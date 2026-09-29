import { motion } from 'framer-motion'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { EntityLink } from '../../components/ui/EntityLink'
import type { ArgLink, ArgNode, ArgNodeType, Argument } from '../../model/types'
import { LINK_META, NODE_META, NODE_W, nodeLabel } from './argModel'

export type Selection = { type: 'node'; id: string } | { type: 'link'; id: string } | null
export interface View {
  x: number
  y: number
  k: number
}

interface Props {
  arg: Argument
  selected: Selection
  onSelect: (s: Selection) => void
  highlight: string[]
  flags: Record<string, string[]>
  heights: Record<string, number>
  onHeight: (id: string, h: number) => void
  view: View
  onView: (v: View) => void
  onMove: (id: string, x: number, y: number) => void
  onText: (id: string, text: string) => void
  onConnect: (from: string, to: string) => void
  onAttach: (targetId: string, type: ArgNodeType) => void
  onDelete: (id: string) => void
  readOnly?: boolean
}

const ATTACH_MENU: ArgNodeType[] = ['objection', 'counter', 'rebuttal', 'evidence', 'definition', 'assumption']

function anchor(a: { x: number; y: number; h: number }, b: { x: number; y: number; h: number }) {
  const acx = a.x + NODE_W / 2
  const bcx = b.x + NODE_W / 2
  const dx = bcx - acx
  const vertical = Math.abs(dx) < NODE_W * 0.8
  if (vertical) {
    const down = b.y > a.y
    const p1 = { x: acx, y: down ? a.y + a.h : a.y }
    const p2 = { x: bcx, y: down ? b.y : b.y + b.h }
    const c = Math.max(30, Math.abs(p2.y - p1.y) / 2)
    return { p1, p2, d: `M${p1.x},${p1.y} C${p1.x},${p1.y + (down ? c : -c)} ${p2.x},${p2.y - (down ? c : -c)} ${p2.x},${p2.y}` }
  }
  const right = dx > 0
  const p1 = { x: right ? a.x + NODE_W : a.x, y: a.y + Math.min(a.h / 2, 40) }
  const p2 = { x: right ? b.x : b.x + NODE_W, y: b.y + Math.min(b.h / 2, 40) }
  const c = Math.max(40, Math.abs(p2.x - p1.x) / 2)
  return { p1, p2, d: `M${p1.x},${p1.y} C${p1.x + (right ? c : -c)},${p1.y} ${p2.x - (right ? c : -c)},${p2.y} ${p2.x},${p2.y}` }
}

function AutoText({ value, onChange, placeholder, readOnly }: { value: string; onChange: (v: string) => void; placeholder: string; readOnly?: boolean }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const resize = () => {
      el.style.height = '0px'
      el.style.height = el.scrollHeight + 'px'
    }
    resize()
    // Re-measure once web fonts finish loading, since metrics change.
    document.fonts?.ready.then(resize)
  }, [value])
  return (
    <textarea
      ref={ref}
      className="node-text"
      value={value}
      rows={1}
      readOnly={readOnly}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onPointerDown={(e) => e.stopPropagation()}
      spellCheck
    />
  )
}

