/**
 * Converts a folder of Tabroom round-result exports into data/uploads/.
 *
 *   npm run import:results -- <folder> [--season 2026-27] [--kumar <skumar-ml checkout>]
 *
 * Expected layout (one folder per tournament; a subfolder per division when a tournament has several):
 *   <Tournament>/tournament_info.txt   first line "<Name>, <City ST>, <Sept 18–20 2026>", a Tabroom link, "Division: …"
 *   <Tournament>/entries.csv           school, location, debater_names, entry_code, status
 *   <Tournament>/NN_<Round>.csv        round, aff_code, neg_code, winner_side, winner_code, decision, ballots, judges, aff_points, neg_points, notes
 *
 * Only varsity divisions are imported: a division named Varsity, Open, Champ(ionship) or TOC, or any division
 * of a national-circuit tournament (on the TOC bid calendar). Closeouts, pairing-only rounds and split panels
 * are dropped. Each tournament is rewritten as tournament.json + entries.csv + Prelims/ and Elims/.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { parseTable } from '../../src/rankings/csv'
import { slugify } from '../../src/rankings/pipeline'
import { calendarMatch, parseDateRange, readCalendar } from './calendar'

const arg = (flag: string) => (process.argv.includes(flag) ? process.argv[process.argv.indexOf(flag) + 1] : undefined)
const src = resolve(process.argv[2] ?? '')
const season = arg('--season') ?? '2026-27'
const OUT = resolve('data/uploads', season)
const calendar = readCalendar(resolve(arg('--kumar') ?? '.cache/kumar'), `${season.slice(0, 4)}-${Number(season.slice(0, 4)) + 1}`)

const isDir = (p: string) => existsSync(p) && statSync(p).isDirectory()
const VARSITY = /\b(varsity|open|champ|championship|toc)\b/i
const ROUND_ROBIN = /\bround robin\b|\bRR\b/i
/** Names the source datasets already use, so the same tournament is recognised as one. */
const ALIASES: Record<string, string> = { 'National Speech and Debate Season Opener': 'UK Season Opener' }
const ACRONYMS = new Set(['HS', 'TFA', 'UIL', 'NSDA', 'TOC', 'NIETOC', 'IQT', 'USAFO', 'LD', 'MDTA', 'DSDL', 'CBSR', 'YDRC', 'AECHS', 'FGCCFL', 'LC', 'II', 'III'])

/** ALL-CAPS names read better in title case; acronyms stay. */
const tidy = (name: string) =>
  name !== name.toUpperCase()
    ? name
    : name
        .split(/\s+/)
        .map((w) => (ACRONYMS.has(w) ? w : w.charAt(0) + w.slice(1).toLowerCase()))
        .join(' ')

function place(text: string) {
  const online = /online|nsda campus/i.test(text)
  const m = text.trim().match(/^(.*?)[,\s]+([A-Z]{2})$/)
  if (online) return { city: 'Online', state: m ? m[2] : '' }
  return m ? { city: m[1].replace(/\s+[A-Z]{2}$/, '').replace(/,$/, '').trim(), state: m[2] } : { city: text.trim(), state: '' }
}
const titleCity = (c: string) => (c === c.toLowerCase() ? c.replace(/\b\w/g, (x) => x.toUpperCase()) : c)

interface Info {
  name: string
  city: string
  state: string
  start: string
  end: string
  tabroomId: number | null
  division: string
}

function readInfo(dir: string): Info | null {
  const path = join(dir, 'tournament_info.txt')
  if (!existsSync(path)) return null
  const text = readFileSync(path, 'utf8')
  const first = text.split(/\r?\n/)[0]
  const parts = first.split(',').map((p) => p.trim())
  const dates = parseDateRange(parts.at(-1) ?? '')
  if (!dates || parts.length < 3) return null
  const { city, state } = place(parts.at(-2)!)
  const id = text.match(/tourn_id=(\d+)/)
  return {
    name: tidy(parts.slice(0, -2).join(', ')),
    city: titleCity(city),
    state,
    ...dates,
    tabroomId: id ? Number(id[1]) : null,
    division: text.match(/Division:\s*(.*)/)?.[1].trim() ?? '',
  }
}

/** Canonical elim label for Tabroom's many abbreviations, or null for a prelim. */
function roundLabel(name: string): { elim: boolean; label: string } {
  const n = name.trim()
  if (/^(r|rd|round)\s*\.?\s*\d+$/i.test(n)) return { elim: false, label: `Round ${n.match(/\d+/)![0]}` }
  const rules: [RegExp, string][] = [
    [/runoff/i, 'Runoff'],
    [/quad/i, 'Quads'],
    [/trip/i, 'Triples'],
    [/doub/i, 'Doubles'],
    [/oct/i, 'Octafinals'],
    [/quar|qtr|qrt|^p?q$|ldq$/i, 'Quarterfinals'],
    [/sem|^s$|lds$/i, 'Semifinals'],
    [/fin|^f$|ldf$/i, 'Finals'],
  ]
  const hit = rules.find(([re]) => re.test(n))
  return hit ? { elim: true, label: hit[1] } : { elim: true, label: slugify(n) || 'elim' }
}

