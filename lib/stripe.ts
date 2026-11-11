import Stripe from 'stripe'
import { getSupabaseAdminClient } from '@/lib/auth'

export const PRICE_IDS = {
  starter: 'price_starter_001',
  pro: 'price_pro_001',
  agency: 'price_agency_001',
}

export const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 99,
    description: 'Up to 100 leads per month, basic AI calling',
    features: [
      '100 leads per month',
      'Basic AI voice calling',
      'Kanban lead dashboard',
      'Calendar scheduling',
    ],
    priceId: PRICE_IDS.starter,
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 249,
    description: 'Up to 500 leads per month, advanced AI calling',
    features: [
      '500 leads per month',
      'Advanced AI voice calling',
      'Priority lead scoring',
      'Dob & ACRIS data integration',
      'Custom appointment types',
    ],
    priceId: PRICE_IDS.pro,
    popular: true,
  },
  {
    id: 'agency',
    name: 'Agency',
    price: 499,
    description: 'Unlimited leads, team features, dedicated support',
    features: [
      'Unlimited leads',
      'Dedicated AI voice agent',
      'Team collaboration',
      'White-label dashboard',
      'API access',
      'Dedicated support',
    ],
    priceId: PRICE_IDS.agency,
    popular: false,
  },
]

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured.')
  }
  return new Stripe(secretKey, { apiVersion: '2024-06-18' as Stripe.LatestApiVersion })
}

export async function createCheckoutSession(
  userId: string,
  email: string,
  name: string | undefined,
  priceId: string,
  successUrl: string,
  cancelUrl: string
) {
  const stripe = getStripe()
  const customer = await stripe.customers.create({
    email: email || undefined,
    name,
    metadata: { userId },
  })

  const session = await stripe.checkout.sessions.create({
    customer: customer.id,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId },
    subscription_data: { metadata: { userId } },
  })

  return session.url
}

function stripeStatus(status: Stripe.Subscription.Status) {
  switch (status) {
    case 'trialing':
      return 'trialing'
    case 'past_due':
    case 'unpaid':
      return 'past_due'
    case 'incomplete':
      return 'incomplete'
    case 'canceled':
    case 'incomplete_expired':
      return 'canceled'
    case 'paused':
      return 'active'
    default:
      return 'active'
  }
}

function subscriptionPlan(priceId: string) {
  if (priceId === PRICE_IDS.starter) return 'starter'
  if (priceId === PRICE_IDS.pro) return 'pro'
  return 'pay_per_lead'
}

async function saveSubscription(userId: string, customerId: string, subscription: Stripe.Subscription) {
  const admin = getSupabaseAdminClient()
  const subscriptionPeriod = subscription as Stripe.Subscription & {
    current_period_start: number
    current_period_end: number
  }
  const priceId = subscription.items.data[0]?.price.id

  if (!priceId) {
    throw new Error('Stripe subscription has no price.')
  }

  const { error } = await admin.from('subscriptions').upsert(
    {
      agent_id: userId,
      plan: subscriptionPlan(priceId),
      status: stripeStatus(subscription.status),
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      current_period_start: new Date(subscriptionPeriod.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscriptionPeriod.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      metadata: { stripe_price_id: priceId },
    },
    { onConflict: 'agent_id' }
  )

  if (error) {
    throw new Error(`Could not save subscription: ${error.message}`)
  }
}

export async function handleStripeWebhook(req: Request) {
  const signature = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!signature) {
    throw new Error('Missing Stripe signature.')
  }
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured.')
  }

  const body = await req.text()
  const stripe = getStripe()
  const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      const userId = session.metadata?.userId
      const subscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id
      const customerId =
        typeof session.customer === 'string' ? session.customer : session.customer?.id

      if (!userId || !subscriptionId || !customerId) {
        throw new Error('Stripe checkout session is missing user, subscription, or customer metadata.')
      }

      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      await saveSubscription(userId, customerId, subscription)
      break
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object
      const admin = getSupabaseAdminClient()
      const { data: existing, error: lookupError } = await admin
        .from('subscriptions')
        .select('agent_id, stripe_customer_id')
        .eq('stripe_subscription_id', subscription.id)
        .maybeSingle()

      if (lookupError) {
        throw new Error(`Could not find subscription owner: ${lookupError.message}`)
      }
      if (!existing) {
        throw new Error('No workspace subscription matches this Stripe subscription.')
      }

      await saveSubscription(
        existing.agent_id,
        existing.stripe_customer_id || '',
        subscription
      )
      break
    }
  }

  return { received: true }
}