function NodeCard({
  arg,
  node,
  pos,
  selected,
  highlighted,
  flags,
  onPointerDownDrag,
  onSelect,
  onText,
  onHeight,
  onAttach,
  onDelete,
  onStartConnect,
  readOnly,
}: {
  arg: Argument
  node: ArgNode
  pos: { x: number; y: number }
  selected: boolean
  highlighted: boolean
  flags: string[]
  onPointerDownDrag: (e: RPointerEvent) => void
  onSelect: () => void
  onText: (t: string) => void
  onHeight: (h: number) => void
  onAttach: (t: ArgNodeType) => void
  onDelete: () => void
  onStartConnect: (e: RPointerEvent) => void
  readOnly?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [menu, setMenu] = useState(false)
  const meta = NODE_META[node.type]
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => onHeight(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const placeholder =
    node.type === 'claim' ? 'State the position you want to defend…' : node.type === 'conclusion' ? 'Therefore…' : node.type === 'inference' ? 'If … and …, then …' : `Write the ${meta.label.toLowerCase()}…`
  const allowed = node.type === 'objection' || node.type === 'counter' ? ATTACH_MENU : ATTACH_MENU.filter((t) => t !== 'rebuttal')
  return (
    <motion.div
      ref={ref}
      data-node-id={node.id}
      className={`arg-node t-${node.type} ${selected ? 'selected' : ''} ${highlighted ? 'highlighted' : ''} ${node.target ? 'attached' : ''}`}
      style={{ left: pos.x, top: pos.y, width: NODE_W, ['--nc' as string]: meta.color }}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.22 }}
      onPointerDown={(e) => {
        onSelect()
        onPointerDownDrag(e)
      }}
    >
      <div className="node-head">
        <GripVertical className="grip" aria-hidden />
        <span className="node-type">{meta.label}</span>
        <span className="node-idx mono">{nodeLabel(arg, node)}</span>
        <span className="spacer" />
        {flags.length > 0 && (
          <span className="node-flag" title={flags.join(' · ')}>
            {flags.length}
          </span>
        )}
        {!readOnly && (
          <div className="node-tools" onPointerDown={(e) => e.stopPropagation()}>
            <button className="nt-btn" aria-label="Attach" title="Attach objection, evidence, definition…" onClick={() => setMenu((m) => !m)}>
              <Plus />
            </button>
            <button className="nt-btn danger" aria-label="Delete node" onClick={onDelete}>
              <Trash2 />
            </button>
          </div>
        )}
      </div>
      <AutoText value={node.text} onChange={onText} placeholder={placeholder} readOnly={readOnly} />
      {node.refs && node.refs.length > 0 && (
        <div className="node-refs" onPointerDown={(e) => e.stopPropagation()}>
          {node.refs.map((r) => (
            <EntityLink key={r} id={r} variant="chip" />
          ))}
        </div>
      )}
      {menu && (
        <div className="attach-menu glass" onPointerDown={(e) => e.stopPropagation()}>
          {allowed.map((t) => (
            <button
              key={t}
              onClick={() => {
                onAttach(t)
                setMenu(false)
              }}
              style={{ ['--nc' as string]: NODE_META[t].color }}
            >
              <span className="am-dot" />
              {NODE_META[t].label}
              <span className="dim">{NODE_META[t].hint}</span>
            </button>
          ))}
        </div>
      )}
      {!readOnly && <span className="port" title="Drag to connect" onPointerDown={(e) => { e.stopPropagation(); onStartConnect(e) }} />}
    </motion.div>
  )
}

