import { Bookmark, X } from 'lucide-react'
import { useState } from 'react'
import { EntityLink } from '../../components/ui/EntityLink'
import { KindIcon, PageHeader } from '../../components/ui/primitives'
import { KIND_LABEL } from '../../model/graph'
import type { EntityKind } from '../../model/types'
import { useOS } from '../../store'
import { useKnowledgeGraph } from '../../store/graph'
import './workspace.css'

export function SavedPage() {
  const saved = useOS((s) => s.saved)
  const toggleSaved = useOS((s) => s.toggleSaved)
  const g = useKnowledgeGraph()
  const kinds = [...new Set(saved.map((s) => s.kind))]
  const [filter, setFilter] = useState<EntityKind | 'all'>('all')
  const list = saved.filter((s) => filter === 'all' || s.kind === filter)
  return (
    <div className="page">
      <PageHeader eyebrow="Workspace · Saved" title="Saved" lede="Everything you’ve bookmarked across PhilosophyOS — thinkers, passages, arguments, debates." />
      <div className="filterbar">
        <div className="seg" role="tablist">
          <button role="tab" aria-selected={filter === 'all'} onClick={() => setFilter('all')}>All <span className="dim mono" style={{ marginLeft: 6, fontSize: 10 }}>{saved.length}</span></button>
          {kinds.map((k) => (
            <button key={k} role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}>
              {KIND_LABEL[k]}s <span className="dim mono" style={{ marginLeft: 6, fontSize: 10 }}>{saved.filter((s) => s.kind === k).length}</span>
            </button>
          ))}
        </div>
      </div>
      {list.length ? (
        <div className="saved-grid">
          {list.map((s) => {
            const n = g.nodes.get(s.id)
            if (!n) return null
            return (
              <div key={s.id} className={`card saved-card k-${n.kind}`}>
                <div className="hstack" style={{ justifyContent: 'space-between' }}>
                  <span className="hstack eyebrow" style={{ gap: 6 }}><KindIcon kind={n.kind} size={12} /> {KIND_LABEL[n.kind]}</span>
                  <button className="btn icon sm ghost" aria-label="Remove from saved" onClick={() => toggleSaved(s)}><X /></button>
                </div>
                <EntityLink id={n.id}>
                  <span className="serif" style={{ fontSize: 19 }}>{n.label}</span>
                </EntityLink>
                <p className={`clamp-3 ${n.kind === 'passage' ? 'serif t0' : 'dim'}`} style={{ fontSize: n.kind === 'passage' ? 15 : 'var(--fs-12)', lineHeight: 1.5 }}>{n.summary}</p>
                <span className="dim mono" style={{ fontSize: 10.5 }}>{n.sublabel}</span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="empty">
          <Bookmark />
          <p>Nothing saved yet. Use the bookmark on any thinker, passage or argument.</p>
        </div>
      )}
    </div>
  )
}
