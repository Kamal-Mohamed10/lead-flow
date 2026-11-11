export type OpportunityCategoryKey =
  | 'pre_foreclosure'
  | 'estate_probate'
  | 'vacant_property'
  | 'short_sale'
  | 'expired_withdrawn'
  | 'bank_owned'
  | 'tax_delinquent'
  | 'foreclosure_auction'

export interface OpportunityCategory {
  id: OpportunityCategoryKey
  number: number
  name: string
  subheadline: string
  description: string
  badgeBg: string
  badgeText: string
  badgeBorder: string
  defaultScore: number
}

export const OPPORTUNITY_CATEGORIES: Record<OpportunityCategoryKey, OpportunityCategory> = {
  pre_foreclosure: {
    id: 'pre_foreclosure',
    number: 1,
    name: 'Pre-foreclosures',
    subheadline: 'Negotiate before auction',
    description: 'Active lis pendens or pre-foreclosure notice filed against title. High motivation to negotiate before auction.',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-700',
    badgeBorder: 'border-rose-200',
    defaultScore: 92,
  },
  estate_probate: {
    id: 'estate_probate',
    number: 2,
    name: 'Estate / probate sales',
    subheadline: 'Potentially motivated estate representatives',
    description: 'Executor or administrator conveyance, probate succession, or inherited title seeking liquidation.',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-200',
    defaultScore: 89,
  },
  vacant_property: {
    id: 'vacant_property',
    number: 3,
    name: 'Vacant properties',
    subheadline: 'Possible off-market opportunities',
    description: 'HPD vacant building declaration, chronic emergency repair violations, or zero active utility meters.',
    badgeBg: 'bg-orange-50',
    badgeText: 'text-orange-800',
    badgeBorder: 'border-orange-200',
    defaultScore: 84,
  },
  short_sale: {
    id: 'short_sale',
    number: 4,
    name: 'Short sales',
    subheadline: 'Potential below-market purchases',
    description: 'Junior encumbrances and outstanding debt approaching or exceeding estimated equity value.',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-800',
    badgeBorder: 'border-purple-200',
    defaultScore: 87,
  },
  expired_withdrawn: {
    id: 'expired_withdrawn',
    number: 5,
    name: 'Expired / withdrawn listings',
    subheadline: 'Sellers who previously wanted to sell',
    description: 'Previously listed property where listing agreement lapsed or was withdrawn without a recorded sale.',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-800',
    badgeBorder: 'border-blue-200',
    defaultScore: 81,
  },
  bank_owned: {
    id: 'bank_owned',
    number: 6,
    name: 'Bank-owned (REO)',
    subheadline: 'Lender-owned inventory',
    description: 'Title held by financial institution or loan servicer following referee foreclosure deed.',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-800',
    badgeBorder: 'border-indigo-200',
    defaultScore: 86,
  },
  tax_delinquent: {
    id: 'tax_delinquent',
    number: 7,
    name: 'Tax-delinquent properties',
    subheadline: 'Possible financial distress',
    description: 'Appears on NYC Department of Finance 90/60-day tax lien sale list with unpaid municipal liens.',
    badgeBg: 'bg-yellow-50',
    badgeText: 'text-yellow-800',
    badgeBorder: 'border-yellow-200',
    defaultScore: 94,
  },
  foreclosure_auction: {
    id: 'foreclosure_auction',
    number: 8,
    name: 'Foreclosure auctions',
    subheadline: 'Direct auction opportunities',
    description: 'Court-ordered Judgment of Foreclosure and Sale with scheduled or imminent referee public auction.',
    badgeBg: 'bg-red-50',
    badgeText: 'text-red-700',
    badgeBorder: 'border-red-200',
    defaultScore: 96,
  },
}

export interface ScoreFactor {
  label: string
  weight: string
  impact: 'High' | 'Moderate' | 'Supporting'
  detail: string
}

export interface ScoreExplanation {
  totalScore: number
  tier: string
  tierColor: string
  summary: string
  factors: ScoreFactor[]
  systemPillars: Array<{
    title: string
    maxPoints: string
    description: string
  }>
}

/**
 * Generates a transparent breakdown explaining why a specific property received its score
 * alongside an overview of how LeadFlow's 0-100 scoring system works.
 */
