/**
 * Turns Tabroom round results into Glicko-2 rankings and debater profiles.
 *
 * The method follows the public debate-rankings project
 * (github.com/shreerammodi/debate-rankings): every decided round is a
 * Glicko-2 game, rounds are processed in tournament order, majors count
 * twice, and debaters are ranked by rating − 2 × deviation. The code here is
 * an independent implementation.
 */
import { parseTable } from './csv'
import { START, conservative, update, type Rating } from './glicko2'
import type { DebaterFile, FieldStats, RankedDebater, RoundResult, TournamentLine, TournamentMeta } from './types'

export interface RankingsConfig {
  tournaments: string[]
  majors: string[]
  multi_team_debaters: string[]
  topic_boundaries?: { sepoct_end?: string; novdec_end?: string }
}

export interface RawTournament {
  slug: string
  /** entries.csv text. */
  entries: string
  /** Round files, in any order; they are sorted by name like the reference. */
  files: { name: string; text: string }[]
}

export const PERIODS = [
  { slug: 'sepoct', label: 'Sep–Oct topic' },
  { slug: 'novdec', label: 'Nov–Dec topic' },
  { slug: 'janfeb', label: 'Jan–Feb topic' },
] as const

const ELIM_ORDER = ['Finals', 'Semifinals', 'Quarterfinals', 'Octafinals', 'Doubles', 'Triples', 'Quads'] as const
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

