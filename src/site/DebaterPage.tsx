import { ChevronRight, Flag, Medal, Star } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router'
import { RatingChart } from '../components/ui/charts'
import { Avatar, pct } from '../components/ui/primitives'
import { NotFound } from '../features/workspace/NotFound'
import { schoolSlug, useDebater, useRankings } from '../rankings/data'
import type { RoundResult } from '../rankings/types'
import { useOS } from '../store'
import { HeadToHead } from './HeadToHead'
import { CORRECTIONS_URL } from './links'
import './profile.css'

const MEDAL: Record<string, string> = { Champion: 'gold', Finalist: 'silver', Semifinalist: 'bronze' }

export function DebaterPage() {
  const { id = '' } = useParams()
  const rankings = useRankings()
  const file = useDebater(id)
  const following = useOS((s) => s.following.includes(id))
  const toggleFollow = useOS((s) => s.toggleFollow)
  const pushRecent = useOS((s) => s.pushRecent)

  const list = rankings.state === 'ready' ? rankings.data : null
  const d = file.state === 'ready' ? file.data : null
  const me = list?.debaters.find((x) => x.id === id) ?? null
  const byId = useMemo(() => new Map((list?.debaters ?? []).map((x) => [x.id, x])), [list])

  useEffect(() => {
    if (d) {
      pushRecent({ kind: 'debater', id: d.id, label: d.name })
      document.title = `${d.name} — LD rankings · Resolved`
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d?.id])

  const bestWins = useMemo(() => {
    if (!d) return []
    const seen = new Set<string>()
    return d.rounds
      .filter((r) => r.won && byId.has(r.opp))
      .sort((a, b) => byId.get(a.opp)!.rank - byId.get(b.opp)!.rank)
      .filter((r) => !seen.has(r.opp) && seen.add(r.opp))
      .slice(0, 5)
  }, [d, byId])

  if (file.state === 'error') return <NotFound what="debater" />
  if (!d || !list) return <div className="wrap"><div className="skeleton" style={{ height: 520, marginTop: 40 }} /></div>

  const pts = d.rounds.map((r) => r.points).filter((p): p is number => p !== null)
  const avgPts = pts.length ? (pts.reduce((a, b) => a + b, 0) / pts.length).toFixed(2) : '—'
  const topPct = me ? Math.max(1, Math.round((me.rank / list.debaters.length) * 100)) : null
  const byTournament = d.tournaments.map((t) => ({ t, rounds: d.rounds.filter((r) => r.t === t.t) }))
  const chart = d.rounds.map((r) => ({ rating: r.rating, rd: r.rd, label: `${d.tournaments.find((t) => t.t === r.t)?.name ?? r.t} · ${r.round} vs ${r.oppName}`, group: d.tournaments.find((t) => t.t === r.t)?.name ?? r.t, won: r.won }))

  return (
    <div className="wrap profile">
      <nav className="crumb pf-crumb" aria-label="Breadcrumb">
        <Link to="/rankings">LD rankings</Link>
        <ChevronRight size={13} />
        <Link to={`/schools/${schoolSlug(d.school)}`}>{d.school}</Link>
      </nav>

      <header className="pf-head">
        <Avatar name={d.name} size={84} />
        <div className="pf-id">
          <div className="eyebrow">Lincoln–Douglas · {d.season}</div>
          <h1 className="pg-title pf-name">{d.name}</h1>
          <p className="pf-school">
            <Link to={`/schools/${schoolSlug(d.school)}`}>{d.school}</Link>
            {d.state && <span> · {d.state}</span>}
          </p>
        </div>
        <button className={`btn ${following ? 'primary' : ''}`} aria-pressed={following} onClick={() => toggleFollow(d.id, d.name)}>
          <Star /> {following ? 'Following' : 'Follow'}
        </button>
      </header>

      <div className="pf-stats">
        <div className="pf-stat big">
          <span className="pf-k">Rank</span>
          <span className="pf-v">#{me?.rank ?? '—'}</span>
          <span className="pf-s">{topPct !== null ? `Top ${topPct}% of ${list.debaters.length}` : 'Unranked'}</span>
        </div>
        <div className="pf-stat">
          <span className="pf-k">Score</span>
          <span className="pf-v">{me?.score.toFixed(1) ?? '—'}</span>
          <span className="pf-s">Rating {me ? Math.round(me.rating) : '—'} ± {me ? Math.round(me.rd) : '—'}</span>
        </div>
        <div className="pf-stat">
          <span className="pf-k">Record</span>
          <span className="pf-v">{me?.wins ?? 0}–{me?.losses ?? 0}</span>
          <span className="pf-s">Elims {me?.elimWins ?? 0}–{me?.elimLosses ?? 0}</span>
        </div>
        <div className="pf-stat">
          <span className="pf-k">By side</span>
          <span className="pf-v sides"><span className="aff-t">{pct(me?.affWinRate ?? null)}</span><span className="neg-t">{pct(me?.negWinRate ?? null)}</span></span>
          <span className="pf-s">Aff · Neg win rate</span>
        </div>
        <div className="pf-stat">
          <span className="pf-k">Speaks</span>
          <span className="pf-v">{avgPts}</span>
          <span className="pf-s">Average prelim points</span>
        </div>
      </div>

      <div className="pf-layout">
        <div className="pf-main">
          <section className="card pf-card">
            <h2 className="pf-h2">Rating over the season</h2>
            <RatingChart points={chart} />
          </section>

          <section className="pf-card-list">
            <h2 className="pf-h2">Tournaments</h2>
            <div className="pf-tourneys">
              {d.tournaments.map((t) => (
                <div key={t.t} className="card pf-tourney">
                  <div className="pt-top">
                    <b>{t.name}</b>
                    {t.major && <span className="tag gold">Major</span>}
                  </div>
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
            <h2 className="pf-h2">Round by round</h2>
            {byTournament.map(({ t, rounds }) => (
              <div key={t.t} className="pf-rounds">
                <h3 className="pr-t">{t.name}</h3>
                <div className="pr-table" role="table" aria-label={`Rounds at ${t.name}`}>
                  {rounds.map((r, i) => (
                    <RoundRow key={i} r={r} oppRank={byId.get(r.opp)?.rank} />
                  ))}
                </div>
              </div>
            ))}
          </section>
        </div>

        <aside className="pf-side">
          <HeadToHead debaters={list.debaters} initialA={me} initialB={null} compact />
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
        <Link to={`/debaters/${r.opp}`}>{r.oppName}</Link>
        <span className="dim"> · {r.oppSchool}{oppRank ? ` · #${oppRank}` : ''}</span>
      </span>
      <span className={`pr-res ${r.won ? 'w' : 'l'}`} role="cell">{r.won ? 'W' : 'L'}{r.decision && r.decision !== '1-0' ? <small> {r.decision}</small> : null}</span>
      <span className="pr-pts num dim" role="cell">{r.points?.toFixed(1) ?? ''}</span>
      <span className="pr-rating num" role="cell">{Math.round(r.rating)}</span>
    </div>
  )
}
