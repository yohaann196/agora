/** Tournament calendars and fuzzy name matching, shared by the rankings build and the results importer. */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { slugify } from '../../src/rankings/pipeline'

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }
const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

/** "Sept. 4-7, 2026", "Oct. 29-Nov. 1, 2026", "Sept 18–20 2026", "Jan. 16, 2027" → ISO start and end. */
export function parseDateRange(text: string): { start: string; end: string } | null {
  const m = text.replace(/\*/g, '').match(/([A-Za-z]+)\.?\s*(\d+)(?:\s*[-–]\s*(?:([A-Za-z]+)\.?\s*)?(\d+))?,?\s*(\d{4})/)
  if (!m) return null
  const m1 = MONTHS[m[1].slice(0, 3).toLowerCase()]
  const m2 = m[3] ? MONTHS[m[3].slice(0, 3).toLowerCase()] : m1
  const year = Number(m[5])
  if (!m1 || !m2) return null
  // A range that crosses into January ends in the stated year and starts in the one before.
  const startYear = m2 < m1 ? year - 1 : year
  return { start: iso(startYear, m1, Number(m[2])), end: iso(year, m2, Number(m[4] ?? m[2])) }
}

export interface CalendarRow {
  name: string
  start: string
  end: string
  tabroomId: number | null
}

/** The TOC bid calendar skumar-ml keeps for the current season (a markdown table). */
export function readCalendar(kumarDir: string, seasonFolder: string): CalendarRow[] {
  const path = join(kumarDir, seasonFolder, 'LD-tournament-calendar.md')
  if (!existsSync(path)) return []
  const rows: CalendarRow[] = []
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const cells = line.split('|').map((c) => c.trim())
    if (cells.length < 5 || !/\d{4}/.test(cells[1]) || /\*/.test(cells[1])) continue
    const dates = parseDateRange(cells[1])
    if (!dates) continue
    const id = cells[3].match(/tourn_id=(\d+)/)
    rows.push({ name: cells[2], ...dates, tabroomId: id ? Number(id[1]) : null })
  }
  return rows
}

export const words = (s: string) => slugify(s).split('-').filter((w) => w.length > 2 && !['the', 'and', 'invitational', 'classic', 'tournament', 'debate', 'speech', 'school'].includes(w))

export function calendarMatch(name: string, calendar: CalendarRow[]) {
  const want = words(name)
  if (!want.length) return undefined
  return calendar.find((c) => {
    const have = new Set(words(c.name))
    return want.every((w) => have.has(w))
  })
}
