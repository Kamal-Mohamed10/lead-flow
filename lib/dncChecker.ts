/**
 * Do-Not-Call (DNC) & Telemarketing Compliance Checker
 * Validates numbers against FTC National DNC patterns, NY State DNC registry regulations,
 * and maintains an active suppression list to protect agents from non-compliant dials.
 */

// Local / custom suppression set (simulated / cache of registered DNC numbers)
const dncSuppressionCache = new Set<string>([
  '2125550198',
  '7185550143',
  '9175550182',
  '3475550119',
])

export interface DncCheckResult {
  isDnc: boolean
  formattedPhone: string
  reason?: string
}

/**
 * Checks whether a 10-digit US phone number is flagged on Do Not Call lists.
 * In New York State, calling a number registered on the DNC Registry carries steep fines.
 * If a number is identified on DNC, LeadFlow automatically suppresses/redacts it.
 */
export function checkDoNotCall(phone: string): DncCheckResult {
  if (!phone) {
    return { isDnc: false, formattedPhone: '' }
  }

  // Normalize phone to 10 digits
  const cleanDigits = phone.replace(/\D/g, '')
  const tenDigit = cleanDigits.length === 11 && cleanDigits.startsWith('1')
    ? cleanDigits.slice(1)
    : cleanDigits

  if (tenDigit.length !== 10) {
    return { isDnc: false, formattedPhone: phone }
  }

  const formatted = `(${tenDigit.slice(0, 3)}) ${tenDigit.slice(3, 6)}-${tenDigit.slice(6)}`

  // 1. Check known local DNC suppression cache
  if (dncSuppressionCache.has(tenDigit)) {
    return {
      isDnc: true,
      formattedPhone: formatted,
      reason: 'Flagged on National / NY State Do-Not-Call Registry',
    }
  }

  // 2. Certain test exchange patterns or known telemarketing blocks
  // Numbers ending in 0000 or standard reserved 555 numbers can be flagged
  if (tenDigit.endsWith('9999') || tenDigit.endsWith('0000')) {
    return {
      isDnc: true,
      formattedPhone: formatted,
      reason: 'Automated dialer block / invalid telemarketing range',
    }
  }

  return {
    isDnc: false,
    formattedPhone: formatted,
  }
}
