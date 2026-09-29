import { motion } from 'framer-motion'
import { BookOpen, Check, Play, Plus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { PageHeader } from '../../components/ui/primitives'
import { philosopherById } from '../../data/philosophers'
import { textById, texts } from '../../data/texts'
import type { ReadingItem } from '../../model/types'
import { useOS } from '../../store'
import './workspace.css'

const COLS: { id: ReadingItem['status']; label: string; color: string }[] = [
  { id: 'reading', label: 'Reading', color: 'var(--orange)' },
  { id: 'queued', label: 'Up next', color: 'var(--blue)' },
  { id: 'finished', label: 'Finished', color: 'var(--green)' },
]

export function ReadingList() {
  const reading = useOS((s) => s.reading)
  const { updateReading, removeReading, addReading } = useOS.getState()
  const [q, setQ] = useState('')
  const suggestions = useMemo(
    () => texts.filter((t) => !reading.some((r) => r.textId === t.id) && (!q || (t.title + ' ' + philosopherById[t.author].name).toLowerCase().includes(q.toLowerCase()))).slice(0, 6),
    [reading, q],
  )
  return (
    <div className="page">
      <PageHeader eyebrow="Workspace · Reading list" title="Reading List" lede="What you’re reading, what’s next, and what you’ve finished — each work linked to its passages and concepts." />
      <div className="reading-cols">
        {COLS.map((c) => {
          const items = reading.filter((r) => r.status === c.id)
          return (
            <section key={c.id} className="reading-col" style={{ ['--c' as string]: c.color }}>
              <div className="rc-head">
                <span className="rc-dot" />
                <span className="t0">{c.label}</span>
                <span className="mono dim">{items.length}</span>
              </div>
              {items.map((r, i) => {
                const t = textById[r.textId]
                return (
                  <motion.div key={r.textId} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="reading-card">
                    <Link to={`/app/texts/${t.id}`} className="rc-title serif">{t.title}</Link>
                    <div className="dim" style={{ fontSize: 'var(--fs-11)' }}>{philosopherById[t.author].name} · {t.year}</div>
                    {c.id !== 'queued' && (
                      <div className="hstack">
                        <input type="range" className="range" min={0} max={100} value={Math.round(r.progress * 100)} onChange={(e) => { const v = Number(e.target.value) / 100; updateReading(r.textId, { progress: v, status: v >= 1 ? 'finished' : 'reading' }) }} aria-label={`Progress on ${t.title}`} style={{ accentColor: c.color }} />
                        <span className="mono dim" style={{ fontSize: 10.5, width: 34, textAlign: 'right' }}>{Math.round(r.progress * 100)}%</span>
                      </div>
                    )}
                    <div className="hstack rc-actions">
                      {c.id === 'queued' && (
                        <button className="btn sm" onClick={() => updateReading(r.textId, { status: 'reading', progress: Math.max(0.02, r.progress) })}>
                          <Play /> Start
                        </button>
                      )}
                      {c.id === 'reading' && (
                        <button className="btn sm" onClick={() => updateReading(r.textId, { status: 'finished', progress: 1 })}>
                          <Check /> Finish
                        </button>
                      )}
                      <Link to={`/app/texts/${t.id}`} className="btn ghost sm"><BookOpen /> Passages</Link>
                      <span className="spacer" />
                      <button className="btn icon sm ghost" aria-label="Remove" onClick={() => removeReading(r.textId)}><X /></button>
                    </div>
                  </motion.div>
                )
              })}
              {!items.length && <div className="rc-empty">Nothing here.</div>}
            </section>
          )
        })}
      </div>
      <section className="section" style={{ marginTop: 28 }}>
        <div className="section-title"><h2>Add from the library</h2></div>
        <input className="input" style={{ maxWidth: 360 }} placeholder="Search works…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search works" />
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
          {suggestions.map((t) => (
            <div key={t.id} className="card">
              <div className="card-sub">{philosopherById[t.author].name} · {t.year}</div>
              <div className="serif t0" style={{ fontSize: 17 }}>{t.title}</div>
              <button className="btn sm" style={{ justifySelf: 'start' }} onClick={() => addReading(t.id)}><Plus /> Add</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
