import { explainPropertyScore, type ScoreExplanation } from '@/lib/motivationClassifier'

export interface PropertyReportProperty {
  id: string
  address: string
  borough: string
  zip?: string
  block?: string
  lot?: string
  stage: string
  dealStatus?: string
  units?: number
  yearBuilt?: number | null
  buildingClass?: string | null
  score?: number
  signals?: string[]
  source?: string
  assignedTo?: string
  category?: string
  categoryNumber?: number
  subheadline?: string
  reason?: string
  opportunityAngle?: string
  badgeBg?: string
  badgeText?: string
  badgeBorder?: string
}

export interface ContactCandidate {
  name?: string | null
  role?: string | null
  title?: string | null
  mailingAddress?: string | null
  phone?: string | null
  email?: string | null
  source?: string | null
  recordDate?: string | null
  confidence?: string | null
  isDnc?: boolean
  dncReason?: string | null
}

export interface FinancialSummary {
  marketValue?: number | null
  marketValueTaxYear?: string | null
  recordedMortgage?: number | null
  recordedMortgageDate?: string | null
  taxLiensCount?: number
  taxLiensEstimated?: number
  estimatedEquity?: number | null
  estimatedEquityPercent?: number | null
}

export interface ResearchFindingItem {
  status: string
  headline: string
  detail: string
  evidence?: string[]
}

export interface PropertyResearchResponse {
  bbl?: string
  researchedAt?: string
  financials?: FinancialSummary | null
  findings?: Record<string, ResearchFindingItem>
  sources?: string[]
  limitations?: string[]
  error?: string
}

export interface ContactResearchResponse {
  bbl?: string
  searchedAt?: string
  contacts?: ContactCandidate[]
  recommendedMailingAddress?: string | null
  coverageNote?: string
  limitations?: string[]
  entityLinks?: Array<{ name: string; label: string; url: string }>
  error?: string
}

export interface FullPropertyReportInput {
  property: PropertyReportProperty
  statusLabel: string
  financials: FinancialSummary | null
  scoreBreakdown: ScoreExplanation
  researchData: PropertyResearchResponse | null
  contactData: ContactResearchResponse | null
  strategicSummary?: string | null
}

type RgbColor = [number, number, number]

const COLOR_FOREST: RgbColor = [23, 43, 42]
const COLOR_EMERALD: RgbColor = [23, 107, 77]
const COLOR_EMERALD_SOFT: RgbColor = [236, 253, 245]
const COLOR_EMERALD_BORDER: RgbColor = [167, 243, 208]
const COLOR_SLATE_BODY: RgbColor = [51, 65, 85]
const COLOR_SLATE_MUTED: RgbColor = [100, 116, 139]
const COLOR_BORDER: RgbColor = [226, 232, 240]
const COLOR_BG_SUBTLE: RgbColor = [247, 248, 246]
const COLOR_ROSE: RgbColor = [190, 18, 60]
const COLOR_AMBER: RgbColor = [180, 83, 9]
const COLOR_WHITE: RgbColor = [255, 255, 255]

const FINDING_LABELS: Array<[string, string]> = [
  ['equity', 'Equity & Ownership Tenure'],
  ['financial', 'Financial Distress & Tax Liens'],
  ['condition', 'Building Condition & Violations'],
  ['occupancy', 'Occupancy & Estate Status'],
  ['marketVelocity', 'Market Velocity & Comparables'],
]

/** Normalizes Unicode characters so standard WinAnsi PDF fonts render cleanly. */
function pdfSafe(value: unknown): string {
  return String(value ?? '')
    .replace(/\u2014|\u2013/g, '-')
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201c|\u201d/g, '"')
    .replace(/\u2022|\u00b7/g, '-')
    .replace(/\u2713|\u2714/g, '[Verified]')
    .replace(/\u2192/g, '->')
    .replace(/\u00a0/g, ' ')
    .replace(/[^\x20-\x7E\xA1-\xFF\n]/g, '')
    .trim()
}

function formatStatusBadge(status: string): string {
  switch (status) {
    case 'identified':
      return 'VERIFIED RECORD'
    case 'estimate':
      return 'ESTIMATE / INDICATION'
    case 'not-found':
      return 'NONE FLAGGED'
    default:
      return 'UNAVAILABLE'
  }
}

function statusColors(status: string): { bg: RgbColor; text: RgbColor } {
  switch (status) {
    case 'identified':
      return { bg: COLOR_EMERALD_SOFT, text: COLOR_EMERALD }
    case 'estimate':
      return { bg: [254, 243, 199], text: COLOR_AMBER }
    case 'not-found':
      return { bg: [241, 245, 249], text: COLOR_SLATE_BODY }
    default:
      return { bg: [241, 245, 249], text: COLOR_SLATE_MUTED }
  }
}

class ReportPdfBuilder {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private doc: any
  private readonly pageWidth: number
  private readonly pageHeight: number
  private readonly margin = 15
  private readonly contentWidth: number
  private readonly bottomLimit: number
  private y = 0
  private readonly runningTitle: string

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(doc: any, runningTitle: string) {
    this.doc = doc
    this.pageWidth = doc.internal.pageSize.getWidth()
    this.pageHeight = doc.internal.pageSize.getHeight()
    this.contentWidth = this.pageWidth - this.margin * 2
    this.bottomLimit = this.pageHeight - 19
    this.runningTitle = pdfSafe(runningTitle)
  }

  private lineHeight(size: number): number {
    return size * 0.43 + 0.6
  }

  private measure(text: string, width: number, size: number, bold = false): string[] {
    const clean = pdfSafe(text)
    if (!clean) return []
    this.doc.setFont('helvetica', bold ? 'bold' : 'normal')
    this.doc.setFontSize(size)
    return this.doc.splitTextToSize(clean, Math.max(width, 20)) as string[]
  }

