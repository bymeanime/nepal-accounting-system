// ============================================================
// API: Calendar utility — returns today's BS date + helpers
// ============================================================

import { NextResponse } from 'next/server'
import { adToBs, adToBsString, formatBsDate, parseBsDate, todayBsString, getFiscalYear, BS_MONTH_NAMES_EN, BS_MONTH_NAMES_NP, bsMonthRange } from '@/lib/nepaliCalendar'

export async function GET() {
  const today = new Date()
  const todayBs = adToBs(today)
  const todayBsString = adToBsString(today)
  const fy = getFiscalYear(today)

  // List 12 BS months of current FY for selector
  const months: any[] = []
  let y = fy.bsYearStart, m = 4 // Shrawan
  for (let i = 0; i < 12; i++) {
    const range = bsMonthRange(y, m)
    months.push({
      value: `${y}-${String(m).padStart(2, '0')}`,
      label: `${BS_MONTH_NAMES_EN[m - 1]} ${y}`,
      labelNp: `${BS_MONTH_NAMES_NP[m - 1]} ${y}`,
      startBs: range.startBs,
      endBs: range.endBs,
    })
    m++
    if (m > 12) { m = 1; y++ }
  }

  return NextResponse.json({
    today: {
      bs: todayBsString,
      bsParts: todayBs,
      bsLong: formatBsDate(todayBs, 'LONG_EN'),
      bsLongNp: formatBsDate(todayBs, 'LONG_NP'),
      ad: today.toISOString().split('T')[0],
    },
    fiscalYear: fy,
    months,
  })
}