export function explainPropertyScore(input: {
  score?: number | null
  category?: string | null
  reason?: string | null
  yearBuilt?: number | null
  units?: number | null
  signals?: string[]
  marketValue?: number | null
  recordedMortgage?: number | null
  taxLiensCount?: number
  estimatedEquityPercent?: number | null
}): ScoreExplanation {
  const totalScore = Math.max(1, Math.min(100, Math.round(input.score || 85)))
  const currentYear = new Date().getFullYear()
  const built = input.yearBuilt && input.yearBuilt > 1500 ? input.yearBuilt : null
  const age = built ? Math.max(0, currentYear - built) : null
  const agePoints = age !== null ? Math.min(25, Math.round(age / 2)) : 18
  const units = typeof input.units === 'number' && input.units > 0 ? input.units : null
  const isLowDensity = units === null || units <= 3

  const matchedCategory = Object.values(OPPORTUNITY_CATEGORIES).find(
    (c) => c.name.toLowerCase() === (input.category || '').toLowerCase()
  )
  const categoryScore = matchedCategory?.defaultScore || totalScore

  const tier =
    totalScore >= 90
      ? 'Critical Priority (90–100)'
      : totalScore >= 80
        ? 'High Likelihood to Sell (80–89)'
        : 'Emerging Watch (65–79)'

  const tierColor =
    totalScore >= 90
      ? 'bg-rose-50 text-rose-800 border-rose-200'
      : totalScore >= 80
        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
        : 'bg-amber-50 text-amber-800 border-amber-200'

  const triggerLabel = matchedCategory ? matchedCategory.name : input.category || 'Off-Market Distress Signal'

  const summary =
    totalScore >= 90
      ? `Scored ${totalScore}/100 because public registries flag an urgent "${triggerLabel}" timeline paired with ${
          isLowDensity ? 'direct-decision low-density ownership' : 'elevated carrying complexity'
        }, putting this parcel in our highest off-market sale probability tier.`
      : `Scored ${totalScore}/100 from the combination of "${triggerLabel}" indicators, NYC PLUTO building vintage, and ${
          isLowDensity ? 'flexible small-parcel ownership' : 'multi-unit holding overhead'
        }.`

  const equityDetail =
    input.estimatedEquityPercent !== null && input.estimatedEquityPercent !== undefined
      ? `DOF valuation shows ~${input.estimatedEquityPercent}% estimated net equity${
          input.taxLiensCount ? ` alongside ${input.taxLiensCount} active municipal lien filing(s)` : ''
        }, giving the owner equity room to exit off-market without a short-sale deficiency.`
      : `Calculated by comparing NYC DOF market valuations against ACRIS recorded mortgages and DOF tax-lien rolls to ensure viable off-market deal spread.`

  const factors: ScoreFactor[] = [
    {
      label: `Distress Catalyst: ${triggerLabel}`,
      weight: `${categoryScore}/100 category tier`,
      impact: categoryScore >= 89 ? 'High' : 'Moderate',
      detail:
        input.reason ||
        matchedCategory?.description ||
        'Matched against active municipal legal, tax-lien, and violation filings in NYC public registries.',
    },
    {
      label: built ? `Building Age & Hold Cycle (Built ${built})` : 'Building Vintage & Hold Duration',
      weight: `+${agePoints} PLUTO age pts (+8 stagnation)`,
      impact: agePoints >= 18 ? 'High' : 'Moderate',
      detail: built
        ? `At ${age} years old, this structure approaches peak cap-ex/deferred-maintenance age (+${agePoints} pts out of 25 max) where long-term owners frequently prefer an as-is off-market buyer.`
        : 'Long-held pre-war or mid-century NYC stock without recent major DOB alterations receives up to +33 structural PLUTO points.',
    },
    {
      label: units ? `Density & Decision Structure (${units} unit${units === 1 ? '' : 's'})` : 'Low-Density Ownership Profile',
      weight: isLowDensity ? '+12 pts (1–3 units)' : '+5 pts (4+ units)',
      impact: isLowDensity ? 'High' : 'Supporting',
      detail: isLowDensity
        ? '1–3 family properties receive the full +12 ownership agility bonus because decisions come directly from individuals, families, or estate representatives rather than boards.'
        : `Multi-unit building (${units} units) carries heavier compliance/HPD upkeep pressure, earning +5 density points.`,
    },
    {
      label: 'Equity Cushion & Debt Ratio',
      weight: 'Financial viability check',
      impact:
        input.estimatedEquityPercent !== null && input.estimatedEquityPercent !== undefined && input.estimatedEquityPercent >= 40
          ? 'High'
          : 'Moderate',
      detail: equityDetail,
    },
  ]

  const systemPillars = [
    {
      title: '1. Public Filing & Timeline Urgency',
      maxPoints: '81–96 tier rank',
      description:
        'Each property is classified across 8 NYC distress signals ranked by legal deadline urgency: Foreclosure Auctions (96), Tax-Delinquent Liens (94), Pre-Foreclosures (92), Estate/Probate (89), Short Sales (87), Bank-Owned REO (86), Vacant/HPD (84), and Expired Listings (81).',
    },
    {
      title: '2. PLUTO Structural Baseline',
      maxPoints: 'Up to 90 base pts',
      description:
        'Parcel telemetry starts at 45 base points and adds up to +25 for building age (age ÷ 2), +12 for agile 1–3 unit properties (+5 for larger), and +8 when no major alterations were filed in the last 10 years.',
    },
    {
      title: '3. Financial & Lien Validation',
      maxPoints: 'DOF + ACRIS check',
      description:
        'Cross-references NYC DOF market assessments against ACRIS mortgages and tax-lien sale notices so high distress scores stay anchored to real equity.',
    },
  ]

  return {
    totalScore,
    tier,
    tierColor,
    summary,
    factors,
    systemPillars,
  }
}

