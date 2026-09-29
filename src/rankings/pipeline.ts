/**
 * Turns tournament results into Glicko-2 rankings and debater profiles.
 *
 * The method follows the public debate-rankings project
 * (github.com/shreerammodi/debate-rankings): every decided round is a
 * Glicko-2 game, and debaters are ranked by rating − 2 × deviation. Here every
 * tournament — national circuit and local — is rated in one pool in date
 * order, and circuit rounds count twice. The code is an independent
 * implementation.
 */
import { parseTable } from './csv'
import { START, conservative, update, type Rating } from './glicko2'
import type { DebaterSeason, FieldStats, Level, RankedDebater, RoundResult, TournamentLine, TournamentMeta } from './types'

/** How much one decided round counts as a Glicko-2 game: circuit rounds count double a local round. */
export const WEIGHT: Record<Level, number> = { circuit: 1, local: 0.5 }
/** Decided rounds needed for a rank in the all-tournaments view. */
export const MIN_ROUNDS = 4

export interface RankingsConfig {
  tournaments: string[]
  majors: string[]
  multi_team_debaters: string[]
  topic_boundaries?: { sepoct_end?: string; novdec_end?: string }
}

/** One tournament from the debate-rankings dataset: entries.csv plus a CSV per round. */
export interface RawTournament {
  slug: string
  /** entries.csv text. */
  entries: string
  /** Round files, in any order; they are sorted by name like the reference. */
  files: { name: string; text: string }[]
  /** When the source splits rounds into Prelims/ and Elims/ folders, the elim files (and `files` are the prelims). */
  elimFiles?: { name: string; text: string }[]
}

/** A source-agnostic tournament, ready to rate. */
export interface Tournament {
  slug: string
  name: string
  level: Level
  /** ISO dates (YYYY-MM-DD). */
  start: string
  end: string
  city: string
  state: string
  tabroomId: number | null
  entries: Entry[]
  rounds: Round[]
}

export interface Entry {
  code: string
  name: string
  school: string
  state: string
  /** Tabroom student ids, when the source has them; they identify a debater across tournaments. */
  ids?: string[]
}

export interface Match {
  aff: string
  neg: string
  winner: 'aff' | 'neg' | null
  /** Ballot count such as "2-1", or empty. */
  decision: string
  affPoints: number | null
  negPoints: number | null
}

export interface Round {
  label: string
  elim: boolean
  matches: Match[]
}

export const PERIODS = [
  { slug: 'sepoct', label: 'Sep–Oct topic' },
  { slug: 'novdec', label: 'Nov–Dec topic' },
  { slug: 'janfeb', label: 'Jan–Feb topic' },
  { slug: 'marapr', label: 'Mar–Apr topic' },
  { slug: 'mayjun', label: 'May–Jun topic' },
] as const

/** The LD topic period a tournament falls in, from its start date (topics change on the 1st). */
export function periodOfDate(date: string) {
  const m = Number(date.slice(5, 7))
  if (m >= 7 && m <= 10) return 'sepoct'
  if (m >= 11) return 'novdec'
  if (m <= 2) return 'janfeb'
  if (m <= 4) return 'marapr'
  return 'mayjun'
}

export const ELIM_ORDER = ['Finals', 'Semifinals', 'Quarterfinals', 'Octafinals', 'Doubles', 'Triples', 'Quads'] as const
const ELIM_TERMS: [RegExp, string][] = [
  [/runoff/i, 'Runoff'],
  [/quad/i, 'Quads'],
  [/triple/i, 'Triples'],
  [/double/i, 'Doubles'],
  [/octa|octo/i, 'Octafinals'],
  [/quarter/i, 'Quarterfinals'],
  [/semi/i, 'Semifinals'],
  [/final/i, 'Finals'],
]
const PLACEMENT: Record<string, string> = {
  Runoff: 'Runoff',
  Quads: 'Quad-octafinalist',
  Triples: 'Triple-octafinalist',
  Doubles: 'Double-octafinalist',
  Octafinals: 'Octafinalist',
  Quarterfinals: 'Quarterfinalist',
  Semifinals: 'Semifinalist',
  Finals: 'Finalist',
}