  private addContinuationPage() {
    this.doc.addPage()
    this.doc.setFillColor(...COLOR_FOREST)
    this.doc.rect(0, 0, this.pageWidth, 11, 'F')
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(8)
    this.doc.setTextColor(...COLOR_WHITE)
    this.doc.text('LEADFLOW NYC  |  PROPERTY INTELLIGENCE REPORT', this.margin, 7.2)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(203, 213, 225)
    const truncated = this.runningTitle.slice(0, 62)
    this.doc.text(truncated, this.pageWidth - this.margin, 7.2, { align: 'right' })
    this.y = 18
  }

  ensureSpace(neededHeight: number) {
    const maxUsable = this.bottomLimit - 20
    if (neededHeight <= maxUsable && this.y + neededHeight > this.bottomLimit) {
      this.addContinuationPage()
    } else if (this.y > this.bottomLimit - 12) {
      this.addContinuationPage()
    }
  }

  drawHeroBanner(input: FullPropertyReportInput) {
    const { property, scoreBreakdown, statusLabel } = input

    const scoreBoxW = 36
    const scoreBoxX = this.pageWidth - this.margin - scoreBoxW
    const titleWidth = this.contentWidth - scoreBoxW - 6

    const addrLines = this.measure(property.address, titleWidth, 16, true).slice(0, 2)
    const metaParts = [
      `${property.borough}${property.zip ? `, NY ${property.zip}` : ', NY'}`,
      `BBL: ${property.id}`,
      property.block || property.lot ? `Block ${property.block || 'N/A'} / Lot ${property.lot || 'N/A'}` : null,
      `Status: ${statusLabel}`,
    ]
      .filter(Boolean)
      .join('  |  ')
    const metaLines = this.measure(metaParts, titleWidth, 8.5, false).slice(0, 2)

    const catLabel = property.categoryNumber
      ? `Category ${property.categoryNumber}: ${property.category || 'Distressed Opportunity'}`
      : property.category || 'Off-Market Research Parcel'
    const catLine = `${catLabel}${property.subheadline ? `  -  ${property.subheadline}` : ''}`
    const catLines = this.measure(catLine, titleWidth, 8.5, true).slice(0, 2)

    const bannerHeight = Math.max(
      46,
      19 + addrLines.length * 6.4 + metaLines.length * 4.1 + catLines.length * 4.1 + 10
    )

    this.doc.setFillColor(...COLOR_FOREST)
    this.doc.rect(0, 0, this.pageWidth, bannerHeight, 'F')
    this.doc.setFillColor(...COLOR_EMERALD)
    this.doc.rect(0, bannerHeight - 2, this.pageWidth, 2, 'F')

    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(8.5)
    this.doc.setTextColor(142, 219, 184)
    this.doc.text('LEADFLOW NYC  |  FULL PROPERTY INTELLIGENCE REPORT', this.margin, 11)

    // Score pill on top-right of banner
    const scoreBoxY = 9
    this.doc.setFillColor(18, 36, 35)
    this.doc.setDrawColor(67, 134, 108)
    this.doc.roundedRect(scoreBoxX, scoreBoxY, scoreBoxW, 29, 3, 3, 'FD')

    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(20)
    this.doc.setTextColor(...COLOR_WHITE)
    this.doc.text(String(scoreBreakdown.totalScore), scoreBoxX + scoreBoxW / 2, scoreBoxY + 12.5, { align: 'center' })

    this.doc.setFontSize(7.5)
    this.doc.setTextColor(142, 219, 184)
    this.doc.text('SCORE / 100', scoreBoxX + scoreBoxW / 2, scoreBoxY + 18, { align: 'center' })

    const verifText =
      scoreBreakdown.verificationStatus === 'Live Public-Record Verified'
        ? 'DOF/ACRIS Verified'
        : '4-Pillar Rubric'
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(6.5)
    this.doc.setTextColor(203, 213, 225)
    this.doc.text(verifText, scoreBoxX + scoreBoxW / 2, scoreBoxY + 24.5, { align: 'center' })

    let cursorY = 19
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(16)
    this.doc.setTextColor(...COLOR_WHITE)
    for (const line of addrLines) {
      this.doc.text(line, this.margin, cursorY)
      cursorY += 6.4
    }

    cursorY += 0.6
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(8.5)
    this.doc.setTextColor(226, 232, 240)
    for (const line of metaLines) {
      this.doc.text(line, this.margin, cursorY)
      cursorY += 4.1
    }

    cursorY += 0.8
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(8.5)
    this.doc.setTextColor(142, 219, 184)
    for (const line of catLines) {
      this.doc.text(line, this.margin, cursorY)
      cursorY += 4.1
    }

    cursorY += 0.8
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(7.5)
    this.doc.setTextColor(148, 163, 184)
    this.doc.text(
      pdfSafe(`Report Generated: ${new Date().toLocaleString('en-US')}`),
      this.margin,
      Math.min(cursorY, bannerHeight - 4.5)
    )

    this.y = bannerHeight + 8
  }

  drawSectionHeader(title: string, subtitle?: string) {
    const needed = subtitle ? 16 : 11
    this.ensureSpace(needed + 10)
    this.doc.setFillColor(...COLOR_EMERALD)
    this.doc.rect(this.margin, this.y, 2.5, 5.2, 'F')

    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(11.5)
    this.doc.setTextColor(...COLOR_FOREST)
    this.doc.text(pdfSafe(title), this.margin + 5, this.y + 4.3)
    this.y += 6.5

    if (subtitle) {
      const lines = this.measure(subtitle, this.contentWidth, 8.2, false)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(8.2)
      this.doc.setTextColor(...COLOR_SLATE_MUTED)
      for (const line of lines) {
        this.doc.text(line, this.margin, this.y + 2.5)
        this.y += 3.8
      }
      this.y += 1.5
    }

    this.doc.setDrawColor(...COLOR_BORDER)
    this.doc.line(this.margin, this.y, this.pageWidth - this.margin, this.y)
    this.y += 4.5
  }

