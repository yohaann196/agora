import { AppWindow } from 'lucide-react'
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'
import { KIND_LABEL, neighbors, routeFor } from '../../model/graph'
import type { EntityKind } from '../../model/types'
import { useOS } from '../../store'
import { useKnowledgeGraph } from '../../store/graph'
import { KindIcon } from './primitives'

interface Props {
  id: string
  children?: ReactNode
  variant?: 'inline' | 'chip'
  className?: string
  hover?: boolean
}

/**
 * A link to any entity on the knowledge graph. Click to navigate, ⌥/Alt-click to
 * open a floating preview window. Hover shows a preview card.
 */
export function EntityLink({ id, children, variant = 'inline', className = '', hover = true }: Props) {
  const g = useKnowledgeGraph()
  const node = g.nodes.get(id)
  const navigate = useNavigate()
  const pushRecent = useOS((s) => s.pushRecent)
  const openWindow = useOS((s) => s.openWindow)
  const ref = useRef<HTMLAnchorElement>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  if (!node) return <span className={className}>{children ?? id}</span>
  const href = routeFor(node)

  const onClick = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setRect(null)
    if (e.altKey) {
      openWindow('entity', { kind: node.kind, id })
      return
    }
    pushRecent({ kind: node.kind, id })
    navigate(href)
  }

  const onEnter = () => {
    if (!hover) return
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => ref.current && setRect(ref.current.getBoundingClientRect()), 420)
  }
  const onLeave = () => {
    window.clearTimeout(timer.current)
    setRect(null)
  }

  const cls = variant === 'chip' ? `tag k-${node.kind} ${className}` : `elink k-${node.kind} ${className}`
  return (
    <>
      <a ref={ref} href={href} className={cls} onClick={onClick} onMouseEnter={onEnter} onMouseLeave={onLeave} onFocus={onEnter} onBlur={onLeave}>
        <span className="dot" aria-hidden />
        {children ?? node.label}
      </a>
      {rect && createPortal(<HoverCard id={id} rect={rect} />, document.body)}
    </>
  )
}

function HoverCard({ id, rect }: { id: string; rect: DOMRect }) {
  const g = useKnowledgeGraph()
  const node = g.nodes.get(id)!
  const nb = neighbors(g, id)
  const W = 320
  const left = Math.min(Math.max(12, rect.left), window.innerWidth - W - 12)
  const below = rect.bottom + 8 + 190 < window.innerHeight
  const style = below ? { left, top: rect.bottom + 8 } : { left, bottom: window.innerHeight - rect.top + 8 }
  const kinds = new Map<EntityKind, number>()
  for (const n of nb) kinds.set(n.node.kind, (kinds.get(n.node.kind) ?? 0) + 1)
  return (
    <div className={`hovercard glass k-${node.kind}`} style={{ ...style, width: W }} role="tooltip">
      <div className="hovercard-head">
        <KindIcon kind={node.kind} size={13} />
        <span className="eyebrow">{KIND_LABEL[node.kind]}</span>
        <span className="dim mono" style={{ marginLeft: 'auto', fontSize: 10 }}>
          {nb.length} links
        </span>
      </div>
      <div className="hovercard-title">{node.label}</div>
      {node.sublabel && <div className="dim" style={{ fontSize: 'var(--fs-11)' }}>{node.sublabel}</div>}
      <p className="hovercard-body clamp-3">{node.summary}</p>
      <div className="hovercard-foot">
        {[...kinds.entries()].slice(0, 4).map(([k, c]) => (
          <span key={k} className={`k-${k} hstack`} style={{ gap: 4 }}>
            <span className="dot" style={{ width: 5, height: 5, borderRadius: 5, background: 'var(--tag)' }} />
            {c} {KIND_LABEL[k].toLowerCase()}
            {c > 1 && !KIND_LABEL[k].endsWith('s') ? 's' : ''}
          </span>
        ))}
        <span className="spacer" />
        <span className="hstack dim" style={{ gap: 4 }}>
          <AppWindow size={11} /> <span className="kbd">⌥</span> click
        </span>
      </div>
    </div>
  )
}
