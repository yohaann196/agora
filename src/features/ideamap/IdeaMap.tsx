import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type Simulation, type SimulationLinkDatum, type SimulationNodeDatum } from 'd3-force'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Crosshair, Link2, Maximize, Minus, Pin, Plus, RotateCcw, Sparkles, Trash2, X, ZoomIn } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { kindColor } from '../../components/ui/MiniGraph'
import { KIND_LABEL, neighbors, routeFor, search } from '../../model/graph'
import type { EntityKind } from '../../model/types'
import { useOS } from '../../store'
import { useKnowledgeGraph } from '../../store/graph'
import './ideamap.css'

interface SimNode extends SimulationNodeDatum {
  id: string
  label: string
  kind: EntityKind | 'custom'
  degree: number
  pinned?: boolean
}
interface SimLink extends SimulationLinkDatum<SimNode> {
  id: string
  label: string
  custom?: boolean
}

const PER_NODE = 8
const KIND_RANK: Record<string, number> = { concept: 0, school: 1, philosopher: 2, argument: 3, text: 4, debate: 5, essay: 6 }
/** Curated first ring for the default map, so the opening view reads as a coherent field of ideas. */
const FEATURED: Record<string, string[]> = {
  justice: ['equality', 'liberty', 'rights', 'utilitarianism', 'deontology', 'social-contract', 'moral-responsibility', 'fairness'],
}