/** "jane doe" → "Jane Doe" (only lowercase initials change, like the reference). */
export function normalizeName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => (p[0] === p[0].toLowerCase() ? p[0].toUpperCase() + p.slice(1) : p))
    .join(' ')
}

export const slugify = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/** A school name without the suffixes Tabroom entries vary on ("Cupertino Independent", "Danville Area", "Gunn HS"). */
export const schoolKey = (institution: string) =>
  slugify(institution)
    .split('-')
    .filter((w) => w && !['independent', 'unaffiliated', 'hs', 'high', 'school', 'area'].includes(w))
    .join('-')

/** Identity: school + name, or name alone for debaters who compete for several schools. */
export function identityKey(institution: string, name: string, multiTeam: string[]) {
  const n = normalizeName(name)
  return multiTeam.includes(n) ? n : `${schoolKey(institution) || institution}|${n}`
}

export const titleFromSlug = (slug: string) =>
  slug
    .split('-')
    .map((w) => (w === 'rr' ? 'Round Robin' : w.length <= 3 && w !== 'the' ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(' ')

/** Which side won, or null for splits, byes, advances and blanks. */
export function parseWinner(cell: string): 'aff' | 'neg' | null {
  const c = cell.replace(/\s+/g, ' ').trim()
  if (!c || /advances|\bbye\b/i.test(c)) return null
  const m = c.match(/\b(aff|neg|pro|con)\b\s*$/i) ?? c.match(/^\s*(aff|neg|pro|con)\b/i)
  if (!m) return null
  const w = m[1].toLowerCase()
  return w === 'aff' || w === 'pro' ? 'aff' : 'neg'
}

/** Average speaker points in a cell; ranks that some exports append ("29.3 1") are ignored. */
const average = (cell: string | undefined) => {
  const nums = (cell ?? '').split(/\s+/).map(Number).filter((n) => Number.isFinite(n) && n >= 15 && n <= 30)
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null
}

/** An elim label from a round name ("Octofinals", "DOUBLES", "Elim 3: Semis"), if it names one. */
export const elimLabel = (name: string) => ELIM_TERMS.find(([re]) => re.test(name))?.[1]

/**
 * Label unnamed elims by bracket size, working back from the last: a round with n pairings is
 * at least the level that holds n (1 final, 2 semis, 4 quarters…), and each earlier round is at
 * least one level larger. This copes with closeouts (fewer rows) and a missing final.
 */
export function bracketLabels(sizes: number[]): string[] {
  const out: string[] = []
  let prev = -1
  for (let i = sizes.length - 1; i >= 0; i--) {
    const fits = Math.max(0, Math.ceil(Math.log2(Math.max(1, sizes[i]))))
    prev = Math.max(prev + 1, fits)
    out[i] = ELIM_ORDER[prev] ?? `Elim ${i + 1}`
  }
  return out
}

interface ParsedRound {
  label: string
  elim: boolean
  rows: Record<string, string>[]
}

const byFileName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'en', { numeric: true })

/** Parse and label a dataset tournament's round files in order. */
export function parseRounds(t: RawTournament): ParsedRound[] {
  const isRound = (f: { name: string }) => f.name.endsWith('.csv') && !f.name.startsWith('entries')
  const split = !!t.elimFiles
  const files = [...t.files.filter(isRound).sort(byFileName), ...(t.elimFiles ?? []).filter(isRound).sort(byFileName)]
  const prelimCount = t.files.filter(isRound).length
  const parsed = files.map((f, i) => {
    const { headers, rows } = parseTable(f.text)
    const named = elimLabel(f.name)
    const panelOnly = headers.includes('Judges') && headers.includes('Votes') && !headers.some((h) => /points/i.test(h))
    const numbered = f.name.match(/round-(\d+)/i)
    const elim = split ? i >= prelimCount : !!named || panelOnly
    return { named: elim ? named : undefined, elim, numbered: numbered ? Number(numbered[1]) : null, rows }
  })
  const unnamed = parsed.filter((p) => p.elim && !p.named)
  const labels = bracketLabels(unnamed.map((p) => p.rows.length))
  let prelim = 0
  return parsed.map((p) => {
    if (!p.elim) {
      prelim++
      return { label: `Round ${p.numbered ?? prelim}`, elim: false, rows: p.rows }
    }
    return { label: p.named ?? labels[unnamed.indexOf(p)], elim: true, rows: p.rows }
  })
}

const clean = (s: string | undefined) => (s ?? '').replace(/\s+/g, ' ').trim()

/** Convert a dataset tournament to the common model. */
export function fromDataset(raw: RawTournament, meta: Omit<Tournament, 'slug' | 'entries' | 'rounds'>): Tournament {
  const entries: Entry[] = parseTable(raw.entries)
    .rows.filter((e) => e.Code && e.Entry)
    .map((e) => ({ code: clean(e.Code), name: clean(e.Entry), school: clean(e.Institution ?? e.School), state: stateOf(e.Location) }))
  const rounds: Round[] = parseRounds(raw).map((r) => ({
    label: r.label,
    elim: r.elim,
    matches: r.rows.map((row) => {
      const win = row.Win ?? row.Result ?? ''
      const votes = win.match(/(\d+)\s*-\s*(\d+)/)
      return {
        aff: clean(row.Aff ?? row.Pro),
        neg: clean(row.Neg ?? row.Con),
        winner: parseWinner(win),
        decision: votes ? `${votes[1]}-${votes[2]}` : '',
        affPoints: average(row['Aff Points'] ?? row.AffPoints ?? row['AffPoints & Ranks']),
        negPoints: average(row['Neg Points'] ?? row.NegPoints ?? row['NegPoints & Ranks']),
      }
    }),
  }))
  return { slug: raw.slug, ...meta, entries, rounds }
}

/** "TX/US" → "TX"; foreign locations keep their country. */
export const stateOf = (location: string | undefined) => clean(location).replace(/\/US$/, '')

/** Sort key: tournaments are rated in the order they finished. */
export const byDate = (a: Tournament, b: Tournament) => a.end.localeCompare(b.end) || a.start.localeCompare(b.start) || a.slug.localeCompare(b.slug)

export interface DebaterState {
  id: string
  name: string
  school: string
  state: string
  rating: Rating
  rounds: RoundResult[]
  tournaments: Set<string>
  levels: Set<Level>
}

const pct = (w: number, n: number) => (n ? Math.round((1000 * w) / n) / 10 : null)

export interface RankingsResult {
  debaters: DebaterState[]
  tournaments: TournamentMeta[]
  field: FieldStats
  /** Scores as of `snapshotBefore`, for rank movement. */
  snapshot: Map<string, number> | null
}

export interface RankOptions {
  multiTeam?: string[]
  /** Record everyone's score just before the first tournament that ends on or after this date. */
  snapshotBefore?: string
}

/** Rate tournaments (already in date order) in one Glicko-2 pool. */
export function computeRankings(list: Tournament[], opts: RankOptions = {}): RankingsResult {
  const multiTeam = opts.multiTeam ?? []
  const byKey = new Map<string, DebaterState>()
  const byStudent = new Map<string, DebaterState>()
  const usedIds = new Set<string>()
  const tournaments: TournamentMeta[] = []
  const field = { aff: 0, n: 0, affE: 0, nE: 0 }
  let snapshot: Map<string, number> | null = null
  const all = new Set<DebaterState>()

  for (const t of list) {
    if (opts.snapshotBefore && !snapshot && t.end >= opts.snapshotBefore) {
      snapshot = new Map([...all].filter((d) => d.rounds.length).map((d) => [d.id, conservative(d.rating)]))
    }
    const weight = WEIGHT[t.level]

    // Map this tournament's entry codes to debaters: by Tabroom student id first, then by school + name.
    const codeTo = new Map<string, DebaterState>()
    for (const e of t.entries) {
      const key = identityKey(e.school, e.name, multiTeam)
      let d = e.ids?.map((id) => byStudent.get(id)).find(Boolean) ?? byKey.get(key)
      if (!d) {
        const name = normalizeName(e.name)
        let id = slugify(`${name} ${e.school}`)
        for (let n = 2; usedIds.has(id); n++) id = slugify(`${name} ${e.school} ${n}`)
        usedIds.add(id)
        d = { id, name, school: e.school, state: e.state, rating: { ...START }, rounds: [], tournaments: new Set(), levels: new Set() }
        all.add(d)
      } else {
        d.school = e.school
        if (e.state) d.state = e.state
      }
      byKey.set(key, d)
      for (const id of e.ids ?? []) byStudent.set(id, d)
      codeTo.set(e.code, d)
    }

    let decided = 0
    for (const round of t.rounds) {
      // Every match in a round uses ratings from before the round, like one timestamp in the reference.
      const updates: { d: DebaterState; next: Rating; r: RoundResult }[] = []
      for (const m of round.matches) {
        const aff = codeTo.get(m.aff)
        const neg = codeTo.get(m.neg)
        if (!aff || !neg || !m.winner || aff === neg) continue
        decided++
        for (const [me, opp, side] of [
          [aff, neg, 'aff'],
          [neg, aff, 'neg'],
        ] as const) {
          const won = m.winner === side
          const next = update(me.rating, [{ opponent: opp.rating, score: won ? 1 : 0, weight }])
          const points = side === 'aff' ? m.affPoints : m.negPoints
          updates.push({
            d: me,
            next,
            r: { t: t.slug, round: round.label, elim: round.elim, side, opp: opp.id, oppName: opp.name, oppSchool: opp.school, won, decision: m.decision, points: points && Math.round(points * 10) / 10, rating: 0, rd: 0 },
          })
        }
        field.n++
        if (m.winner === 'aff') field.aff++
        if (round.elim) {
          field.nE++
          if (m.winner === 'aff') field.affE++
        }
      }
      // A debater appears at most once per round; apply after all matches are scored.
      for (const u of updates) {
        u.d.rating = u.next
        u.r.rating = Math.round(u.next.r * 10) / 10
        u.r.rd = Math.round(u.next.rd * 10) / 10
        u.d.rounds.push(u.r)
        u.d.tournaments.add(t.slug)
        u.d.levels.add(t.level)
      }
    }
    tournaments.push({
      slug: t.slug,
      name: t.name,
      level: t.level,
      start: t.start,
      end: t.end,
      city: t.city,
      state: t.state,
      tabroomId: t.tabroomId,
      entries: codeTo.size,
      rounds: decided,
      period: periodOfDate(t.start),
    })
  }

  const fieldStats: FieldStats = {
    affWinRate: pct(field.aff, field.n),
    negWinRate: pct(field.n - field.aff, field.n),
    affElimWinRate: pct(field.affE, field.nE),
    negElimWinRate: pct(field.nE - field.affE, field.nE),
    rounds: field.n,
  }
  return { debaters: [...all].filter((d) => d.rounds.length), tournaments, field: fieldStats, snapshot }
}

/** Debaters connected to the largest group by a chain of opponents. Ratings are only comparable within a group. */
export function mainPool(debaters: DebaterState[]): Set<string> {
  const parent = new Map<string, string>()
  const find = (x: string): string => {
    let r = x
    while (parent.get(r) !== r) r = parent.get(r)!
    while (parent.get(x) !== r) {
      const next = parent.get(x)!
      parent.set(x, r)
      x = next
    }
    return r
  }
  for (const d of debaters) parent.set(d.id, d.id)
  for (const d of debaters) {
    for (const r of d.rounds) {
      if (!parent.has(r.opp)) continue
      const a = find(d.id)
      const b = find(r.opp)
      if (a !== b) parent.set(a, b)
    }
  }
  const size = new Map<string, number>()
  for (const d of debaters) size.set(find(d.id), (size.get(find(d.id)) ?? 0) + 1)
  const biggest = [...size.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  return new Set(debaters.filter((d) => find(d.id) === biggest).map((d) => d.id))
}

const winRate = (rs: RoundResult[], side: 'aff' | 'neg', elim?: boolean) => {
  const set = rs.filter((r) => r.side === side && (elim === undefined || r.elim === elim))
  return pct(set.filter((r) => r.won).length, set.length)
}

export interface RankListOptions {
  /** Which debaters are listed. */
  include?: (d: DebaterState) => boolean
  /** Which listed debaters get a rank number; the rest are listed unranked (rank null) after them. */
  rankable?: (d: DebaterState) => boolean
  /** Ids in the main pool (see mainPool); others are marked pool "local". */
  pool?: Set<string>
}

export function rankList(result: RankingsResult, opts: RankListOptions = {}): RankedDebater[] {
  const { include = () => true, rankable = () => true, pool } = opts
  const score = (d: DebaterState) => conservative(d.rating)
  const listed = result.debaters.filter(include).sort((a, b) => Number(rankable(b)) - Number(rankable(a)) || score(b) - score(a))

  // Rank before the snapshot, among the same set of debaters.
  const prevRank = new Map<string, number>()
  if (result.snapshot) {
    const snap = result.snapshot
    listed
      .filter((d) => rankable(d) && snap.has(d.id))
      .sort((a, b) => snap.get(b.id)! - snap.get(a.id)!)
      .forEach((d, i) => prevRank.set(d.id, i + 1))
  }

  let rank = 0
  return listed.map((d) => {
    const rs = d.rounds
    const ranked = rankable(d)
    return {
      id: d.id,
      name: d.name,
      school: d.school,
      state: d.state,
      rank: ranked ? ++rank : null,
      prevRank: prevRank.get(d.id) ?? null,
      score: Math.round(score(d) * 100) / 100,
      rating: Math.round(d.rating.r * 100) / 100,
      rd: Math.round(d.rating.rd * 100) / 100,
      wins: rs.filter((r) => r.won).length,
      losses: rs.filter((r) => !r.won).length,
      elimWins: rs.filter((r) => r.elim && r.won).length,
      elimLosses: rs.filter((r) => r.elim && !r.won).length,
      affWinRate: winRate(rs, 'aff'),
      negWinRate: winRate(rs, 'neg'),
      affElimWinRate: winRate(rs, 'aff', true),
      negElimWinRate: winRate(rs, 'neg', true),
      tournaments: d.tournaments.size,
      circuit: d.levels.has('circuit'),
      pool: !pool || pool.has(d.id) ? 'main' : 'local',
      spark: rs.slice(-16).map((r) => Math.round(r.rating)),
    }
  })
}

const record = (rs: RoundResult[]) => `${rs.filter((r) => r.won).length}-${rs.filter((r) => !r.won).length}`

/** How far a debater got: the round they lost in, or the round after their last elim win. */
export function placement(rounds: RoundResult[]): string | null {
  const elims = rounds.filter((r) => r.elim && r.round !== 'Runoff')
  if (!elims.length) return null
  const last = elims[elims.length - 1]
  if (!last.won) return PLACEMENT[last.round] ?? last.round
  if (last.round === 'Finals') return 'Champion'
  // Won their last recorded elim: they reached the next round (a closeout, or results not posted).
  const i = ELIM_ORDER.indexOf(last.round as (typeof ELIM_ORDER)[number])
  return i > 0 ? PLACEMENT[ELIM_ORDER[i - 1]] : null
}

/** One season of a debater's profile. */
export function debaterSeason(d: DebaterState, tournaments: TournamentMeta[], season: { slug: string; label: string }, pool: 'main' | 'local'): DebaterSeason {
  const lines: TournamentLine[] = tournaments
    .filter((t) => d.tournaments.has(t.slug))
    .map((t) => {
      const rs = d.rounds.filter((r) => r.t === t.slug)
      const pts = rs.map((r) => r.points).filter((p): p is number => p !== null)
      return {
        t: t.slug,
        name: t.name,
        level: t.level,
        start: t.start,
        end: t.end,
        city: t.city,
        state: t.state,
        tabroomId: t.tabroomId,
        prelims: record(rs.filter((r) => !r.elim)),
        elims: record(rs.filter((r) => r.elim)),
        placement: placement(rs),
        avgPoints: pts.length ? Math.round((pts.reduce((a, b) => a + b, 0) / pts.length) * 100) / 100 : null,
      }
    })
  return { season: season.slug, label: season.label, school: d.school, pool, rounds: d.rounds, tournaments: lines }
}
