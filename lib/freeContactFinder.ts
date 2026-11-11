/**
 * Free Public Directory Contact Scraper & Search Assistant
 * Queries public search engines (DuckDuckGo HTML / public search APIs)
 * for an owner name and NYC property address to find free public contact candidates.
 */

interface CandidateContact {
  name: string
  phone: string | null
  email: string | null
  source: string
  snippet?: string
}

export async function fetchFreePublicContacts(ownerName: string, address: string, borough: string): Promise<CandidateContact[]> {
  if (!ownerName || ownerName.length < 3) return []

  // Check if owner is an institutional/government entity where phone scraping is irrelevant
  if (/CITY OF NEW YORK|HOUSING AUTHORITY|DEPT OF|STATE OF NY|USA/i.test(ownerName)) {
    return []
  }

  const results: CandidateContact[] = []

  try {
    const cleanOwner = ownerName.replace(/[^a-zA-Z0-9 ]/g, '').trim()
    const query = encodeURIComponent(`"${cleanOwner}" "${address}" phone OR contact OR email`)
    
    // Query DuckDuckGo HTML endpoint without requiring any paid API keys
    const response = await fetch(`https://html.duckduckgo.com/html/?q=${query}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(6000),
      cache: 'no-store',
    })

    if (!response.ok) return []

    const html = await response.text()

    // Regular expressions for standard North American phone numbers
    // Matches formats: (212) 555-1234, 212-555-1234, 212.555.1234, +1 212 555 1234
    const phoneRegex = /(?:\+?1[-. ]?)?\(?([2-9][0-8][0-9])\)?[-. ]?([2-9][0-9]{2})[-. ]?([0-9]{4})/g
    // Regular expression for email addresses
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g

    const foundPhones = new Set<string>()
    const foundEmails = new Set<string>()

    let phoneMatch
    while ((phoneMatch = phoneRegex.exec(html)) !== null) {
      const fullPhone = phoneMatch[0].trim()
      // Filter out common false positives like dates, years, or generic support numbers
      const digitsOnly = fullPhone.replace(/\D/g, '')
      if (digitsOnly.length === 10 || (digitsOnly.length === 11 && digitsOnly.startsWith('1'))) {
        const areaCode = digitsOnly.length === 11 ? digitsOnly.slice(1, 4) : digitsOnly.slice(0, 3)
        // Standard NYC / NY metropolitan area codes: 212, 718, 917, 347, 646, 929, 516, 914, etc.
        const nyAreaCodes = ['212', '718', '917', '347', '646', '929', '516', '914', '845', '201', '551', '908', '732']
        if (nyAreaCodes.includes(areaCode) || !foundPhones.size) {
          const formatted = `(${areaCode}) ${digitsOnly.slice(-7, -4)}-${digitsOnly.slice(-4)}`
          foundPhones.add(formatted)
        }
      }
    }

    let emailMatch
    while ((emailMatch = emailRegex.exec(html)) !== null) {
      const email = emailMatch[1].toLowerCase()
      // Skip common bot/search engine/asset emails
      if (!email.includes('duckduckgo') && !email.includes('sentry') && !email.includes('example') && !email.includes('schema.org')) {
        foundEmails.add(email)
      }
    }

    const phoneList = Array.from(foundPhones).slice(0, 2)
    const emailList = Array.from(foundEmails).slice(0, 1)

    if (phoneList.length || emailList.length) {
      phoneList.forEach((phone) => {
        results.push({
          name: cleanOwner,
          phone,
          email: emailList[0] || null,
          source: 'Public Web Search Directory',
          snippet: `Found associated with ${address}, ${borough}`,
        })
      })
    }
  } catch (err) {
    // Gracefully handle timeout or search block
    console.warn('Public contact search skipped or timed out:', err)
  }

  return results
}
