import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Search, ShieldCheck, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { interpretPassage } from '../../ai/interpret'
import { detectConcepts } from '../../ai/lexicon'
import { EntityLink } from '../../components/ui/EntityLink'
import { PageHeader, SaveButton, SourceBadge } from '../../components/ui/primitives'
import { conceptById, concepts } from '../../data/concepts'
import { philosopherById, philosophers } from '../../data/philosophers'
import { schools } from '../../data/schools'
import { passages, textById, texts } from '../../data/texts'
import type { Passage } from '../../model/types'
import './texts.css'

type Mode = 'all' | 'phrase' | 'concept' | 'philosopher' | 'work' | 'school'
const MODES: { id: Mode; label: string }[] = [
  { id: 'all', label: 'Everything' },
  { id: 'phrase', label: 'Phrase' },
  { id: 'concept', label: 'Concept' },
  { id: 'philosopher', label: 'Philosopher' },
  { id: 'work', label: 'Work' },
  { id: 'school', label: 'School' },
]
const EXAMPLES = ['free will', 'justice', 'lying', 'God is dead', 'Kant', 'existentialism', 'happiness', 'the Other']

interface Hit {
  p: Passage
  score: number
  why: string[]
}

function runSearch(q: string, mode: Mode): { hits: Hit[]; matchedConcepts: string[] } {
  const t = q.trim().toLowerCase()
  if (!t) return { hits: [], matchedConcepts: [] }
  const res = new Map<string, Hit>()
  const add = (p: Passage, score: number, why: string) => {
    const h = res.get(p.id) ?? { p, score: 0, why: [] }
    h.score += score
    if (!h.why.includes(why)) h.why.push(why)
    res.set(p.id, h)
  }
  const on = (m: Mode) => mode === 'all' || mode === m
  let matchedConcepts: string[] = []
  if (on('phrase')) {
    for (const p of passages) {
      if (p.body.toLowerCase().includes(t)) add(p, 5, 'phrase in passage')
      else if (p.context.toLowerCase().includes(t)) add(p, 1.5, 'phrase in context')
    }
  }
  if (on('concept')) {
    matchedConcepts = [...new Set([...concepts.filter((c) => c.name.toLowerCase().includes(t)).map((c) => c.id), ...detectConcepts(t, 3)])].slice(0, 3)
    for (const p of passages) for (const c of matchedConcepts) if (p.concepts.includes(c)) add(p, 3, `concept: ${conceptById[c].name}`)
  }
  if (on('philosopher')) {
    for (const ph of philosophers.filter((x) => x.name.toLowerCase().includes(t))) for (const p of passages.filter((x) => x.author === ph.id)) add(p, 2.5, `by ${ph.name}`)
  }
  if (on('work')) {
    for (const w of texts.filter((x) => x.title.toLowerCase().includes(t))) for (const p of passages.filter((x) => x.textId === w.id)) add(p, 3, `from ${w.title}`)
  }
  if (on('school')) {
    for (const s of schools.filter((x) => x.name.toLowerCase().includes(t))) for (const p of passages.filter((x) => s.members.includes(x.author))) add(p, 1.5, `school: ${s.name}`)
  }
  const hits = [...res.values()].sort((a, b) => b.score - a.score || (a.p.source === 'quotation' ? -1 : 1))
  return { hits, matchedConcepts }
}

function Highlight({ text, q }: { text: string; q: string }) {
  const t = q.trim()
  if (!t) return <>{text}</>
  const i = text.toLowerCase().indexOf(t.toLowerCase())
  if (i < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, i)}
      <mark className="hl">{text.slice(i, i + t.length)}</mark>
      {text.slice(i + t.length)}
    </>
  )
}

export function ResultCard({ hit, q }: { hit: Hit; q: string }) {
  const [open, setOpen] = useState(false)
  const [interp, setInterp] = useState(false)
  const p = hit.p
  const w = textById[p.textId]
  const ph = philosopherById[p.author]
  const ai = interp ? interpretPassage(p) : null
  return (
    <motion.article layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`passage-card ${p.source}`}>
      <div className="p-meta" style={{ marginBottom: 2 }}>
        <SourceBadge type={p.source} />
        <EntityLink id={ph.id} />
        <span className="dim">·</span>
        <EntityLink id={w.id}>
          <em>{w.title}</em>
        </EntityLink>
        <span className="mono">{p.locator}</span>
        {p.translation && <span className="dim">{p.translation}</span>}
        <span className="spacer" />
        <SaveButton refItem={{ kind: 'passage', id: p.id }} />
      </div>
      <div className="p-body">
        {p.source === 'quotation' ? '“' : ''}
        <Highlight text={p.body} q={q} />
        {p.source === 'quotation' ? '”' : ''}
      </div>
      <div className="hstack" style={{ flexWrap: 'wrap', gap: 6 }}>
        {hit.why.map((w) => (
          <span key={w} className="why mono">{w}</span>
        ))}
        <span className="spacer" />
        <button className="btn ghost sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          Context <ChevronDown style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 200ms' }} />
        </button>
        <button className="btn ghost sm" onClick={() => setInterp((o) => !o)} aria-expanded={interp} style={interp ? { color: 'var(--violet)' } : undefined}>
          <Sparkles /> Interpret
        </button>
        <Link className="btn ghost sm" to={`/app/texts/${w.id}#${p.id}`}>
          Open work
        </Link>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div className="p-context">
              <div className="hstack" style={{ marginBottom: 6 }}>
                <SourceBadge type="summary" label="Context · summary" />
              </div>
              {p.context}
            </div>
          </motion.div>
        )}
        {ai && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div className="interp">
              <SourceBadge type="interpretation" />
              <p>{ai.claim}</p>
              <p>{ai.project}</p>
              {ai.connections.length > 0 && (
                <ul>
                  {ai.connections.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              )}
              <p className="interp-q">{ai.question}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  )
}