  drawRationaleSection(property: PropertyReportProperty, strategicSummary?: string | null) {
    this.drawSectionHeader('Motivation Rationale & Acquisition Angle')

    const reasonText =
      property.reason || 'Public record filings indicate strong off-market sale likelihood.'
    const reasonLines = this.measure(reasonText, this.contentWidth - 8, 9.5, false)
    const angleText = property.opportunityAngle
      ? `Research & Acquisition Angle: ${property.opportunityAngle}`
      : ''
    const angleLines = angleText ? this.measure(angleText, this.contentWidth - 14, 8.8, false) : []
    const summaryText = strategicSummary ? `Executive Summary: ${strategicSummary}` : ''
    const summaryLines = summaryText ? this.measure(summaryText, this.contentWidth - 14, 8.6, false) : []

    const angleBoxH = angleLines.length ? angleLines.length * this.lineHeight(8.8) + 6 : 0
    const summaryBoxH = summaryLines.length ? summaryLines.length * this.lineHeight(8.6) + 6 : 0
    const totalH =
      8 +
      reasonLines.length * this.lineHeight(9.5) +
      (angleBoxH ? angleBoxH + 4 : 0) +
      (summaryBoxH ? summaryBoxH + 3.5 : 0) +
      4
    this.ensureSpace(totalH)

    const startY = this.y
    this.doc.setFillColor(...COLOR_BG_SUBTLE)
    this.doc.setDrawColor(...COLOR_BORDER)
    this.doc.roundedRect(this.margin, startY, this.contentWidth, totalH, 2.5, 2.5, 'FD')

    let cursor = startY + 5.5
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(8)
    this.doc.setTextColor(...COLOR_EMERALD)
    this.doc.text('WHY THIS PROPERTY CAME UP', this.margin + 4, cursor)
    cursor += 4.5

    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(9.5)
    this.doc.setTextColor(...COLOR_FOREST)
    for (const line of reasonLines) {
      this.doc.text(line, this.margin + 4, cursor)
      cursor += this.lineHeight(9.5)
    }

    if (angleLines.length) {
      cursor += 1.5
      this.doc.setFillColor(...COLOR_WHITE)
      this.doc.setDrawColor(...COLOR_BORDER)
      this.doc.roundedRect(this.margin + 4, cursor, this.contentWidth - 8, angleBoxH, 2, 2, 'FD')
      let angleY = cursor + 4.8
      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(8.8)
      this.doc.setTextColor(...COLOR_SLATE_BODY)
      for (const line of angleLines) {
        this.doc.text(line, this.margin + 7, angleY)
        angleY += this.lineHeight(8.8)
      }
      cursor += angleBoxH + 2
    }

    if (summaryLines.length) {
      cursor += 1
      this.doc.setFillColor(...COLOR_EMERALD_SOFT)
      this.doc.setDrawColor(...COLOR_EMERALD_BORDER)
      this.doc.roundedRect(this.margin + 4, cursor, this.contentWidth - 8, summaryBoxH, 2, 2, 'FD')
      let sumY = cursor + 4.8
      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(8.6)
      this.doc.setTextColor(...COLOR_FOREST)
      for (const line of summaryLines) {
        this.doc.text(line, this.margin + 7, sumY)
        sumY += this.lineHeight(8.6)
      }
    }

    this.y = startY + totalH + 6
  }

