import { ArrowRight, Route } from 'lucide-react'
import { useMemo, useState } from 'react'
import { findPath, neighbors, search } from '../../model/graph'
import { useKnowledgeGraph } from '../../store/graph'
import { EntityLink } from './EntityLink'

/** "How is X connected to Y?" — shortest path through the knowledge graph. */
export function PathTracer({ from, suggestions = [] }: { from: string; suggestions?: string[] }) {
  const g = useKnowledgeGraph()
  const [q, setQ] = useState('')
  const [target, setTarget] = useState<string | null>(null)
  const hits = useMemo(() => (q.trim() ? search(g, q, ['philosopher', 'concept', 'school', 'text', 'argument'], 6).filter((h) => h.node.id !== from) : []), [g, q, from])
  const path = useMemo(() => (target ? findPath(g, from, target) : null), [g, from, target])

  const relLabel = (a: string, b: string) => neighbors(g, a).find((n) => n.node.id === b)?.label ?? ''

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ position: 'relative' }}>
        <input
          className="input"
          placeholder="Trace a connection to…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setTarget(null)
          }}
          aria-label="Find connection to"
        />
        {hits.length > 0 && !target && (
          <div className="glass" style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 5, borderRadius: 'var(--r-2)', padding: 4 }}>
            {hits.map((h) => (
              <button
                key={h.node.id}
                className={`result-row k-${h.node.kind}`}
                onClick={() => {
                  setTarget(h.node.id)
                  setQ(h.node.label)
                }}
              >
                <span className="dot" style={{ width: 6, height: 6, borderRadius: 6, background: 'var(--tag)' }} />
                <span className="r-label">{h.node.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {!target && suggestions.length > 0 && (
        <div className="chips">
          {suggestions.map((s) => {
            const n = g.nodes.get(s)
            if (!n) return null
            return (
              <button key={s} className={`tag k-${n.kind}`} onClick={() => { setTarget(s); setQ(n.label) }}>
                <Route size={11} /> {n.label}
              </button>
            )
          })}
        </div>
      )}
      {target && (
        <div className="path-chain">
          {path ? (
            path.map((id, i) => (
              <div key={id} className="path-step">
                {i > 0 && (
                  <div className="path-rel">
                    <ArrowRight size={11} /> {relLabel(path[i - 1], id)}
                  </div>
                )}
                <EntityLink id={id} />
              </div>
            ))
          ) : (
            <p className="dim" style={{ fontSize: 'var(--fs-12)' }}>No path within six steps. Perhaps that connection is yours to make — add it on the Idea Map.</p>
          )}
          {path && <div className="dim mono" style={{ fontSize: 10.5, marginTop: 4 }}>{path.length - 1} step{path.length === 2 ? '' : 's'} apart</div>}
        </div>
      )}
    </div>
  )
}