export function TextExplorer() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const mode = (params.get('mode') as Mode) ?? 'all'
  const [draft, setDraft] = useState(q)
  const [sourceFilter, setSourceFilter] = useState<'all' | 'quotation' | 'summary'>('all')
  const [authorFilter, setAuthorFilter] = useState<string | null>(null)
  const { hits, matchedConcepts } = useMemo(() => runSearch(q, mode), [q, mode])
  const filtered = hits.filter((h) => (sourceFilter === 'all' || h.p.source === sourceFilter) && (!authorFilter || h.p.author === authorFilter))
  const authors = [...new Set(hits.map((h) => h.p.author))]
  const set = (next: { q?: string; mode?: Mode }) => {
    const n = new URLSearchParams(params)
    if (next.q !== undefined) n.set('q', next.q)
    if (next.mode) n.set('mode', next.mode)
    setParams(n, { replace: true })
    setAuthorFilter(null)
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow={`Text Explorer · ${passages.length} passages from ${texts.length} works`}
        title="Text Explorer"
        lede="Search the corpus by phrase, concept, philosopher, work, or school. Every result says exactly what it is: a direct quotation, a summary, or an interpretation."
      />

      <form
        className="explorer-search"
        onSubmit={(e) => {
          e.preventDefault()
          set({ q: draft })
        }}
      >
        <Search aria-hidden />
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Try “free will”, “justice”, or “God is dead”" aria-label="Search texts" autoFocus={!q} />
        <div className="seg" role="group" aria-label="Search by">
          {MODES.map((m) => (
            <button type="button" key={m.id} aria-pressed={mode === m.id} onClick={() => set({ mode: m.id, q: draft })}>
              {m.label}
            </button>
          ))}
        </div>
        <button className="btn primary">Search</button>
      </form>

      <div className="source-legend">
        <ShieldCheck size={14} style={{ color: 'var(--green)' }} />
        <span>Integrity:</span>
        <SourceBadge type="quotation" /> <span className="dim">verbatim from the named translation</span>
        <SourceBadge type="summary" /> <span className="dim">what the text says, not its words</span>
        <SourceBadge type="interpretation" /> <span className="dim">a reading that goes beyond the text</span>
        <span className="dim">· Quotations are never generated.</span>
      </div>

      {!q && (
        <div className="explorer-empty">
          <div className="eyebrow">Start with</div>
          <div className="chips">
            {EXAMPLES.map((e) => (
              <button
                key={e}
                className="tag plain"
                onClick={() => {
                  setDraft(e)
                  set({ q: e })
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      {q && (
        <div className="two-col">
          <div className="grid">
            {matchedConcepts.length > 0 && (
              <div className="concept-hit">
                {matchedConcepts.map((c) => (
                  <div key={c}>
                    <div className="eyebrow" style={{ color: 'var(--cyan)' }}>Concept match</div>
                    <div className="hstack" style={{ margin: '4px 0' }}>
                      <EntityLink id={c}>
                        <span className="serif" style={{ fontSize: 20 }}>{conceptById[c].name}</span>
                      </EntityLink>
                    </div>
                    <p className="dim" style={{ fontSize: 'var(--fs-12)' }}>{conceptById[c].definition}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="hstack" style={{ justifyContent: 'space-between' }}>
              <span className="dim" style={{ fontSize: 'var(--fs-12)' }}>
                {filtered.length} result{filtered.length === 1 ? '' : 's'} for <span className="t0">“{q}”</span>
              </span>
            </div>
            {filtered.map((h) => (
              <ResultCard key={h.p.id} hit={h} q={mode === 'all' || mode === 'phrase' ? q : ''} />
            ))}
            {!filtered.length && (
              <div className="empty">
                No passages match. The corpus is deliberately small and verified — PhilosophyOS won’t invent a quotation to fill the gap.
              </div>
            )}
          </div>
          <aside>
            <div className="panel">
              <div className="panel-head"><h3>Source type</h3></div>
              <div className="panel-body" style={{ display: 'grid', gap: 6 }}>
                {(['all', 'quotation', 'summary'] as const).map((s) => (
                  <label key={s} className="facet">
                    <input type="radio" name="src" checked={sourceFilter === s} onChange={() => setSourceFilter(s)} />
                    <span>{s === 'all' ? 'All' : s === 'quotation' ? 'Direct quotations' : 'Summaries'}</span>
                    <span className="dim mono">{s === 'all' ? hits.length : hits.filter((h) => h.p.source === s).length}</span>
                  </label>
                ))}
              </div>
            </div>
            {authors.length > 1 && (
              <div className="panel">
                <div className="panel-head">
                  <h3>Philosopher</h3>
                  {authorFilter && <button className="btn ghost sm" onClick={() => setAuthorFilter(null)}>Clear</button>}
                </div>
                <div className="panel-body" style={{ display: 'grid', gap: 6 }}>
                  {authors.map((a) => (
                    <label key={a} className="facet">
                      <input type="radio" name="author" checked={authorFilter === a} onChange={() => setAuthorFilter(a)} />
                      <span>{philosopherById[a].name}</span>
                      <span className="dim mono">{hits.filter((h) => h.p.author === a).length}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}