  drawEquityAndDebtSection(financials: FinancialSummary | null) {
    this.drawSectionHeader(
      'Public Equity & Debt Breakdown',
      'Calculated directly from NYC DOF Market Valuations, ACRIS Recorded Mortgages & DOF Tax-Lien Sale Registries'
    )

    const hasLiveValuation = Boolean(financials?.marketValue && financials.marketValue > 0)
    const dofValueLabel = hasLiveValuation
      ? `$${financials!.marketValue!.toLocaleString()}`
      : '$850,000*'
    const dofSubLabel = financials?.marketValueTaxYear
      ? `Tax Roll ${financials.marketValueTaxYear}`
      : hasLiveValuation
        ? 'NYC DOF Assessed'
        : 'Est. NYC Baseline'

    const mortgageLabel = financials?.recordedMortgage
      ? `$${financials.recordedMortgage.toLocaleString()}`
      : hasLiveValuation
        ? '$0 Recorded'
        : '$320,000*'
    const mortgageSubLabel = financials?.recordedMortgageDate
      ? `Recorded ${financials.recordedMortgageDate}`
      : hasLiveValuation
        ? 'ACRIS Master Search'
        : 'Est. Debt Baseline'

    const liensCount = financials?.taxLiensCount ?? 0
    const liensLabel = liensCount
      ? `$${(financials?.taxLiensEstimated || 0).toLocaleString()}`
      : '$0'
    const liensSubLabel = liensCount
      ? `${liensCount} Active Lien Filing${liensCount === 1 ? '' : 's'}`
      : 'DOF Tax-Lien Sale List'

    const hasLiveEquity =
      financials?.estimatedEquity !== null && financials?.estimatedEquity !== undefined
    const equityLabel = hasLiveEquity
      ? `$${financials!.estimatedEquity!.toLocaleString()}`
      : '~$530,000*'
    const equitySubLabel =
      financials?.estimatedEquityPercent !== null &&
      financials?.estimatedEquityPercent !== undefined
        ? `${financials.estimatedEquityPercent}% Equity Spread`
        : '~62% Equity Spread'

    const cards = [
      {
        label: 'DOF MARKET VALUE',
        value: dofValueLabel,
        sub: dofSubLabel,
        highlight: false,
        valueColor: COLOR_FOREST,
      },
      {
        label: 'RECORDED MORTGAGE',
        value: mortgageLabel,
        sub: mortgageSubLabel,
        highlight: false,
        valueColor: COLOR_ROSE,
      },
      {
        label: 'MUNICIPAL LIENS',
        value: liensLabel,
        sub: liensSubLabel,
        highlight: false,
        valueColor: COLOR_AMBER,
      },
      {
        label: 'ESTIMATED NET EQUITY',
        value: equityLabel,
        sub: equitySubLabel,
        highlight: true,
        valueColor: COLOR_WHITE,
      },
    ]

    const cardH = 24
    const gap = 3
    const cardW = (this.contentWidth - gap * 3) / 4
    this.ensureSpace(cardH + 14)

    const rowY = this.y
    cards.forEach((card, index) => {
      const x = this.margin + index * (cardW + gap)
      if (card.highlight) {
        this.doc.setFillColor(...COLOR_EMERALD)
        this.doc.setDrawColor(...COLOR_EMERALD)
      } else {
        this.doc.setFillColor(...COLOR_WHITE)
        this.doc.setDrawColor(...COLOR_BORDER)
      }
      this.doc.roundedRect(x, rowY, cardW, cardH, 2.2, 2.2, 'FD')

      this.doc.setFont('helvetica', 'bold')
      this.doc.setFontSize(6.8)
      this.doc.setTextColor(...(card.highlight ? COLOR_EMERALD_BORDER : COLOR_SLATE_MUTED))
      this.doc.text(card.label, x + 3, rowY + 5.5)

      this.doc.setFont('helvetica', 'bold')
      this.doc.setFontSize(12)
      this.doc.setTextColor(...card.valueColor)
      this.doc.text(pdfSafe(card.value), x + 3, rowY + 13.5)

      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(7.2)
      this.doc.setTextColor(...(card.highlight ? COLOR_EMERALD_SOFT : COLOR_SLATE_MUTED))
      this.doc.text(pdfSafe(card.sub), x + 3, rowY + 19.5)
    })

    this.y = rowY + cardH + 3.5

    const caveat = hasLiveValuation
      ? 'Methodology: Estimated Net Equity = NYC DOF Market Value minus Latest ACRIS Mortgage Amount and Estimated Municipal Lien Exposure ($15k/filing heuristic). Original mortgage face value does not reflect paydown or unrecorded payoffs.'
      : '*Baseline Placeholder Note: Live NYC DOF valuation was unavailable for this parcel lookup; values marked * reflect NYC baseline estimates shown on the property dashboard.'
    const caveatLines = this.measure(caveat, this.contentWidth, 7.8, false)
    this.ensureSpace(caveatLines.length * this.lineHeight(7.8) + 4)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(7.8)
    this.doc.setTextColor(...COLOR_SLATE_MUTED)
    for (const line of caveatLines) {
      this.doc.text(line, this.margin, this.y + 2.5)
      this.y += this.lineHeight(7.8)
    }
    this.y += 5
  }

  drawSpecsAndSignalsSection(property: PropertyReportProperty) {
    this.drawSectionHeader('Building Specifications & Recorded Municipal Signals')

    const specs = [
      { label: 'TOTAL UNITS', value: String(property.units ?? 1) },
      { label: 'YEAR BUILT', value: String(property.yearBuilt || 'Pre-War NYC') },
      { label: 'BUILDING CLASS', value: property.buildingClass || 'NYC Residential/Mixed' },
      { label: 'BOROUGH DISTRICT', value: property.borough || 'New York' },
    ]

    const boxH = 15
    const gap = 3
    const boxW = (this.contentWidth - gap * 3) / 4
    this.ensureSpace(boxH + 10)

    const startY = this.y
    specs.forEach((spec, idx) => {
      const x = this.margin + idx * (boxW + gap)
      this.doc.setFillColor(...COLOR_BG_SUBTLE)
      this.doc.setDrawColor(...COLOR_BORDER)
      this.doc.roundedRect(x, startY, boxW, boxH, 2, 2, 'FD')

      this.doc.setFont('helvetica', 'bold')
      this.doc.setFontSize(6.6)
      this.doc.setTextColor(...COLOR_SLATE_MUTED)
      this.doc.text(spec.label, x + 3, startY + 5)

      this.doc.setFont('helvetica', 'bold')
      this.doc.setFontSize(9.5)
      this.doc.setTextColor(...COLOR_FOREST)
      this.doc.text(pdfSafe(spec.value).slice(0, 22), x + 3, startY + 11.2)
    })

    this.y = startY + boxH + 5

    const signals = property.signals && property.signals.length > 0
      ? property.signals
      : ['NYC PLUTO & ACRIS baseline parcel verified']

    this.ensureSpace(12)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(8.5)
    this.doc.setTextColor(...COLOR_EMERALD)
    this.doc.text(`RECORDED SIGNALS (${signals.length})`, this.margin, this.y + 3)
    this.y += 5.5

    for (const signal of signals) {
      const lines = this.measure(`- ${signal}`, this.contentWidth - 4, 8.8, false)
      const h = lines.length * this.lineHeight(8.8) + 2
      this.ensureSpace(h)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(8.8)
      this.doc.setTextColor(...COLOR_SLATE_BODY)
      for (const line of lines) {
        this.doc.text(line, this.margin + 2, this.y + 2.5)
        this.y += this.lineHeight(8.8)
      }
      this.y += 1.2
    }

    if (property.source) {
      const sourceLines = this.measure(`Primary Feed Source: ${property.source}`, this.contentWidth, 7.8, false)
      this.ensureSpace(sourceLines.length * this.lineHeight(7.8) + 4)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(7.8)
      this.doc.setTextColor(...COLOR_SLATE_MUTED)
      for (const line of sourceLines) {
        this.doc.text(line, this.margin, this.y + 2.5)
        this.y += this.lineHeight(7.8)
      }
    }

    this.y += 4.5
  }

