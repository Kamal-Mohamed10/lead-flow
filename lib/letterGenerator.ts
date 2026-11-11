import jsPDF from 'jspdf'

interface LetterParams {
  ownerName: string
  propertyAddress: string
  borough: string
  mailingAddress?: string | null
  category?: string
  categoryNumber?: number
  agentName?: string
  agentPhone?: string
  agentEmail?: string
}

export function generateMotivationLetter({
  ownerName,
  propertyAddress,
  borough,
  mailingAddress,
  category = 'Pre-foreclosure',
  agentName = 'Licensed Real Estate Specialist',
  agentPhone = '(212) 555-0199',
  agentEmail = 'agent@leadflownyc.com',
}: LetterParams) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 22
  let y = 28

  const writeText = (text: string, size = 11, bold = false, color: [number, number, number] = [30, 41, 59]) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(text, pageWidth - margin * 2) as string[]
    for (const line of lines) {
      if (y > 270) {
        doc.addPage()
        y = 25
      }
      doc.text(line, margin, y)
      y += size * 0.48
    }
  }

  // Header / Agent details
  writeText('PRIVATE & CONFIDENTIAL ADVISORY', 9, true, [23, 107, 77])
  y += 2
  writeText(agentName, 13, true, [23, 43, 42])
  writeText(`Direct Line: ${agentPhone}  |  Email: ${agentEmail}`, 9, false, [100, 116, 139])
  writeText(`New York City Off-Market Acquisitions & Advisory`, 9, false, [100, 116, 139])
  
  y += 6
  // Horizontal divider
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageWidth - margin, y)
  y += 8

  // Date & Recipient
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  writeText(today, 10, false, [100, 116, 139])
  y += 4

  writeText(ownerName || 'Property Owner of Record', 11, true, [15, 23, 42])
  if (mailingAddress && mailingAddress !== propertyAddress) {
    writeText(mailingAddress, 10, false, [71, 85, 105])
  } else {
    writeText(`${propertyAddress}, ${borough}, NY`, 10, false, [71, 85, 105])
  }
  y += 6

  // Subject line
  writeText(`RE: Private Consultation Regarding ${propertyAddress}, ${borough}`, 11, true, [23, 43, 42])
  y += 5

  // Salutation
  writeText(`Dear ${ownerName ? ownerName.split(' ')[0] : 'Property Owner'},`, 11, false)
  y += 3

  // Body content customized by Motivation Category
  const catLower = category.toLowerCase()

  if (catLower.includes('foreclosure') || catLower.includes('short sale') || catLower.includes('pre-foreclosure')) {
    writeText(
      `I am writing to you regarding your property at ${propertyAddress}. According to recent public records published by the City of New York, a pre-auction or mortgage milestone was recently logged concerning this parcel.`,
      11
    )
    y += 3
    writeText(
      `Please understand that I am not reaching out to pressure you into a quick, discounted auction sale. In fact, many property owners facing public timelines have multiple legal and financial paths to preserve their equity or negotiate favorable terms with lenders before any auction date.`,
      11
    )
    y += 3
    writeText(
      `Our advisory team works directly with qualified private buyers and equity partners who can evaluate your situation confidentially. We can help you examine whether an off-market private cash purchase, loan modification consultation, or private equity buyout best protects your financial interests.`,
      11
    )
  } else if (catLower.includes('estate') || catLower.includes('probate')) {
    writeText(
      `I hope this letter finds you well. I am reaching out regarding the property located at ${propertyAddress}. In reviewing recent city records and estate filings, I understand that you or your family may currently be overseeing estate affairs concerning this property.`,
      11
    )
    y += 3
    writeText(
      `Managing real estate through probate or estate administration in New York City can be complex, especially when balancing ongoing municipal taxes, building upkeep, and beneficiary timelines.`,
      11
    )
    y += 3
    writeText(
      `If your family is considering liquidating or evaluating the property, we specialize in seamless, as-is off-market purchases where you pay zero clean-out costs, no broker commissions, and can select your exact closing timeline.`,
      11
    )
  } else if (catLower.includes('tax') || catLower.includes('delinquent')) {
    writeText(
      `I am writing to you directly regarding ${propertyAddress}. During a recent review of public municipal tax rolls and city notice registries, this property was identified with recorded municipal lien notices.`,
      11
    )
    y += 3
    writeText(
      `Many NYC owners are surprised by the compounding interest rates attached to municipal lien lists. Before fees escalate or the city initiates third-party enforcement, you have viable options to extract your accrued equity or arrange an off-market settlement.`,
      11
    )
    y += 3
    writeText(
      `We can provide you with an exact equity calculation, pay all outstanding city liens at closing, and release cash directly to you without requiring any repairs or open-house showings.`,
      11
    )
  } else if (catLower.includes('vacant') || catLower.includes('expired')) {
    writeText(
      `I am writing to inquire about your property at ${propertyAddress}. In reviewing municipal occupancy records and Department of Buildings records, we noted this property may currently be vacant, under-utilized, or recently off the active market.`,
      11
    )
    y += 3
    writeText(
      `Vacant properties in New York City frequently incur rising property taxes, insurance surcharges, and municipal inspection exposure. If managing this asset has become burdensome, we have private buyers actively seeking off-market acquisitions in ${borough}.`,
      11
    )
    y += 3
    writeText(
      `We purchase properties in 100% "as-is" condition with zero contingencies, meaning you do not have to perform repairs or clear DOB/HPD violations prior to sale.`,
      11
    )
  } else {
    writeText(
      `I am contacting you regarding your property at ${propertyAddress}. Our private acquisitions group is actively looking for properties in ${borough} on behalf of qualified local buyers.`,
      11
    )
    y += 3
    writeText(
      `If you have ever considered selling or would simply like to know what your property could command off-market—without publicly listing on the MLS, paying staging costs, or hosting public open houses—we would welcome an informal conversation.`,
      11
    )
  }

  y += 4
  writeText(`Our Promise to You:`, 11, true, [23, 43, 42])
  y += 1
  writeText(`• 100% Confidential: No signage, no public MLS listing, no neighbors walking through.`, 10, false, [51, 65, 85])
  y += 1
  writeText(`• Zero Repairs Needed: Buy "as-is", leaving any unwanted contents or repairs behind.`, 10, false, [51, 65, 85])
  y += 1
  writeText(`• Flexible Closing: Close in as few as 14 days or take several months—on your timeline.`, 10, false, [51, 65, 85])

  y += 5
  writeText(
    `If you would be open to a brief, five-minute introductory call, please feel free to reach me directly on my cell at ${agentPhone} or email me at ${agentEmail}. There is zero obligation whatsoever.`,
    11
  )

  y += 6
  writeText(`Sincerely,`, 11, false)
  y += 4
  writeText(agentName, 11, true, [23, 43, 42])
  writeText(`New York City Real Estate Advisory`, 10, false, [100, 116, 139])

  // Footer note
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text(
    'This letter is an informational business inquiry and does not constitute legal, tax, or mortgage counseling.',
    margin,
    285
  )

  const cleanAddr = propertyAddress.replace(/[^a-zA-Z0-9]/g, '_')
  doc.save(`Direct_Mail_Letter_${cleanAddr}.pdf`)
}