export function IdeaMap() {
  const g = useKnowledgeGraph()
  const navigate = useNavigate()
  const center = useOS((s) => s.ideaCenter)
  const expanded = useOS((s) => s.ideaExpanded)
  const customNodes = useOS((s) => s.ideaNodes)
  const customEdges = useOS((s) => s.ideaEdges)
  const reduce = useOS((s) => s.settings.reduceMotion)
  const store = useOS.getState()

  const [selected, setSelected] = useState<string | null>(center)
  const [hover, setHover] = useState<string | null>(null)
  const [connectFrom, setConnectFrom] = useState<string | null>(null)
  const [pendingEdge, setPendingEdge] = useState<{ from: string; to: string } | null>(null)
  const [edgeLabel, setEdgeLabel] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [findQ, setFindQ] = useState('')
  const [view, setView] = useState({ x: 0, y: 0, k: 1 })
  const [, setTick] = useState(0)
  const svgRef = useRef<SVGSVGElement>(null)
  const simRef = useRef<Simulation<SimNode, SimLink> | null>(null)
  const nodesRef = useRef(new Map<string, SimNode>())
  const viewRef = useRef(view)
  viewRef.current = view

  // ------- derive visible graph
  const { nodes, links } = useMemo(() => {
    const visible = new Map<string, { label: string; kind: EntityKind | 'custom' }>()
    const add = (id: string) => {
      const n = g.nodes.get(id)
      if (n) visible.set(id, { label: n.label, kind: n.kind })
    }
    add(center)
    for (const e of expanded) {
      add(e)
      if (FEATURED[e]) {
        FEATURED[e].forEach(add)
        continue
      }
      const seen = new Set<string>()
      neighbors(g, e)
        .filter((nb) => nb.node.kind !== 'passage' && nb.node.kind !== 'note' && !seen.has(nb.node.id) && seen.add(nb.node.id))
        .sort((a, b) => (KIND_RANK[a.node.kind] ?? 9) - (KIND_RANK[b.node.kind] ?? 9))
        .slice(0, PER_NODE)
        .forEach((nb) => add(nb.node.id))
    }
    for (const c of customNodes) visible.set(c.id, { label: c.label, kind: c.kind })
    const ls: SimLink[] = []
    const seenL = new Set<string>()
    for (const [id] of visible) {
      for (const nb of neighbors(g, id)) {
        if (!visible.has(nb.node.id) || nb.direction !== 'out') continue
        const key = [id, nb.node.id].sort().join('|')
        if (seenL.has(key)) continue
        seenL.add(key)
        ls.push({ id: key, source: id, target: nb.node.id, label: nb.label })
      }
    }
    for (const e of customEdges) if (visible.has(e.from) && visible.has(e.to)) ls.push({ id: e.id, source: e.from, target: e.to, label: e.label, custom: true })
    const degree = new Map<string, number>()
    for (const l of ls) {
      degree.set(l.source as string, (degree.get(l.source as string) ?? 0) + 1)
      degree.set(l.target as string, (degree.get(l.target as string) ?? 0) + 1)
    }
    return { nodes: [...visible.entries()].map(([id, v]) => ({ id, ...v, degree: degree.get(id) ?? 0 })), links: ls }
  }, [g, center, expanded, customNodes, customEdges])

  // ------- simulation
  useEffect(() => {
    const map = nodesRef.current
    const box = svgRef.current?.getBoundingClientRect()
    const W = box?.width ?? 1000
    const H = box?.height ?? 700
    const next = new Map<string, SimNode>()
    for (const n of nodes) {
      const prev = map.get(n.id)
      if (prev) {
        Object.assign(prev, { label: n.label, kind: n.kind, degree: n.degree })
        next.set(n.id, prev)
      } else {
        // Spawn new nodes next to the node that revealed them.
        const parent = links.map((l) => (l.source === n.id ? (l.target as string) : l.target === n.id ? (l.source as string) : null)).find((p) => p && map.has(p))
        const p = parent ? map.get(parent)! : undefined
        const a = Math.random() * Math.PI * 2
        next.set(n.id, { ...n, x: (p?.x ?? W / 2) + Math.cos(a) * 30, y: (p?.y ?? H / 2) + Math.sin(a) * 30 })
      }
    }
    nodesRef.current = next
    const simNodes = [...next.values()]
    const c = next.get(center)
    if (c && !c.pinned) {
      c.fx = W / 2
      c.fy = H / 2
    }
    for (const n of simNodes) if (n.id !== center && !n.pinned) { n.fx = null; n.fy = null }
    const simLinks = links.map((l) => ({ ...l }))
    const sim = simRef.current ?? forceSimulation<SimNode, SimLink>()
    simRef.current = sim
    sim
      .nodes(simNodes)
      .force('link', forceLink<SimNode, SimLink>(simLinks).id((d) => d.id).distance((l) => ((l.source as SimNode).id === center || (l.target as SimNode).id === center ? 175 : 110)).strength(0.5))
      .force('charge', forceManyBody().strength(-520))
      .force('center', forceCenter(W / 2, H / 2).strength(0.04))
      .force('x', forceX(W / 2).strength(0.03))
      .force('y', forceY(H / 2).strength(0.04))
      .force('collide', forceCollide<SimNode>().radius((d) => radius(d) + 16))
      .alpha(reduce ? 0.05 : 0.9)
      .alphaDecay(reduce ? 0.2 : 0.035)
    let raf = 0
    sim.on('tick', () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setTick((t) => t + 1))
    })
    if (reduce) sim.tick(200)
    sim.restart()
    return () => {
      cancelAnimationFrame(raf)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, links, center])

  useEffect(() => () => void simRef.current?.stop(), [])

  const radius = (n: { id: string; degree: number; kind: string }) => (n.id === center ? 38 : Math.min(18, 7 + n.degree * 1.3) + (n.kind === 'philosopher' ? 2 : 0))

  // ------- interactions
  const toWorld = (cx: number, cy: number) => {
    const r = svgRef.current!.getBoundingClientRect()
    const v = viewRef.current
    return { x: (cx - r.left - v.x) / v.k, y: (cy - r.top - v.y) / v.k }
  }

  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const v = viewRef.current
      const r = el.getBoundingClientRect()
      const k = Math.min(2.4, Math.max(0.3, v.k * Math.exp(-e.deltaY * 0.0018)))
      const mx = e.clientX - r.left
      const my = e.clientY - r.top
      setView({ k, x: mx - ((mx - v.x) / v.k) * k, y: my - ((my - v.y) / v.k) * k })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const onBgDown = (e: React.PointerEvent) => {
    if (e.target !== e.currentTarget && !(e.target as Element).classList.contains('map-bg')) return
    setSelected(null)
    setConnectFrom(null)
    const sx = e.clientX
    const sy = e.clientY
    const v0 = viewRef.current
    const move = (ev: PointerEvent) => setView({ ...v0, x: v0.x + ev.clientX - sx, y: v0.y + ev.clientY - sy })
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const onNodeDown = (n: SimNode, e: React.PointerEvent) => {
    e.stopPropagation()
    const sim = simRef.current
    const start = { x: e.clientX, y: e.clientY }
    let moved = false
    const move = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 4) return
      moved = true
      const w = toWorld(ev.clientX, ev.clientY)
      n.fx = w.x
      n.fy = w.y
      sim?.alphaTarget(0.25).restart()
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      sim?.alphaTarget(0)
      if (moved) {
        n.pinned = true
        return
      }
      // A click, not a drag.
      if (connectFrom && connectFrom !== n.id) {
        setPendingEdge({ from: connectFrom, to: n.id })
        setConnectFrom(null)
        setSelected(n.id)
        return
      }
      setSelected(n.id)
      if (!expanded.includes(n.id) && n.kind !== 'custom') store.expandIdea(n.id)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const fit = useCallback(() => {
    const ns = [...nodesRef.current.values()]
    const box = svgRef.current?.getBoundingClientRect()
    if (!ns.length || !box) return
    const xs = ns.map((n) => n.x ?? 0)
    const ys = ns.map((n) => n.y ?? 0)
    const minX = Math.min(...xs) - 80
    const maxX = Math.max(...xs) + 80
    const minY = Math.min(...ys) - 60
    const maxY = Math.max(...ys) + 60
    const k = Math.min(1.4, Math.max(0.3, Math.min(box.width / (maxX - minX), box.height / (maxY - minY))))
    setView({ k, x: box.width / 2 - ((minX + maxX) / 2) * k, y: box.height / 2 - ((minY + maxY) / 2) * k })
  }, [])

  const selNode = selected ? g.nodes.get(selected) ?? null : null
  const selCustom = selected ? customNodes.find((c) => c.id === selected) : undefined
  const selRelations = selected ? neighbors(g, selected).filter((nb) => nb.node.kind !== 'passage').slice(0, 14) : []
  const findHits = findQ.trim() ? search(g, findQ, ['concept', 'philosopher', 'school', 'text', 'argument'], 6) : []
  const simNodes = [...nodesRef.current.values()]
  const byId = nodesRef.current
  const focusIds = new Set<string>()
  const focus = hover ?? selected
  if (focus) {
    focusIds.add(focus)
    for (const l of links) {
      if (l.source === focus || (l.source as SimNode).id === focus) focusIds.add(typeof l.target === 'string' ? l.target : (l.target as SimNode).id)
      if (l.target === focus || (l.target as SimNode).id === focus) focusIds.add(typeof l.source === 'string' ? l.source : (l.source as SimNode).id)
    }
  }

  return (
    <div className="page map-page">
      <div className="map-stage">
        <svg ref={svgRef} className={`map-svg ${connectFrom ? 'connecting' : ''}`} onPointerDown={onBgDown} role="application" aria-label="Idea map">
          <defs>
            <radialGradient id="map-glow">
              <stop offset="0%" stopColor="rgb(var(--accent-rgb))" stopOpacity="0.28" />
              <stop offset="100%" stopColor="rgb(var(--accent-rgb))" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect className="map-bg" x={0} y={0} width="100%" height="100%" fill="transparent" />
          <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
            {byId.get(center) && <circle cx={byId.get(center)!.x} cy={byId.get(center)!.y} r={150} fill="url(#map-glow)" pointerEvents="none" />}
            {links.map((l) => {
              const s = byId.get(typeof l.source === 'string' ? l.source : (l.source as SimNode).id)
              const t = byId.get(typeof l.target === 'string' ? l.target : (l.target as SimNode).id)
              if (!s || !t || s.x == null || t.x == null) return null
              const on = focus && focusIds.has(s.id) && focusIds.has(t.id) && (s.id === focus || t.id === focus)
              const dim = focus && !on
              return (
                <g key={l.id} className="map-link">
                  <line x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke={l.custom ? 'var(--amber)' : on ? kindColor(t.id === focus ? s.kind : t.kind) : 'var(--line-3)'} strokeWidth={on ? 1.4 : 0.8} strokeOpacity={dim ? 0.25 : on ? 0.9 : 0.6} strokeDasharray={l.custom ? '4 4' : undefined} />
                  {((on && hover) || l.custom) && (
                    <text x={(s.x + t.x!) / 2} y={(s.y! + t.y!) / 2 - 4} textAnchor="middle" className="map-link-label" fill={l.custom ? 'var(--amber)' : 'var(--text-2)'}>
                      {l.label}
                    </text>
                  )}
                </g>
              )
            })}
            {simNodes.map((n) => {
              if (n.x == null || n.y == null) return null
              const r = radius(n)
              const isCenter = n.id === center
              const sel = n.id === selected
              const dim = focus && !focusIds.has(n.id)
              const col = kindColor(n.kind)
              const exp = expanded.includes(n.id)
              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x},${n.y})`}
                  className={`map-node ${dim ? 'dim' : ''}`}
                  onPointerDown={(e) => onNodeDown(n, e)}
                  onPointerEnter={() => setHover(n.id)}
                  onPointerLeave={() => setHover(null)}
                  onDoubleClick={() => {
                    n.pinned = false
                    if (n.id !== center) {
                      n.fx = null
                      n.fy = null
                    }
                    simRef.current?.alpha(0.3).restart()
                  }}
                  role="button"
                  aria-label={n.label}
                >
                  <motion.g initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
                    {(sel || isCenter) && <circle r={r + 7} fill="none" stroke={col} strokeOpacity={sel ? 0.7 : 0.3} strokeWidth={1} />}
                    <circle r={r} fill={`color-mix(in srgb, ${col} ${isCenter ? 26 : 16}%, var(--bg-1))`} stroke={col} strokeWidth={isCenter ? 1.6 : 1.1} style={{ filter: sel || isCenter ? `drop-shadow(0 0 10px ${col})` : undefined }} />
                    {!exp && n.kind !== 'custom' && n.degree < 3 && <circle r={2.2} cx={r * 0.7} cy={-r * 0.7} fill={col} />}
                    {n.pinned && <circle r={2.4} cx={-r * 0.7} cy={-r * 0.7} fill="var(--text-1)" />}
                    {isCenter ? (
                      <text y={5} textAnchor="middle" className="map-label center">
                        {n.label.length > 12 ? n.label.split(' ')[0] : n.label}
                      </text>
                    ) : (
                      <text y={r + 14} textAnchor="middle" className="map-label">
                        {n.label.length > 26 ? n.label.slice(0, 25) + '…' : n.label}
                      </text>
                    )}
                  </motion.g>
                </g>
              )
            })}
          </g>
        </svg>

        <div className="map-float tl glass">
          <div className="map-title">
            <span className="eyebrow">Idea Map</span>
            <span className="serif t0">{g.nodes.get(center)?.label}</span>
          </div>
          <div style={{ position: 'relative' }}>
            <input className="input" placeholder="Recenter on…" value={findQ} onChange={(e) => setFindQ(e.target.value)} aria-label="Recenter map" />
            {findHits.length > 0 && (
              <div className="glass map-find">
                {findHits.map((h) => (
                  <button
                    key={h.node.id}
                    className={`result-row k-${h.node.kind}`}
                    onClick={() => {
                      store.setIdeaCenter(h.node.id)
                      setSelected(h.node.id)
                      setFindQ('')
                      nodesRef.current = new Map()
                      setView({ x: 0, y: 0, k: 1 })
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: 6, background: 'var(--tag)' }} />
                    <span className="r-label">{h.node.label}</span>
                    <span className="r-kind">{KIND_LABEL[h.node.kind]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="map-float br glass">
          <button className={`btn icon sm ${connectFrom ? 'primary' : ''}`} title="Connect two ideas" aria-label="Connect two ideas" onClick={() => setConnectFrom(connectFrom ? null : selected)} disabled={!selected && !connectFrom}>
            <Link2 />
          </button>
          <button className="btn icon sm" aria-label="Zoom out" onClick={() => setView((v) => ({ ...v, k: Math.max(0.3, v.k * 0.85) }))}><Minus /></button>
          <span className="mono dim" style={{ fontSize: 10.5, width: 38, textAlign: 'center' }}>{Math.round(view.k * 100)}%</span>
          <button className="btn icon sm" aria-label="Zoom in" onClick={() => setView((v) => ({ ...v, k: Math.min(2.4, v.k * 1.15) }))}><ZoomIn /></button>
          <button className="btn icon sm" aria-label="Fit" onClick={fit}><Maximize /></button>
          <button
            className="btn icon sm"
            aria-label="Reset map"
            title="Reset to Justice"
            onClick={() => {
              store.resetIdeaMap()
              nodesRef.current = new Map()
              setSelected('justice')
              setView({ x: 0, y: 0, k: 1 })
            }}
          >
            <RotateCcw />
          </button>
        </div>

        <div className="map-legend">
          {(['concept', 'philosopher', 'school', 'text', 'argument', 'custom'] as const).map((k) => (
            <span key={k}>
              <i style={{ background: kindColor(k) }} /> {k === 'custom' ? 'Your ideas' : KIND_LABEL[k] + 's'}
            </span>
          ))}
        </div>

        <AnimatePresence>
          {connectFrom && (
            <motion.div className="map-banner glass" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <Link2 size={14} /> Click another idea to connect it to <strong>{g.nodes.get(connectFrom)?.label ?? customNodes.find((c) => c.id === connectFrom)?.label}</strong>
              <button className="btn ghost sm" onClick={() => setConnectFrom(null)}><X /></button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <aside className="map-side">
        {pendingEdge && (
          <form
            className="panel edge-form"
            onSubmit={(e) => {
              e.preventDefault()
              store.addIdeaEdge(pendingEdge.from, pendingEdge.to, edgeLabel.trim() || 'relates to')
              store.toast({ title: 'Relationship added', tone: 'success' })
              setPendingEdge(null)
              setEdgeLabel('')
            }}
          >
            <div className="eyebrow">New relationship</div>
            <p style={{ fontSize: 'var(--fs-12)' }}>
              <span className="t0">{labelOf(pendingEdge.from)}</span> <span className="dim">→</span> <span className="t0">{labelOf(pendingEdge.to)}</span>
            </p>
            <input className="input" autoFocus placeholder="e.g. grounds, conflicts with, presupposes" value={edgeLabel} onChange={(e) => setEdgeLabel(e.target.value)} aria-label="Relationship label" />
            <div className="chips">
              {['supports', 'conflicts with', 'presupposes', 'is an instance of', 'refines'].map((s) => (
                <button type="button" key={s} className="tag plain" onClick={() => setEdgeLabel(s)}>{s}</button>
              ))}
            </div>
            <div className="hstack">
              <button className="btn primary sm">Add relationship</button>
              <button type="button" className="btn ghost sm" onClick={() => setPendingEdge(null)}>Cancel</button>
            </div>
          </form>
        )}

        {selected && (selNode || selCustom) ? (
          <div className="panel">
            <div className="panel-body" style={{ display: 'grid', gap: 12 }}>
              <div>
                <div className="eyebrow" style={{ color: kindColor(selNode?.kind ?? 'custom') }}>{selNode ? KIND_LABEL[selNode.kind] : 'Your idea'} {selected === center && '· center'}</div>
                <div className="serif t0" style={{ fontSize: 24, lineHeight: 1.15, marginTop: 4 }}>{selNode?.label ?? selCustom?.label}</div>
              </div>
              {selNode && <p style={{ fontSize: 'var(--fs-12)', lineHeight: 1.6 }}>{selNode.summary}</p>}
              <div className="chips">
                {selNode && (
                  <button className="btn sm" onClick={() => navigate(routeFor(selNode))}>
                    Open <ArrowUpRight />
                  </button>
                )}
                {selected !== center && selNode && (
                  <button className="btn sm" onClick={() => { store.setIdeaCenter(selected); nodesRef.current = new Map(); setView({ x: 0, y: 0, k: 1 }) }}>
                    <Crosshair /> Center
                  </button>
                )}
                <button className="btn sm" onClick={() => setConnectFrom(selected)}>
                  <Link2 /> Connect
                </button>
                {selNode && expanded.includes(selected) && selected !== center && (
                  <button className="btn sm ghost" onClick={() => store.collapseIdea(selected)}>Collapse</button>
                )}
                {selCustom && (
                  <button className="btn sm danger" onClick={() => { store.removeIdeaNode(selected); setSelected(null) }}>
                    <Trash2 /> Remove
                  </button>
                )}
              </div>
              {selRelations.length > 0 && (
                <>
                  <div className="divider-label">Relationships</div>
                  <div className="link-list">
                    {selRelations.map((r, i) => (
                      <button key={i} className="link-row" style={{ textAlign: 'left' }} onClick={() => { store.expandIdea(selected); setSelected(r.node.id); store.expandIdea(r.node.id) }}>
                        <span style={{ width: 7, height: 7, borderRadius: 7, background: kindColor(r.node.kind), flex: 'none' }} />
                        <span className="t0 truncate">{r.node.label}</span>
                        <span className="rel">{r.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {customEdges.filter((e) => e.from === selected || e.to === selected).length > 0 && (
                <>
                  <div className="divider-label">Your relationships</div>
                  {customEdges
                    .filter((e) => e.from === selected || e.to === selected)
                    .map((e) => (
                      <div key={e.id} className="link-row">
                        <span className="t0 truncate">{labelOf(e.from)} <span style={{ color: 'var(--amber)' }}>{e.label}</span> {labelOf(e.to)}</span>
                        <button className="btn icon sm ghost" aria-label="Remove relationship" onClick={() => store.removeIdeaEdge(e.id)}><X /></button>
                      </div>
                    ))}
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="panel">
            <div className="panel-body" style={{ display: 'grid', gap: 10 }}>
              <div className="serif t0" style={{ fontSize: 22 }}>Explore by connection</div>
              <ul className="map-help">
                <li><strong>Click</strong> an idea to expand its relationships.</li>
                <li><strong>Drag</strong> to rearrange — dragged ideas stay pinned. Double-click to release.</li>
                <li><strong>Connect</strong> any two ideas and name the relationship.</li>
                <li><strong>Scroll</strong> to zoom, drag the background to pan.</li>
              </ul>
            </div>
          </div>
        )}

        <form
          className="panel"
          onSubmit={(e) => {
            e.preventDefault()
            if (!newLabel.trim()) return
            const id = store.addIdeaNode(newLabel.trim())
            if (selected) store.addIdeaEdge(selected, id, 'suggests')
            setNewLabel('')
            setSelected(id)
            store.toast({ title: 'Idea added to your map', tone: 'success' })
          }}
        >
          <div className="panel-head"><h3><Sparkles /> Add your own idea</h3></div>
          <div className="panel-body" style={{ display: 'grid', gap: 8 }}>
            <input className="input" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. Justice requires forgiveness" aria-label="New idea" />
            <div className="hstack" style={{ justifyContent: 'space-between' }}>
              <span className="dim" style={{ fontSize: 'var(--fs-11)' }}>{selected ? `Linked to ${labelOf(selected)}` : 'Unlinked'}</span>
              <button className="btn sm primary" disabled={!newLabel.trim()}><Plus /> Add</button>
            </div>
          </div>
        </form>

        <div className="map-stats mono">
          <span>{nodes.length} ideas</span>
          <span>{links.length} relationships</span>
          <span><Pin size={10} style={{ display: 'inline', verticalAlign: -1 }} /> {simNodes.filter((n) => n.pinned).length} pinned</span>
        </div>
      </aside>
    </div>
  )

  function labelOf(id: string) {
    return g.nodes.get(id)?.label ?? customNodes.find((c) => c.id === id)?.label ?? id
  }
}
