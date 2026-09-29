import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, BrainCircuit, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { useEffect, useMemo, useState, type PointerEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { EntityLink } from '../../components/ui/EntityLink'
import { KindIcon, SaveButton, SourceBadge, timeAgo } from '../../components/ui/primitives'
import { compareQuestions } from '../../data/compare'
import { concepts } from '../../data/concepts'
import { philosopherById, philosophers } from '../../data/philosophers'
import { questionsOfTheDay, userById } from '../../data/social'
import { schools } from '../../data/schools'
import { featuredPassages, passages, textById, texts } from '../../data/texts'
import { appForCard, type AppDef } from '../../lib/apps'
import { KIND_LABEL, routeFor } from '../../model/graph'
import type { DebateMove } from '../../model/types'
import { useOS, type HomeCard } from '../../store'
import { useKnowledgeGraph } from '../../store/graph'
import './home.css'

function greeting(d: Date) {
  const h = d.getHours()
  return h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

function QuoteRotator() {
  const [i, setI] = useState(() => new Date().getDate() % featuredPassages.length)
  const [paused, setPaused] = useState(false)
  const reduce = useOS((s) => s.settings.reduceMotion)
  useEffect(() => {
    if (paused) return
    const t = setInterval(() => setI((x) => (x + 1) % featuredPassages.length), 9000)
    return () => clearInterval(t)
  }, [paused])
  const p = featuredPassages[i]
  const ph = philosopherById[p.author]
  const text = textById[p.textId]
  return (
    <section className="quote-stage" aria-roledescription="carousel" aria-label="Rotating philosophical quotation">
      <div className="quote-mark" aria-hidden>“</div>
      <AnimatePresence mode="wait">
        <motion.figure
          key={p.id}
          initial={{ opacity: 0, y: reduce ? 0 : 8, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: reduce ? 0 : -6, filter: 'blur(4px)' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="quote-fig"
        >
          <blockquote className="quote">{p.body.replace(/^…|…$/g, '')}</blockquote>
          <figcaption>
            <EntityLink id={ph.id} />
            <span className="dim">·</span>
            <EntityLink id={text.id}>
              <em>{text.title}</em>
            </EntityLink>
            <span className="dim mono" style={{ fontSize: 11 }}>{p.locator}</span>
            {p.translation && <span className="dim" style={{ fontSize: 11 }}>{p.translation}</span>}
            <SourceBadge type="quotation" />
          </figcaption>
        </motion.figure>
      </AnimatePresence>
      <div className="quote-controls">
        <button className="btn icon sm ghost" aria-label="Previous quotation" onClick={() => setI((x) => (x - 1 + featuredPassages.length) % featuredPassages.length)}>
          <ChevronLeft />
        </button>
        <div className="quote-dots" aria-hidden>
          {featuredPassages.map((fp, j) => (
            <span key={fp.id} className={j === i ? 'on' : ''} />
          ))}
        </div>
        <button className="btn icon sm ghost" aria-label="Next quotation" onClick={() => setI((x) => (x + 1) % featuredPassages.length)}>
          <ChevronRight />
        </button>
        <button className="btn icon sm ghost" aria-label={paused ? 'Resume rotation' : 'Pause rotation'} onClick={() => setPaused((x) => !x)}>
          {paused ? <Play /> : <Pause />}
        </button>
        <span className="spacer" />
        <SaveButton refItem={{ kind: 'passage', id: p.id }} />
        <Link to={routeFor({ kind: 'passage', id: p.id })} className="btn sm ghost">
          Read in context <ArrowUpRight />
        </Link>
      </div>
    </section>
  )
}

function useCardMeta(): Record<HomeCard, string> {
  const args = useOS((s) => s.arguments)
  const essays = useOS((s) => s.essays)
  const chat = useOS((s) => s.chat)
  const ideaNodes = useOS((s) => s.ideaNodes)
  const g = useKnowledgeGraph()
  return {
    library: `${philosophers.length} thinkers · ${texts.length} works`,
    concepts: `${concepts.length} concepts · ${g.edges.length} links`,
    arguments: `${args.filter((a) => a.author === 'you').length} yours · ${args.length} total`,
    compare: `${compareQuestions.length} curated questions`,
    essay: `${essays.length} draft${essays.length === 1 ? '' : 's'}`,
    socratic: `6 modes · ${chat.filter((m) => m.role === 'user').length} exchanges`,
    map: `${ideaNodes.length} custom nodes`,
    schools: `${schools.length} traditions`,
    explorer: `${passages.length} passages · sourced`,
  }
}

function AppCard({ app, index, meta }: { app: AppDef; index: number; meta: string }) {
  const I = app.icon
  const onMove = (e: PointerEvent<HTMLAnchorElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
  }
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * index, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
      <Link to={app.path} className="app-card" style={{ ['--a' as string]: app.accent }} onPointerMove={onMove}>
        <div className="app-card-top">
          <span className="app-icon">
            <I aria-hidden />
          </span>
          <span className="app-idx mono">{String(index + 1).padStart(2, '0')}</span>
        </div>
        <div className="app-title">{app.label}</div>
        <p className="app-desc">{app.description}</p>
        <div className="app-foot">
          <span className="mono">{meta}</span>
          <ArrowRight className="app-arrow" aria-hidden />
        </div>
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
  const reading = useOS((s) => s.reading)
  const debates = useOS((s) => s.debates)
  const g = useKnowledgeGraph()
  const navigate = useNavigate()
  const meta = useCardMeta()
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

  return (
    <div className="page home">
      <section className="home-hero">
        <div>
          <div className="eyebrow">
            {now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })} · {greeting(now)}
          </div>
          <h1 className="home-title">
            Welcome back, <span className="home-name">{settings.name}.</span>
          </h1>
        </div>
        <div className="home-cta">
          <button className="btn" onClick={() => useOS.getState().setPalette(true)}>
            Command palette <span className="kbd">⌘K</span>
          </button>
          <button className="btn primary" onClick={() => navigate(`/app/arguments/${useOS.getState().createArgument()}`)}>
            New argument
          </button>
        </div>
      </section>

      <QuoteRotator />

      <section className="app-grid" aria-label="Applications">
        {cards.map((c, i) => (
          <AppCard key={c} app={appForCard(c)} index={i} meta={meta[c]} />
        ))}
      </section>

      <section className="home-strip">
        <div className="panel">
          <div className="panel-head">
            <h3>Continue thinking</h3>
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
            <h3>Recently read</h3>
            <Link to="/app/reading" className="btn ghost sm">
              Reading list <ArrowRight />
            </Link>
          </div>
          <ul className="row-list">
            {reading
              .filter((r) => r.status !== 'queued')
              .slice(0, 4)
              .map((r) => {
                const t = textById[r.textId]
                return (
                  <li key={r.textId}>
                    <Link to={`/app/texts/${t.id}`} className="row-link k-text reading-row">
                      <KindIcon kind="text" />
                      <span style={{ display: 'grid', minWidth: 0, flex: 1, gap: 5 }}>
                        <span className="hstack" style={{ justifyContent: 'space-between' }}>
                          <span className="truncate t0 serif" style={{ fontSize: 15 }}>{t.title}</span>
                          <span className="dim mono" style={{ fontSize: 10.5 }}>{Math.round(r.progress * 100)}%</span>
                        </span>
                        <span className="meter">
                          <span style={{ width: `${r.progress * 100}%`, background: r.status === 'finished' ? 'var(--green)' : 'var(--orange)' }} />
                        </span>
                        <span className="dim" style={{ fontSize: 'var(--fs-11)' }}>{philosopherById[t.author].name}</span>
                      </span>
                    </Link>
                  </li>
                )
              })}
          </ul>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3>Debate activity</h3>
            <Link to="/app/debates" className="btn ghost sm">
              Network <ArrowRight />
            </Link>
          </div>
          <ul className="row-list">
            {activity.map(({ m, debateId, thesis }) => (
              <li key={m.id}>
                <Link to={`/app/debates/${debateId}`} className="row-link activity-row">
                  <span className={`move-pill ${m.type}`}>{m.type}</span>
                  <span style={{ minWidth: 0, display: 'grid', gap: 2 }}>
                    <span className="clamp-2" style={{ color: 'var(--text-1)', fontSize: 'var(--fs-12)' }}>
                      <strong className="t0" style={{ fontWeight: 500 }}>{userById[m.author]?.name ?? 'You'}</strong> on “{thesis.slice(0, 60)}…”
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
          <div className="panel-body" style={{ display: 'grid', gap: 16 }}>
            <p className="quote" style={{ fontSize: 22 }}>{qotd}</p>
            <p className="dim" style={{ fontSize: 'var(--fs-12)' }}>Don’t look for an answer yet. Write down what you believe, then let the Socratic AI question it.</p>
            <button className="btn" style={{ justifySelf: 'start' }} onClick={() => navigate(`/app/socratic?q=${encodeURIComponent(qotd)}`)}>
              <BrainCircuit /> Think it through
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