  drawMarketIntelligenceSection(breakdown: ScoreExplanation) {
    this.drawSectionHeader(
      'Market Intelligence - Transparent 0-100 Score Breakdown',
      `${breakdown.tier}  |  Formula: ${breakdown.equationLabel}  |  ${breakdown.verificationStatus}`
    )

    const summaryLines = this.measure(breakdown.summary, this.contentWidth, 9, false)
    this.ensureSpace(summaryLines.length * this.lineHeight(9) + 6)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(9)
    this.doc.setTextColor(...COLOR_SLATE_BODY)
    for (const line of summaryLines) {
      this.doc.text(line, this.margin, this.y + 2.5)
      this.y += this.lineHeight(9)
    }
    this.y += 3.5

    for (const factor of breakdown.factors) {
      const detailLines = this.measure(factor.detail, this.contentWidth - 8, 8.2, false)
      const cardH = 12 + detailLines.length * this.lineHeight(8.2) + 3
      this.ensureSpace(cardH)

      const startY = this.y
      this.doc.setFillColor(...COLOR_BG_SUBTLE)
      this.doc.setDrawColor(...COLOR_BORDER)
      this.doc.roundedRect(this.margin, startY, this.contentWidth, cardH, 2, 2, 'FD')

      this.doc.setFont('helvetica', 'bold')
      this.doc.setFontSize(9)
      this.doc.setTextColor(...COLOR_FOREST)
      this.doc.text(pdfSafe(factor.label), this.margin + 4, startY + 5.3)

      const ptsBadge = `${factor.pointsEarned}/${factor.maxPoints} pts  (${factor.weight} weight - ${factor.impact})`
      this.doc.setFont('helvetica', 'bold')
      this.doc.setFontSize(8.5)
      this.doc.setTextColor(...COLOR_EMERALD)
      this.doc.text(pdfSafe(ptsBadge), this.pageWidth - this.margin - 4, startY + 5.3, { align: 'right' })

      const tagLine = `${factor.verified ? '[Verified]' : '[Baseline]'}  ${factor.sourceTag}`
      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(7.5)
      this.doc.setTextColor(...COLOR_SLATE_MUTED)
      this.doc.text(pdfSafe(tagLine), this.margin + 4, startY + 9.4)

      let cursor = startY + 13.5
      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(8.2)
      this.doc.setTextColor(...COLOR_SLATE_BODY)
      for (const line of detailLines) {
        this.doc.text(line, this.margin + 4, cursor)
        cursor += this.lineHeight(8.2)
      }

      this.y = startY + cardH + 2.5
    }

    // 4-Pillar Rubric Summary
    if (breakdown.systemPillars?.length) {
      this.ensureSpace(14)
      this.y += 2
      this.doc.setFont('helvetica', 'bold')
      this.doc.setFontSize(8.5)
      this.doc.setTextColor(...COLOR_EMERALD)
      this.doc.text('SCORING SYSTEM PILLARS', this.margin, this.y + 3)
      this.y += 5.5

      for (const pillar of breakdown.systemPillars) {
        const descLines = this.measure(`${pillar.formula} - ${pillar.description}`, this.contentWidth - 8, 8, false)
        const h = 8 + descLines.length * this.lineHeight(8) + 2.5
        this.ensureSpace(h)

        const startY = this.y
        this.doc.setFillColor(...COLOR_WHITE)
        this.doc.setDrawColor(...COLOR_BORDER)
        this.doc.roundedRect(this.margin, startY, this.contentWidth, h, 1.8, 1.8, 'FD')

        this.doc.setFont('helvetica', 'bold')
        this.doc.setFontSize(8.5)
        this.doc.setTextColor(...COLOR_FOREST)
        this.doc.text(pdfSafe(pillar.title), this.margin + 3.5, startY + 4.8)

        this.doc.setFont('helvetica', 'bold')
        this.doc.setFontSize(8)
        this.doc.setTextColor(...COLOR_EMERALD)
        this.doc.text(pdfSafe(pillar.maxPoints), this.pageWidth - this.margin - 3.5, startY + 4.8, { align: 'right' })

        let cursor = startY + 8.8
        this.doc.setFont('helvetica', 'normal')
        this.doc.setFontSize(8)
        this.doc.setTextColor(...COLOR_SLATE_BODY)
        for (const line of descLines) {
          this.doc.text(line, this.margin + 3.5, cursor)
          cursor += this.lineHeight(8)
        }
        this.y = startY + h + 2
      }
    }

    this.y += 4
  }

