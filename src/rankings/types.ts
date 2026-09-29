/** Shapes of the generated rankings data (public/data/<event>/…). */

export interface TournamentMeta {
  slug: string
  name: string
  major: boolean
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
  rank: number
  /** Rank before the most recent tournament, if ranked then. */
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
  /** Rating after each of the debater's most recent rounds (for sparklines). */
  spark: number[]
}

export interface Period {
  slug: string
  label: string
}

export interface RankingsFile {
  event: 'hsld'
  eventLabel: string
  season: string
  period: Period
  periods: Period[]
  generatedAt: string
  source: { repo: string; commit: string; committedAt: string }
  tournaments: TournamentMeta[]
  field: FieldStats
  debaters: RankedDebater[]
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
  major: boolean
  prelims: string
  elims: string
  placement: string | null
  avgPoints: number | null
}

export interface DebaterFile {
  id: string
  name: string
  school: string
  state: string
  season: string
  rounds: RoundResult[]
  tournaments: TournamentLine[]
}
