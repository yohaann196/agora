import { ArrowDownWideNarrow, Info, Search, Star, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Avatar, RankChange, pct } from '../components/ui/primitives'
import { Sparkline } from '../components/ui/charts'
import { schoolSlug, useRankings } from '../rankings/data'
import type { RankedDebater, RankingsFile } from '../rankings/types'
import { useOS } from '../store'
import { HeadToHead } from './HeadToHead'
import './rankings.css'

type SortKey = 'score' | 'rating' | 'wins' | 'affWinRate' | 'negWinRate' | 'elimWins'
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'score', label: 'Score' },
  { key: 'rating', label: 'Rating' },
  { key: 'wins', label: 'Wins' },
  { key: 'affWinRate', label: 'Aff %' },
  { key: 'negWinRate', label: 'Neg %' },
  { key: 'elimWins', label: 'Elim wins' },
]
const PAGE = 50

export const updatedLabel = (f: RankingsFile) => new Date(f.source.committedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })

function Podium({ top }: { top: RankedDebater[] }) {
  return (
    <div className="podium">
      {top.map((d) => (
        <Link key={d.id} to={`/debaters/${d.id}`} className={`podium-card p${d.rank}`}>
          <span className="pd-rank">{d.rank}</span>
          <Avatar name={d.name} size={46} />
          <span className="pd-name">{d.name}</span>
          <span className="pd-school">{d.school}</span>
          <span className="pd-stats">
            <b className="num">{d.score.toFixed(0)}</b> score · {d.wins}–{d.losses}
          </span>
        </Link>
      ))}
    </div>
  )
}