export function ArgCanvas(p: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null)
  const [connect, setConnect] = useState<{ from: string; x: number; y: number } | null>(null)
  const viewRef = useRef(p.view)
  viewRef.current = p.view

  const toCanvas = (clientX: number, clientY: number) => {
    const r = wrap.current!.getBoundingClientRect()
    const v = viewRef.current
    return { x: (clientX - r.left - v.x) / v.k, y: (clientY - r.top - v.y) / v.k }
  }

  // Wheel: pan, or zoom with ctrl/cmd (and trackpad pinch).
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const v = viewRef.current
      if (e.ctrlKey || e.metaKey) {
        const r = el.getBoundingClientRect()
        const k = Math.min(1.8, Math.max(0.35, v.k * Math.exp(-e.deltaY * 0.0022)))
        const mx = e.clientX - r.left
        const my = e.clientY - r.top
        p.onView({ k, x: mx - ((mx - v.x) / v.k) * k, y: my - ((my - v.y) / v.k) * k })
      } else {
        p.onView({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY })
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startNodeDrag = (node: ArgNode, e: RPointerEvent) => {
    if (e.button !== 0 || p.readOnly) return
    const start = toCanvas(e.clientX, e.clientY)
    const ox = node.x
    const oy = node.y
    let moved = false
    const move = (ev: PointerEvent) => {
      const c = toCanvas(ev.clientX, ev.clientY)
      const nx = Math.round(ox + c.x - start.x)
      const ny = Math.round(oy + c.y - start.y)
      if (!moved && Math.hypot(nx - ox, ny - oy) < 3) return
      moved = true
      setDrag({ id: node.id, x: nx, y: ny })
    }
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      if (moved) {
        const c = toCanvas(ev.clientX, ev.clientY)
        p.onMove(node.id, Math.round(ox + c.x - start.x), Math.round(oy + c.y - start.y))
      }
      setDrag(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const startPan = (e: RPointerEvent) => {
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).classList.contains('canvas-layer')) return
    p.onSelect(null)
    const sx = e.clientX
    const sy = e.clientY
    const v0 = viewRef.current
    ;(e.currentTarget as HTMLElement).classList.add('panning')
    const el = e.currentTarget as HTMLElement
    const move = (ev: PointerEvent) => p.onView({ ...v0, x: v0.x + ev.clientX - sx, y: v0.y + ev.clientY - sy })
    const up = () => {
      el.classList.remove('panning')
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const startConnect = (node: ArgNode, e: RPointerEvent) => {
    const c = toCanvas(e.clientX, e.clientY)
    setConnect({ from: node.id, x: c.x, y: c.y })
    const move = (ev: PointerEvent) => {
      const cc = toCanvas(ev.clientX, ev.clientY)
      setConnect({ from: node.id, x: cc.x, y: cc.y })
    }
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      const el = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-node-id]') as HTMLElement | null
      const to = el?.dataset.nodeId
      if (to && to !== node.id) p.onConnect(node.id, to)
      setConnect(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const posOf = (n: ArgNode) => (drag?.id === n.id ? { x: drag.x, y: drag.y } : { x: n.x, y: n.y })
  const rect = (id: string) => {
    const n = p.arg.nodes.find((x) => x.id === id)
    if (!n) return null
    return { ...posOf(n), h: p.heights[id] ?? 100 }
  }

  const bounds = p.arg.nodes.reduce(
    (acc, n) => ({ w: Math.max(acc.w, n.x + NODE_W + 400), h: Math.max(acc.h, n.y + (p.heights[n.id] ?? 120) + 400) }),
    { w: 1600, h: 1200 },
  )

  const renderLink = (l: ArgLink) => {
    const a = rect(l.from)
    const b = rect(l.to)
    if (!a || !b) return null
    const { d, p1, p2 } = anchor(a, b)
    const meta = LINK_META[l.kind]
    const sel = p.selected?.type === 'link' && p.selected.id === l.id
    const hi = p.highlight.includes(l.from) || p.highlight.includes(l.to)
    const mx = (p1.x + p2.x) / 2
    const my = (p1.y + p2.y) / 2
    return (
      <g key={l.id} className={`arg-link ${sel ? 'sel' : ''} ${hi ? 'hi' : ''}`} onPointerDown={(e) => { e.stopPropagation(); p.onSelect({ type: 'link', id: l.id }) }}>
        <path d={d} className="hit" />
        <motion.path
          d={d}
          stroke={meta.color}
          strokeWidth={sel ? 2 : 1.3}
          strokeDasharray={meta.dashed ? '5 5' : undefined}
          fill="none"
          markerEnd={`url(#arrow-${l.kind})`}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: sel || hi ? 1 : 0.7 }}
          transition={{ duration: 0.5 }}
        />
        <g transform={`translate(${mx}, ${my})`}>
          <rect x={-meta.label.length * 3.1 - 6} y={-8} width={meta.label.length * 6.2 + 12} height={16} rx={3} fill="var(--bg-0)" stroke={meta.color} strokeOpacity={0.3} />
          <text textAnchor="middle" y={3.5} fontSize={9.5} fill={meta.color} style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
            {meta.label}
          </text>
        </g>
      </g>
    )
  }

  return (
    <div ref={wrap} className="arg-canvas dotgrid" onPointerDown={startPan} role="application" aria-label="Argument canvas">
      <div className="canvas-layer" style={{ transform: `translate(${p.view.x}px, ${p.view.y}px) scale(${p.view.k})`, width: bounds.w, height: bounds.h }}>
        <svg className="arg-links" width={bounds.w} height={bounds.h}>
          <defs>
            {Object.entries(LINK_META).map(([k, m]) => (
              <marker key={k} id={`arrow-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,1 L9,5 L0,9 z" fill={m.color} />
              </marker>
            ))}
          </defs>
          {p.arg.links.map(renderLink)}
          {connect &&
            (() => {
              const a = rect(connect.from)
              if (!a) return null
              const x1 = a.x + NODE_W / 2
              const y1 = a.y + a.h
              return <path d={`M${x1},${y1} C${x1},${y1 + 60} ${connect.x},${connect.y - 60} ${connect.x},${connect.y}`} stroke="var(--accent)" strokeDasharray="4 4" fill="none" strokeWidth={1.5} />
            })()}
        </svg>
        {p.arg.nodes.map((n) => (
          <NodeCard
            key={n.id}
            arg={p.arg}
            node={n}
            pos={posOf(n)}
            selected={p.selected?.type === 'node' && p.selected.id === n.id}
            highlighted={p.highlight.includes(n.id)}
            flags={p.flags[n.id] ?? []}
            onPointerDownDrag={(e) => startNodeDrag(n, e)}
            onSelect={() => p.onSelect({ type: 'node', id: n.id })}
            onText={(t) => p.onText(n.id, t)}
            onHeight={(h) => p.onHeight(n.id, h)}
            onAttach={(t) => p.onAttach(n.id, t)}
            onDelete={() => p.onDelete(n.id)}
            onStartConnect={(e) => startConnect(n, e)}
            readOnly={p.readOnly}
          />
        ))}
      </div>
    </div>
  )
}
