import { AnimatePresence, motion } from 'framer-motion'
import { Check, Focus, PenLine, Plus, Quote, Trash2, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { analyzeEssay, type Signal } from '../../ai/essay'
import { EntityLink } from '../../components/ui/EntityLink'
import { PageHeader, SourceBadge, timeAgo } from '../../components/ui/primitives'
import { philosopherById } from '../../data/philosophers'
import { passages, textById } from '../../data/texts'
import { useDebounced } from '../../lib/hooks'
import type { EssaySection } from '../../model/types'
import { useOS } from '../../store'
import { NotFound } from '../workspace/NotFound'
import './essay.css'

const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0)

export function EssaysIndex() {
  const essays = useOS((s) => s.essays)
  const navigate = useNavigate()
  return (
    <div className="page">
      <PageHeader
        eyebrow="Essay Studio"
        title="Essay Studio"
        lede="A writing environment that reads for reasoning, not grammar: thesis, support, objections, definitions, evidence and context."
        actions={
          <button className="btn primary" onClick={() => navigate(`/app/essays/${useOS.getState().createEssay()}`)}>
            <Plus /> New essay
          </button>
        }
      />
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {essays.map((e) => {
          const total = e.sections.reduce((n, s) => n + words(s.body), 0)
          const done = e.sections.filter((s) => words(s.body) > 20).length
          return (
            <Link key={e.id} to={`/app/essays/${e.id}`} className="card essay-card">
              <div className="card-sub">{total} words · {timeAgo(e.updatedAt)}</div>
              <div className="serif t0" style={{ fontSize: 24, lineHeight: 1.15 }}>{e.title}</div>
              <p className="dim clamp-2" style={{ fontSize: 'var(--fs-12)' }}>{e.prompt}</p>
              <div className="essay-progress">
                {e.sections.map((s) => (
                  <span key={s.id} className={words(s.body) > 20 ? 'full' : words(s.body) > 0 ? 'part' : ''} title={s.label} />
                ))}
              </div>
              <div className="dim" style={{ fontSize: 'var(--fs-11)' }}>{done} of {e.sections.length} sections drafted</div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function SectionEditor({ s, active, focusMode, onFocus, onChange, registerRef }: { s: EssaySection; active: boolean; focusMode: boolean; onFocus: () => void; onChange: (v: string) => void; registerRef: (el: HTMLTextAreaElement | null) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = Math.max(64, el.scrollHeight) + 'px'
  }, [s.body])
  return (
    <section id={`sec-${s.id}`} className={`es-section ${active ? 'active' : ''} ${focusMode && !active ? 'faded' : ''}`}>
      <div className="es-label">
        <span className="mono">{s.label}</span>
        <span className="dim">{words(s.body) ? `${words(s.body)} words` : ''}</span>
      </div>
      <textarea
        ref={(el) => {
          ref.current = el
          registerRef(el)
        }}
        value={s.body}
        onFocus={onFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={s.hint}
        aria-label={s.label}
        spellCheck
      />
    </section>
  )
}

const SIGNAL_LABEL: Record<Signal, string> = { missing: 'Not yet', developing: 'Developing', solid: 'Solid' }

export function EssayStudio() {
  const { id = '' } = useParams()
  const essay = useOS((s) => s.essays.find((e) => e.id === id))
  const { updateSection, updateEssay, deleteEssay, pushRecent, toast } = useOS.getState()
  const navigate = useNavigate()
  const [active, setActive] = useState('thesis')
  const [focusMode, setFocusMode] = useState(false)
  const [citeOpen, setCiteOpen] = useState(false)
  const [citeQ, setCiteQ] = useState('')
  const refs = useRef<Record<string, HTMLTextAreaElement | null>>({})
  const debounced = useDebounced(essay, 500)
  const analysis = useMemo(() => (debounced ? analyzeEssay(debounced) : null), [debounced])

  useEffect(() => {
    if (essay) pushRecent({ kind: 'essay', id: essay.id })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])
  if (!essay) return <NotFound />

  const total = essay.sections.reduce((n, s) => n + words(s.body), 0)
  const citeHits = passages.filter((p) => !citeQ || (p.body + textById[p.textId].title + philosopherById[p.author].name + p.concepts.join(' ')).toLowerCase().includes(citeQ.toLowerCase())).slice(0, 8)

  const insertCitation = (pid: string) => {
    const p = passages.find((x) => x.id === pid)!
    const t = textById[p.textId]
    const ph = philosopherById[p.author]
    const snippet =
      p.source === 'quotation'
        ? `As ${ph.name.split(' ').slice(-1)[0]} writes, “${p.body}” (${t.title}, ${p.locator}).`
        : `${ph.name.split(' ').slice(-1)[0]} argues that ${p.body.charAt(0).toLowerCase() + p.body.slice(1)} (${t.title}, ${p.locator}; summary).`
    const sec = essay.sections.find((s) => s.id === active) ?? essay.sections[0]
    const el = refs.current[sec.id]
    const pos = el?.selectionStart ?? sec.body.length
    const next = sec.body.slice(0, pos) + (sec.body && !/\s$/.test(sec.body.slice(0, pos)) ? ' ' : '') + snippet + sec.body.slice(pos)
    updateSection(essay.id, sec.id, next)
    updateEssay(essay.id, { references: [...new Set([...essay.references, pid])] })
    setCiteOpen(false)
    toast({ title: 'Citation inserted', body: `${t.title}, ${p.locator}`, tone: 'success' })
  }

  return (
    <div className={`page es-page ${focusMode ? 'focus' : ''}`}>
      <aside className="es-outline">
        <input className="es-title" value={essay.title} onChange={(e) => updateEssay(essay.id, { title: e.target.value })} aria-label="Essay title" />
        <textarea className="es-prompt" value={essay.prompt} onChange={(e) => updateEssay(essay.id, { prompt: e.target.value })} aria-label="Essay prompt" rows={3} />
        <div className="eyebrow" style={{ margin: '8px 0 4px' }}>Outline</div>
        <nav className="outline-list">
          {essay.sections.map((s, i) => {
            const w = words(s.body)
            return (
              <button
                key={s.id}
                className={`outline-item ${active === s.id ? 'on' : ''}`}
                onClick={() => {
                  setActive(s.id)
                  document.getElementById(`sec-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  setTimeout(() => refs.current[s.id]?.focus({ preventScroll: true }), 350)
                }}
              >
                <span className={`o-dot ${w > 40 ? 'full' : w > 0 ? 'part' : ''}`} />
                <span className="mono dim o-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="o-label">{s.label}</span>
                <span className="mono dim o-w">{w || ''}</span>
              </button>
            )
          })}
        </nav>
        <div className="eyebrow" style={{ margin: '16px 0 4px' }}>References</div>
        <div className="refs">
          {essay.references.map((r) => (
            <div key={r} className="ref-row">
              <EntityLink id={r} />
              <button className="btn icon sm ghost" aria-label="Remove reference" onClick={() => updateEssay(essay.id, { references: essay.references.filter((x) => x !== r) })}>
                <X />
              </button>
            </div>
          ))}
          {!essay.references.length && <p className="dim" style={{ fontSize: 'var(--fs-11)' }}>Insert a citation to add references.</p>}
        </div>
        <button
          className="btn ghost sm danger"
          style={{ marginTop: 'auto', justifySelf: 'start' }}
          onClick={() => {
            deleteEssay(essay.id)
            navigate('/app/essays')
          }}
        >
          <Trash2 /> Delete essay
        </button>
      </aside>

      <section className="es-main">
        <div className="es-bar">
          <span className="hstack dim" style={{ fontSize: 'var(--fs-11)' }}>
            <Check size={12} style={{ color: 'var(--green)' }} /> Saved · {total} words
          </span>
          <div className="hstack" style={{ position: 'relative' }}>
            <button className="btn sm" onClick={() => setCiteOpen((o) => !o)} aria-expanded={citeOpen}>
              <Quote /> Insert citation
            </button>
            <button className={`btn sm ${focusMode ? 'primary' : ''}`} onClick={() => setFocusMode((f) => !f)} aria-pressed={focusMode}>
              <Focus /> Focus
            </button>
            <AnimatePresence>
              {citeOpen && (
                <motion.div className="cite-pop glass" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                  <input className="input" autoFocus placeholder="Search passages by phrase, thinker, concept…" value={citeQ} onChange={(e) => setCiteQ(e.target.value)} aria-label="Search passages" />
                  <div className="cite-list">
                    {citeHits.map((p) => (
                      <button key={p.id} className="cite-item" onClick={() => insertCitation(p.id)}>
                        <div className="hstack" style={{ gap: 6 }}>
                          <SourceBadge type={p.source} />
                          <span className="dim" style={{ fontSize: 'var(--fs-11)' }}>{philosopherById[p.author].name} · <em>{textById[p.textId].title}</em> {p.locator}</span>
                        </div>
                        <p className="clamp-2">{p.body}</p>
                      </button>
                    ))}
                  </div>
                  <p className="dim" style={{ fontSize: 10.5 }}>Inserted into “{essay.sections.find((s) => s.id === active)?.label}” at the cursor. Summaries are marked as such.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className="es-scroll">
          <div className="es-doc">
            <h1 className="es-doc-title">{essay.title}</h1>
            <p className="es-doc-prompt">{essay.prompt}</p>
            {essay.sections.map((s) => (
              <SectionEditor
                key={s.id}
                s={s}
                active={active === s.id}
                focusMode={focusMode}
                onFocus={() => setActive(s.id)}
                onChange={(v) => updateSection(essay.id, s.id, v)}
                registerRef={(el) => (refs.current[s.id] = el)}
              />
            ))}
          </div>
        </div>
      </section>

      <aside className="es-analysis">
        <div className="hstack" style={{ justifyContent: 'space-between' }}>
          <div className="eyebrow">Argument analysis</div>
          <PenLine size={13} style={{ color: 'var(--amber)' }} />
        </div>
        <p className="dim" style={{ fontSize: 'var(--fs-11)', lineHeight: 1.5 }}>Reads for reasoning, not grammar. Signals update as you write.</p>
        {analysis?.dimensions.map((d) => (
          <div key={d.id} className={`dim-card ${d.signal}`}>
            <div className="dim-head">
              <span className="t0">{d.label}</span>
              <span className="signal">
                <i className={d.signal !== 'missing' ? 'on' : ''} />
                <i className={d.signal === 'solid' ? 'on' : ''} />
                <i className={d.signal === 'solid' ? 'on' : ''} />
                <span className="mono">{SIGNAL_LABEL[d.signal]}</span>
              </span>
            </div>
            <p className="dim-sum">{d.summary}</p>
            {d.prompts.length > 0 && (
              <ul className="dim-prompts">
                {d.prompts.slice(0, 3).map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {analysis && (analysis.concepts.length > 0 || analysis.philosophers.length > 0) && (
          <div className="dim-card">
            <div className="dim-head"><span className="t0">Detected in your draft</span></div>
            <div className="chips">
              {analysis.philosophers.map((p) => <EntityLink key={p} id={p} variant="chip" />)}
              {analysis.concepts.map((c) => <EntityLink key={c} id={c} variant="chip" />)}
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}