export function RankingsPage() {
  const [params, setParams] = useSearchParams()
  const period = params.get('period') ?? 'season'
  const load = useRankings(period)
  const [q, setQ] = useState('')
  const [state, setState] = useState('')
  const [onlyFollowing, setOnlyFollowing] = useState(false)
  const [sort, setSort] = useState<SortKey>('score')
  const [limit, setLimit] = useState(PAGE)
  const following = useOS((s) => s.following)
  const toggleFollow = useOS((s) => s.toggleFollow)

  const data = load.state === 'ready' ? load.data : null
  const states = useMemo(() => (data ? [...new Set(data.debaters.map((d) => d.state).filter(Boolean))].sort() : []), [data])
  const rows = useMemo(() => {
    if (!data) return []
    const t = q.trim().toLowerCase()
    const list = data.debaters.filter(
      (d) => (!t || `${d.name} ${d.school}`.toLowerCase().includes(t)) && (!state || d.state === state) && (!onlyFollowing || following.includes(d.id)),
    )
    if (sort === 'score') return list
    return [...list].sort((a, b) => ((b[sort] ?? -1) as number) - ((a[sort] ?? -1) as number) || a.rank - b.rank)
  }, [data, q, state, onlyFollowing, following, sort])

  return (
    <div className="wrap rankings">
      <header className="pg-head">
        <div className="eyebrow">Lincoln–Douglas · {data?.season ?? '2026–27'} season · unofficial</div>
        <h1 className="pg-title">LD Rankings</h1>
        <p className="pg-lede">
          Every varsity LD debater with a decided round at a tracked national-circuit tournament, rated with Glicko-2 and ranked by rating minus two deviations.{' '}
          <Link to="/rankings/method" className="inline-link">How it works <Info size={13} /></Link>
        </p>
        {data && (
          <div className="rk-meta">
            <span><b>{data.debaters.length}</b> debaters</span>
            <span><b>{data.tournaments.length}</b> tournaments</span>
            <span><b>{data.field.rounds.toLocaleString()}</b> rounds</span>
            <span>Updated {updatedLabel(data)}</span>
          </div>
        )}
      </header>

      {load.state === 'error' && <div className="caption">Couldn’t load the rankings. Check your connection and reload.</div>}
      {load.state === 'loading' && <div className="skeleton" style={{ height: 420 }} />}

      {data && (
        <>
          {data.periods.length > 1 && (
            <div className="seg rk-periods" role="tablist" aria-label="Period">
              {data.periods.map((p) => (
                <button key={p.slug} role="tab" aria-selected={period === p.slug} onClick={() => setParams(p.slug === 'season' ? {} : { period: p.slug }, { replace: true })}>
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {!q && !state && !onlyFollowing && sort === 'score' && <Podium top={data.debaters.slice(0, 3)} />}

          <div className="rk-layout">
            <section className="rk-main">
              <div className="rk-controls">
                <label className="rk-search">
                  <Search size={15} aria-hidden />
                  <input value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE) }} placeholder="Search a debater or school" aria-label="Search debaters" />
                </label>
                <select className="select rk-state" value={state} onChange={(e) => { setState(e.target.value); setLimit(PAGE) }} aria-label="Filter by state">
                  <option value="">All states</option>
                  {states.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <label className="rk-sort">
                  <ArrowDownWideNarrow size={15} aria-hidden />
                  <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort by">
                    {SORTS.map((s) => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                </label>
                <button className={`btn sm ${onlyFollowing ? 'primary' : ''}`} aria-pressed={onlyFollowing} onClick={() => setOnlyFollowing((v) => !v)}>
                  <Star /> Following {following.length ? `(${following.length})` : ''}
                </button>
              </div>

              <div className="rk-table" role="table" aria-label="LD rankings">
                <div className="rk-row rk-headrow" role="row">
                  <span role="columnheader">#</span>
                  <span role="columnheader" className="c-change">±</span>
                  <span role="columnheader">Debater</span>
                  <span role="columnheader" className="c-num">Score</span>
                  <span role="columnheader" className="c-num">Record</span>
                  <span role="columnheader" className="c-num c-hide-md">Aff</span>
                  <span role="columnheader" className="c-num c-hide-md">Neg</span>
                  <span role="columnheader" className="c-num c-hide-md">Elims</span>
                  <span role="columnheader" className="c-hide-sm">Trend</span>
                  <span role="columnheader" className="sr-only">Follow</span>
                </div>
                {rows.slice(0, limit).map((d) => {
                  const on = following.includes(d.id)
                  return (
                    <div key={d.id} className="rk-row" role="row">
                      <span className="c-rank num" role="cell">{d.rank}</span>
                      <span className="c-change" role="cell"><RankChange rank={d.rank} prev={d.prevRank} /></span>
                      <span className="c-who" role="cell">
                        <Avatar name={d.name} size={30} />
                        <span className="c-who-text">
                          <Link to={`/debaters/${d.id}`} className="c-name">{d.name}</Link>
                          <Link to={`/schools/${schoolSlug(d.school)}`} className="c-school">{d.school}{d.state ? ` · ${d.state}` : ''}</Link>
                        </span>
                      </span>
                      <span className="c-num c-score num" role="cell">{d.score.toFixed(1)}</span>
                      <span className="c-num num" role="cell">{d.wins}–{d.losses}</span>
                      <span className="c-num c-hide-md num" role="cell">{pct(d.affWinRate)}</span>
                      <span className="c-num c-hide-md num" role="cell">{pct(d.negWinRate)}</span>
                      <span className="c-num c-hide-md num" role="cell">{d.elimWins + d.elimLosses ? `${d.elimWins}–${d.elimLosses}` : '—'}</span>
                      <span className="c-hide-sm" role="cell"><Sparkline values={d.spark} /></span>
                      <span role="cell">
                        <button className={`follow ${on ? 'on' : ''}`} aria-pressed={on} aria-label={on ? `Unfollow ${d.name}` : `Follow ${d.name}`} onClick={() => toggleFollow(d.id, d.name)}>
                          <Star size={15} />
                        </button>
                      </span>
                    </div>
                  )
                })}
                {!rows.length && <div className="empty">No debaters match those filters.</div>}
              </div>
              {rows.length > limit && (
                <button className="btn rk-more" onClick={() => setLimit((l) => l + PAGE * 2)}>
                  Show more · {rows.length - limit} left
                </button>
              )}
            </section>

            <aside className="rk-side">
              <HeadToHead debaters={data.debaters} />
              <section className="card field-card">
                <h3><Trophy size={16} /> The field this {data.period.slug === 'season' ? 'season' : 'topic'}</h3>
                <div className="fc-split">
                  <div>
                    <span className="eyebrow">All rounds</span>
                    <div className="side-bar"><i className="a" style={{ width: `${data.field.affWinRate ?? 50}%` }} /><i className="n" style={{ width: `${data.field.negWinRate ?? 50}%` }} /></div>
                    <div className="fc-nums"><span className="aff-t">Aff {pct(data.field.affWinRate)}</span><span className="neg-t">Neg {pct(data.field.negWinRate)}</span></div>
                  </div>
                  <div>
                    <span className="eyebrow">Elims</span>
                    <div className="side-bar"><i className="a" style={{ width: `${data.field.affElimWinRate ?? 50}%` }} /><i className="n" style={{ width: `${data.field.negElimWinRate ?? 50}%` }} /></div>
                    <div className="fc-nums"><span className="aff-t">Aff {pct(data.field.affElimWinRate)}</span><span className="neg-t">Neg {pct(data.field.negElimWinRate)}</span></div>
                  </div>
                </div>
                <ul className="fc-tourneys">
                  {data.tournaments.map((t) => (
                    <li key={t.slug}>
                      <span>{t.name}</span>
                      {t.major && <span className="tag gold">Major ×2</span>}
                      <span className="dim num">{t.entries}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </aside>
          </div>
        </>
      )}
    </div>
  )
}
