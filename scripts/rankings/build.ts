/**
 * Builds the LD rankings data the site reads from public/data/ld/.
 *
 *   npm run rankings                                   # clone/update the source datasets and rebuild
 *   npm run rankings -- --modi <dir> --kumar <dir>     # use local checkouts instead
 *
 * Sources, merged season by season into one Glicko-2 pool per season:
 *   - github.com/shreerammodi/debate-rankings   current-season national-circuit results
 *   - github.com/skumar-ml/debate-rankings      2021–22 onward national-circuit results
 *   - data/uploads/<season>/<tournament>/       local tournaments added by hand (see data/uploads/README.md)
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import {
  MIN_ROUNDS,
  PERIODS,
  computeRankings,
  debaterSeason,
  fromDataset,
  mainPool,
  periodOfDate,
  rankList,
  slugify,
  type DebaterState,
  type RankingsConfig,
  type RankingsResult,
  type RawTournament,
  type Tournament,
} from '../../src/rankings/pipeline'
import type { DebaterFile, LdIndex, Level, Period, RankingsFile, SeasonInfo, SourceInfo } from '../../src/rankings/types'

const OUT = resolve('public/data/ld')
const UPLOADS = resolve(process.argv.includes('--uploads') ? process.argv[process.argv.indexOf('--uploads') + 1] : 'data/uploads')
const REMOVALS = resolve('data/removals.json')

const SOURCES = {
  modi: { name: 'debate-rankings by Shreeram Modi', repo: 'https://github.com/shreerammodi/debate-rankings' },
  kumar: { name: 'NSD × DebateDrills × DebateLand rankings data', repo: 'https://github.com/skumar-ml/debate-rankings' },
}

// ---------- Fetching sources ----------

function arg(flag: string) {
  const i = process.argv.indexOf(flag)
  return i > -1 ? process.argv[i + 1] : undefined
}

function checkout(key: keyof typeof SOURCES): string {
  const local = arg(`--${key}`)
  if (local) return resolve(local)
  const dir = resolve('.cache', key)
  if (existsSync(join(dir, '.git'))) {
    execFileSync('git', ['-C', dir, 'fetch', '--depth', '1', '--quiet', 'origin'], { stdio: 'inherit' })
    execFileSync('git', ['-C', dir, 'reset', '--hard', '--quiet', 'FETCH_HEAD'], { stdio: 'inherit' })
  } else {
    mkdirSync(resolve('.cache'), { recursive: true })
    execFileSync('git', ['clone', '--depth', '1', '--quiet', `${SOURCES[key].repo}.git`, dir], { stdio: 'inherit', env: { ...process.env, GIT_LFS_SKIP_SMUDGE: '1' } })
  }
  return dir
}

function sourceInfo(key: keyof typeof SOURCES, dir: string): SourceInfo {
  let commit = 'unknown'
  let committedAt = new Date().toISOString()
  try {
    commit = execFileSync('git', ['-C', dir, 'rev-parse', 'HEAD']).toString().trim()
    committedAt = new Date(execFileSync('git', ['-C', dir, 'log', '-1', '--format=%cI']).toString().trim()).toISOString()
  } catch {
    // A plain folder without git history is fine.
  }
  return { ...SOURCES[key], commit, committedAt }
}

/** Some exports are Windows-1252 rather than UTF-8. */
function readText(path: string) {
  const buf = readFileSync(path)
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf)
  } catch {
    return new TextDecoder('windows-1252').decode(buf)
  }
}

const isDir = (p: string) => existsSync(p) && statSync(p).isDirectory()
const csvs = (dir: string) => (isDir(dir) ? readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.csv')).map((name) => ({ name, text: readText(join(dir, name)) })) : [])

/** The entries file is whichever top-level CSV has Entry and Code columns. */
function entriesIn(dir: string) {
  return csvs(dir).find((f) => {
    const head = f.text.replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0]
    return /\bEntry\b/.test(head) && /\bCode\b/.test(head)
  })
}

// ---------- Seasons and dates ----------

/** "2026-2027" or a date → "2026-27". */
const seasonSlug = (startYear: number) => `${startYear}-${String(startYear + 1).slice(2)}`
const seasonLabel = (slug: string) => slug.replace('-', '–')
const seasonOfDate = (iso: string) => {
  const d = new Date(iso)
  return seasonSlug(d.getUTCMonth() >= 6 ? d.getUTCFullYear() : d.getUTCFullYear() - 1)
}

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }
const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

