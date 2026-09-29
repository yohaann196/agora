import { ChevronRight, Flag, Info, Medal, Star } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { RatingChart } from '../components/ui/charts'
import { Avatar, pct } from '../components/ui/primitives'
import { NotFound } from '../features/workspace/NotFound'
import { schoolSlug, useDebater, useRankings } from '../rankings/data'
import type { RankedDebater, RoundResult } from '../rankings/types'
import { useOS } from '../store'
import { HeadToHead } from './HeadToHead'
import { CORRECTIONS_URL } from './links'
import { dateRange } from './RankingsPage'
import './profile.css'

const MEDAL: Record<string, string> = { Champion: 'gold', Finalist: 'silver', Semifinalist: 'bronze' }
const record = (rs: RoundResult[]) => `${rs.filter((r) => r.won).length}–${rs.filter((r) => !r.won).length}`
const winPct = (rs: RoundResult[]) => (rs.length ? Math.round((1000 * rs.filter((r) => r.won).length) / rs.length) / 10 : null)

export function DebaterPage() {
  const { id = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const file = useDebater(id)
  const d = file.state === 'ready' ? file.data : null
  const season = d?.seasons.find((s) => s.season === params.get('season')) ?? d?.seasons[0] ?? null
  const circuitLoad = useRankings({ season: season?.season ?? null })
  const allLoad = useRankings({ season: season?.season ?? null, view: 'all' })
  const [only, setOnly] = useState('')
  const following = useOS((s) => s.following.includes(id))
  const toggleFollow = useOS((s) => s.toggleFollow)
  const pushRecent = useOS((s) => s.pushRecent)

  const circuit = circuitLoad.state === 'ready' && circuitLoad.data.seasonSlug === season?.season ? circuitLoad.data : null
  const all = allLoad.state === 'ready' && allLoad.data.seasonSlug === season?.season ? allLoad.data : null
  const meCircuit = circuit?.debaters.find((x) => x.id === id) ?? null
  const meAll = all?.debaters.find((x) => x.id === id) ?? null
  const me: RankedDebater | null = meCircuit ?? meAll
  const list = meCircuit ? circuit : all
  const byId = useMemo(() => new Map((all?.debaters ?? []).map((x) => [x.id, x])), [all])

  useEffect(() => {
    if (d) {
      pushRecent({ kind: 'debater', id: d.id, label: d.name })
      document.title = `${d.name} — LD rankings · Resolved`
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d?.id])

  const bestWins = useMemo(() => {
    if (!season) return []
    const seen = new Set<string>()
    return season.rounds
      .filter((r) => r.won && byId.get(r.opp)?.rank)
      .sort((a, b) => byId.get(a.opp)!.rank! - byId.get(b.opp)!.rank!)
      .filter((r) => !seen.has(r.opp) && seen.add(r.opp))
      .slice(0, 5)
  }, [season, byId])

  if (file.state === 'error') return <NotFound what="debater" />
  if (!d || !season || !list) return <div className="wrap"><div className="skeleton" style={{ height: 520, marginTop: 40 }} /></div>

  const rounds = season.rounds
  const tName = (t: string) => season.tournaments.find((x) => x.t === t)?.name ?? t
  const pts = rounds.map((r) => r.points).filter((p): p is number => p !== null)
  const avgPts = pts.length ? (pts.reduce((a, b) => a + b, 0) / pts.length).toFixed(2) : '—'
  const rankedCount = list.debaters.filter((x) => x.rank !== null).length
  const topPct = me?.rank ? Math.max(1, Math.round((me.rank / rankedCount) * 100)) : null
  const elims = rounds.filter((r) => r.elim)
  const newestFirst = [...season.tournaments].reverse()
  const shown = newestFirst.filter((t) => !only || t.t === only)
  const chart = rounds.map((r) => ({ rating: r.rating, rd: r.rd, label: `${tName(r.t)} · ${r.round} vs ${r.oppName}`, group: tName(r.t), won: r.won }))
  const pickSeason = (slug: string) => {
    setOnly('')
    setParams(slug === d.seasons[0].season ? {} : { season: slug }, { replace: true })
  }

  return (
    <div className="wrap profile">
      <nav className="crumb pf-crumb" aria-label="Breadcrumb">
        <Link to="/rankings">LD rankings</Link>
        <ChevronRight size={13} />
        <Link to={`/schools/${schoolSlug(season.school)}`}>{season.school}</Link>
      </nav>

      <header className="pf-head">
        <Avatar name={d.name} size={84} />
        <div className="pf-id">
          <div className="eyebrow">Lincoln–Douglas · {d.seasons.length > 1 ? `${d.seasons.length} seasons` : `${season.label} season`}</div>
          <h1 className="pg-title pf-name">{d.name}</h1>
          <p className="pf-school">
            <Link to={`/schools/${schoolSlug(season.school)}`}>{season.school}</Link>
            {d.state && <span> · {d.state}</span>}
          </p>
        </div>
        <button className={`btn ${following ? 'primary' : ''}`} aria-pressed={following} onClick={() => toggleFollow(d.id, d.name)}>
          <Star /> {following ? 'Following' : 'Follow'}
        </button>
      </header>

      {d.seasons.length > 1 && (
        <div className="pf-seasons" role="tablist" aria-label="Season">
          {d.seasons.map((s) => (
            <button key={s.season} role="tab" aria-selected={s.season === season.season} onClick={() => pickSeason(s.season)}>
              <b>{s.label}</b>
              <span>{record(s.rounds)} · {s.tournaments.length} tournament{s.tournaments.length === 1 ? '' : 's'}</span>
            </button>
          ))}
        </div>
      )}

      <div className="pf-stats">
        <div className="pf-stat big">
          <span className="pf-k">{meCircuit ? 'Circuit rank' : 'National rank'}</span>
          <span className="pf-v">{me?.rank ? `#${me.rank}` : '—'}</span>
          <span className="pf-s">
            {topPct !== null ? `Top ${topPct}% of ${rankedCount.toLocaleString()}` : 'Unranked'}
            {meCircuit && all?.view === 'all' && meAll?.rank ? ` · #${meAll.rank} all tournaments` : ''}
          </span>
        </div>
        <div className="pf-stat">
          <span className="pf-k">Score</span>
          <span className="pf-v">{me?.score.toFixed(1) ?? '—'}</span>
          <span className="pf-s">Rating {me ? Math.round(me.rating) : '—'} ± {me ? Math.round(me.rd) : '—'}</span>
        </div>
        <div className="pf-stat">
          <span className="pf-k">Record</span>
          <span className="pf-v">{record(rounds)}</span>
          <span className="pf-s">Elims {record(elims)}</span>
        </div>
        <div className="pf-stat">
          <span className="pf-k">By side</span>
          <span className="pf-v sides"><span className="aff-t">{pct(winPct(rounds.filter((r) => r.side === 'aff')))}</span><span className="neg-t">{pct(winPct(rounds.filter((r) => r.side === 'neg')))}</span></span>
          <span className="pf-s">Aff · Neg win rate</span>
        </div>
        <div className="pf-stat">
          <span className="pf-k">Speaks</span>
          <span className="pf-v">{avgPts}</span>
          <span className="pf-s">Average points</span>
        </div>
      </div>

      {season.pool === 'local' && (
        <p className="pf-note">
          <Info size={15} /> No chain of opponents links {d.name.split(' ')[0]} to the national pool yet, so their rating can’t be compared nationally. They’re ranked on their state leaderboard.
        </p>
      )}

      <div className="pf-layout">
        <div className="pf-main">
          <section className="card pf-card">
            <h2 className="pf-h2">Rating over the {season.label} season</h2>
            <RatingChart points={chart} />
          </section>

          <section className="pf-card-list">
            <h2 className="pf-h2">Tournaments</h2>
            <div className="pf-tourneys">
              {newestFirst.map((t) => (
                <div key={t.t} className="card pf-tourney">
                  <div className="pt-top">
                    <b>{t.name}</b>
                    <span className={`tag ${t.level === 'circuit' ? 'gold' : ''}`}>{t.level === 'circuit' ? 'Circuit' : 'Local'}</span>
                  </div>
                  {(t.start || t.city || t.state) && <div className="pt-when dim">{[dateRange(t), [t.city, t.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}</div>}
                  <div className="pt-line">
                    <span>Prelims <b className="num">{t.prelims}</b></span>
                    {t.elims !== '0-0' && <span>Elims <b className="num">{t.elims}</b></span>}
                    {t.avgPoints && <span>Speaks <b className="num">{t.avgPoints.toFixed(1)}</b></span>}
                  </div>
                  {t.placement && (
                    <span className={`placement ${MEDAL[t.placement] ?? ''}`}>
                      {MEDAL[t.placement] && <Medal size={13} />} {t.placement}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="card pf-card">
            <div className="pf-h2-row">
              <h2 className="pf-h2">Round by round</h2>
              {season.tournaments.length > 1 && (
                <select className="select sm" value={only} onChange={(e) => setOnly(e.target.value)} aria-label="Show rounds from">
                  <option value="">All tournaments</option>
                  {newestFirst.map((t) => (
                    <option key={t.t} value={t.t}>{t.name}</option>
                  ))}
                </select>
              )}
            </div>
            {shown.map((t) => (
              <div key={t.t} className="pf-rounds">
                <h3 className="pr-t">{t.name}</h3>
                <div className="pr-table" role="table" aria-label={`Rounds at ${t.name}`}>
                  {rounds.filter((r) => r.t === t.t).map((r, i) => (
                    <RoundRow key={i} r={r} oppRank={byId.get(r.opp)?.rank ?? undefined} />
                  ))}
                </div>
              </div>
            ))}
          </section>
        </div>

        <aside className="pf-side">
          <HeadToHead key={season.season} debaters={list.debaters} initialA={me} initialB={null} compact />
          {bestWins.length > 0 && (
            <section className="card pf-card">
              <h2 className="pf-h2">Best wins</h2>
              <ol className="best-wins">
                {bestWins.map((r) => (
                  <li key={r.opp}>
                    <span className="bw-rank num">#{byId.get(r.opp)!.rank}</span>
                    <Link to={`/debaters/${r.opp}`}>
                      <b>{r.oppName}</b>
                      <span>{r.oppSchool}</span>
                    </Link>
                    <span className="dim">{r.round}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
          <section className="card pf-card pf-fix">
            <Flag size={15} />
            <p>
              Is this you? If a result is wrong, or you’d like this profile removed, <a href={CORRECTIONS_URL(d.name)} target="_blank" rel="noreferrer">send a correction or removal request</a>.
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}

function RoundRow({ r, oppRank }: { r: RoundResult; oppRank?: number }) {
  return (
    <div className="pr-row" role="row">
      <span className="pr-round" role="cell">{r.round}</span>
      <span role="cell"><span className={`tag ${r.side}`}>{r.side === 'aff' ? 'Aff' : 'Neg'}</span></span>
      <span className="pr-opp" role="cell">
        {r.opp ? <Link to={`/debaters/${r.opp}`}>{r.oppName}</Link> : <span>{r.oppName}</span>}
        <span className="dim">{r.oppSchool ? ` · ${r.oppSchool}` : ''}{oppRank ? ` · #${oppRank}` : ''}</span>
      </span>
      <span className={`pr-res ${r.won ? 'w' : 'l'}`} role="cell">{r.won ? 'W' : 'L'}{r.decision && r.decision !== '1-0' ? <small> {r.decision}</small> : null}</span>
      <span className="pr-pts num dim" role="cell">{r.points?.toFixed(1) ?? ''}</span>
      <span className="pr-rating num" role="cell">{Math.round(r.rating)}</span>
    </div>
  )
}