const DROP = /closeout|walkover|pairing only|split panel|bye|forfeit/i
const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
const csvLine = (cells: string[]) => cells.map(csvCell).join(',')

const report = { imported: [] as string[], skipped: [] as string[] }

function convert(dir: string, info: Info, division: string, parentName: string, circuitParent: boolean) {
  const isRR = ROUND_ROBIN.test(division)
  const circuit = circuitParent || !!calendarMatch(parentName, calendar)
  const label = `${parentName}${division && division !== info.division ? ` / ${division}` : ''}`
  if (!VARSITY.test(division) && !circuit) {
    report.skipped.push(`${label} ("${division || 'no division name'}")`)
    return
  }
  const base = ALIASES[parentName] ?? parentName
  const name = isRR ? `${base.replace(/\s+(Fall Classic|Invitational|Classic|Tournament)$/i, '')} Round Robin` : base
  const slug = slugify(name)
  const out = join(OUT, slug)

  const entries = parseTable(readFileSync(join(dir, 'entries.csv'), 'utf8')).rows
  const known = new Set(entries.map((e) => e.entry_code))
  const rounds = readdirSync(dir)
    .filter((f) => f.endsWith('.csv') && f !== 'entries.csv')
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
  let kept = 0
  let dropped = 0
  let unknown = 0
  const files: { folder: 'Prelims' | 'Elims'; name: string; text: string }[] = []
  for (const [i, f] of rounds.entries()) {
    const rows = parseTable(readFileSync(join(dir, f), 'utf8')).rows
    if (!rows.length) continue
    const { elim, label: roundName } = roundLabel(rows[0].round || f.replace(/^\d+_|\.csv$/g, ''))
    const lines = ['Aff,Neg,Win,Aff Points,Neg Points']
    for (const r of rows) {
      const side = (r.winner_side || '').toLowerCase()
      if (DROP.test(r.notes || '') || (side !== 'aff' && side !== 'neg') || !r.aff_code || !r.neg_code) {
        dropped++
        continue
      }
      if (!known.has(r.aff_code) || !known.has(r.neg_code)) unknown++
      const ballots = (r.decision || '').match(/^(\d+)\s*-\s*(\d+)\s+(AFF|NEG)$/i)
      lines.push(csvLine([r.aff_code, r.neg_code, ballots ? `${ballots[1]}-${ballots[2]} ${ballots[3].toUpperCase()}` : side === 'aff' ? 'Aff' : 'Neg', r.aff_points || '', r.neg_points || '']))
      kept++
    }
    files.push({ folder: elim ? 'Elims' : 'Prelims', name: `${String(i + 1).padStart(2, '0')}-${slugify(roundName)}.csv`, text: lines.join('\n') + '\n' })
  }
  if (!kept) {
    report.skipped.push(`${label} (no decided rounds published)`)
    return
  }

  rmSync(out, { recursive: true, force: true })
  mkdirSync(join(out, 'Prelims'), { recursive: true })
  mkdirSync(join(out, 'Elims'), { recursive: true })
  const meta = { name, start: info.start, end: info.end, city: info.city, state: info.state, ...(info.tabroomId ? { tabroomId: info.tabroomId } : {}), ...(circuit ? { level: 'circuit' } : {}), division }
  writeFileSync(join(out, 'tournament.json'), JSON.stringify(meta, null, 2) + '\n')
  writeFileSync(
    join(out, 'entries.csv'),
    ['Institution,Location,Entry,Code', ...entries.filter((e) => e.entry_code && e.debater_names).map((e) => csvLine([e.school, e.location, e.debater_names, e.entry_code]))].join('\n') + '\n',
  )
  for (const f of files) writeFileSync(join(out, f.folder, f.name), f.text)
  report.imported.push(`${name}${circuit ? ' [circuit]' : ''}: ${entries.length} entries, ${kept} rounds${dropped ? `, ${dropped} dropped` : ''}${unknown ? `, ${unknown} with an unlisted entry` : ''}`)
}

if (!isDir(src)) throw new Error(`Not a folder: ${src}`)
for (const t of readdirSync(src).filter((d) => isDir(join(src, d))).sort()) {
  const dir = join(src, t)
  const info = readInfo(dir)
  if (!info) {
    report.skipped.push(`${t} (no readable tournament_info.txt)`)
    continue
  }
  const circuitParent = !!calendarMatch(ALIASES[info.name] ?? info.name, calendar) || !!calendarMatch(info.name, calendar)
  if (existsSync(join(dir, 'entries.csv'))) convert(dir, info, info.division, info.name, circuitParent)
  for (const sub of readdirSync(dir).filter((d) => isDir(join(dir, d)) && existsSync(join(dir, d, 'entries.csv')))) convert(join(dir, sub), info, basename(sub), info.name, circuitParent)
}

console.log(`Imported ${report.imported.length} into ${OUT}:\n  ${report.imported.join('\n  ')}`)
console.log(`\nSkipped ${report.skipped.length}:\n  ${report.skipped.join('\n  ')}`)
if (!calendar.length) console.warn('\n(No TOC bid calendar found at .cache/kumar; run `npm run rankings` once so circuit tournaments are recognised.)')
