import { motion } from 'framer-motion'
import { ArrowRight, BrainCircuit, Columns3, Sparkles, Waypoints } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { sketchComparison } from '../../ai/interpret'
import { EntityLink } from '../../components/ui/EntityLink'
import { Monogram, PageHeader, SourceBadge, eraColor } from '../../components/ui/primitives'
import { compareById, compareQuestions } from '../../data/compare'
import { conceptById } from '../../data/concepts'
import { philosopherById, philosophers } from '../../data/philosophers'
import { passageById, textById } from '../../data/texts'
import type { CompareQuestion, Position } from '../../model/types'
import { useOS } from '../../store'
import { shortName } from '../library/Library'
import './compare.css'

function matchCurated(q: string): CompareQuestion | undefined {
  const t = q.trim().toLowerCase().replace(/[?.!]/g, '')
  return compareQuestions.find((c) => c.question.toLowerCase().replace(/[?.!]/g, '') === t)
}

export function PositionColumn({ pos, index }: { pos: Position; index: number }) {
  const p = philosopherById[pos.philosopher]
  return (
    <motion.article className="cmp-col" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.07, duration: 0.45, ease: [0.16, 1, 0.3, 1] }} style={{ ['--c' as string]: eraColor(p.era) }}>
      <header className="cmp-head">
        <Monogram id={p.id} size={40} />
        <div>
          <EntityLink id={p.id}>
            <span className="serif" style={{ fontSize: 19 }}>{p.name}</span>
          </EntityLink>
          <div className="hstack" style={{ marginTop: 6, gap: 8, flexWrap: 'wrap' }}>
            <span className="mono dim" style={{ fontSize: 10.5 }}>{p.dates}</span>
            <span className="stance">{pos.stance}</span>
          </div>
        </div>
      </header>
      <p className="cmp-headline">{pos.headline}</p>
      <div className="cmp-block">
        <div className="eyebrow">Reasoning</div>
        <ol className="cmp-reasons">
          {pos.reasoning.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ol>
      </div>
      <div className="cmp-block">
        <div className="eyebrow">Support</div>
        <div className="cmp-support">
          {pos.support.map((s, i) => {
            const passage = s.passageId ? passageById[s.passageId] : undefined
            return (
              <div key={i} className={`sup ${s.source}`}>
                <div className="hstack" style={{ flexWrap: 'wrap', gap: 6 }}>
                  <SourceBadge type={s.source === 'quotation' ? 'quotation' : s.source === 'summary' ? 'summary' : 'interpretation'} label={s.source === 'quotation' ? 'Textual support' : s.source === 'summary' ? 'Summary of text' : 'Interpretation'} />
                  <span className="dim" style={{ fontSize: 'var(--fs-11)' }}>
                    {passage ? (
                      <>
                        <EntityLink id={passage.textId}>
                          <em>{textById[passage.textId].title}</em>
                        </EntityLink>{' '}
                        <span className="mono">{passage.locator}</span>
                      </>
                    ) : (
                      s.citation
                    )}
                  </span>
                </div>
                {s.source === 'quotation' && passage ? (
                  <blockquote className="sup-quote">“{passage.body}”{passage.translation && <span className="sup-tr"> — {passage.translation}</span>}</blockquote>
                ) : s.source === 'summary' && passage ? (
                  <p className="sup-text">{passage.body}</p>
                ) : (
                  <p className="sup-text">{s.text}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <div className="chips" style={{ marginTop: 'auto' }}>
        {pos.concepts.map((c) => (
          <EntityLink key={c} id={c} variant="chip">
            {conceptById[c]?.name}
          </EntityLink>
        ))}
      </div>
    </motion.article>
  )
}

export function ComparePage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const qid = params.get('q') ?? 'lying'
  const custom = params.get('custom')
  const withParam = params.get('with')
  const [draft, setDraft] = useState(custom ?? compareById[qid]?.question ?? '')
  const [picked, setPicked] = useState<string[]>(() => {
    const base = compareById[qid]?.positions.map((p) => p.philosopher) ?? ['kant', 'mill', 'nietzsche']
    return withParam && !base.includes(withParam) ? [withParam, ...base.slice(0, 3)] : base
  })

  const data: CompareQuestion = useMemo(() => {
    if (custom) {
      const cur = matchCurated(custom)
      if (cur) return cur
      return sketchComparison(custom, picked.slice(0, 4))
    }
    const cq = compareById[qid] ?? compareQuestions[0]
    // If the user added a philosopher the curated set lacks, sketch just that column.
    const extra = picked.filter((p) => !cq.positions.some((x) => x.philosopher === p))
    if (!extra.length) return { ...cq, positions: cq.positions.filter((p) => picked.includes(p.philosopher)) }
    const sk = sketchComparison(cq.question, extra)
    return { ...cq, positions: [...sk.positions, ...cq.positions.filter((p) => picked.includes(p.philosopher))] }
  }, [custom, qid, picked])

  const isSketch = data.id === 'custom' || data.positions.some((p) => p.stance === 'Sketch')
  const run = () => {
    const cur = matchCurated(draft)
    if (cur) {
      setParams({ q: cur.id })
      setPicked(cur.positions.map((p) => p.philosopher))
    } else setParams({ custom: draft })
  }
  const toggle = (id: string) => setPicked((ps) => (ps.includes(id) ? (ps.length > 1 ? ps.filter((x) => x !== id) : ps) : ps.length >= 4 ? [...ps.slice(1), id] : [...ps, id]))

  return (
    <div className="page">
      <PageHeader
        eyebrow="Philosopher Compare"
        title="Compare perspectives"
        lede="Put one question to several thinkers. Each position separates what the text actually says from how it is interpreted."
      />
      <form
        className="cmp-ask"
        onSubmit={(e) => {
          e.preventDefault()
          run()
        }}
      >
        <Columns3 aria-hidden />
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask a question — e.g. Is lying ever justified?" aria-label="Question" />
        <button className="btn primary">
          Compare <ArrowRight />
        </button>
      </form>
      <div className="cmp-presets">
        {compareQuestions.map((c) => (
          <button
            key={c.id}
            className={`tag plain ${!custom && qid === c.id ? 'on' : ''}`}
            onClick={() => {
              setParams({ q: c.id })
              setDraft(c.question)
              setPicked(c.positions.map((p) => p.philosopher))
            }}
          >
            {c.question}
          </button>
        ))}
      </div>
      <div className="cmp-picker">
        <span className="eyebrow">Thinkers</span>
        {philosophers.map((p) => (
          <button key={p.id} className={`pick ${picked.includes(p.id) ? 'on' : ''}`} onClick={() => toggle(p.id)} title={p.name} aria-pressed={picked.includes(p.id)}>
            <Monogram id={p.id} size={24} />
            <span>{shortName(p)}</span>
          </button>
        ))}
      </div>

      <motion.h2 key={data.question} className="cmp-question" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {data.question}
      </motion.h2>
      {isSketch && (
        <div className="sketch-banner">
          <Sparkles size={14} />
          <span>
            {data.id === 'custom' ? 'No curated comparison exists for this question yet.' : 'Some columns are not in the curated set.'} Columns marked <strong>Sketch</strong> are generated from each thinker’s core commitments — treat them as <SourceBadge type="interpretation" /> and verify against the texts.
          </span>
        </div>
      )}

      <div className="cmp-grid" style={{ gridTemplateColumns: `repeat(${Math.min(4, data.positions.length)}, minmax(0, 1fr))` }}>
        {data.positions.map((p, i) => (
          <PositionColumn key={p.philosopher + data.question} pos={p} index={i} />
        ))}
      </div>

      <section className="key-diff">
        <div className="eyebrow" style={{ color: 'var(--violet)' }}>Key difference</div>
        <p>{data.keyDifference}</p>
        {data.axes.length > 0 && (
          <div className="axes" role="table">
            <div className="axes-row head" role="row">
              <span role="columnheader" />
              {data.positions.map((p) => (
                <span key={p.philosopher} role="columnheader">{shortName(philosopherById[p.philosopher])}</span>
              ))}
            </div>
            {data.axes.map((a) => (
              <div className="axes-row" role="row" key={a.label}>
                <span role="rowheader" className="dim">{a.label}</span>
                {data.positions.map((p) => (
                  <span key={p.philosopher} role="cell">{a.values[p.philosopher] ?? '—'}</span>
                ))}
              </div>
            ))}
          </div>
        )}
        <div className="hstack" style={{ marginTop: 16, flexWrap: 'wrap' }}>
          <button
            className="btn"
            onClick={() => {
              useOS.getState().setSocraticMode('socratic')
              navigate(`/app/socratic?q=${encodeURIComponent(`My answer to "${data.question}" is: `)}`)
            }}
          >
            <BrainCircuit /> Where do you stand? Think it through
          </button>
          <button
            className="btn"
            onClick={() => {
              const s = useOS.getState()
              const id = s.createArgument(data.question)
              s.updateArgument(id, { philosophers: data.positions.map((p) => p.philosopher), concepts: [...new Set(data.positions.flatMap((p) => p.concepts))].slice(0, 5) })
              navigate(`/app/arguments/${id}`)
            }}
          >
            <Waypoints /> Build your own argument
          </button>
        </div>
      </section>
    </div>
  )
}