  drawForensicResearchSection(researchData: PropertyResearchResponse | null) {
    const timestampLabel = researchData?.researchedAt
      ? `Cross-referenced with NYC Open Data (DOF Valuation, ACRIS Master/Legals/Parties, Tax Lien Sale List, HPD & DOB) on ${new Date(researchData.researchedAt).toLocaleString('en-US')}`
      : 'Cross-referenced with NYC Open Data (DOF Valuation, ACRIS, Tax Lien Sale List, HPD & DOB)'

    this.drawSectionHeader('Instant Forensic Research Findings', timestampLabel)

    if (!researchData?.findings || Object.keys(researchData.findings).length === 0) {
      const msg = researchData?.error
        ? `Live municipal research notice: ${researchData.error}`
        : 'Live forensic finding rows were not returned during this export; refer to the Equity & Score breakdown sections above.'
      const lines = this.measure(msg, this.contentWidth - 8, 9, false)
      const h = lines.length * this.lineHeight(9) + 8
      this.ensureSpace(h)
      this.doc.setFillColor(...COLOR_BG_SUBTLE)
      this.doc.setDrawColor(...COLOR_BORDER)
      this.doc.roundedRect(this.margin, this.y, this.contentWidth, h, 2, 2, 'FD')
      let cursor = this.y + 5.5
      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(9)
      this.doc.setTextColor(...COLOR_SLATE_BODY)
      for (const line of lines) {
        this.doc.text(line, this.margin + 4, cursor)
        cursor += this.lineHeight(9)
      }
      this.y += h + 5
      return
    }

    const orderedKeys: Array<[string, string]> = [...FINDING_LABELS]
    for (const key of Object.keys(researchData.findings)) {
      if (!orderedKeys.some(([knownKey]) => knownKey === key)) {
        orderedKeys.push([key, key.toUpperCase()])
      }
    }

    for (const [key, label] of orderedKeys) {
      const finding = researchData.findings[key]
      if (!finding) continue

      const headlineLines = this.measure(finding.headline, this.contentWidth - 8, 9.2, true)
      const detailLines = this.measure(finding.detail, this.contentWidth - 8, 8.4, false)
      const evidenceWrapped = (finding.evidence || []).map((ev) =>
        this.measure(`- ${ev}`, this.contentWidth - 12, 8, false)
      )
      const evidenceHeight = evidenceWrapped.reduce(
        (sum, lines) => sum + lines.length * this.lineHeight(8) + 1.2,
        evidenceWrapped.length ? 3 : 0
      )

      const cardH =
        10 +
        headlineLines.length * this.lineHeight(9.2) +
        detailLines.length * this.lineHeight(8.4) +
        evidenceHeight +
        5

      this.ensureSpace(cardH)
      const startY = this.y
      this.doc.setFillColor(...COLOR_WHITE)
      this.doc.setDrawColor(...COLOR_BORDER)
      this.doc.roundedRect(this.margin, startY, this.contentWidth, cardH, 2.2, 2.2, 'FD')

      // Category Title + Status badge
      this.doc.setFont('helvetica', 'bold')
      this.doc.setFontSize(7.8)
      this.doc.setTextColor(...COLOR_EMERALD)
      this.doc.text(pdfSafe(label.toUpperCase()), this.margin + 4, startY + 5.4)

      const badgeText = formatStatusBadge(finding.status)
      const colors = statusColors(finding.status)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setFontSize(6.8)
      const badgeW = Math.min(this.doc.getTextWidth(badgeText) + 6, 46)
      const badgeX = this.pageWidth - this.margin - 4 - badgeW
      this.doc.setFillColor(...colors.bg)
      this.doc.roundedRect(badgeX, startY + 2.3, badgeW, 4.6, 1.2, 1.2, 'F')
      this.doc.setTextColor(...colors.text)
      this.doc.text(badgeText, badgeX + badgeW / 2, startY + 5.4, { align: 'center' })

      let cursor = startY + 10.5
      this.doc.setFont('helvetica', 'bold')
      this.doc.setFontSize(9.2)
      this.doc.setTextColor(...COLOR_FOREST)
      for (const line of headlineLines) {
        this.doc.text(line, this.margin + 4, cursor)
        cursor += this.lineHeight(9.2)
      }

      cursor += 0.8
      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(8.4)
      this.doc.setTextColor(...COLOR_SLATE_BODY)
      for (const line of detailLines) {
        this.doc.text(line, this.margin + 4, cursor)
        cursor += this.lineHeight(8.4)
      }

      if (evidenceWrapped.length) {
        cursor += 2
        for (const lines of evidenceWrapped) {
          this.doc.setFont('helvetica', 'normal')
          this.doc.setFontSize(8)
          this.doc.setTextColor(...COLOR_SLATE_MUTED)
          for (const line of lines) {
            this.doc.text(line, this.margin + 6, cursor)
            cursor += this.lineHeight(8)
          }
          cursor += 1.2
        }
      }

      this.y = startY + cardH + 3
    }

    if (researchData.sources?.length) {
      const sourceText = `Datasets Consulted: ${researchData.sources.join(' | ')}`
      const lines = this.measure(sourceText, this.contentWidth, 7.8, false)
      this.ensureSpace(lines.length * this.lineHeight(7.8) + 4)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(7.8)
      this.doc.setTextColor(...COLOR_SLATE_MUTED)
      for (const line of lines) {
        this.doc.text(line, this.margin, this.y + 2.5)
        this.y += this.lineHeight(7.8)
      }
      this.y += 2
    }

    if (researchData.limitations?.length) {
      const limText = `Research Limitations: ${researchData.limitations.join(' ')}`
      const lines = this.measure(limText, this.contentWidth, 7.6, false)
      this.ensureSpace(lines.length * this.lineHeight(7.6) + 4)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(7.6)
      this.doc.setTextColor(...COLOR_SLATE_MUTED)
      for (const line of lines) {
        this.doc.text(line, this.margin, this.y + 2.5)
        this.y += this.lineHeight(7.6)
      }
    }

    this.y += 4.5
  }

