import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { neighbors, routeFor } from '../../model/graph'
import type { EntityKind } from '../../model/types'
import { useOS } from '../../store'
import { useKnowledgeGraph } from '../../store/graph'

const KIND_VAR: Record<string, string> = {
  philosopher: 'var(--k-philosopher)',
  concept: 'var(--k-concept)',
  school: 'var(--k-school)',
  text: 'var(--k-text)',
  passage: 'var(--k-passage)',
  argument: 'var(--k-argument)',
  debate: 'var(--k-debate)',
  essay: 'var(--k-essay)',
  note: 'var(--k-note)',
  user: 'var(--k-user)',
  source: 'var(--k-source)',
  doc: 'var(--k-doc)',
  flow: 'var(--k-doc)',
}
export const kindColor = (k: EntityKind | 'custom') => KIND_VAR[k] ?? 'var(--k-custom)'

/** Radial neighborhood of one entity on the knowledge graph. */
export function MiniGraph({ id, size = 300, max = 16, exclude = ['passage'] }: { id: string; size?: number; max?: number; exclude?: EntityKind[] }) {
  const g = useKnowledgeGraph()
  const navigate = useNavigate()
  const pushRecent = useOS((s) => s.pushRecent)
  const [hover, setHover] = useState<string | null>(null)
  const center = g.nodes.get(id)
  const nb = useMemo(() => {
    const seen = new Set<string>()
    return neighbors(g, id)
      .filter((n) => !exclude.includes(n.node.kind) && !seen.has(n.node.id) && seen.add(n.node.id))
      .slice(0, max)
  }, [g, id, max, exclude])
  if (!center) return null
  const c = size / 2
  const R = size / 2 - 58
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size, display: 'block', margin: '0 auto', overflow: 'visible' }} role="img" aria-label={`Connections of ${center.label}`}>
      <circle cx={c} cy={c} r={R} fill="none" stroke="var(--line-1)" strokeDasharray="2 4" />
      <circle cx={c} cy={c} r={R * 0.45} fill="none" stroke="var(--line-0)" />
      {nb.map((n, i) => {
        const a = (i / nb.length) * Math.PI * 2 - Math.PI / 2
        const x = c + Math.cos(a) * R
        const y = c + Math.sin(a) * R
        const on = hover === n.node.id
        return (
          <g key={n.node.id}>
            <motion.line
              x1={c}
              y1={c}
              x2={x}
              y2={y}
              stroke={on ? kindColor(n.node.kind) : 'var(--line-2)'}
              strokeWidth={on ? 1.2 : 0.8}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.02 * i, duration: 0.5 }}
            />
          </g>
        )
      })}
      {nb.map((n, i) => {
        const a = (i / nb.length) * Math.PI * 2 - Math.PI / 2
        const x = c + Math.cos(a) * R
        const y = c + Math.sin(a) * R
        const on = hover === n.node.id
        const anchor = Math.abs(Math.cos(a)) < 0.3 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end'
        const dx = anchor === 'middle' ? 0 : Math.cos(a) > 0 ? 9 : -9
        const dy = anchor === 'middle' ? (Math.sin(a) > 0 ? 16 : -10) : 4
        return (
          <g
            key={n.node.id}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHover(n.node.id)}
            onMouseLeave={() => setHover(null)}
            onClick={() => {
              pushRecent({ kind: n.node.kind, id: n.node.id })
              navigate(routeFor(n.node))
            }}
            role="link"
            aria-label={`${n.label} ${n.node.label}`}
          >
            <motion.circle
              cx={x}
              cy={y}
              r={on ? 5 : 3.6}
              fill={kindColor(n.node.kind)}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.25 + 0.02 * i }}
              style={{ filter: on ? `drop-shadow(0 0 6px ${kindColor(n.node.kind)})` : undefined }}
            />
            <text x={x + dx} y={y + dy} textAnchor={anchor} fontSize="10" fill={on ? 'var(--text-0)' : 'var(--text-2)'} style={{ fontFamily: 'var(--font-ui)' }}>
              {n.node.label.length > 16 ? n.node.label.slice(0, 15) + '…' : n.node.label}
            </text>
          </g>
        )
      })}
      <circle cx={c} cy={c} r={24} fill="var(--bg-2)" stroke={kindColor(center.kind)} strokeWidth="1" />
      <circle cx={c} cy={c} r={30} fill="none" stroke={kindColor(center.kind)} strokeOpacity="0.2" />
      <text x={c} y={c + 4} textAnchor="middle" fontSize="11" fill="var(--text-0)" style={{ fontFamily: 'var(--font-serif)' }}>
        {center.label.length > 12 ? center.label.split(' ').slice(-1)[0].slice(0, 12) : center.label}
      </text>
    </svg>
  )
}
