import { ChevronRight } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useParams } from 'react-router'
import { Sparkline } from '../components/ui/charts'
import { Avatar, pct } from '../components/ui/primitives'
import { NotFound } from '../features/workspace/NotFound'
import { schoolSlug, useRankings } from '../rankings/data'
import './profile.css'
import './rankings.css'

export function SchoolPage() {
  const { slug = '' } = useParams()
  const load = useRankings({ view: 'all' })
  const data = load.state === 'ready' ? load.data : null
  const members = useMemo(() => (data ? data.debaters.filter((d) => schoolSlug(d.school) === slug) : []), [data, slug])

  if (load.state === 'loading') return <div className="wrap"><div className="skeleton" style={{ height: 400, marginTop: 40 }} /></div>
  if (!data || !members.length) return <NotFound what="school" />

  const school = members[0].school
  const wins = members.reduce((n, d) => n + d.wins, 0)
  const losses = members.reduce((n, d) => n + d.losses, 0)
  const elimW = members.reduce((n, d) => n + d.elimWins, 0)
  const elimL = members.reduce((n, d) => n + d.elimLosses, 0)
  const topCount = members.filter((d) => d.rank !== null && d.rank <= 50).length

  return (
    <div className="wrap profile">
      <nav className="crumb pf-crumb" aria-label="Breadcrumb">
        <Link to="/rankings">LD rankings</Link>
        <ChevronRight size={13} />
        <span>School</span>
      </nav>
      <header className="pf-head">
        <Avatar name={school} size={84} />
        <div className="pf-id">
          <div className="eyebrow">Lincoln–Douglas · {data.season}</div>
          <h1 className="pg-title pf-name">{school}</h1>
          <p className="pf-school">{members[0].state || '—'} · {members.length} ranked debater{members.length === 1 ? '' : 's'}</p>
        </div>
      </header>
      <div className="pf-stats">
        <div className="pf-stat big">
          <span className="pf-k">Best ranked</span>
          <span className="pf-v">#{members[0].rank}</span>
          <span className="pf-s">{members[0].name}</span>
        </div>
        <div className="pf-stat">
          <span className="pf-k">Top 50</span>
          <span className="pf-v">{topCount}</span>
          <span className="pf-s">debaters in the top 50</span>
        </div>
        <div className="pf-stat">
          <span className="pf-k">Record</span>
          <span className="pf-v">{wins}–{losses}</span>
          <span className="pf-s">{pct((100 * wins) / Math.max(1, wins + losses))} of rounds won</span>
        </div>
        <div className="pf-stat">
          <span className="pf-k">Elims</span>
          <span className="pf-v">{elimW}–{elimL}</span>
          <span className="pf-s">elimination rounds</span>
        </div>
        <div className="pf-stat">
          <span className="pf-k">Field</span>
          <span className="pf-v">{data.debaters.length}</span>
          <span className="pf-s">debaters ranked nationally</span>
        </div>
      </div>
      <div className="rk-table" role="table" aria-label={`${school} debaters`}>
        <div className="rk-row rk-headrow" role="row">
          <span role="columnheader">#</span>
          <span role="columnheader" className="c-change" />
          <span role="columnheader">Debater</span>
          <span role="columnheader" className="c-num">Score</span>
          <span role="columnheader" className="c-num">Record</span>
          <span role="columnheader" className="c-num c-hide-md">Aff</span>
          <span role="columnheader" className="c-num c-hide-md">Neg</span>
          <span role="columnheader" className="c-num c-hide-md">Elims</span>
          <span role="columnheader" className="c-hide-sm">Trend</span>
          <span role="columnheader" />
        </div>
        {members.map((d) => (
          <div key={d.id} className="rk-row" role="row">
            <span className="c-rank num" role="cell">{d.rank}</span>
            <span className="c-change" role="cell" />
            <span className="c-who" role="cell">
              <Avatar name={d.name} size={30} />
              <span className="c-who-text">
                <Link to={`/debaters/${d.id}`} className="c-name">{d.name}</Link>
                <span className="c-school">{d.tournaments} tournament{d.tournaments === 1 ? '' : 's'}</span>
              </span>
            </span>
            <span className="c-num c-score num" role="cell">{d.score.toFixed(1)}</span>
            <span className="c-num num" role="cell">{d.wins}–{d.losses}</span>
            <span className="c-num c-hide-md num" role="cell">{pct(d.affWinRate)}</span>
            <span className="c-num c-hide-md num" role="cell">{pct(d.negWinRate)}</span>
            <span className="c-num c-hide-md num" role="cell">{d.elimWins + d.elimLosses ? `${d.elimWins}–${d.elimLosses}` : '—'}</span>
            <span className="c-hide-sm" role="cell"><Sparkline values={d.spark} /></span>
            <span role="cell" />
          </div>
        ))}
      </div>
    </div>
  )
}
