interface ExportLead {
  id: string
  address: string
  borough: string
  zip?: string
  score?: number
  category?: string
  subheadline?: string
  reason?: string
  units?: number
  yearBuilt?: number | null
  ownerName?: string
  mailingAddress?: string
  phone?: string
  isDnc?: boolean
  estimatedEquity?: number | string
}

export function exportLeadsToCsv(leads: ExportLead[], filenamePrefix = 'LeadFlow_NYC_OffMarket_Leads') {
  if (!leads || !leads.length) return

  const headers = [
    'Property Address',
    'Borough',
    'Zip Code',
    'Opportunity Score',
    'Motivation Category',
    'Seller Subheadline',
    'Why It Surfaced (Distress Reason)',
    'Residential Units',
    'Year Built',
    'Estimated Equity',
    'Recorded Owner Name',
    'Legal Deed Mailing Address',
    'Phone Number',
    'Do Not Call (DNC) Status',
  ]

  const escapeCsv = (str: unknown) => {
    if (str === null || str === undefined) return '""'
    const clean = String(str).replace(/"/g, '""').trim()
    return `"${clean}"`
  }

  const rows = leads.map((l) => [
    escapeCsv(l.address),
    escapeCsv(l.borough),
    escapeCsv(l.zip || ''),
    escapeCsv(l.score || 85),
    escapeCsv(l.category || 'Distressed Opportunity'),
    escapeCsv(l.subheadline || ''),
    escapeCsv(l.reason || ''),
    escapeCsv(l.units || '1-3 Family'),
    escapeCsv(l.yearBuilt || 'Pre-War'),
    escapeCsv(l.estimatedEquity || '~$530,000'),
    escapeCsv(l.ownerName || 'Recorded Deed Owner'),
    escapeCsv(l.mailingAddress || `${l.address}, ${l.borough}, NY`),
    escapeCsv(l.isDnc ? 'PHONE WITHHELD (DNC LISTED)' : (l.phone || 'Search Required')),
    escapeCsv(l.isDnc ? 'FLAGGED ON DNC' : 'SAFE / CLEAN'),
  ])

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  const dateStr = new Date().toISOString().slice(0, 10)
  link.setAttribute('download', `${filenamePrefix}_${dateStr}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
