import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, BrainCircuit, ChevronLeft, ChevronRight, FileText, Globe, Search, TableProperties } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { EntityLink } from '../../components/ui/EntityLink'
import { KindIcon, timeAgo } from '../../components/ui/primitives'
import { compareQuestions } from '../../data/compare'
import { concepts } from '../../data/concepts'
import { philosopherById, philosophers } from '../../data/philosophers'
import { questionsOfTheDay, userById } from '../../data/social'
import { schools } from '../../data/schools'
import { featuredPassages, passages, textById, texts } from '../../data/texts'
import { appForCard, type AppDef } from '../../lib/apps'
import { KIND_LABEL, routeFor } from '../../model/graph'
import type { DebateMove } from '../../model/types'
import { shortCite } from '../../research/cite'
import { docStats, formatSeconds } from '../../research/docModel'
import { FORMATS } from '../../research/formats'
import { useOS, type HomeCard } from '../../store'
import { useKnowledgeGraph } from '../../store/graph'
import './home.css'

function greeting(d: Date) {
  const h = d.getHours()
  return h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

/** A verified quotation, lettered like a caption box in the sky panel. */
function SkyQuote() {
  const [i, setI] = useState(() => new Date().getDate() % featuredPassages.length)
  const reduce = useOS((s) => s.settings.reduceMotion)
  useEffect(() => {
    if (reduce) return
    const t = setInterval(() => setI((x) => (x + 1) % featuredPassages.length), 11000)
    return () => clearInterval(t)
  }, [reduce])
  const p = featuredPassages[i]
  const ph = philosopherById[p.author]
  const text = textById[p.textId]
  const step = (d: number) => setI((x) => (x + d + featuredPassages.length) % featuredPassages.length)
  return (
    <div className="sky-quote">
      <AnimatePresence mode="wait">
        <motion.figure key={p.id} initial={{ opacity: 0, x: reduce ? 0 : 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: reduce ? 0 : -10 }} transition={{ duration: 0.3 }} className="sq-fig">
          <blockquote className="sq-text">{p.body.replace(/^…|…$/g, '')}</blockquote>
          <figcaption className="sq-cap">
            <EntityLink id={ph.id} /> · <EntityLink id={text.id}><em>{text.title}</em></EntityLink> <span className="mono">{p.locator}</span>
          </figcaption>
        </motion.figure>
      </AnimatePresence>
      <div className="sq-controls">
        <button aria-label="Previous quotation" onClick={() => step(-1)}><ChevronLeft size={14} /></button>
        <button aria-label="Next quotation" onClick={() => step(1)}><ChevronRight size={14} /></button>
      </div>
    </div>
  )
}

function useCardMeta(): Record<HomeCard, string> {
  const args = useOS((s) => s.arguments)
  const essays = useOS((s) => s.essays)
  const chat = useOS((s) => s.chat)
  const ideaNodes = useOS((s) => s.ideaNodes)
  const docs = useOS((s) => s.docs)
  const flows = useOS((s) => s.flows)
  const sources = useOS((s) => s.sources)
  const g = useKnowledgeGraph()
  return {
    browser: `${sources.length} sources cited`,
    docs: `${docs.length} docs · ${docs.reduce((n, d) => n + docStats(d.content).cards, 0)} cards`,
    flow: `${flows.length} flows · Policy · LD · PF`,
    library: `${philosophers.length} thinkers · ${texts.length} works`,
    concepts: `${concepts.length} concepts · ${g.edges.length} links`,
    arguments: `${args.filter((a) => a.author === 'you').length} yours · ${args.length} total`,
    compare: `${compareQuestions.length} curated questions`,
    essay: `${essays.length} draft${essays.length === 1 ? '' : 's'}`,
    socratic: `6 modes · ${chat.filter((m) => m.role === 'user').length} exchanges`,
    map: `${ideaNodes.length} custom nodes`,
    schools: `${schools.length} traditions`,
    explorer: `${passages.length} verified passages`,
  }
}

function AppPanel({ app, index, meta }: { app: AppDef; index: number; meta: string }) {
  const I = app.icon
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 * index, duration: 0.3 }} className="app-cell">
      <Link to={app.path} className="app-panel" style={{ ['--a' as string]: app.accent }}>
        <span className="ap-no">{String(index + 1).padStart(2, '0')}</span>
        <span className="ap-icon"><I aria-hidden /></span>
        <span className="ap-title">{app.label}</span>
        <span className="ap-desc">{app.description}</span>
        <span className="ap-foot">
          <span className="mono">{meta}</span>
          <ArrowRight aria-hidden />
        </span>
      </Link>
    </motion.div>
  )
}

