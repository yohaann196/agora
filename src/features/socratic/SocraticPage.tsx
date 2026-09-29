import { AnimatePresence, motion } from 'framer-motion'
import {
  AppWindow,
  BookOpenCheck,
  BrainCircuit,
  CircleStop,
  Eraser,
  GraduationCap,
  MessageCircleQuestion,
  NotebookPen,
  ScanSearch,
  Send,
  Swords,
  Theater,
  Trophy,
  Waypoints,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { MODE_META } from '../../ai/socratic'
import { EntityLink } from '../../components/ui/EntityLink'
import { Monogram } from '../../components/ui/primitives'
import { RichText } from '../../components/ui/RichText'
import { philosopherById, philosophers } from '../../data/philosophers'
import { useOS, type SocraticMode } from '../../store'
import { useSocraticChat } from './useChat'
import './socratic.css'

const MODE_ICON: Record<SocraticMode, LucideIcon> = {
  socratic: MessageCircleQuestion,
  devil: Swords,
  tutor: GraduationCap,
  philosopher: Theater,
  fallacy: ScanSearch,
  coach: Trophy,
}
const MODE_COLOR: Record<SocraticMode, string> = {
  socratic: 'var(--green)',
  devil: 'var(--rose)',
  tutor: 'var(--blue)',
  philosopher: 'var(--violet)',
  fallacy: 'var(--amber)',
  coach: 'var(--orange)',
}
const STARTERS: Record<SocraticMode, string[]> = {
  socratic: ['Lying is wrong because it destroys trust.', 'We have no free will if our choices are caused.', 'A just society is one where everyone gets what they deserve.'],
  devil: ['Utilitarianism is the most rational moral theory.', 'Lying is never justified.', 'Existentialism makes us more responsible, not less.'],
  tutor: ['What is the categorical imperative?', 'Explain the veil of ignorance.', 'What does Sartre mean by bad faith?'],
  philosopher: ['It is fine to lie to protect a friend.', 'Happiness is the only thing that matters.', 'People are shaped entirely by their circumstances.'],
  fallacy: ['Everyone knows lying is wrong, so it must be. If we allow white lies, it will eventually lead to total dishonesty.', 'Either we ban all speech that offends or society collapses.'],
  coach: ['The state should ban hate speech because it harms vulnerable groups and those harms outweigh the value of that speech.', 'We should prioritise liberty because rights protect individuals from majority tyranny.'],
}

export function SocraticPage() {
  const chat = useOS((s) => s.chat)
  const mode = useOS((s) => s.socraticMode)
  const philosopher = useOS((s) => s.socraticPhilosopher)
  const provider = useOS((s) => (s.settings.aiProvider === 'anthropic' && s.settings.apiKey ? 'Claude' : 'Local reasoning engine'))
  const { setSocraticMode, setSocraticPhilosopher, clearChat, openWindow, createNote, createArgument, updateArgument, toast } = useOS.getState()
  const { send, stop, busy } = useSocraticChat()
  const [draft, setDraft] = useState('')
  const [params, setParams] = useSearchParams()
  const [question, setQuestion] = useState<string | null>(null)
  const navigate = useNavigate()
  const scroller = useRef<HTMLDivElement>(null)
  const ta = useRef<HTMLTextAreaElement>(null)

  // Incoming ?q= : prefill, pose as a question, or (in Tutor mode) ask directly.
  useEffect(() => {
    const q = params.get('q')
    if (!q) return
    setParams({}, { replace: true })
    if (/:\s*$/.test(q)) setDraft(q)
    else if (useOS.getState().socraticMode === 'tutor') send(q)
    else setQuestion(q)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const lastText = chat[chat.length - 1]?.text
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
  }, [chat.length, lastText])

  useLayoutEffect(() => {
    const el = ta.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = Math.min(220, el.scrollHeight) + 'px'
  }, [draft])

  const trace = useMemo(() => {
    const concepts = new Set<string>()
    const assumptions = new Set<string>()
    const fallacies = new Set<string>()
    for (const m of chat) {
      m.meta?.concepts?.forEach((c) => concepts.add(c))
      m.meta?.assumptions?.forEach((a) => assumptions.add(a))
      m.meta?.fallacies?.forEach((f) => fallacies.add(f))
    }
    const userTurns = chat.filter((m) => m.role === 'user')
    return { concepts: [...concepts].slice(0, 10), assumptions: [...assumptions], fallacies: [...fallacies], first: userTurns[0]?.text, latest: userTurns.length > 1 ? userTurns[userTurns.length - 1].text : undefined, turns: userTurns.length }
  }, [chat])

  const submit = () => {
    if (!draft.trim() || busy) return
    send(draft)
    setDraft('')
  }

  const toArgument = () => {
    const users = chat.filter((m) => m.role === 'user')
    if (!users.length) return
    const id = createArgument(users[0].text.slice(0, 70))
    const a = useOS.getState().arguments.find((x) => x.id === id)!
    const nodes = [
      { ...a.nodes[0], text: users[0].text },
      ...users.slice(1, 4).map((u, i) => ({ id: `sp${i}`, type: 'premise' as const, text: u.text, x: 80, y: 200 + i * 170 })),
      { ...a.nodes[2], text: '', y: 200 + Math.max(1, users.length - 1) * 170 },
    ]
    const chain = nodes.map((n) => n.id)
    const links = chain.slice(1).map((to, i) => ({ id: `sl${i}`, from: chain[i], to, kind: i === chain.length - 2 ? ('infers' as const) : ('supports' as const) }))
    updateArgument(id, { nodes, links, concepts: trace.concepts.slice(0, 5), summary: 'Built from a Socratic dialogue.' })
    navigate(`/app/arguments/${id}`)
  }

  const saveNote = () => {
    const body = chat.map((m) => `${m.role === 'user' ? 'Me' : `Socratic AI (${MODE_META[m.mode].label})`}: ${m.text}`).join('\n\n') + (trace.concepts.length ? `\n\nLinks: ${trace.concepts.map((c) => `[[${c}]]`).join(' ')}` : '')
    const id = createNote({ title: `Dialogue: ${(trace.first ?? 'untitled').slice(0, 48)}`, body })
    toast({ title: 'Dialogue saved to Notes', tone: 'success' })
    navigate(`/app/notes/${id}`)
  }

  const MIcon = MODE_ICON[mode]
  return (
    <div className="page soc-page">
      <aside className="soc-modes" aria-label="Modes">
        <div className="soc-brand">
          <BrainCircuit size={16} style={{ color: 'var(--green)' }} />
          <div>
            <div className="t0" style={{ fontWeight: 500 }}>Socratic AI</div>
            <div className="dim" style={{ fontSize: 'var(--fs-11)' }}>Asks before it tells.</div>
          </div>
        </div>
        <div className="mode-list" role="radiogroup">
          {(Object.keys(MODE_META) as SocraticMode[]).map((m) => {
            const I = MODE_ICON[m]
            return (
              <button key={m} role="radio" aria-checked={mode === m} className={`mode-item ${mode === m ? 'on' : ''}`} style={{ ['--mc' as string]: MODE_COLOR[m] }} onClick={() => setSocraticMode(m)}>
                {mode === m && <motion.span layoutId="mode-bg" className="mode-bg" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                <I aria-hidden />
                <span>
                  <span className="mode-name">{MODE_META[m].label}</span>
                  <span className="mode-short">{MODE_META[m].short}</span>
                </span>
              </button>
            )
          })}
        </div>
        {mode === 'philosopher' && (
          <div className="phil-pick">
            <div className="eyebrow">Respond as</div>
            <div className="phil-grid">
              {philosophers.map((p) => (
                <button key={p.id} className={`phil-btn ${philosopher === p.id ? 'on' : ''}`} onClick={() => setSocraticPhilosopher(p.id)} title={p.name} aria-pressed={philosopher === p.id}>
                  <Monogram id={p.id} size={30} />
                </button>
              ))}
            </div>
            <div className="dim" style={{ fontSize: 'var(--fs-11)' }}>{philosopherById[philosopher]?.name}</div>
          </div>
        )}
        <div className="principle">
          <span className="eyebrow">Principle</span>
          <p>AI should amplify philosophical thinking, not replace it.</p>
        </div>
      </aside>

      <section className="soc-main">
        <div className="soc-head">
          <div className="hstack" style={{ gap: 10 }}>
            <span className="mode-glyph" style={{ ['--mc' as string]: MODE_COLOR[mode] }}>
              <MIcon />
            </span>
            <div>
              <div className="t0" style={{ fontWeight: 500 }}>
                {MODE_META[mode].label}
                {mode === 'philosopher' && <span className="dim"> · as {philosopherById[philosopher]?.name}</span>}
              </div>
              <div className="dim" style={{ fontSize: 'var(--fs-11)' }}>{MODE_META[mode].blurb}</div>
            </div>
          </div>
          <div className="hstack">
            <span className="engine mono">{provider}</span>
            <button className="btn ghost sm" onClick={() => openWindow('socratic')} title="Open in a floating window">
              <AppWindow /> Pop out
            </button>
            <button className="btn ghost sm" onClick={clearChat} disabled={!chat.length}>
              <Eraser /> Clear
            </button>
          </div>
        </div>

        <div className="transcript" ref={scroller} aria-live="polite">
          {question && (
            <div className="posed">
              <div className="eyebrow">On the table</div>
              <p className="quote">{question}</p>
              <p className="dim" style={{ fontSize: 'var(--fs-12)' }}>Write what you believe — even tentatively. The questions start there.</p>
            </div>
          )}
          {!chat.length && !question && (
            <div className="soc-empty">
              <p className="quote">“{mode === 'tutor' ? 'Ask about any concept, and I’ll explain — then check you’ve understood.' : mode === 'fallacy' ? 'Paste reasoning. I’ll show where it might go wrong, and why.' : mode === 'coach' ? 'Give me a contention. We’ll find where it breaks before your opponent does.' : 'State a position you actually hold. I won’t tell you if it’s right. I’ll help you find out.'}”</p>
              <div className="starters">
                {STARTERS[mode].map((s) => (
                  <button key={s} className="starter" onClick={() => setDraft(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          <AnimatePresence initial={false}>
            {chat.map((m) => (
              <motion.div key={m.id} className={`turn ${m.role}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} style={{ ['--mc' as string]: MODE_COLOR[m.mode] }}>
                <div className="speaker mono">
                  {m.role === 'user' ? 'You' : m.mode === 'philosopher' && m.philosopher ? philosopherById[m.philosopher]?.name.split(' ').slice(-1)[0] : MODE_META[m.mode].label}
                </div>
                <div className="utterance">
                  {m.role === 'user' ? <p className="u-text">{m.text}</p> : <RichText text={m.text || ' '} className={m.pending ? 'caret' : ''} />}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <textarea
            ref={ta}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || !e.shiftKey)) {
                e.preventDefault()
                submit()
              }
            }}
            placeholder={question ? 'I think…' : MODE_META[mode].placeholder}
            aria-label="Your message"
            rows={1}
          />
          <div className="composer-bar">
            <span className="dim" style={{ fontSize: 'var(--fs-11)' }}>
              <span className="kbd">↵</span> send · <span className="kbd">⇧↵</span> new line
            </span>
            {busy ? (
              <button type="button" className="btn sm" onClick={stop}>
                <CircleStop /> Stop
              </button>
            ) : (
              <button className="btn primary sm" disabled={!draft.trim()}>
                <Send /> Send
              </button>
            )}
          </div>
        </form>
      </section>

      <aside className="soc-trace" aria-label="Thinking trace">
        <div className="eyebrow">Thinking trace</div>
        <div className="trace-block">
          <h4>Your position</h4>
          {trace.first ? (
            <>
              <p className="pos">{trace.first}</p>
              {trace.latest && (
                <>
                  <div className="dim mono" style={{ fontSize: 10, margin: '6px 0 2px' }}>now, after {trace.turns} turns</div>
                  <p className="pos latest">{trace.latest}</p>
                </>
              )}
            </>
          ) : (
            <p className="dim">Not stated yet.</p>
          )}
        </div>
        <div className="trace-block">
          <h4>Assumptions surfaced <span className="mono dim">{trace.assumptions.length}</span></h4>
          {trace.assumptions.length ? (
            <ul className="trace-list">
              {trace.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          ) : (
            <p className="dim">None yet.</p>
          )}
        </div>
        {trace.fallacies.length > 0 && (
          <div className="trace-block">
            <h4>Possible fallacies</h4>
            <div className="chips">
              {trace.fallacies.map((f) => (
                <span key={f} className="tag" style={{ ['--tag' as string]: 'var(--amber)' }}>{f}</span>
              ))}
            </div>
          </div>
        )}
        <div className="trace-block">
          <h4>Concepts touched</h4>
          {trace.concepts.length ? (
            <div className="chips">
              {trace.concepts.map((c) => (
                <EntityLink key={c} id={c} variant="chip" />
              ))}
            </div>
          ) : (
            <p className="dim">They’ll appear here, linked to the knowledge graph.</p>
          )}
        </div>
        <div className="trace-actions">
          <button className="btn sm" onClick={toArgument} disabled={!trace.first}>
            <Waypoints /> Turn into an argument
          </button>
          <button className="btn sm" onClick={saveNote} disabled={!chat.length}>
            <NotebookPen /> Save dialogue as note
          </button>
          <button className="btn sm ghost" onClick={() => navigate('/app/compare')}>
            <BookOpenCheck /> See how philosophers answer
          </button>
        </div>
      </aside>
    </div>
  )
}
