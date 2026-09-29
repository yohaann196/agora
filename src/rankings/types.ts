/** Shapes of the generated rankings data (public/data/<event>/…). */

/** Circuit tournaments come from the national-circuit datasets; local ones are uploaded. */
export type Level = 'circuit' | 'local'
/** Which rankings view a file holds: debaters with a circuit tournament, or everyone. */
export type PoolView = 'circuit' | 'all'

export interface TournamentMeta {
  slug: string
  name: string
  level: Level
  /** ISO dates (YYYY-MM-DD); empty when the source doesn't say. */
  start: string
  end: string
  city: string
  state: string
  tabroomId: number | null
  entries: number
  rounds: number
  /** The topic period this tournament belongs to, e.g. "sepoct". */
  period: string
}

export interface FieldStats {
  affWinRate: number | null
  negWinRate: number | null
  affElimWinRate: number | null
  negElimWinRate: number | null
  rounds: number
}

export interface RankedDebater {
  id: string
  name: string
  school: string
  state: string
  /** Null when unranked in this view (fewer than the minimum rounds, or outside the main pool). */
  rank: number | null
  /** Rank a week before the most recent results, if ranked then. */
  prevRank: number | null
  /** Rating − 2 × deviation, the ranking score. */
  score: number
  rating: number
  rd: number
  wins: number
  losses: number
  elimWins: number
  elimLosses: number
  affWinRate: number | null
  negWinRate: number | null
  affElimWinRate: number | null
  negElimWinRate: number | null
  tournaments: number
  /** Has at least one circuit tournament. */
  circuit: boolean
  /** "local" when no chain of opponents links this debater to the national pool. */
  pool: 'main' | 'local'
  /** Rating after each of the debater's most recent rounds (for sparklines). */
  spark: number[]
}

export interface Period {
  slug: string
  label: string
}

export interface SourceInfo {
  name: string
  repo: string
  commit: string
  committedAt: string
}

export interface RankingsFile {
  event: 'hsld'
  eventLabel: string
  /** Season slug, e.g. "2026-27", and its label, "2026–27". */
  seasonSlug: string
  season: string
  view: PoolView
  /** Whether the season has local tournaments (and so an all-tournaments view). */
  hasLocal: boolean
  period: Period
  periods: Period[]
  generatedAt: string
  /** When the newest source data was committed. */
  updatedAt: string
  tournaments: TournamentMeta[]
  field: FieldStats
  debaters: RankedDebater[]
}

export interface SeasonInfo {
  slug: string
  label: string
  tournaments: number
  circuitTournaments: number
  rounds: number
  debaters: number
  hasLocal: boolean
  periods: Period[]
}

/** public/data/ld/index.json: what seasons exist and how much data is behind them. */
export interface LdIndex {
  generatedAt: string
  current: string
  seasons: SeasonInfo[]
  totals: { seasons: number; tournaments: number; rounds: number; debaters: number }
  sources: SourceInfo[]
}

export interface RoundResult {
  /** Tournament slug. */
  t: string
  round: string
  elim: boolean
  side: 'aff' | 'neg'
  opp: string
  oppName: string
  oppSchool: string
  won: boolean
  /** Ballot count, e.g. "2-1", when a panel judged the round. */
  decision: string
  points: number | null
  /** Rating and deviation after this round. */
  rating: number
  rd: number
}

export interface TournamentLine {
  t: string
  name: string
  level: Level
  start: string
  end: string
  city: string
  state: string
  tabroomId: number | null
  prelims: string
  elims: string
  placement: string | null
  avgPoints: number | null
}

export interface DebaterSeason {
  season: string
  label: string
  school: string
  pool: 'main' | 'local'
  rounds: RoundResult[]
  tournaments: TournamentLine[]
}

/** public/data/ld/debaters/<id>.json: a debater's whole career, newest season first. */
export interface DebaterFile {
  id: string
  name: string
  school: string
  state: string
  seasons: DebaterSeason[]
}
