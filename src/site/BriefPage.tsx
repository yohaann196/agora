import { ChevronRight, Info, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { briefById, briefs, type BriefBlock } from '../data/briefs'
import { NotFound } from '../features/workspace/NotFound'
import { pct } from '../components/ui/primitives'
import { useRankings } from '../rankings/data'
import { useOS } from '../store'
import { BriefCover } from './BriefsPage'
import './briefs.css'

function FieldData() {
  const load = useRankings()
  if (load.state !== 'ready') return <div className="skeleton" style={{ height: 120 }} />
  const f = load.data.field
  const lean = (f.negWinRate ?? 50) - (f.affWinRate ?? 50)
  const elimLean = (f.negElimWinRate ?? 50) - (f.affElimWinRate ?? 50)
  return (
    <div className="brief-data">
      <div className="bd-row">
        <span className="bd-label">All rounds</span>
        <div className="side-bar big"><i className="a" style={{ width: `${f.affWinRate}%` }} /><i className="n" style={{ width: `${f.negWinRate}%` }} /></div>
        <span className="bd-nums"><b className="aff-t">Aff {pct(f.affWinRate)}</b> · <b className="neg-t">Neg {pct(f.negWinRate)}</b></span>
      </div>
      <div className="bd-row">
        <span className="bd-label">Elims</span>
        <div className="side-bar big"><i className="a" style={{ width: `${f.affElimWinRate}%` }} /><i className="n" style={{ width: `${f.negElimWinRate}%` }} /></div>
        <span className="bd-nums"><b className="aff-t">Aff {pct(f.affElimWinRate)}</b> · <b className="neg-t">Neg {pct(f.negElimWinRate)}</b></span>
      </div>
      <p className="bd-summary">
        Across {f.rounds.toLocaleString()} decided rounds at {load.data.tournaments.length} tournaments, the {lean >= 0 ? 'negative' : 'affirmative'} has won{' '}
        <b>{Math.abs(lean).toFixed(1)} points</b> more often across all rounds
        {Math.abs(elimLean) > Math.abs(lean) ? `, and the gap widens to ${Math.abs(elimLean).toFixed(1)} points in elimination rounds` : ''}.
      </p>
    </div>
  )
}

function Leaders() {
  const load = useRankings()
  if (load.state !== 'ready') return <div className="skeleton" style={{ height: 200 }} />
  return (
    <ol className="brief-leaders">
      {load.data.debaters.slice(0, 10).map((d) => (
        <li key={d.id}>
          <span className="bl-rank">{d.rank}</span>
          <Link to={`/debaters/${d.id}`}><b>{d.name}</b> <span className="dim">{d.school}</span></Link>
          <span className="num">{d.wins}–{d.losses}</span>
        </li>
      ))}
    </ol>
  )
}

function Block({ b }: { b: BriefBlock }) {
  if ('p' in b) return <p>{b.p}</p>
  if ('list' in b) return <ul>{b.list.map((x) => <li key={x}>{x}</li>)}</ul>
  if ('callout' in b)
    return (
      <aside className="brief-callout">
        {b.title && <b>{b.title}</b>}
        <p>{b.callout}</p>
      </aside>
    )
  if ('terms' in b)
    return (
      <dl className="brief-terms">
        {b.terms.map((t) => (
          <div key={t.term}>
            <dt>{t.term}</dt>
            <dd>{t.meaning}</dd>
          </div>
        ))}
      </dl>
    )
  if ('args' in b)
    return (
      <div className="brief-args">
        {b.args.map((a) => (
          <section key={a.title} className={`brief-arg ${a.side}`}>
            <span className={`tag ${a.side}`}>{a.side === 'aff' ? 'Aff' : 'Neg'}</span>
            <h4>{a.title}</h4>
            <p>{a.warrant}</p>
            <div className="ba-answers">
              <span className="eyebrow">Expect</span>
              <ul>{a.answers.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          </section>
        ))}
      </div>
    )
  if ('reading' in b)
    return (
      <ol className="brief-reading">
        {b.reading.map((r) => (
          <li key={r.title}>
            <div>
              <b>{r.title}</b>
              <span className="dim">{r.author} · {r.detail}</span>
              <p>{r.why}</p>
            </div>
            <Link to={`/app/evidence?q=${encodeURIComponent(r.search)}`} className="btn sm"><Search /> Find &amp; cut</Link>
          </li>
        ))}
      </ol>
    )
  if ('data' in b) return b.data === 'field' ? <FieldData /> : <Leaders />
  return null
}

export function BriefPage() {
  const { id = '' } = useParams()
  const b = briefById[id]
  const pushRecent = useOS((s) => s.pushRecent)
  const [active, setActive] = useState('')
  useEffect(() => {
    if (!b || b.status !== 'published') return
    pushRecent({ kind: 'brief', id: b.id, label: b.title })
    document.title = `${b.title} · Debate Utils Briefs`
    const obs = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: '-20% 0px -70% 0px' })
    b.sections.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b?.id])
  if (!b || b.status !== 'published') return <NotFound what="brief" />
  const others = briefs.filter((x) => x.id !== b.id).slice(0, 2)

  return (
    <div className="wrap brief">
      <nav className="crumb" style={{ paddingTop: 28 }} aria-label="Breadcrumb">
        <Link to="/briefs">Monthly Briefs</Link>
        <ChevronRight size={13} />
        <span>No. {b.issue}</span>
      </nav>
      <header className="brief-head">
        <div className="eyebrow">{b.month} · {b.event} · {b.readMinutes} min read</div>
        <h1 className="pg-title">{b.title}</h1>
        <p className="brief-topic">{b.topic}</p>
        <p className="pg-lede">{b.dek}</p>
      </header>
      <div className="brief-layout">
        <nav className="brief-toc" aria-label="In this brief">
          <span className="eyebrow">In this brief</span>
          {b.sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className={active === s.id ? 'on' : ''} onClick={(e) => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>
              {s.heading}
            </a>
          ))}
        </nav>
        <article className="article">
          {b.sections.map((s) => (
            <section key={s.id} id={s.id} className="brief-section">
              <h2>{s.heading}</h2>
              {s.blocks.map((blk, i) => (
                <Block key={i} b={blk} />
              ))}
            </section>
          ))}
          <aside className="brief-note">
            <Info size={15} />
            <p>This brief is Debate Utils’ own analysis. It contains no quotations. Positions attributed to authors summarise works in the reading list; cut the originals before you read them in round.</p>
          </aside>
        </article>
      </div>
      <h2 className="briefs-sub">More issues</h2>
      <div className="briefs-grid">
        {others.map((o) => (
          <BriefCover key={o.id} b={o} />
        ))}
      </div>
    </div>
  )
}