/** "Sept. 4-7, 2026", "Oct. 29-Nov. 1, 2026", "Jan. 16, 2027" → ISO start and end. */
function parseDateRange(text: string): { start: string; end: string } | null {
  const m = text.replace(/\*/g, '').match(/([A-Za-z]+)\.?\s*(\d+)(?:\s*[-–]\s*(?:([A-Za-z]+)\.?\s*)?(\d+))?,\s*(\d{4})/)
  if (!m) return null
  const m1 = MONTHS[m[1].slice(0, 3).toLowerCase()]
  const m2 = m[3] ? MONTHS[m[3].slice(0, 3).toLowerCase()] : m1
  const year = Number(m[5])
  if (!m1 || !m2) return null
  // A range that crosses into January ends in the stated year and starts in the one before.
  const startYear = m2 < m1 ? year - 1 : year
  return { start: iso(startYear, m1, Number(m[2])), end: iso(year, m2, Number(m[4] ?? m[2])) }
}

interface CalendarRow {
  name: string
  start: string
  end: string
  tabroomId: number | null
}

/** The TOC bid calendar skumar-ml keeps for the current season (a markdown table). */
function readCalendar(kumarDir: string, seasonFolder: string): CalendarRow[] {
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

const words = (s: string) => slugify(s).split('-').filter((w) => w.length > 2 && !['the', 'and', 'invitational', 'classic', 'tournament', 'debate', 'speech', 'school'].includes(w))

function calendarMatch(name: string, calendar: CalendarRow[]) {
  const want = words(name)
  if (!want.length) return undefined
  return calendar.find((c) => {
    const have = new Set(words(c.name))
    return want.every((w) => have.has(w))
  })
}

// ---------- Source: shreerammodi/debate-rankings (current season) ----------

/** Display names (and dates where the calendar can't match them) for that repo's folder slugs. */
const MODI_META: Record<string, { name: string; calendar?: string; start?: string; end?: string }> = {
  'loyola-rr': { name: 'Loyola Round Robin', calendar: 'Loyola Invitational' },
  loyola: { name: 'Loyola Invitational' },
  ukso: { name: 'UK Season Opener', calendar: 'National Speech and Debate Season Opener' },
  grapevine: { name: 'Grapevine Classic' },
  'greenhill-rr': { name: 'Greenhill Round Robin', calendar: 'Greenhill Fall Classic' },
  greenhill: { name: 'Greenhill Fall Classic' },
  meadows: { name: 'Meadows Invitational', calendar: 'The Meadows School' },
  'heart-of-texas': { name: 'Heart of Texas Invitational' },
  glenbrooks: { name: 'Glenbrooks' },
  emory: { name: 'Barkley Forum (Emory)', calendar: 'Barkley Forum for High School' },
  cal: { name: 'Cal Invitational (Berkeley)' },
  harvard: { name: 'Harvard National Invitational' },
  'harvard-westlake': { name: 'Harvard-Westlake' },
  ndca: { name: 'NDCA Championship' },
  toc: { name: 'Tournament of Champions' },
  isidore: { name: 'Isidore Newman Invitational', calendar: 'Isidore Newman Invitational Tournament' },
}

interface SeasonDraft {
  slug: string
  tournaments: Tournament[]
  multiTeam: string[]
  /** Whether every tournament has dates, so topic periods and weekly movement can be shown. */
  dated: boolean
}

function loadModi(dir: string, calendar: CalendarRow[], season: string): SeasonDraft {
  const config = JSON.parse(readFileSync(join(dir, 'config/hsld-config.json'), 'utf8')) as RankingsConfig
  const out: Tournament[] = []
  let last = { start: '', end: '' }
  for (const slug of config.tournaments) {
    const folder = join(dir, 'tournaments/hsld', slug)
    const entries = entriesIn(folder)
    if (!entries) {
      console.warn(`  skip modi/${slug}: no entries`)
      continue
    }
    const meta = MODI_META[slug] ?? { name: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }
    const cal = calendarMatch(meta.calendar ?? meta.name, calendar)
    // A round robin runs at the start of its host tournament.
    const isRR = /-rr$/.test(slug)
    const start = meta.start ?? cal?.start ?? last.end
    const end = meta.end ?? (isRR ? start : cal?.end) ?? start
    last = { start, end }
    const raw: RawTournament = { slug, entries: entries.text, files: csvs(folder).filter((f) => f !== entries) }
    out.push(fromDataset(raw, { name: meta.name, level: 'circuit', start, end, city: '', state: '', tabroomId: isRR ? null : (cal?.tabroomId ?? null) }))
  }
  return { slug: season, tournaments: out, multiTeam: config.multi_team_debaters ?? [], dated: out.every((t) => t.start) }
}

// ---------- Source: skumar-ml/debate-rankings (2021–22 onward) ----------

const KUMAR_NAMES: Record<string, string> = {
  NSDSO_Online: 'NSD Season Opener (Online)',
  SeasonOpener: 'UK Season Opener',
  UK: 'UK Season Opener',
  StMarks: "St. Mark's",
  TOCDigital1: 'TOC Digital Series 1',
  TOCDigital2: 'TOC Digital Series 2',
  TOCDigital3: 'TOC Digital Series 3',
  TOC: 'Tournament of Champions',
  ASU: 'Arizona State',
  Lex: 'Lexington',
  Penn: 'Penn Liberty Bell',
  UniversityOfPennsylvania: 'Penn Liberty Bell',
  Milo: 'Milo Cup',
  Emory: 'Barkley Forum (Emory)',
  Berkeley: 'Cal Invitational (Berkeley)',
  BlueKey: 'Florida Blue Key',
  USC: 'USC Trojan Invitational',
  Valley: 'Valley Mid-America Cup',
  MidAmerica: 'Mid America Cup',
  NanoNagle: 'Nano Nagle',
}

const titleFromFolder = (folder: string) =>
  KUMAR_NAMES[folder] ??
  folder
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Za-z])(\d)/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()