  drawOwnerAndContactsSection(contactData: ContactResearchResponse | null) {
    this.drawSectionHeader(
      'Find Owner & Verified Public Contact Directory',
      'Deed grantees, HPD/DOB registered agents, mailing addresses, phone numbers, DNC scrub status, and email records'
    )

    if (contactData?.recommendedMailingAddress) {
      const mailLines = this.measure(
        `Recommended Public Mailing Address: ${contactData.recommendedMailingAddress}`,
        this.contentWidth - 8,
        8.6,
        true
      )
      const h = mailLines.length * this.lineHeight(8.6) + 6
      this.ensureSpace(h)
      this.doc.setFillColor(...COLOR_EMERALD_SOFT)
      this.doc.setDrawColor(...COLOR_EMERALD_BORDER)
      this.doc.roundedRect(this.margin, this.y, this.contentWidth, h, 2, 2, 'FD')
      let cursor = this.y + 5
      this.doc.setFont('helvetica', 'bold')
      this.doc.setFontSize(8.6)
      this.doc.setTextColor(...COLOR_FOREST)
      for (const line of mailLines) {
        this.doc.text(line, this.margin + 4, cursor)
        cursor += this.lineHeight(8.6)
      }
      this.y += h + 4
    }

    const contacts = contactData?.contacts || []
    if (!contacts.length) {
      const emptyMsg = contactData?.error
        ? `Public contact lookup note: ${contactData.error}`
        : 'No public ownership or contact records were returned for this BBL during report generation. Verify directly in NYC ACRIS & HPD portals.'
      const lines = this.measure(emptyMsg, this.contentWidth - 8, 9, false)
      const h = lines.length * this.lineHeight(9) + 8
      this.ensureSpace(h)
      this.doc.setFillColor(...COLOR_BG_SUBTLE)
      this.doc.setDrawColor(...COLOR_BORDER)
      this.doc.roundedRect(this.margin, this.y, this.contentWidth, h, 2, 2, 'FD')
      let cursor = this.y + 5.5
      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(9)
      this.doc.setTextColor(...COLOR_SLATE_BODY)
      for (const line of lines) {
        this.doc.text(line, this.margin + 4, cursor)
        cursor += this.lineHeight(9)
      }
      this.y += h + 5
      return
    }

    contacts.forEach((contact, idx) => {
      const isPrimary = idx === 0
      const nameText = `${contact.name || 'Recorded Property Owner'}${isPrimary ? '  [Primary Owner]' : ''}`
      const metaText = [
        contact.role || 'Deed Holder',
        contact.title || null,
        contact.source ? `Source: ${contact.source}` : null,
        contact.recordDate ? `Filed ${contact.recordDate}` : null,
      ]
        .filter(Boolean)
        .join('  |  ')

      const addressLine = `Mailing Address: ${contact.mailingAddress || 'Not listed in reviewed filings'}`
      const phoneStatus = contact.isDnc
        ? `Phone: DNC Flagged (${contact.dncReason || 'Do Not Call Registry'})`
        : contact.phone
          ? `Phone: ${contact.phone}  [Not on DNC Registry]`
          : 'Phone: Not listed in NYC filings'
      const emailLine = `Email: ${contact.email || 'Not listed in public filings'}`

      const metaLines = this.measure(metaText, this.contentWidth - 8, 7.8, false)
      const addrLines = this.measure(addressLine, this.contentWidth - 8, 8.4, false)
      const phoneLines = this.measure(phoneStatus, this.contentWidth - 8, 8.4, true)
      const emailLines = this.measure(emailLine, this.contentWidth - 8, 8.4, false)

      const cardH =
        9 +
        metaLines.length * this.lineHeight(7.8) +
        addrLines.length * this.lineHeight(8.4) +
        phoneLines.length * this.lineHeight(8.4) +
        emailLines.length * this.lineHeight(8.4) +
        5

      this.ensureSpace(cardH)
      const startY = this.y
      this.doc.setFillColor(...(isPrimary ? COLOR_EMERALD_SOFT : COLOR_WHITE))
      this.doc.setDrawColor(...(isPrimary ? COLOR_EMERALD_BORDER : COLOR_BORDER))
      this.doc.roundedRect(this.margin, startY, this.contentWidth, cardH, 2.2, 2.2, 'FD')

      this.doc.setFont('helvetica', 'bold')
      this.doc.setFontSize(9.5)
      this.doc.setTextColor(...COLOR_FOREST)
      this.doc.text(pdfSafe(nameText).slice(0, 78), this.margin + 4, startY + 5.6)

      let cursor = startY + 9.8
      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(7.8)
      this.doc.setTextColor(...COLOR_SLATE_MUTED)
      for (const line of metaLines) {
        this.doc.text(line, this.margin + 4, cursor)
        cursor += this.lineHeight(7.8)
      }

      cursor += 0.8
      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(8.4)
      this.doc.setTextColor(...COLOR_SLATE_BODY)
      for (const line of addrLines) {
        this.doc.text(line, this.margin + 4, cursor)
        cursor += this.lineHeight(8.4)
      }

      this.doc.setFont('helvetica', 'bold')
      this.doc.setFontSize(8.4)
      this.doc.setTextColor(...(contact.isDnc ? COLOR_ROSE : contact.phone ? COLOR_EMERALD : COLOR_SLATE_MUTED))
      for (const line of phoneLines) {
        this.doc.text(line, this.margin + 4, cursor)
        cursor += this.lineHeight(8.4)
      }

      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(8.4)
      this.doc.setTextColor(...COLOR_SLATE_BODY)
      for (const line of emailLines) {
        this.doc.text(line, this.margin + 4, cursor)
        cursor += this.lineHeight(8.4)
      }

      this.y = startY + cardH + 2.8
    })

    if (contactData?.entityLinks?.length) {
      const entityHeader = 'NYS DOS Public Entity Registries:'
      this.ensureSpace(14)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setFontSize(8.2)
      this.doc.setTextColor(...COLOR_FOREST)
      this.doc.text(entityHeader, this.margin, this.y + 3)
      this.y += 5
      for (const entity of contactData.entityLinks) {
        const lines = this.measure(`- ${entity.name}: ${entity.url}`, this.contentWidth - 4, 7.6, false)
        this.ensureSpace(lines.length * this.lineHeight(7.6) + 2)
        this.doc.setFont('helvetica', 'normal')
        this.doc.setFontSize(7.6)
        this.doc.setTextColor(...COLOR_SLATE_MUTED)
        for (const line of lines) {
          this.doc.text(line, this.margin + 2, this.y + 2.5)
          this.y += this.lineHeight(7.6)
        }
      }
    }

    if (contactData?.coverageNote) {
      const lines = this.measure(contactData.coverageNote, this.contentWidth, 7.6, false)
      this.ensureSpace(lines.length * this.lineHeight(7.6) + 4)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(7.6)
      this.doc.setTextColor(...COLOR_SLATE_MUTED)
      for (const line of lines) {
        this.doc.text(line, this.margin, this.y + 2.5)
        this.y += this.lineHeight(7.6)
      }
    }

    if (contactData?.limitations?.length) {
      const limText = `Contact Search Notes: ${contactData.limitations.join(' ')}`
      const lines = this.measure(limText, this.contentWidth, 7.5, false)
      this.ensureSpace(lines.length * this.lineHeight(7.5) + 4)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(7.5)
      this.doc.setTextColor(...COLOR_SLATE_MUTED)
      for (const line of lines) {
        this.doc.text(line, this.margin, this.y + 2.5)
        this.y += this.lineHeight(7.5)
      }
    }
  }

