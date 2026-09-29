import { motion, useInView } from 'framer-motion'
import { ArrowDown, ArrowRight, BrainCircuit, Columns3, Orbit, PenLine, ScanSearch, Swords, Waypoints } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { analyzeArgument } from '../ai/analyzeArgument'
import { respond } from '../ai/socratic'
import { PhiMark } from '../components/shell/Sidebar'
import { MiniGraph } from '../components/ui/MiniGraph'
import { SourceBadge } from '../components/ui/primitives'
import { RichText } from '../components/ui/RichText'
import { seedArguments } from '../data/arguments'
import { compareById } from '../data/compare'
import { ArgAnalysisPanel } from '../features/arguments/ArgAnalysis'
import { ArgCanvas } from '../features/arguments/ArgCanvas'
import { PositionColumn } from '../features/compare/ComparePage'
import './landing.css'

const VERBS = ['Read.', 'Analyze.', 'Compare.', 'Argue.', 'Build better ideas.']

/* ------------------------------------------------------------------ */
/* Constellation                                                        */
/* ------------------------------------------------------------------ */

const STARS: [string, number, number, string][] = [
  ['Kant', 14, 30, 'var(--violet)'], ['Justice', 30, 18, 'var(--cyan)'], ['Mill', 22, 62, 'var(--violet)'], ['Liberty', 38, 44, 'var(--cyan)'],
  ['Rawls', 50, 22, 'var(--violet)'], ['Veil of ignorance', 64, 12, 'var(--cyan)'], ['Duty', 8, 52, 'var(--cyan)'], ['Sartre', 76, 40, 'var(--violet)'],
  ['Bad faith', 88, 26, 'var(--cyan)'], ['Beauvoir', 84, 62, 'var(--violet)'], ['The Other', 94, 48, 'var(--cyan)'], ['Existentialism', 70, 70, 'var(--green)'],
  ['Utilitarianism', 12, 80, 'var(--green)'], ['Aristotle', 40, 78, 'var(--violet)'], ['Eudaimonia', 54, 88, 'var(--cyan)'], ['Republic', 58, 58, 'var(--orange)'],
  ['Plato', 46, 64, 'var(--violet)'], ['Nietzsche', 90, 84, 'var(--violet)'], ['Will to power', 78, 90, 'var(--cyan)'], ['Hume', 4, 16, 'var(--violet)'],
  ['Is–ought', 20, 8, 'var(--cyan)'], ['Marx', 30, 92, 'var(--violet)'],
]
const LINKS: [number, number][] = [[0, 1], [0, 6], [0, 19], [19, 20], [1, 3], [1, 4], [4, 5], [2, 3], [2, 12], [3, 16], [16, 15], [15, 1], [7, 8], [7, 9], [9, 10], [7, 11], [11, 9], [13, 14], [13, 16], [17, 18], [11, 17], [2, 21], [21, 13], [4, 7], [0, 2]]

function Constellation() {
  return (
    <svg className="constellation" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      {LINKS.map(([a, b], i) => (
        <motion.line
          key={i}
          x1={STARS[a][1]}
          y1={STARS[a][2]}
          x2={STARS[b][1]}
          y2={STARS[b][2]}
          stroke="rgba(148,163,200,0.2)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 + i * 0.05, duration: 1.4, ease: 'easeOut' }}
        />
      ))}
    </svg>
  )
}

