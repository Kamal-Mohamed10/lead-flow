import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-18' as any,
})

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

export async function createCheckoutSession(
  userId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    throw new Error('User not found')
  }

  let customerId = user.stripeCustomerId

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name || undefined,
    })
    customerId = customer.id

    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customerId },
    })
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
    },
  })

  return session.url
}

export async function handleStripeWebhook(req: Request) {
  const sig = req.headers.get('stripe-signature')!
  const body = await req.text()

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    throw new Error(`Webhook signature verification failed`)
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.userId

      if (userId) {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        )

        await prisma.subscription.upsert({
          where: { userId },
          update: {
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items.data[0].price.id,
            status: 'active',
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          },
          create: {
            userId,
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items.data[0].price.id,
            status: 'active',
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          },
        })
      }
      break
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          status:
            subscription.status === 'canceled'
              ? 'canceled'
              : subscription.status === 'past_due'
              ? 'past_due'
              : subscription.status === 'incomplete'
              ? 'incomplete'
              : 'active',
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
      })
      break
    }
  }

  return { received: true }
}

export { stripe }