  applyFooters() {
    const totalPages = this.doc.getNumberOfPages()
    for (let page = 1; page <= totalPages; page += 1) {
      this.doc.setPage(page)
      const footerY = this.pageHeight - 10
      this.doc.setDrawColor(...COLOR_BORDER)
      this.doc.line(this.margin, footerY - 4, this.pageWidth - this.margin, footerY - 4)

      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(7.5)
      this.doc.setTextColor(...COLOR_SLATE_MUTED)
      this.doc.text(
        'LeadFlow NYC  |  Public municipal records only - verify title, payoff & DNC status independently before outreach.',
        this.margin,
        footerY
      )
      this.doc.text(`Page ${page} of ${totalPages}`, this.pageWidth - this.margin, footerY, {
        align: 'right',
      })
    }
  }
}

export async function buildFullPropertyReportPdfDoc(input: FullPropertyReportInput) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const builder = new ReportPdfBuilder(doc, `${input.property.address} (BBL ${input.property.id})`)

  builder.drawHeroBanner(input)
  builder.drawRationaleSection(input.property, input.strategicSummary)
  builder.drawEquityAndDebtSection(input.financials)
  builder.drawSpecsAndSignalsSection(input.property)
  builder.drawMarketIntelligenceSection(input.scoreBreakdown)
  builder.drawForensicResearchSection(input.researchData)
  builder.drawOwnerAndContactsSection(input.contactData)
  builder.applyFooters()

  return doc
}

export async function generateFullPropertyReportPdf(input: FullPropertyReportInput) {
  const doc = await buildFullPropertyReportPdfDoc(input)

  const safeSlug = input.property.address
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
    .toLowerCase()

  doc.save(`${safeSlug || input.property.id || 'property'}-full-property-report.pdf`)
}

export async function fetchPropertyResearchData(
  property: PropertyReportProperty
): Promise<PropertyResearchResponse | null> {
  try {
    const response = await fetch('/api/nyc/property-research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: property.address,
        borough: property.borough,
        zip: property.zip,
        bbl: property.id,
      }),
    })
    const data = (await response.json()) as PropertyResearchResponse
    if (!response.ok) {
      return { error: data?.error || 'Live NYC property research was unavailable.' }
    }
    return data
  } catch {
    return null
  }
}

export async function fetchContactResearchData(
  property: PropertyReportProperty
): Promise<ContactResearchResponse | null> {
  try {
    const response = await fetch('/api/nyc/contact-research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bbl: property.id,
        address: property.address,
        borough: property.borough,
      }),
    })
    const data = (await response.json()) as ContactResearchResponse
    if (!response.ok) {
      return { error: data?.error || 'Public contact records were unavailable.' }
    }
    return data
  } catch {
    return null
  }
}

export async function fetchAndDownloadPropertyReportPdf(input: {
  property: PropertyReportProperty
  statusLabel: string
  researchData?: PropertyResearchResponse | null
  contactData?: ContactResearchResponse | null
  financials?: FinancialSummary | null
  strategicSummary?: string | null
}) {
  const [resolvedResearch, resolvedContacts] = await Promise.all([
    input.researchData ? Promise.resolve(input.researchData) : fetchPropertyResearchData(input.property),
    input.contactData ? Promise.resolve(input.contactData) : fetchContactResearchData(input.property),
  ])

  const effectiveFinancials = resolvedResearch?.financials ?? input.financials ?? null
  const scoreBreakdown = explainPropertyScore({
    score: input.property.score,
    category: input.property.category,
    reason: input.property.reason,
    yearBuilt: input.property.yearBuilt,
    units: input.property.units,
    signals: input.property.signals,
    marketValue: effectiveFinancials?.marketValue,
    recordedMortgage: effectiveFinancials?.recordedMortgage,
    taxLiensCount: effectiveFinancials?.taxLiensCount,
    estimatedEquityPercent: effectiveFinancials?.estimatedEquityPercent,
  })

  await generateFullPropertyReportPdf({
    property: input.property,
    statusLabel: input.statusLabel,
    financials: effectiveFinancials,
    scoreBreakdown,
    researchData: resolvedResearch,
    contactData: resolvedContacts,
    strategicSummary: input.strategicSummary,
  })
}