function StarLabels() {
  return (
    <div className="star-labels" aria-hidden>
      {STARS.map(([label, x, y, c], i) => (
        <motion.span key={label} style={{ left: `${x}%`, top: `${y}%`, ['--sc' as string]: c }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + i * 0.05, duration: 1 }}>
          <i style={{ animationDelay: `${(i % 7) * 0.6}s` }} />
          {label}
        </motion.span>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Live preview                                                         */
/* ------------------------------------------------------------------ */

type PreviewTab = 'arguments' | 'map' | 'socratic' | 'compare'
const PREVIEW_TABS: { id: PreviewTab; label: string; icon: typeof Waypoints }[] = [
  { id: 'arguments', label: 'Argument Builder', icon: Waypoints },
  { id: 'map', label: 'Idea Map', icon: Orbit },
  { id: 'socratic', label: 'Socratic AI', icon: BrainCircuit },
  { id: 'compare', label: 'Philosopher Compare', icon: Columns3 },
]

function PreviewArgument() {
  const arg = seedArguments[0]
  const analysis = useMemo(() => analyzeArgument(arg), [arg])
  const [heights, setHeights] = useState<Record<string, number>>({})
  const [highlight, setHighlight] = useState<string[]>([])
  const [view, setView] = useState({ x: 24, y: 12, k: 0.78 })
  return (
    <div className="pv-arg">
      <div className="pv-canvas">
        <ArgCanvas
          arg={arg}
          selected={null}
          onSelect={() => undefined}
          highlight={highlight}
          flags={{}}
          heights={heights}
          onHeight={(id, h) => setHeights((m) => (m[id] === h ? m : { ...m, [id]: h }))}
          view={view}
          onView={setView}
          onMove={() => undefined}
          onText={() => undefined}
          onConnect={() => undefined}
          onAttach={() => undefined}
          onDelete={() => undefined}
          readOnly
        />
      </div>
      <div className="pv-side">
        <ArgAnalysisPanel analysis={analysis} onHighlight={setHighlight} onAddObjection={() => undefined} onAddCounter={() => undefined} />
      </div>
    </div>
  )
}

function PreviewSocratic() {
  const turns = useMemo(() => {
    const a = 'Lying is always wrong because it destroys trust.'
    const r1 = respond(a, 'socratic', [])
    const b = 'I mean any intentional deception — even misleading someone with true statements.'
    const r2 = respond(b, 'socratic', [{ role: 'user', text: a }, { role: 'ai', text: r1.text }])
    return [
      { who: 'You', text: a, ai: false },
      { who: 'Socratic', text: r1.text, ai: true },
      { who: 'You', text: b, ai: false },
      { who: 'Socratic', text: r2.text, ai: true },
    ]
  }, [])
  return (
    <div className="pv-soc">
      {turns.map((t, i) => (
        <motion.div key={i} className={`pv-turn ${t.ai ? 'ai' : ''}`} initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.25 }}>
          <span className="mono">{t.who}</span>
          <div>{t.ai ? <RichText text={t.text} /> : <p className="serif">{t.text}</p>}</div>
        </motion.div>
      ))}
    </div>
  )
}

function PreviewCompare() {
  const q = compareById['lying']
  return (
    <div className="pv-cmp">
      <h3 className="serif">{q.question}</h3>
      <div className="pv-cmp-grid">
        {q.positions.slice(0, 3).map((p, i) => (
          <PositionColumn key={p.philosopher} pos={p} index={i} />
        ))}
      </div>
    </div>
  )
}

function LivePreview() {
  const [tab, setTab] = useState<PreviewTab>('arguments')
  return (
    <div className="preview-window" id="preview">
      <div className="pw-bar">
        <span className="lights"><i /><i /><i /></span>
        <div className="pw-tabs" role="tablist">
          {PREVIEW_TABS.map((t) => {
            const I = t.icon
            return (
              <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
                <I size={13} /> {t.label}
              </button>
            )
          })}
        </div>
        <span className="pw-live mono"><i /> live</span>
      </div>
      <div className="pw-body">
        {tab === 'arguments' && <PreviewArgument />}
        {tab === 'map' && (
          <div className="pv-map">
            <MiniGraph id="justice" size={520} max={18} />
            <div className="pv-map-note">
              <div className="eyebrow">Knowledge graph</div>
              <p className="serif">Justice, one step out.</p>
              <p className="dim">Every thinker, concept, text and argument is a node. Hover to trace a relationship; in the app, click to expand and add your own.</p>
            </div>
          </div>
        )}
        {tab === 'socratic' && <PreviewSocratic />}
        {tab === 'compare' && <PreviewCompare />}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Feature demos                                                        */
/* ------------------------------------------------------------------ */

function SocraticDemo() {
  const [claim, setClaim] = useState('Happiness is the only thing that matters.')
  const [reply, setReply] = useState<string | null>(() => respond('Happiness is the only thing that matters.', 'socratic', []).text)
  return (
    <div className="demo demo-soc">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setReply(respond(claim, 'socratic', []).text)
        }}
      >
        <input className="input serif" value={claim} onChange={(e) => { setClaim(e.target.value); setReply(null) }} aria-label="Your claim" />
        <button className="btn primary sm">Question me</button>
      </form>
      <div className="demo-reply">
        {reply ? (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
            <RichText text={reply} />
          </motion.div>
        ) : (
          <p className="dim">Type any position and press enter. The reply is generated live by the in-browser reasoning engine.</p>
        )}
      </div>
    </div>
  )
}

function ArgumentDemo() {
  const [shown, setShown] = useState(false)
  const steps: [string, string, string][] = [
    ['Claim', 'Greater happiness is morally valuable.', 'var(--n-claim)'],
    ['Premise', 'Moral actions should maximize happiness.', 'var(--n-premise)'],
    ['Conclusion', 'Therefore, sacrificing one person can sometimes be morally justified.', 'var(--n-conclusion)'],
  ]
  const flags = ['Premise 1 stands without support', 'The conclusion introduces “sacrificing” and “justified”', 'Hidden assumption: value can be summed across persons', 'Objection: the separateness of persons (Rawls)']
  return (
    <div className="demo demo-arg">
      <div className="chain">
        {steps.map(([t, s, c], i) => (
          <div key={t} className="chain-step" style={{ ['--nc' as string]: c }}>
            <span className="mono">{t}</span>
            <p className="serif">{s}</p>
            {i < steps.length - 1 && <span className="chain-arrow" />}
          </div>
        ))}
      </div>
      <button className="btn sm" onClick={() => setShown((s) => !s)}>
        <ScanSearch /> {shown ? 'Hide analysis' : 'Analyze argument'}
      </button>
      {shown && (
        <ul className="demo-flags">
          {flags.map((f, i) => (
            <motion.li key={f} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.12 }}>
              {f}
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  )
}

function CompareDemo() {
  const q = compareById['lying']
  return (
    <div className="demo demo-cmp">
      {q.positions.slice(0, 3).map((p) => (
        <div key={p.philosopher} className="mini-col">
          <span className="mono">{p.philosopher}</span>
          <p className="serif">{p.headline}</p>
          <SourceBadge type={p.support[0].source === 'quotation' ? 'quotation' : p.support[0].source === 'summary' ? 'summary' : 'interpretation'} label={p.support[0].source === 'quotation' ? 'Textual support' : undefined} />
        </div>
      ))}
    </div>
  )
}

function EssayDemo() {
  const rows: [string, number][] = [['Thesis clarity', 3], ['Premise support', 2], ['Counterarguments', 1], ['Definitions', 2], ['Evidence', 3]]
  return (
    <div className="demo demo-essay">
      <div className="doc">
        <span className="mono">Thesis</span>
        <p className="serif">Lying is sometimes justified, because a duty of truthfulness cannot be owed to someone who uses our answer to commit a grave wrong.</p>
        <span className="mono">Counterargument</span>
        <p className="serif dim">The strongest objection to your thesis…</p>
      </div>
      <div className="signals">
        {rows.map(([l, n]) => (
          <div key={l}>
            <span>{l}</span>
            <span className={`sig s${n}`}><i /><i /><i /></span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DebateDemo() {
  const items: [string, string, number][] = [
    ['argument', 'Existentialism provides a stronger account of moral responsibility than Kantian deontology.', 0],
    ['objection', 'Responsibility requires a standard we can fail to meet.', 1],
    ['response', 'Sartre’s standard is formal too: in choosing, I choose an image of humanity.', 2],
    ['rebuttal', 'Then the existentialist account borrows the Kantian test it claims to beat.', 3],
  ]
  return (
    <div className="demo demo-debate">
      {items.map(([t, s, d]) => (
        <div key={t} className="d-row" style={{ marginLeft: d * 18 }}>
          <span className={`move-pill ${t}`}>{t}</span>
          <p className="serif">{s}</p>
        </div>
      ))}
    </div>
  )
}

function Feature({ n, icon: I, title, lede, points, children, color, flip }: { n: string; icon: typeof Waypoints; title: string; lede: string; points: string[]; children: ReactNode; color: string; flip?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <section ref={ref} className={`feature ${flip ? 'flip' : ''}`} style={{ ['--fc' as string]: color }}>
      <motion.div className="f-text" initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
        <div className="f-num mono">{n}</div>
        <div className="f-icon"><I /></div>
        <h2>{title}</h2>
        <p className="f-lede">{lede}</p>
        <ul>
          {points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </motion.div>
      <motion.div className="f-visual" initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}>
        {children}
      </motion.div>
    </section>
  )
}

/* ------------------------------------------------------------------ */

export function Landing() {
  const navigate = useNavigate()
  const [verb, setVerb] = useState(0)
  useEffect(() => {
    document.body.classList.add('landing-body')
    return () => document.body.classList.remove('landing-body')
  }, [])
  useEffect(() => {
    if (verb >= VERBS.length) return
    const t = setTimeout(() => setVerb((v) => v + 1), 380)
    return () => clearTimeout(t)
  }, [verb])

  return (
    <div className="landing">
      <nav className="l-nav">
        <Link to="/" className="l-brand">
          <PhiMark size={24} />
          <span>Philosophy<span className="mono">OS</span></span>
        </Link>
        <div className="l-links">
          <a href="#preview">Preview</a>
          <a href="#features">Features</a>
          <a href="#principle">Principle</a>
        </div>
        <button className="btn primary" onClick={() => navigate('/app')}>
          Enter PhilosophyOS <ArrowRight />
        </button>
      </nav>

      <header className="hero">
        <Constellation />
        <StarLabels />
        <div className="hero-inner">
          <motion.div className="hero-badge mono" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <span className="dot" /> v1.0 · A workspace for philosophy &amp; debate
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>
            Philosophy<span className="os">OS</span>
          </motion.h1>
          <motion.p className="hero-sub" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.8 }}>
            An operating system for thinking.
          </motion.p>
          <p className="hero-verbs" aria-label={VERBS.join(' ')}>
            {VERBS.map((v, i) => (
              <motion.span key={v} initial={{ opacity: 0, y: 6 }} animate={i < verb ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.4 }} className={i === VERBS.length - 1 ? 'last' : ''}>
                {v}
              </motion.span>
            ))}
          </p>
          <motion.div className="hero-cta" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <button className="btn primary lg" onClick={() => navigate('/app')}>
              Enter PhilosophyOS <ArrowRight />
            </button>
            <a className="btn lg" href="#preview">
              Explore the system <ArrowDown />
            </a>
          </motion.div>
        </div>
      </header>

      <section className="preview-section">
        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
          <LivePreview />
        </motion.div>
        <p className="preview-caption">This is the real application running on this page — not a screenshot. Hover a finding to see which cards it refers to.</p>
      </section>

      <div id="features" className="features">
        <div className="features-head">
          <div className="eyebrow">The system</div>
          <h2>Six instruments for rigorous thought.</h2>
        </div>
        <Feature n="01" icon={Waypoints} color="var(--blue)" title="Argument Builder" lede="Construct formal arguments as connected cards — claim, premises, inference, conclusion — then attach objections, evidence, definitions and assumptions." points={['Drag to rearrange; connect any two steps', 'Analysis finds unsupported premises, gaps, ambiguities and hidden assumptions', 'Never declares an argument “correct” — it explains the reasoning']}>
          <ArgumentDemo />
        </Feature>
        <Feature flip n="02" icon={Orbit} color="var(--cyan)" title="Idea Map" lede="A living graph of thinkers, concepts, texts and your own ideas. Click to expand a relationship; name your own connections." points={['Everything in PhilosophyOS is a node', 'Trace the path between any two ideas', 'Add ideas and relationships of your own']}>
          <div className="demo demo-map"><MiniGraph id="kant" size={360} max={14} /></div>
        </Feature>
        <Feature n="03" icon={BrainCircuit} color="var(--green)" title="Socratic AI" lede="Not a chatbot in a new coat. Its default is to ask — surfacing assumptions, testing definitions, and offering counterexamples." points={['Six modes: Socratic, Devil’s Advocate, Tutor, Philosopher, Fallacy Detector, Debate Coach', 'A live trace of your position, assumptions and concepts', 'Runs locally, or on Claude with your own key']}>
          <SocraticDemo />
        </Feature>
        <Feature flip n="04" icon={Columns3} color="var(--violet)" title="Philosopher Compare" lede="Put one question to several thinkers and see their positions side by side — with textual support kept visibly apart from interpretation." points={['Direct quotations only from named translations', 'Summaries and interpretations are always labelled', 'A “key difference” that names the real disagreement']}>
          <CompareDemo />
        </Feature>
        <Feature n="05" icon={PenLine} color="var(--amber)" title="Essay Studio" lede="A distraction-free writing room with an outline built for philosophy — and an analysis rail that reads for reasoning, not grammar." points={['Thesis, premise support, counterarguments, definitions, evidence', 'Insert verified citations at the cursor', 'Focus mode for the writing that matters']}>
          <EssayDemo />
        </Feature>
        <Feature flip n="06" icon={Swords} color="var(--rose)" title="Debate Network" lede="Publish a thesis. Others object, respond, and rebut. Discussion is structured as argument — and ranked by how well it’s tested, not how popular it is." points={['Argument → Objection → Response → Rebuttal', 'Check your reasoning before you publish', 'Profiles built from arguments, not followers']}>
          <DebateDemo />
        </Feature>
      </div>

      <section id="principle" className="principle-section">
        <div className="eyebrow">The principle</div>
        <blockquote className="big-quote">AI should amplify philosophical thinking, <em>not replace it.</em></blockquote>
        <div className="helps">
          {['Understand difficult texts', 'Identify assumptions', 'Construct stronger arguments', 'Discover objections', 'Compare perspectives', 'Connect ideas', 'Write more clearly', 'Debate more rigorously'].map((h, i) => (
            <motion.span key={h} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
              {h}
            </motion.span>
          ))}
        </div>
        <p className="principle-note">The goal is not to give students answers. The goal is a better environment for thinking.</p>
      </section>

      <section className="closing">
        <h2>
          Think deeper.
          <br />
          <span>Build better arguments.</span>
        </h2>
        <button className="btn primary lg" onClick={() => navigate('/app')}>
          Enter PhilosophyOS <ArrowRight />
        </button>
      </section>

      <footer className="l-foot">
        <span className="hstack"><PhiMark size={16} /> PhilosophyOS</span>
        <span className="dim">Quotations are verbatim from the named translations; everything else is labelled as summary or interpretation.</span>
      </footer>
    </div>
  )
}