/** Identity: institution + name, or name alone for debaters who compete for several schools. */
export function identityKey(institution: string, name: string, multiTeam: string[]) {
  const n = normalizeName(name)
  return multiTeam.includes(n) ? n : `${institution}|${n}`
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

const average = (cell: string | undefined) => {
  const nums = (cell ?? '').split(/\s+/).map(Number).filter((n) => Number.isFinite(n) && n > 0)
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null
}

interface ParsedRound {
  label: string
  elim: boolean
  rows: Record<string, string>[]
}

/** Parse and label a tournament's round files in order. */
export function parseRounds(t: RawTournament): ParsedRound[] {
  const files = [...t.files].filter((f) => f.name.endsWith('.csv') && !f.name.startsWith('entries')).sort((a, b) => a.name.localeCompare(b.name))
  const parsed = files.map((f) => {
    const { headers, rows } = parseTable(f.text)
    const named = ELIM_TERMS.find(([re]) => re.test(f.name))
    const panelOnly = headers.includes('Judges') && headers.includes('Votes') && !headers.some((h) => /points/i.test(h))
    const numbered = f.name.match(/round-(\d+)/i)
    return { file: f.name, named: named?.[1], elim: !!named || panelOnly, numbered: numbered ? Number(numbered[1]) : null, rows }
  })
  // Unnamed elim files (Tabroom-123.csv) are labelled by bracket size, working back from the last:
  // a round with n pairings is at least the level that holds n (1 final, 2 semis, 4 quarters…),
  // and each earlier round is at least one level larger. This copes with closeouts (fewer rows)
  // and with a missing final (the last file is then the semis).
  const unnamedElims = parsed.filter((p) => p.elim && !p.named)
  const levels = new Map<(typeof parsed)[number], number>()
  let prev = -1
  for (const p of [...unnamedElims].reverse()) {
    const fits = Math.max(0, Math.ceil(Math.log2(Math.max(1, p.rows.length))))
    prev = Math.max(prev + 1, fits)
    levels.set(p, prev)
  }
  let prelim = 0
  return parsed.map((p) => {
    if (!p.elim) {
      prelim++
      return { label: `Round ${p.numbered ?? prelim}`, elim: false, rows: p.rows }
    }
    if (p.named) return { label: p.named, elim: true, rows: p.rows }
    const level = levels.get(p) ?? 0
    return { label: ELIM_ORDER[level] ?? `Elim ${unnamedElims.indexOf(p) + 1}`, elim: true, rows: p.rows }
  })
}

interface DebaterState {
  id: string
  key: string
  name: string
  school: string
  state: string
  rating: Rating
  rounds: RoundResult[]
  tournaments: Set<string>
}

const pct = (w: number, n: number) => (n ? Math.round((1000 * w) / n) / 10 : null)

export interface RankingsResult {
  debaters: DebaterState[]
  tournaments: TournamentMeta[]
  field: FieldStats
}

/** Split the configured tournaments into topic periods using the config's boundaries. */
export function periodOf(config: RankingsConfig): Record<string, string> {
  const out: Record<string, string> = {}
  let period = 0
  for (const t of config.tournaments) {
    out[t] = PERIODS[period].slug
    if (t === config.topic_boundaries?.sepoct_end && period === 0) period = 1
    else if (t === config.topic_boundaries?.novdec_end && period <= 1) period = 2
  }
  return out
}

export function computeRankings(
  config: RankingsConfig,
  data: Map<string, RawTournament>,
  opts: { names?: Record<string, string>; only?: string[] } = {},
): RankingsResult {
  const periods = periodOf(config)
  const bySlugKey = new Map<string, DebaterState>()
  const usedIds = new Set<string>()
  const tournaments: TournamentMeta[] = []
  const field = { aff: 0, affN: 0, neg: 0, negN: 0, affE: 0, affEN: 0, negE: 0, negEN: 0 }

  for (const slug of opts.only ?? config.tournaments) {
    const t = data.get(slug)
    if (!t) continue
    const major = config.majors.includes(slug)
    const weight = major ? 2 : 1

    // Map this tournament's entry codes to debaters.
    const codeTo = new Map<string, DebaterState>()
    for (const e of parseTable(t.entries).rows) {
      if (!e.Code || !e.Entry) continue
      const key = identityKey(e.Institution, e.Entry, config.multi_team_debaters)
      let d = bySlugKey.get(key)
      if (!d) {
        const name = normalizeName(e.Entry)
        let id = slugify(`${name} ${e.Institution}`)
        for (let n = 2; usedIds.has(id); n++) id = slugify(`${name} ${e.Institution} ${n}`)
        usedIds.add(id)
        d = { id, key, name, school: e.Institution, state: (e.Location ?? '').replace(/\/US$/, ''), rating: { ...START }, rounds: [], tournaments: new Set() }
        bySlugKey.set(key, d)
      } else {
        d.school = e.Institution
        if (e.Location) d.state = e.Location.replace(/\/US$/, '')
      }
      codeTo.set(e.Code.replace(/\s+/g, ' ').trim(), d)
    }

    const rounds = parseRounds(t)
    let decided = 0
    for (const round of rounds) {
      // Every match in a round uses ratings from before the round, like one timestamp in the reference.
      const updates: { d: DebaterState; next: Rating; r: RoundResult }[] = []
      for (const row of round.rows) {
        const aff = codeTo.get((row.Aff ?? row.Pro ?? '').replace(/\s+/g, ' ').trim())
        const neg = codeTo.get((row.Neg ?? row.Con ?? '').replace(/\s+/g, ' ').trim())
        const winner = parseWinner(row.Win ?? '')
        if (!aff || !neg || !winner || aff === neg) continue
        decided++
        const votes = (row.Win ?? '').match(/(\d+)\s*-\s*(\d+)/)
        const decision = votes ? `${votes[1]}-${votes[2]}` : ''
        for (const [me, opp, side] of [
          [aff, neg, 'aff'],
          [neg, aff, 'neg'],
        ] as const) {
          const won = winner === side
          let next = me.rating
          for (let i = 0; i < weight; i++) next = update(next, [{ opponent: opp.rating, score: won ? 1 : 0 }])
          const points = average(side === 'aff' ? row['Aff Points'] : row['Neg Points'])
          updates.push({
            d: me,
            next,
            r: { t: slug, round: round.label, elim: round.elim, side, opp: opp.id, oppName: opp.name, oppSchool: opp.school, won, decision, points: points && Math.round(points * 10) / 10, rating: 0, rd: 0 },
          })
        }
        if (winner === 'aff') field.aff++
        else field.neg++
        field.affN++
        field.negN++
        if (round.elim) {
          if (winner === 'aff') field.affE++
          else field.negE++
          field.affEN++
          field.negEN++
        }
      }
      // A debater appears at most once per round; apply after all matches are scored.
      for (const u of updates) {
        u.d.rating = u.next
        u.r.rating = Math.round(u.next.r * 10) / 10
        u.r.rd = Math.round(u.next.rd * 10) / 10
        u.d.rounds.push(u.r)
        u.d.tournaments.add(slug)
      }
    }
    tournaments.push({ slug, name: opts.names?.[slug] ?? titleFromSlug(slug), major, entries: codeTo.size, rounds: decided, period: periods[slug] ?? 'sepoct' })
  }

  const fieldStats: FieldStats = {
    affWinRate: pct(field.aff, field.affN),
    negWinRate: pct(field.neg, field.negN),
    affElimWinRate: pct(field.affE, field.affEN),
    negElimWinRate: pct(field.negE, field.negEN),
    rounds: field.affN,
  }
  return { debaters: [...bySlugKey.values()].filter((d) => d.rounds.length), tournaments, field: fieldStats }
}

const winRate = (rs: RoundResult[], side: 'aff' | 'neg', elim?: boolean) => {
  const set = rs.filter((r) => r.side === side && (elim === undefined || r.elim === elim))
  return pct(set.filter((r) => r.won).length, set.length)
}

export function rankList(result: RankingsResult, previous?: RankingsResult): RankedDebater[] {
  const prevRank = new Map<string, number>()
  if (previous) {
    ;[...previous.debaters]
      .sort((a, b) => conservative(b.rating) - conservative(a.rating))
      .forEach((d, i) => prevRank.set(d.id, i + 1))
  }
  return [...result.debaters]
    .sort((a, b) => conservative(b.rating) - conservative(a.rating))
    .map((d, i) => {
      const rs = d.rounds
      return {
        id: d.id,
        name: d.name,
        school: d.school,
        state: d.state,
        rank: i + 1,
        prevRank: prevRank.get(d.id) ?? null,
        score: Math.round(conservative(d.rating) * 100) / 100,
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

export function debaterFile(d: DebaterState, tournaments: TournamentMeta[], season: string): DebaterFile {
  const lines: TournamentLine[] = tournaments
    .filter((t) => d.tournaments.has(t.slug))
    .map((t) => {
      const rs = d.rounds.filter((r) => r.t === t.slug)
      const pts = rs.map((r) => r.points).filter((p): p is number => p !== null)
      return {
        t: t.slug,
        name: t.name,
        major: t.major,
        prelims: record(rs.filter((r) => !r.elim)),
        elims: record(rs.filter((r) => r.elim)),
        placement: placement(rs),
        avgPoints: pts.length ? Math.round((pts.reduce((a, b) => a + b, 0) / pts.length) * 100) / 100 : null,
      }
    })
  return { id: d.id, name: d.name, school: d.school, state: d.state, season, rounds: d.rounds, tournaments: lines }
}
