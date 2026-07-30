// ============================================================
// Nepali Calendar (Bikram Sambat) Utility
// Authoritative source for ALL date operations in this system.
// Stores: AD ISO dates in DB (portable)
// Displays: BS dates everywhere (per Nepal business practice)
// Fiscal Year: Shrawan 1 → Asar end (mid-July → mid-July)
// ============================================================

// Days in each BS month for years 2000–2090
// Source: nepali-date-converter npm package (authoritative Nepal Panchang data)
// Index: [year-2000] -> [12 months starting Baisakh]
// Each row: [Baisakh, Jestha, Ashar, Shrawan, Bhadra, Ashwin, Kartik, Mangsir, Poush, Magh, Falgun, Chaitra]
const BS_MONTH_DAYS: Record<number, number[]> = {
  2000: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2001: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2002: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2003: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2004: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2005: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2006: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2007: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2008: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2009: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2010: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2011: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2012: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2013: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2014: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2015: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2016: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2017: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2018: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2019: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2020: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2021: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2022: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2023: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2024: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2025: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2026: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2027: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2028: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2029: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
  2030: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2031: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2032: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2033: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2034: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2035: [30, 32, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2036: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2037: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2038: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2039: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2040: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2041: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2042: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2043: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2044: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2045: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2046: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2047: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2048: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2049: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2050: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2051: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2052: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2053: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2054: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2055: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2056: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
  2057: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2058: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2059: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2060: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2061: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2062: [30, 32, 31, 32, 31, 31, 29, 30, 29, 30, 29, 31],
  2063: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2064: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2065: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2066: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2067: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2068: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2069: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2070: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2071: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2072: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2073: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2074: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2075: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2076: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2077: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2078: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2079: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2081: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2082: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2083: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2084: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2085: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2086: [30, 32, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2087: [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30],
  2088: [30, 31, 32, 32, 30, 31, 30, 30, 29, 30, 30, 30],
  2089: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2090: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  // 2091-2099: Projected based on patterns (library data not available)
  // These are far-future years; update with authoritative data when available
  2091: [31, 31, 32, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2092: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2093: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2094: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2095: [31, 31, 32, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2096: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2097: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2098: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2099: [31, 31, 32, 32, 31, 30, 30, 30, 29, 30, 30, 30],
}

export const BS_MONTH_NAMES_EN = [
  'Baisakh', 'Jestha', 'Ashar', 'Shrawan', 'Bhadra', 'Ashwin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra',
]

export const BS_MONTH_NAMES_NP = [
  'बैशाख', 'जेठ', 'असार', 'श्रावण', 'भदौ', 'असोज',
  'कार्तिक', 'मंसिर', 'पुष', 'माघ', 'फागुन', 'चैत्र',
]

export const BS_MONTH_NAMES_NP_NUM = [
  '१', '२', '३', '४', '५', '६', '७', '८', '९', '१०', '११', '१२',
]

export const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const WEEKDAYS_NP = ['आइत', 'सोम', 'मंगल', 'बुध', 'बिही', 'शुक्र', 'शनि']

export interface BSDate {
  year: number
  month: number // 1-12 (Baisakh = 1)
  day: number // 1-32
  weekday: number // 0-6 (0 = Sunday)
}

const MIN_BS_YEAR = 2000
const MAX_BS_YEAR = 2099

function getDaysInBsMonth(year: number, month: number): number {
  const yearData = BS_MONTH_DAYS[year]
  if (!yearData) {
    throw new Error(`BS year ${year} out of supported range (${MIN_BS_YEAR}-${MAX_BS_YEAR})`)
  }
  return yearData[month - 1]
}

function getTotalDaysFromBsStart(year: number, month: number, day: number): number {
  // Count total days from BS year 2000, Baisakh 1
  let total = 0
  for (let y = MIN_BS_YEAR; y < year; y++) {
    const yearData = BS_MONTH_DAYS[y]
    if (!yearData) continue
    total += yearData.reduce((a, b) => a + b, 0)
  }
  for (let m = 1; m < month; m++) {
    total += getDaysInBsMonth(year, m)
  }
  total += day - 1
  return total
}

// BS 2000-01-01 corresponds to AD 1943-04-14
const BS_EPOCH_AD = new Date(1943, 3, 14) // month is 0-indexed

export function bsToAd(bsYear: number, bsMonth: number, bsDay: number): Date {
  if (bsYear < MIN_BS_YEAR || bsYear > MAX_BS_YEAR) {
    throw new Error(`BS year ${bsYear} out of supported range (${MIN_BS_YEAR}-${MAX_BS_YEAR})`)
  }
  if (bsMonth < 1 || bsMonth > 12) {
    throw new Error(`BS month ${bsMonth} out of range (1-12)`)
  }
  const daysInMonth = getDaysInBsMonth(bsYear, bsMonth)
  if (bsDay < 1 || bsDay > daysInMonth) {
    throw new Error(`BS day ${bsDay} out of range for ${bsYear}/${bsMonth} (1-${daysInMonth})`)
  }

  const totalDays = getTotalDaysFromBsStart(bsYear, bsMonth, bsDay)
  const result = new Date(BS_EPOCH_AD)
  result.setDate(result.getDate() + totalDays)
  return result
}

export function adToBs(date: Date): BSDate {
  // Strip time portion to avoid DST issues
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  // Binary search for the BS date — compute total days from BS epoch
  const epoch = new Date(BS_EPOCH_AD.getFullYear(), BS_EPOCH_AD.getMonth(), BS_EPOCH_AD.getDate())
  const diffMs = target.getTime() - epoch.getTime()
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (totalDays < 0) {
    throw new Error('Date is before BS calendar support range (before BS 2000)')
  }

  // Walk through years and months to find the BS date
  let remaining = totalDays
  let year = MIN_BS_YEAR
  while (year <= MAX_BS_YEAR) {
    const yearDays = BS_MONTH_DAYS[year].reduce((a, b) => a + b, 0)
    if (remaining < yearDays) break
    remaining -= yearDays
    year++
  }

  if (year > MAX_BS_YEAR) {
    throw new Error('Date is after BS calendar support range (after BS 2099)')
  }

  let month = 1
  while (month <= 12) {
    const monthDays = getDaysInBsMonth(year, month)
    if (remaining < monthDays) break
    remaining -= monthDays
    month++
  }

  const day = remaining + 1
  // weekday: 0 = Sunday
  const weekday = target.getDay()

  return { year, month, day, weekday }
}

// ============================================================
// String <-> BSDate helpers
// ============================================================

export function parseBsDate(bsStr: string): BSDate {
  // Accepts "2082-04-15" or "2082/04/15"
  const parts = bsStr.split(/[-/]/).map(Number)
  if (parts.length !== 3) throw new Error(`Invalid BS date: ${bsStr}`)
  return { year: parts[0], month: parts[1], day: parts[2], weekday: 0 }
}

export function formatBsDate(bs: BSDate, format: 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'LONG_EN' | 'LONG_NP' = 'YYYY-MM-DD'): string {
  const monthNameEn = BS_MONTH_NAMES_EN[bs.month - 1]
  const monthNameNp = BS_MONTH_NAMES_NP[bs.month - 1]
  switch (format) {
    case 'YYYY-MM-DD':
      return `${bs.year}-${String(bs.month).padStart(2, '0')}-${String(bs.day).padStart(2, '0')}`
    case 'DD/MM/YYYY':
      return `${String(bs.day).padStart(2, '0')}/${String(bs.month).padStart(2, '0')}/${bs.year}`
    case 'LONG_EN':
      return `${monthNameEn} ${bs.day}, ${bs.year}`
    case 'LONG_NP':
      return `${bs.day} ${monthNameNp}, ${bs.year}`
    default:
      return `${bs.year}-${String(bs.month).padStart(2, '0')}-${String(bs.day).padStart(2, '0')}`
  }
}

// Convert AD Date -> BS string ("2082-04-15")
export function adToBsString(date: Date): string {
  return formatBsDate(adToBs(date))
}

// Convert BS string -> AD Date
export function bsStringToAd(bsStr: string): Date {
  const bs = parseBsDate(bsStr)
  return bsToAd(bs.year, bs.month, bs.day)
}

// Today as BS string
export function todayBsString(): string {
  return adToBsString(new Date())
}

// ============================================================
// Fiscal Year (Shrawan 1 -> Asar end)
// ============================================================

export interface FiscalYear {
  label: string     // "2082/83"
  bsYearStart: number
  bsYearEnd: number
  startBs: string   // "2082-04-01" (Shrawan 1)
  endBs: string     // "2083-03-32" (Asar end — last day)
  startAd: Date
  endAd: Date
}

export function getFiscalYear(date: Date): FiscalYear {
  const bs = adToBs(date)
  // FY starts on Shrawan (month 4). If current BS month < 4, we're in FY starting previous BS year.
  const fyStartBsYear = bs.month < 4 ? bs.year - 1 : bs.year
  const fyEndBsYear = fyStartBsYear + 1

  const startBs = `${fyStartBsYear}-04-01`
  const endBsDay = getDaysInBsMonth(fyEndBsYear, 3) // Asar (month 3) last day
  const endBs = `${fyEndBsYear}-03-${String(endBsDay).padStart(2, '0')}`

  const startAd = bsStringToAd(startBs)
  const endAd = bsStringToAd(endBs)

  const label = `${fyStartBsYear}/${String(fyEndBsYear).slice(-2)}`

  return {
    label,
    bsYearStart: fyStartBsYear,
    bsYearEnd: fyEndBsYear,
    startBs,
    endBs,
    startAd,
    endAd,
  }
}

// Fiscal Year from label "2082/83" or "2082-83"
export function parseFiscalYearLabel(label: string): FiscalYear {
  const match = label.match(/^(\d{4})[/-](\d{2,4})$/)
  if (!match) throw new Error(`Invalid FY label: ${label}`)
  const fyStartBsYear = parseInt(match[1], 10)
  let fyEndBsYear = parseInt(match[2], 10)
  if (fyEndBsYear < 100) fyEndBsYear = fyStartBsYear + 1

  const startBs = `${fyStartBsYear}-04-01`
  const endBsDay = getDaysInBsMonth(fyEndBsYear, 3)
  const endBs = `${fyEndBsYear}-03-${String(endBsDay).padStart(2, '0')}`
  const startAd = bsStringToAd(startBs)
  const endAd = bsStringToAd(endBs)

  return {
    label,
    bsYearStart: fyStartBsYear,
    bsYearEnd: fyEndBsYear,
    startBs,
    endBs,
    startAd,
    endAd,
  }
}

// ============================================================
// BS Month arithmetic
// ============================================================

export function addBsMonths(bsStr: string, months: number): string {
  const bs = parseBsDate(bsStr)
  let totalMonths = bs.year * 12 + (bs.month - 1) + months
  const newYear = Math.floor(totalMonths / 12)
  const newMonth = (totalMonths % 12) + 1
  let newDay = bs.day
  const maxDay = getDaysInBsMonth(newYear, newMonth)
  if (newDay > maxDay) newDay = maxDay
  return formatBsDate({ year: newYear, month: newMonth, day: newDay, weekday: 0 })
}

// Get first and last day of a BS month (as BS strings)
export function bsMonthRange(bsYear: number, bsMonth: number): { startBs: string; endBs: string; startAd: Date; endAd: Date; daysInMonth: number } {
  const daysInMonth = getDaysInBsMonth(bsYear, bsMonth)
  const startBs = `${bsYear}-${String(bsMonth).padStart(2, '0')}-01`
  const endBs = `${bsYear}-${String(bsMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`
  return {
    startBs,
    endBs,
    startAd: bsStringToAd(startBs),
    endAd: bsStringToAd(endBs),
    daysInMonth,
  }
}

// List BS months between two dates (inclusive) — for VAT/TDS return periods
export function listBsMonthsBetween(startBs: string, endBs: string): Array<{ year: number; month: number; label: string; startBs: string; endBs: string }> {
  const start = parseBsDate(startBs)
  const end = parseBsDate(endBs)
  const result: Array<{ year: number; month: number; label: string; startBs: string; endBs: string }> = []
  let y = start.year, m = start.month
  while (y < end.year || (y === end.year && m <= end.month)) {
    const daysInMonth = getDaysInBsMonth(y, m)
    result.push({
      year: y,
      month: m,
      label: `${y}-${String(m).padStart(2, '0')}`,
      startBs: `${y}-${String(m).padStart(2, '0')}-01`,
      endBs: `${y}-${String(m).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`,
    })
    m++
    if (m > 12) { m = 1; y++ }
  }
  return result
}

// ============================================================
// Nepali number formatting (Devanagari digits)
// ============================================================

export function toNepaliDigits(num: number | string): string {
  const npDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९']
  return String(num).replace(/[0-9]/g, d => npDigits[parseInt(d, 10)])
}

// Format NPR currency
export function formatNpr(amount: number, useNepaliDigits: boolean = false): string {
  const formatted = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(amount)
  const result = `NPR ${formatted}`
  return useNepaliDigits ? toNepaliDigits(result) : result
}

// ============================================================
// Validation
// ============================================================

export function isValidBsDate(bsStr: string): boolean {
  try {
    const bs = parseBsDate(bsStr)
    if (bs.year < MIN_BS_YEAR || bs.year > MAX_BS_YEAR) return false
    if (bs.month < 1 || bs.month > 12) return false
    const maxDay = getDaysInBsMonth(bs.year, bs.month)
    return bs.day >= 1 && bs.day <= maxDay
  } catch {
    return false
  }
}

// Helper to ensure a BS string is valid before saving
export function safeBsString(bsStr: string): string {
  if (isValidBsDate(bsStr)) return bsStr
  // Fallback to today
  return todayBsString()
}