function flattenMoves(moves: DebateMove[], debateId: string, thesis: string): { m: DebateMove; debateId: string; thesis: string }[] {
  return moves.flatMap((m) => [{ m, debateId, thesis }, ...flattenMoves(m.children, debateId, thesis)])
}

export function Home() {
  const settings = useOS((s) => s.settings)
  const recents = useOS((s) => s.recents)
  const debates = useOS((s) => s.debates)
  const docs = useOS((s) => s.docs)
  const flows = useOS((s) => s.flows)
  const sources = useOS((s) => s.sources)
  const target = useOS((s) => s.cutTarget)
  const g = useKnowledgeGraph()
  const navigate = useNavigate()
  const meta = useCardMeta()
  const [q, setQ] = useState('')
  const now = new Date()
  const cards = settings.homeCards.filter((c) => !settings.hiddenCards.includes(c))
  const qotd = questionsOfTheDay[now.getDate() % questionsOfTheDay.length]
  const activity = useMemo(
    () =>
      debates
        .flatMap((d) => flattenMoves(d.moves, d.id, d.thesis))
        .sort((a, b) => b.m.createdAt - a.m.createdAt)
        .slice(0, 4),
    [debates],
  )
  const recentDocs = useMemo(() => [...docs].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4), [docs])
  const recentFlows = useMemo(() => [...flows].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3), [flows])

  const research = (e: FormEvent) => {
    e.preventDefault()
    navigate(q.trim() ? `/app/browser?q=${encodeURIComponent(q.trim())}` : '/app/browser')
  }

  return (
    <div className="page home">
      <section className="desk-hero">
        <div className="sky">
          <svg className="sky-clouds" viewBox="0 0 600 200" preserveAspectRatio="xMaxYMax slice" aria-hidden>
            <g fill="var(--paper-hi)" stroke="var(--ink)" strokeWidth="3">
              <path d="M330 200c-10-40 20-66 52-58 6-34 52-50 78-26 20-30 74-24 84 16 34-6 60 22 56 68z" />
              <path d="M120 200c-4-26 18-44 42-36 10-22 44-26 58-4 26-8 46 12 42 40z" />
            </g>
            <g stroke="var(--paper-hi)" strokeWidth="1.2" opacity=".35">
              {Array.from({ length: 14 }, (_, i) => (
                <line key={i} x1={i * 44} y1="0" x2={i * 44 + 60} y2="90" />
              ))}
            </g>
          </svg>
          <span className="caption sky-cap">{now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          <h1 className="sky-title">
            {greeting(now)},<br />
            <span className="spot-word">{settings.name}.</span>
          </h1>
          <SkyQuote />
        </div>
        <div className="next-round">
          <div className="nr-head">Before your next round</div>
          <form className="nr-search" onSubmit={research}>
            <Search size={16} aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Research a topic, author or DOI" aria-label="Research" />
            <button className="btn primary sm" type="submit">Go</button>
          </form>
          <div className="nr-actions">
            <button className="nr-btn" onClick={() => navigate(`/app/docs/${useOS.getState().createDoc('speech')}`)}>
              <FileText /> <span><b>New speech doc</b><small>Pockets · Hats · Blocks · Tags</small></span>
            </button>
            {(['ld', 'policy', 'pf'] as const).map((f) => (
              <button key={f} className="nr-btn" onClick={() => navigate(`/app/flow/${useOS.getState().createFlow(f)}`)}>
                <TableProperties /> <span><b>New {FORMATS[f].short} flow</b><small>{FORMATS[f].label} · {FORMATS[f].speeches.filter((s) => !s.cross).length} speeches</small></span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="desk-row">
        <div className="panel desk-docs">
          <div className="panel-head">
            <h3><FileText /> Speech docs</h3>
            <Link to="/app/docs" className="btn ghost sm">All <ArrowRight /></Link>
          </div>
          <ul className="row-list">
            {recentDocs.map((d) => {
              const st = docStats(d.content)
              return (
                <li key={d.id}>
                  <Link to={`/app/docs/${d.id}`} className="row-link">
                    <KindIcon kind="doc" />
                    <span className="truncate t0">{d.title}</span>
                    {d.id === target && <span className="dc-target">Cutting into</span>}
                    <span className="dim mono row-meta">{st.cards} cards · {formatSeconds(st.readSeconds)}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
        <div className="panel">
          <div className="panel-head">
            <h3><Globe /> Latest sources</h3>
            <Link to="/app/browser" className="btn ghost sm">Browser <ArrowRight /></Link>
          </div>
          <ul className="row-list">
            {sources.slice(0, 4).map((s) => (
              <li key={s.id}>
                <Link to={`/app/browser?source=${s.id}`} className="row-link k-source">
                  <KindIcon kind="source" />
                  <span className="src-line">
                    <b>{shortCite(s)}</b>
                    <span className="truncate dim">{s.title}{s.page ? `, ${s.page}` : ''}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel">
          <div className="panel-head">
            <h3><TableProperties /> Flows</h3>
            <Link to="/app/flow" className="btn ghost sm">Timer <ArrowRight /></Link>
          </div>
          <ul className="row-list">
            {recentFlows.map((f) => (
              <li key={f.id}>
                <Link to={`/app/flow/${f.id}`} className="row-link">
                  <KindIcon kind="flow" />
                  <span className="truncate t0">{f.title}</span>
                  <span className="dim mono row-meta">{FORMATS[f.format].short} · {timeAgo(f.updatedAt)}</span>
                </Link>
              </li>
            ))}
            {!recentFlows.length && <li className="dim letter" style={{ padding: 10 }}>No flows yet.</li>}
          </ul>
        </div>
      </section>

      <section aria-label="Applications">
        <div className="desk-section-head">
          <h2 className="display">The apps</h2>
          <span className="caption">Pick a panel</span>
        </div>
        <div className="app-grid">
          {cards.map((c, i) => (
            <AppPanel key={c} app={appForCard(c)} index={i} meta={meta[c]} />
          ))}
        </div>
      </section>

      <section className="desk-row">
        <div className="panel">
          <div className="panel-head">
            <h3>Continue</h3>
            <span className="dim mono" style={{ fontSize: 10.5 }}>recently opened</span>
          </div>
          <ul className="row-list">
            {recents.slice(0, 6).map((r) => {
              const n = g.nodes.get(r.id)
              if (!n) return null
              return (
                <li key={r.id}>
                  <Link to={routeFor(n)} className={`row-link k-${n.kind}`} onClick={() => useOS.getState().pushRecent({ kind: n.kind, id: n.id })}>
                    <KindIcon kind={n.kind} />
                    <span className="truncate t0">{n.label}</span>
                    <span className="dim mono row-meta">{KIND_LABEL[n.kind]} · {timeAgo(r.at)}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3>Debate network</h3>
            <Link to="/app/debates" className="btn ghost sm">Open <ArrowRight /></Link>
          </div>
          <ul className="row-list">
            {activity.map(({ m, debateId, thesis }) => (
              <li key={m.id}>
                <Link to={`/app/debates/${debateId}`} className="row-link activity-row">
                  <span className={`move-pill ${m.type}`}>{m.type}</span>
                  <span style={{ minWidth: 0, display: 'grid', gap: 2 }}>
                    <span className="clamp-2" style={{ color: 'var(--text-1)', fontSize: 'var(--fs-12)' }}>
                      <strong className="t0">{userById[m.author]?.name ?? 'You'}</strong> on “{thesis.slice(0, 60)}…”
                    </span>
                    <span className="dim mono" style={{ fontSize: 10.5 }}>{timeAgo(m.createdAt)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel qotd">
          <div className="panel-head">
            <h3>Question of the day</h3>
          </div>
          <div className="panel-body qotd-body">
            <p className="balloon">{qotd}</p>
            <p className="dim" style={{ fontSize: 'var(--fs-12)' }}>Write down what you believe first. Then let the coach question it.</p>
            <button className="btn" style={{ justifySelf: 'start' }} onClick={() => navigate(`/app/socratic?q=${encodeURIComponent(qotd)}`)}>
              <BrainCircuit /> Think it through
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