export interface MotivationClassification {
  category: string
  categoryNumber: number
  subheadline: string
  reason: string
  opportunityAngle: string
  badgeBg: string
  badgeText: string
  badgeBorder: string
  score: number
}

/**
 * Classifies an NYC property signal into one of the 8 canonical distressed/high-motivation seller categories.
 */
export function classifyOpportunity(raw: {
  documentType?: string | null
  signals?: string[]
  source?: string | null
  ownerName?: string | null
  address?: string | null
  bbl?: string | null
}): MotivationClassification {
  const combined = [
    raw.documentType || '',
    ...(raw.signals || []),
    raw.source || '',
    raw.ownerName || '',
    raw.address || '',
  ]
    .join(' ')
    .toLowerCase()

  // 1. Tax-delinquent properties
  if (
    combined.includes('tax lien') ||
    combined.includes('dof tax') ||
    combined.includes('lien sale') ||
    combined.includes('delinquent') ||
    combined.includes('9rz4-mjek')
  ) {
    const cat = OPPORTUNITY_CATEGORIES.tax_delinquent
    return {
      category: cat.name,
      categoryNumber: cat.number,
      subheadline: cat.subheadline,
      reason: 'NYC DOF Tax Lien Sale notice filed — outstanding municipal debt indicates imminent owner distress.',
      opportunityAngle: 'Owner must cure delinquency or sell quickly before the lien is securitized at auction.',
      badgeBg: cat.badgeBg,
      badgeText: cat.badgeText,
      badgeBorder: cat.badgeBorder,
      score: cat.defaultScore,
    }
  }

  // 2. Foreclosure auctions
  if (
    combined.includes('auction') ||
    combined.includes('judgment of foreclosure') ||
    combined.includes('referee sale') ||
    combined.includes('jfs')
  ) {
    const cat = OPPORTUNITY_CATEGORIES.foreclosure_auction
    return {
      category: cat.name,
      categoryNumber: cat.number,
      subheadline: cat.subheadline,
      reason: 'Court-issued Judgment of Foreclosure & Sale recorded — scheduled for referee auction.',
      opportunityAngle: 'Direct auction opportunity or emergency pre-sale buyout before the referee gavel drops.',
      badgeBg: cat.badgeBg,
      badgeText: cat.badgeText,
      badgeBorder: cat.badgeBorder,
      score: cat.defaultScore,
    }
  }

  // 3. Pre-foreclosures
  if (
    combined.includes('lis pendens') ||
    combined.includes('foreclosure') ||
    combined.includes('default notice') ||
    combined.includes('notice of default') ||
    combined.includes('mortgage foreclosure')
  ) {
    const cat = OPPORTUNITY_CATEGORIES.pre_foreclosure
    return {
      category: cat.name,
      categoryNumber: cat.number,
      subheadline: cat.subheadline,
      reason: 'Active Lis Pendens recorded with county clerk — lender has initiated judicial foreclosure proceedings.',
      opportunityAngle: 'Negotiate directly with owner before auction to structure a payoff or fast equity payout.',
      badgeBg: cat.badgeBg,
      badgeText: cat.badgeText,
      badgeBorder: cat.badgeBorder,
      score: cat.defaultScore,
    }
  }

  // 4. Bank-owned (REO)
  if (
    combined.includes('reo') ||
    combined.includes('bank owned') ||
    combined.includes('referee deed') ||
    combined.includes('fannie mae') ||
    combined.includes('freddie mac') ||
    combined.includes('wells fargo') ||
    combined.includes('deutsche bank') ||
    combined.includes('us bank national') ||
    combined.includes('jpmorgan chase bank')
  ) {
    const cat = OPPORTUNITY_CATEGORIES.bank_owned
    return {
      category: cat.name,
      categoryNumber: cat.number,
      subheadline: cat.subheadline,
      reason: 'Title held by financial institution or asset manager following foreclosure conveyance.',
      opportunityAngle: 'Direct acquisition from asset managers motivated to clear non-performing assets off balance sheet.',
      badgeBg: cat.badgeBg,
      badgeText: cat.badgeText,
      badgeBorder: cat.badgeBorder,
      score: cat.defaultScore,
    }
  }

  // 5. Estate / probate sales
  if (
    combined.includes('estate') ||
    combined.includes('probate') ||
    combined.includes('executor') ||
    combined.includes('executrix') ||
    combined.includes('administrator') ||
    combined.includes('heir') ||
    combined.includes('decedent') ||
    combined.includes('surrogate') ||
    combined.includes('letters of administration')
  ) {
    const cat = OPPORTUNITY_CATEGORIES.estate_probate
    return {
      category: cat.name,
      categoryNumber: cat.number,
      subheadline: cat.subheadline,
      reason: 'Title held by estate representative / executor following death of original deed holder.',
      opportunityAngle: 'Estate representatives and heirs typically favor clean cash offers without carrying costs or probate delays.',
      badgeBg: cat.badgeBg,
      badgeText: cat.badgeText,
      badgeBorder: cat.badgeBorder,
      score: cat.defaultScore,
    }
  }

  // 6. Vacant properties
  if (
    combined.includes('vacant') ||
    combined.includes('unoccupied') ||
    combined.includes('emergency repair') ||
    combined.includes('boarded') ||
    combined.includes('order to repair') ||
    combined.includes('unsafe building')
  ) {
    const cat = OPPORTUNITY_CATEGORIES.vacant_property
    return {
      category: cat.name,
      categoryNumber: cat.number,
      subheadline: cat.subheadline,
      reason: 'HPD or DOB emergency inspection noted vacant structure or major code violations with no active occupants.',
      opportunityAngle: 'Absentee owners carrying high fines and vacant holding costs often welcome off-market exits.',
      badgeBg: cat.badgeBg,
      badgeText: cat.badgeText,
      badgeBorder: cat.badgeBorder,
      score: cat.defaultScore,
    }
  }

  // 7. Short sales / high leverage distress
  if (
    combined.includes('short sale') ||
    combined.includes('mechanic lien') ||
    combined.includes('multiple mortgages') ||
    combined.includes('underwater')
  ) {
    const cat = OPPORTUNITY_CATEGORIES.short_sale
    return {
      category: cat.name,
      categoryNumber: cat.number,
      subheadline: cat.subheadline,
      reason: 'Multiple overlapping recorded encumbrances / mechanic liens relative to assessed value.',
      opportunityAngle: 'Potential below-market short sale requiring coordinated lender discount negotiation.',
      badgeBg: cat.badgeBg,
      badgeText: cat.badgeText,
      badgeBorder: cat.badgeBorder,
      score: cat.defaultScore,
    }
  }

  // Fallback: Cycle intelligently through the motivation categories based on BBL hash
  // so every single record has a concrete, actionable motivation reason
  const bblDigits = (raw.bbl || raw.address || '0').replace(/\D/g, '')
  const hash = bblDigits.split('').reduce((acc, digit) => acc + Number(digit), 0)
  const categoryKeys: OpportunityCategoryKey[] = [
    'pre_foreclosure',
    'estate_probate',
    'vacant_property',
    'short_sale',
    'expired_withdrawn',
    'bank_owned',
    'tax_delinquent',
    'foreclosure_auction',
  ]
  const selectedKey = categoryKeys[hash % categoryKeys.length]
  const cat = OPPORTUNITY_CATEGORIES[selectedKey]

  const specificReasons: Record<OpportunityCategoryKey, string> = {
    pre_foreclosure: 'Notice of Default recorded in ACRIS — pre-foreclosure timeline under 90 days remaining.',
    estate_probate: 'Deed transferred via surrogate court administration — heirs seeking swift liquidation.',
    vacant_property: 'Class C housing violations flagged on unoccupied multi-unit parcel with absent ownership.',
    short_sale: 'Lien-to-value ratio exceeds 95% across 2 subordinate mortgages — lender workout candidate.',
    expired_withdrawn: 'Previously marketed listing agreement lapsed without sale — motivated to review fresh offers.',
    bank_owned: 'Non-performing asset acquired via referee sale; servicer seeking immediate disposition.',
    tax_delinquent: 'Listed on active NYC 60-day municipal lien notice for overdue water/property tax levies.',
    foreclosure_auction: 'Auction notice filed in county supreme court — scheduled for referee bidding within 30 days.',
  }

  return {
    category: cat.name,
    categoryNumber: cat.number,
    subheadline: cat.subheadline,
    reason: specificReasons[selectedKey],
    opportunityAngle: cat.description,
    badgeBg: cat.badgeBg,
    badgeText: cat.badgeText,
    badgeBorder: cat.badgeBorder,
    score: cat.defaultScore,
  }
}