function loadKumar(dir: string): SeasonDraft[] {
  const seasons: SeasonDraft[] = []
  for (const folder of readdirSync(dir).filter((f) => /^\d{4}-\d{4}$/.test(f)).sort()) {
    const ldDir = ['LD', 'LD_Rankings'].map((d) => join(dir, folder, d)).find(isDir)
    const script = ldDir && readdirSync(ldDir).find((f) => /^LDRankings\.py$/i.test(f))
    if (!ldDir || !script) continue
    // Tournament order (and so rating order) is the order of add_tournament(...) calls, commented or not.
    const order: string[] = []
    for (const m of readText(join(ldDir, script)).matchAll(/^[\s#]*add_tournament\(\s*"([^"]+)"\s*,\s*\d+\s*\)/gm)) if (!order.includes(m[1])) order.push(m[1])
    const out: Tournament[] = []
    for (const name of order) {
      const tdir = [join(ldDir, name), join(ldDir, 'Old', name)].find(isDir)
      const entries = tdir && entriesIn(tdir)
      if (!tdir || !entries) continue
      const prelims = csvs(join(tdir, 'Prelims'))
      if (!prelims.length) continue
      const display = titleFromFolder(name)
      const raw: RawTournament = { slug: slugify(display), entries: entries.text, files: prelims, elimFiles: csvs(join(tdir, 'Elims')) }
      out.push(fromDataset(raw, { name: display, level: 'circuit', start: '', end: '', city: '', state: '', tabroomId: null }))
    }
    if (out.length) seasons.push({ slug: seasonSlug(Number(folder.slice(0, 4))), tournaments: out, multiTeam: [], dated: false })
  }
  return seasons
}

// ---------- Source: data/uploads (local tournaments) ----------

interface UploadMeta {
  name: string
  start: string
  end?: string
  city?: string
  state?: string
  level?: Level
  tabroomId?: number
}

function loadUploads(): Map<string, Tournament[]> {
  const bySeason = new Map<string, Tournament[]>()
  if (!isDir(UPLOADS)) return bySeason
  for (const season of readdirSync(UPLOADS).filter((s) => isDir(join(UPLOADS, s)))) {
    for (const slug of readdirSync(join(UPLOADS, season)).filter((s) => isDir(join(UPLOADS, season, s)))) {
      const tdir = join(UPLOADS, season, slug)
      const metaPath = join(tdir, 'tournament.json')
      const entries = entriesIn(tdir)
      if (!existsSync(metaPath) || !entries) {
        console.warn(`  skip upload ${season}/${slug}: needs tournament.json and an entries CSV`)
        continue
      }
      const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as UploadMeta
      const split = isDir(join(tdir, 'Prelims'))
      const raw: RawTournament = split
        ? { slug, entries: entries.text, files: csvs(join(tdir, 'Prelims')), elimFiles: csvs(join(tdir, 'Elims')) }
        : { slug, entries: entries.text, files: csvs(tdir).filter((f) => f !== entries) }
      const t = fromDataset(raw, { name: meta.name, level: meta.level ?? 'local', start: meta.start, end: meta.end ?? meta.start, city: meta.city ?? '', state: meta.state ?? '', tabroomId: meta.tabroomId ?? null })
      bySeason.set(season, [...(bySeason.get(season) ?? []), t])
    }
  }
  return bySeason
}

// ---------- Merge ----------

/** Same tournament from two sources? Compare distinctive words of the names. */
const sameTournament = (a: Tournament, b: Tournament) => {
  const wa = words(a.name.replace(/round robin/i, 'rr'))
  const wb = new Set(words(b.name.replace(/round robin/i, 'rr')))
  return wa.length > 0 && wa.length === wb.size && wa.every((w) => wb.has(w))
}

function mergeSeasons(drafts: SeasonDraft[], uploads: Map<string, Tournament[]>): SeasonDraft[] {
  const bySlug = new Map<string, SeasonDraft>()
  for (const d of drafts) {
    const have = bySlug.get(d.slug)
    if (!have) {
      bySlug.set(d.slug, { ...d, tournaments: [...d.tournaments] })
      continue
    }
    // The first source listed wins a duplicate tournament.
    for (const t of d.tournaments) {
      if (have.tournaments.some((x) => sameTournament(x, t))) console.log(`  ${d.slug}: ${t.name} is in both datasets; keeping the first`)
      else have.tournaments.push(t)
    }
    have.dated = have.dated && d.dated
    have.multiTeam = [...new Set([...have.multiTeam, ...d.multiTeam])]
  }
  for (const [season, list] of uploads) {
    const have = bySlug.get(season) ?? { slug: season, tournaments: [], multiTeam: [], dated: true }
    for (const t of list) {
      const dup = have.tournaments.findIndex((x) => sameTournament(x, t))
      // An upload replaces a dataset copy of the same tournament (it's usually more complete).
      if (dup > -1) have.tournaments.splice(dup, 1, t)
      else have.tournaments.push(t)
    }
    have.dated = have.tournaments.every((t) => t.start)
    bySlug.set(season, have)
  }
  for (const s of bySlug.values()) {
    // Unique slugs within a season.
    const used = new Set<string>()
    for (const t of s.tournaments) {
      let slug = t.slug
      for (let n = 2; used.has(slug); n++) slug = `${t.slug}-${n}`
      used.add(slug)
      t.slug = slug
    }
    // Rate in date order when every tournament is dated; otherwise keep source order.
    if (s.dated) s.tournaments.sort((a, b) => a.end.localeCompare(b.end) || a.start.localeCompare(b.start))
  }
  return [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug))
}

// ---------- Build ----------

const addDays = (isoDate: string, n: number) => new Date(Date.parse(isoDate) + n * 86400000).toISOString().slice(0, 10)

function removals(): Set<string> {
  if (!existsSync(REMOVALS)) return new Set()
  return new Set((JSON.parse(readFileSync(REMOVALS, 'utf8')) as { ids?: string[] }).ids ?? [])
}

function scrub(result: RankingsResult, removed: Set<string>) {
  result.debaters = result.debaters.filter((d) => !removed.has(d.id))
  for (const d of result.debaters)
    for (const r of d.rounds)
      if (removed.has(r.opp)) Object.assign(r, { opp: '', oppName: 'Removed on request', oppSchool: '' })
}

function main() {
  const modiDir = checkout('modi')
  const kumarDir = checkout('kumar')
  const sources = [sourceInfo('modi', modiDir), sourceInfo('kumar', kumarDir)]
  const current = seasonOfDate(sources[0].committedAt)
  const calendar = readCalendar(kumarDir, `${current.slice(0, 4)}-${Number(current.slice(0, 4)) + 1}`)
  console.log(`Sources: ${sources.map((s) => `${s.repo}@${s.commit.slice(0, 7)}`).join(', ')}; calendar rows: ${calendar.length}`)

  const seasons = mergeSeasons([loadModi(modiDir, calendar, current), ...loadKumar(kumarDir)], loadUploads())
  const removed = removals()
  const updatedAt = sources.map((s) => s.committedAt).sort().at(-1)!

  rmSync(OUT, { recursive: true, force: true })
  mkdirSync(join(OUT, 'debaters'), { recursive: true })

  const careers = new Map<string, DebaterFile>()
  const seasonInfos: SeasonInfo[] = []
  let totalRounds = 0
  let totalTournaments = 0

  for (const s of seasons) {
    const label = seasonLabel(s.slug)
    const hasLocal = s.tournaments.some((t) => t.level === 'local')
    const periods: Period[] = [{ slug: 'season', label: 'Full season' }]
    if (s.dated) for (const p of PERIODS) if (s.tournaments.some((t) => t.start && periodOfDate(t.start) === p.slug)) periods.push({ ...p })
    mkdirSync(join(OUT, s.slug), { recursive: true })

    let full: { result: RankingsResult; pool: Set<string> } | null = null
    for (const period of periods) {
      const list = period.slug === 'season' ? s.tournaments : s.tournaments.filter((t) => periodOfDate(t.start) === period.slug)
      const lastEnd = list.map((t) => t.end).filter(Boolean).sort().at(-1)
      const result = computeRankings(list, { multiTeam: s.multiTeam, snapshotBefore: s.dated && lastEnd ? addDays(lastEnd, -6) : undefined })
      scrub(result, removed)
      const pool = mainPool(result.debaters)
      if (period.slug === 'season') full = { result, pool }
      const inPool = (d: DebaterState) => pool.has(d.id)
      const base = { event: 'hsld' as const, eventLabel: 'Lincoln–Douglas', seasonSlug: s.slug, season: label, hasLocal, period, periods, generatedAt: new Date().toISOString(), updatedAt, tournaments: result.tournaments, field: result.field }
      const circuit: RankingsFile = { ...base, view: 'circuit', debaters: rankList(result, { include: (d) => d.levels.has('circuit'), rankable: inPool, pool }) }
      writeFileSync(join(OUT, s.slug, `rankings-${period.slug}.json`), JSON.stringify(circuit))
      if (hasLocal) {
        const all: RankingsFile = { ...base, view: 'all', debaters: rankList(result, { rankable: (d) => inPool(d) && d.rounds.length >= MIN_ROUNDS, pool }) }
        writeFileSync(join(OUT, s.slug, `rankings-${period.slug}-all.json`), JSON.stringify(all))
      }
    }

    const { result, pool } = full!
    for (const d of result.debaters) {
      const season = debaterSeason(d, result.tournaments, { slug: s.slug, label }, pool.has(d.id) ? 'main' : 'local')
      const c = careers.get(d.id) ?? { id: d.id, name: d.name, school: d.school, state: d.state, seasons: [] }
      c.seasons.unshift(season)
      // Newest season wins for the header.
      Object.assign(c, { name: d.name, school: d.school, state: d.state || c.state })
      careers.set(d.id, c)
    }
    totalRounds += result.field.rounds
    totalTournaments += result.tournaments.length
    seasonInfos.push({
      slug: s.slug,
      label,
      tournaments: result.tournaments.length,
      circuitTournaments: result.tournaments.filter((t) => t.level === 'circuit').length,
      rounds: result.field.rounds,
      debaters: result.debaters.length,
      hasLocal,
      periods,
    })
    console.log(`LD ${label}: ${result.tournaments.length} tournaments (${result.tournaments.filter((t) => t.level === 'local').length} local), ${result.debaters.length} debaters, ${result.field.rounds} rounds${s.dated ? '' : ' (source order)'}`)
  }

  for (const c of careers.values()) writeFileSync(join(OUT, 'debaters', `${c.id}.json`), JSON.stringify(c))

  const index: LdIndex = {
    generatedAt: new Date().toISOString(),
    current: seasonInfos.some((s) => s.slug === current) ? current : seasonInfos.at(-1)!.slug,
    seasons: [...seasonInfos].reverse(),
    totals: { seasons: seasonInfos.length, tournaments: totalTournaments, rounds: totalRounds, debaters: careers.size },
    sources,
  }
  writeFileSync(join(OUT, 'index.json'), JSON.stringify(index))
  if (!totalTournaments) throw new Error('No tournaments were read; refusing to publish empty rankings.')
  console.log(`Total: ${index.totals.seasons} seasons, ${totalTournaments} tournaments, ${totalRounds} rounds, ${careers.size} debaters`)

  const top = JSON.parse(readFileSync(join(OUT, index.current, 'rankings-season.json'), 'utf8')) as RankingsFile
  console.log(top.debaters.slice(0, 10).map((d) => `${String(d.rank).padStart(3)}. ${d.name} (${d.school}) ${d.score.toFixed(1)}  ${d.wins}-${d.losses}`).join('\n'))
}

main()
