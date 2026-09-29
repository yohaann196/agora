import { ArrowRight, FileStack, Globe, Newspaper, Search, Shield, Star, TableProperties, Trophy } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Sparkline } from '../components/ui/charts'
import { Avatar, RankChange, timeAgo } from '../components/ui/primitives'
import { currentBrief } from '../data/briefs'
import { RESOLUTION } from '../data/debateSeeds'
import { cards, docStats, formatSeconds } from '../research/docModel'
import { FORMATS } from '../research/formats'
import { useRankings } from '../rankings/data'
import { useOS } from '../store'
import './dashboard.css'

function greeting(d: Date) {
  const h = d.getHours()
  return h < 5 ? 'Late night prep' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export function Dashboard() {
  const name = useOS((s) => s.settings.name)
  const docs = useOS((s) => s.docs)
  const flows = useOS((s) => s.flows)
  const sources = useOS((s) => s.sources)
  const following = useOS((s) => s.following)
  const target = useOS((s) => s.cutTarget)
  const rankings = useRankings()
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  const data = rankings.state === 'ready' ? rankings.data : null
  const followed = useMemo(() => (data ? following.map((id) => data.debaters.find((d) => d.id === id)).filter((d) => !!d) : []), [data, following])
  const contentions = docs.filter((d) => d.type === 'contention')
  const blocks = docs.filter((d) => d.type === 'block')
  const totalCards = docs.reduce((n, d) => n + cards(d.content).filter((c) => c.body).length, 0)
  const recentDocs = [...docs].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5)

  const research = (e: FormEvent) => {
    e.preventDefault()
    navigate(q.trim() ? `/app/evidence?q=${encodeURIComponent(q.trim())}` : '/app/evidence')
  }

  return (
    <div className="page dash">
      <header className="dash-head">
        <div>
          <div className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          <h1 className="dash-title">{greeting(new Date())}{name ? `, ${name}` : ''}.</h1>
        </div>
        <form className="dash-search" onSubmit={research}>
          <Search size={17} aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find evidence: a topic, author or DOI" aria-label="Find evidence" />
          <button className="btn primary sm" type="submit">Search</button>
        </form>
      </header>

      <Link to={`/briefs/${currentBrief.id}`} className="dash-topic">
        <span className="dt-label">LD · Sep–Oct</span>
        <span className="dt-res">{RESOLUTION}</span>
        <span className="dt-cta"><Newspaper size={15} /> {currentBrief.month} brief <ArrowRight size={14} /></span>
      </Link>

      <div className="dash-grid">
        <section className="panel dash-prep">
          <div className="panel-head">
            <h3>Your prep</h3>
            <span className="dim">{totalCards} cards · {sources.length} sources</span>
          </div>
          <div className="dp-tiles">
            <Link to="/app/evidence" className="dp-tile"><Globe /><b>{sources.length}</b><span>Sources cut</span></Link>
            <Link to="/app/vaults?type=contention" className="dp-tile"><FileStack /><b>{contentions.length}</b><span>Contentions</span></Link>
            <Link to="/app/vaults?type=block" className="dp-tile"><Shield /><b>{blocks.length}</b><span>Blocks</span></Link>
            <Link to="/app/flow" className="dp-tile"><TableProperties /><b>{flows.length}</b><span>Flows</span></Link>
          </div>
          <ul className="dash-list">
            {recentDocs.map((d) => {
              const st = docStats(d.content)
              return (
                <li key={d.id}>
                  <Link to={`/app/vaults/${d.id}`}>
                    <span className={`doc-kind ${d.type}`}>{d.type === 'contention' ? 'Case' : d.type === 'block' ? 'Block' : d.type === 'speech' ? 'Speech' : 'File'}</span>
                    <span className="truncate dl-title">{d.title}</span>
                    {d.id === target && <span className="dc-target">Cutting into</span>}
                    <span className="dim dl-meta">{st.cards} cards · {formatSeconds(st.readSeconds)} · {timeAgo(d.updatedAt)}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="panel dash-follow">
          <div className="panel-head">
            <h3><Star size={15} /> Following</h3>
            <Link to="/rankings" className="btn ghost sm">Rankings <ArrowRight /></Link>
          </div>
          {followed.length ? (
            <ul className="dash-list">
              {followed.map((d) => (
                <li key={d.id}>
                  <Link to={`/debaters/${d.id}`}>
                    <span className="df-rank num">{d.rank ? `#${d.rank}` : '—'}</span>
                    <Avatar name={d.name} size={28} />
                    <span className="dl-who">
                      <b className="truncate">{d.name}</b>
                      <span className="truncate dim">{d.school}</span>
                    </span>
                    <Sparkline values={d.spark} width={56} height={20} />
                    <RankChange rank={d.rank} prev={d.prevRank} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty">
              <Trophy size={22} />
              <p>Follow teammates and rivals from the rankings to track them here.</p>
              <Link to="/rankings" className="btn sm">Browse the rankings</Link>
            </div>
          )}
          {data && (
            <div className="df-top">
              <span className="eyebrow">National top 3</span>
              {data.debaters.filter((d) => d.rank !== null).slice(0, 3).map((d) => (
                <Link key={d.id} to={`/debaters/${d.id}`}>
                  <b>{d.rank}</b> {d.name} <span className="dim">· {d.school}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="panel dash-flows">
          <div className="panel-head">
            <h3><TableProperties size={15} /> Flows</h3>
            <Link to="/app/flow" className="btn ghost sm">Timer <ArrowRight /></Link>
          </div>
          <ul className="dash-list">
            {flows.slice(0, 4).map((f) => (
              <li key={f.id}>
                <Link to={`/app/flow/${f.id}`}>
                  <span className="doc-kind flow">{FORMATS[f.format].short}</span>
                  <span className="truncate dl-title">{f.title}</span>
                  <span className="dim dl-meta">{timeAgo(f.updatedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="dash-new">
            {(['ld', 'pf', 'policy'] as const).map((f) => (
              <button key={f} className="btn sm" onClick={() => navigate(`/app/flow/${useOS.getState().createFlow(f)}`)}>
                New {FORMATS[f].short} flow
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
