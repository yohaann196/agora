import { AnimatePresence, motion } from 'framer-motion'
import {
  AlignVerticalSpaceAround,
  ClipboardCopy,
  Maximize,
  Minus,
  Plus,
  ScanSearch,
  Sparkles,
  Trash2,
  Waypoints,
  ZoomIn,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { analyzeArgument, type ArgumentAnalysis, type Finding } from '../../ai/analyzeArgument'
import { detectConcepts, detectPhilosophers } from '../../ai/lexicon'
import { EntityLink } from '../../components/ui/EntityLink'
import { SaveButton } from '../../components/ui/primitives'
import { philosopherById } from '../../data/philosophers'
import { schools } from '../../data/schools'
import { search, staticGraph } from '../../model/graph'
import { ATTACHMENT_TYPES, CORE_NODE_TYPES, type ArgLinkKind, type ArgNodeType, type Argument } from '../../model/types'
import { useOS } from '../../store'
import { useKnowledgeGraph } from '../../store/graph'
import { NotFound } from '../workspace/NotFound'
import { ANALYSIS_STAGES, AnalyzingState, ArgAnalysisPanel } from './ArgAnalysis'
import { ArgCanvas, type Selection, type View } from './ArgCanvas'
import { LINK_META, NODE_META, NODE_W, attachmentPosition, insertCore, linkKindFor, nodeLabel, standardForm, tidy, coreOrder } from './argModel'
import './arguments.css'

type Tab = 'inspect' | 'form' | 'analysis'

const graphKind = (id: string) => staticGraph.nodes.get(id)?.kind
const graphLabel = (id: string) => staticGraph.nodes.get(id)?.label ?? id

function RefPicker({ onPick }: { onPick: (id: string) => void }) {
  const g = useKnowledgeGraph()
  const [q, setQ] = useState('')
  const hits = useMemo(() => (q.trim() ? search(g, q, ['concept', 'philosopher', 'text', 'school'], 6) : []), [g, q])
  return (
    <div style={{ position: 'relative' }}>
      <input className="input" placeholder="Link a concept, thinker, or text…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Link entity" />
      {hits.length > 0 && (
        <div className="glass" style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 5, borderRadius: 'var(--r-2)', padding: 4 }}>
          {hits.map((h) => (
            <button
              key={h.node.id}
              className={`result-row k-${h.node.kind}`}
              onClick={() => {
                onPick(h.node.id)
                setQ('')
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: 6, background: 'var(--tag)' }} />
              <span className="r-label">{h.node.label}</span>
              <span className="r-kind">{h.node.kind}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function ArgumentBuilder() {
  const { id = '' } = useParams()
  const arg = useOS((s) => s.arguments.find((a) => a.id === id))
  const store = useOS.getState()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<Selection>(null)
  const [tab, setTab] = useState<Tab>('inspect')
  const [heights, setHeights] = useState<Record<string, number>>({})
  const [view, setView] = useState<View>({ x: 40, y: 20, k: 1 })
  const [analysis, setAnalysis] = useState<ArgumentAnalysis | null>(null)
  const [stage, setStage] = useState(-1)
  const [highlight, setHighlight] = useState<string[]>([])
  const canvasBox = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (arg) store.pushRecent({ kind: 'argument', id: arg.id })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const onHeight = useCallback((nid: string, h: number) => setHeights((m) => (m[nid] === h ? m : { ...m, [nid]: h })), [])

  const update = (patch: Partial<Argument>) => arg && store.updateArgument(arg.id, patch)

  const fit = useCallback(() => {
    if (!arg || !canvasBox.current || !arg.nodes.length) return
    const r = canvasBox.current.getBoundingClientRect()
    const minX = Math.min(...arg.nodes.map((n) => n.x))
    const minY = Math.min(...arg.nodes.map((n) => n.y))
    const maxX = Math.max(...arg.nodes.map((n) => n.x + NODE_W))
    const maxY = Math.max(...arg.nodes.map((n) => n.y + (heights[n.id] ?? 110)))
    const k = Math.min(1, Math.max(0.4, Math.min((r.width - 80) / (maxX - minX), (r.height - 150) / (maxY - minY))))
    setView({ k, x: (r.width - (maxX - minX) * k) / 2 - minX * k, y: 70 - minY * k })
  }, [arg, heights])

  // Fit once the first measurements arrive.
  const fitted = useRef(false)
  useEffect(() => {
    if (!fitted.current && arg && Object.keys(heights).length >= arg.nodes.length) {
      fitted.current = true
      fit()
    }
  }, [heights, arg, fit])

  const runAnalysis = useCallback(() => {
    if (!arg) return
    setTab('analysis')
    setAnalysis(null)
    setStage(0)
    const reduce = useOS.getState().settings.reduceMotion
    let i = 0
    const t = setInterval(
      () => {
        i++
        setStage(i)
        if (i >= ANALYSIS_STAGES) {
          clearInterval(t)
          const a = useOS.getState().arguments.find((x) => x.id === arg.id)!
          setAnalysis(analyzeArgument(a))
          setStage(-1)
          useOS.getState().toast({ title: 'Analysis ready', body: 'Hover a finding to see the nodes it refers to.', tone: 'ai' })
        }
      },
      reduce ? 20 : 260,
    )
  }, [arg])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        runAnalysis()
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected?.type === 'link' && !(e.target as HTMLElement).matches('input, textarea')) {
        store.removeArgLink(id, selected.id)
        setSelected(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runAnalysis, selected, id])

  const flags = useMemo(() => {
    const m: Record<string, string[]> = {}
    if (!analysis) return m
    for (const key of ['unsupported', 'gaps'] as const) {
      for (const f of analysis[key]) for (const nid of f.nodeIds ?? []) (m[nid] ??= []).push(f.title)
    }
    return m
  }, [analysis])

  if (!arg) return <NotFound />
  const readOnly = false
  const selNode = selected?.type === 'node' ? arg.nodes.find((n) => n.id === selected.id) : undefined
  const selLink = selected?.type === 'link' ? arg.links.find((l) => l.id === selected.id) : undefined

  const addCore = (type: ArgNodeType) => {
    const { nodes, links, newId } = insertCore(arg, type)
    update({ nodes, links })
    setSelected({ type: 'node', id: newId })
    setTab('inspect')
  }
  const attach = (targetId: string, type: ArgNodeType, text = '') => {
    const pos = attachmentPosition(arg, targetId, heights)
    const nid = store.addArgNode(arg.id, { type, text, x: pos.x, y: pos.y, target: targetId }, { to: targetId, kind: linkKindFor(type) })
    setSelected({ type: 'node', id: nid })
    setTab('inspect')
    return nid
  }
  const doTidy = () => {
    const pos = tidy(arg, heights)
    update({ nodes: arg.nodes.map((n) => (pos[n.id] ? { ...n, ...pos[n.id] } : n)) })
    setTimeout(fit, 60)
  }
  const conclusion = coreOrder(arg).filter((n) => n.type === 'conclusion').pop() ?? coreOrder(arg).pop()
  const onAddObjection = (f: Finding) => {
    const target = f.nodeIds?.[0] ?? conclusion?.id
    if (target) attach(target, 'objection', `${f.title}: ${f.detail}`)
  }
  const onAddCounter = (f: Finding) => {
    if (conclusion) attach(conclusion.id, 'counter', (f.sketch ?? []).join(' '))
  }
  const detected = detectConcepts(arg.nodes.map((n) => n.text).join(' '), 6).filter((c) => !arg.concepts.includes(c))
  const detectedPh = detectPhilosophers(arg.nodes.map((n) => n.text).join(' ')).filter((c) => !arg.philosophers.includes(c))
  const byline = arg.author === 'you' ? 'Your argument' : philosopherById[arg.author]?.name ?? arg.author

  return (
    <div className="page full arg-page">
      <div className="arg-toolbar">
        <div className="arg-title-wrap">
          <Waypoints size={16} style={{ color: 'var(--blue)' }} />
          <input className="arg-title" value={arg.title} onChange={(e) => update({ title: e.target.value })} aria-label="Argument title" />
          <span className="tag plain">{byline}</span>
        </div>
        <div className="arg-tools">
          <SaveButton refItem={{ kind: 'argument', id: arg.id }} />
          <button className="btn primary" onClick={runAnalysis}>
            <ScanSearch /> Analyze Argument <span className="kbd">⌘↵</span>
          </button>
        </div>
      </div>

      <div className="arg-body">
        <div className="arg-canvas-box" ref={canvasBox}>
          <ArgCanvas
            arg={arg}
            selected={selected}
            onSelect={(s) => {
              setSelected(s)
              if (s && tab !== 'analysis') setTab('inspect')
            }}
            highlight={highlight}
            flags={flags}
            heights={heights}
            onHeight={onHeight}
            view={view}
            onView={setView}
            onMove={(nid, x, y) => store.updateArgNode(arg.id, nid, { x, y })}
            onText={(nid, text) => store.updateArgNode(arg.id, nid, { text })}
            onConnect={(from, to) => {
              const toNode = arg.nodes.find((n) => n.id === to)!
              const fromNode = arg.nodes.find((n) => n.id === from)!
              store.addArgLink(arg.id, { from, to, kind: fromNode.target || ATTACHMENT_TYPES.includes(fromNode.type) ? linkKindFor(fromNode.type) : linkKindFor(toNode.type) })
            }}
            onAttach={(t, type) => attach(t, type)}
            onDelete={(nid) => {
              store.removeArgNode(arg.id, nid)
              setSelected(null)
            }}
            readOnly={readOnly}
          />
          <div className="canvas-float tl glass">
          <div className="seg" role="group" aria-label="Add node">
            {CORE_NODE_TYPES.map((t) => (
              <button key={t} onClick={() => addCore(t)} title={NODE_META[t].hint} style={{ ['--nc' as string]: NODE_META[t].color }}>
                <Plus size={12} className="seg-plus" /> {NODE_META[t].label}
              </button>
            ))}
          </div>
          </div>
          <div className="canvas-float br glass">
          <button className="btn icon" title="Tidy layout" aria-label="Tidy layout" onClick={doTidy}>
            <AlignVerticalSpaceAround />
          </button>
          <div className="seg zoom" role="group" aria-label="Zoom">
            <button aria-label="Zoom out" onClick={() => setView((v) => ({ ...v, k: Math.max(0.35, v.k - 0.1) }))}>
              <Minus size={13} />
            </button>
            <button aria-label="Reset zoom" onClick={() => setView((v) => ({ ...v, k: 1 }))} className="mono" style={{ minWidth: 48 }}>
              {Math.round(view.k * 100)}%
            </button>
            <button aria-label="Zoom in" onClick={() => setView((v) => ({ ...v, k: Math.min(1.8, v.k + 0.1) }))}>
              <ZoomIn size={13} />
            </button>
            <button aria-label="Fit to screen" onClick={fit}>
              <Maximize size={13} />
            </button>
          </div>
          </div>
          <div className="arg-legend">
            {(Object.keys(NODE_META) as ArgNodeType[]).map((t) => (
              <span key={t} style={{ ['--nc' as string]: NODE_META[t].color }}>
                <i /> {NODE_META[t].label}
              </span>
            ))}
            <span className="dim legend-hint">· drag to rearrange · drag ● to connect · ⌘-scroll to zoom</span>
          </div>
        </div>

        <aside className="arg-side">
          <div className="seg side-tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'inspect'} onClick={() => setTab('inspect')}>Inspector</button>
            <button role="tab" aria-selected={tab === 'form'} onClick={() => setTab('form')}>Standard form</button>
            <button role="tab" aria-selected={tab === 'analysis'} onClick={() => setTab('analysis')}>
              <Sparkles size={12} style={{ display: 'inline', verticalAlign: -1, marginRight: 5 }} />
              Analysis
            </button>
          </div>
          <div className="side-scroll">
            <AnimatePresence mode="wait">
              <motion.div key={tab + (selNode?.id ?? '') + (selLink?.id ?? '')} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.14 }}>
                {tab === 'inspect' && selNode && (
                  <div className="inspector">
                    <div className="eyebrow" style={{ color: NODE_META[selNode.type].color }}>
                      {nodeLabel(arg, selNode)} · {NODE_META[selNode.type].label}
                    </div>
                    <p className="dim" style={{ fontSize: 'var(--fs-11)' }}>{NODE_META[selNode.type].hint}</p>
                    <div className="field">
                      <label>Type</label>
                      <select
                        className="select"
                        value={selNode.type}
                        onChange={(e) => store.updateArgNode(arg.id, selNode.id, { type: e.target.value as ArgNodeType })}
                      >
                        {(selNode.target ? ATTACHMENT_TYPES : CORE_NODE_TYPES).map((t) => (
                          <option key={t} value={t}>{NODE_META[t].label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label>Text</label>
                      <textarea className="textarea serif" rows={5} style={{ fontSize: 16 }} value={selNode.text} onChange={(e) => store.updateArgNode(arg.id, selNode.id, { text: e.target.value })} />
                    </div>
                    <div className="field">
                      <label>Linked to the knowledge graph</label>
                      {selNode.refs && selNode.refs.length > 0 && (
                        <div className="chips" style={{ marginBottom: 6 }}>
                          {selNode.refs.map((r) => (
                            <span key={r} className="hstack" style={{ gap: 2 }}>
                              <EntityLink id={r} variant="chip" />
                              <button className="btn icon sm ghost" aria-label="Unlink" onClick={() => store.updateArgNode(arg.id, selNode.id, { refs: selNode.refs!.filter((x) => x !== r) })}>
                                <Minus />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <RefPicker
                        onPick={(rid) => {
                          store.updateArgNode(arg.id, selNode.id, { refs: [...new Set([...(selNode.refs ?? []), rid])] })
                          const kind = graphKind(rid)
                          if (kind === 'concept' && !arg.concepts.includes(rid)) update({ concepts: [...arg.concepts, rid] })
                          if (kind === 'philosopher' && !arg.philosophers.includes(rid)) update({ philosophers: [...arg.philosophers, rid] })
                        }}
                      />
                    </div>
                    <div className="field">
                      <label>Attach to this {NODE_META[selNode.type].label.toLowerCase()}</label>
                      <div className="chips">
                        {ATTACHMENT_TYPES.filter((t) => t !== 'rebuttal' || selNode.type === 'objection' || selNode.type === 'counter').map((t) => (
                          <button key={t} className="tag" style={{ ['--tag' as string]: NODE_META[t].color }} onClick={() => attach(selNode.id, t)}>
                            <Plus size={11} /> {NODE_META[t].label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button className="btn danger sm" style={{ justifySelf: 'start' }} onClick={() => { store.removeArgNode(arg.id, selNode.id); setSelected(null) }}>
                      <Trash2 /> Delete node
                    </button>
                  </div>
                )}
                {tab === 'inspect' && selLink && (
                  <div className="inspector">
                    <div className="eyebrow">Relation</div>
                    <div className="field">
                      <label>Kind</label>
                      <select className="select" value={selLink.kind} onChange={(e) => update({ links: arg.links.map((l) => (l.id === selLink.id ? { ...l, kind: e.target.value as ArgLinkKind } : l)) })}>
                        {(Object.keys(LINK_META) as ArgLinkKind[]).map((k) => (
                          <option key={k} value={k}>{LINK_META[k].label}</option>
                        ))}
                      </select>
                    </div>
                    <p className="dim" style={{ fontSize: 'var(--fs-12)' }}>
                      {nodeLabel(arg, arg.nodes.find((n) => n.id === selLink.from)!)} → {nodeLabel(arg, arg.nodes.find((n) => n.id === selLink.to)!)}
                    </p>
                    <button className="btn danger sm" style={{ justifySelf: 'start' }} onClick={() => { store.removeArgLink(arg.id, selLink.id); setSelected(null) }}>
                      <Trash2 /> Remove relation <span className="kbd">⌫</span>
                    </button>
                  </div>
                )}
                {tab === 'inspect' && !selNode && !selLink && (
                  <div className="inspector">
                    <div className="field">
                      <label>Summary</label>
                      <textarea className="textarea" rows={3} value={arg.summary} placeholder="In one sentence, what does this argument show?" onChange={(e) => update({ summary: e.target.value })} />
                    </div>
                    <div className="field">
                      <label>Tradition</label>
                      <select className="select" value={arg.tradition ?? ''} onChange={(e) => update({ tradition: e.target.value || undefined })}>
                        <option value="">— None —</option>
                        {schools.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label>Concepts</label>
                      <div className="chips">
                        {arg.concepts.map((c) => (
                          <EntityLink key={c} id={c} variant="chip" />
                        ))}
                        {!arg.concepts.length && <span className="dim" style={{ fontSize: 'var(--fs-11)' }}>None linked yet.</span>}
                      </div>
                    </div>
                    {(detected.length > 0 || detectedPh.length > 0) && (
                      <div className="field">
                        <label>Detected in your text — link them?</label>
                        <div className="chips">
                          {detected.map((c) => (
                            <button key={c} className="tag k-concept" onClick={() => update({ concepts: [...arg.concepts, c] })}>
                              <Plus size={11} /> {graphLabel(c)}
                            </button>
                          ))}
                          {detectedPh.map((c) => (
                            <button key={c} className="tag k-philosopher" onClick={() => update({ philosophers: [...arg.philosophers, c] })}>
                              <Plus size={11} /> {philosopherById[c].name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="arg-stats">
                      <div><span className="mono">{arg.nodes.filter((n) => n.type === 'premise').length}</span> premises</div>
                      <div><span className="mono">{arg.nodes.filter((n) => n.type === 'objection' || n.type === 'counter').length}</span> challenges</div>
                      <div><span className="mono">{arg.nodes.filter((n) => n.type === 'rebuttal').length}</span> rebuttals</div>
                      <div><span className="mono">{arg.links.length}</span> relations</div>
                    </div>
                    <p className="dim" style={{ fontSize: 'var(--fs-11)', lineHeight: 1.6 }}>
                      Select a card to edit it. Structure flows <strong className="t0">Claim → Premises → Inference → Conclusion</strong>; attach objections, evidence, definitions and assumptions to any step.
                    </p>
                    {arg.author === 'you' && (
                      <button
                        className="btn danger sm"
                        style={{ justifySelf: 'start' }}
                        onClick={() => {
                          store.deleteArgument(arg.id)
                          navigate('/app/arguments')
                        }}
                      >
                        <Trash2 /> Delete argument
                      </button>
                    )}
                  </div>
                )}
                {tab === 'form' && (
                  <div className="inspector">
                    <div className="std-form">
                      {coreOrder(arg).map((n) => (
                        <div key={n.id} className={`sf-row t-${n.type}`} onMouseEnter={() => setHighlight([n.id])} onMouseLeave={() => setHighlight([])} style={{ ['--nc' as string]: NODE_META[n.type].color }}>
                          <span className="sf-label mono">{nodeLabel(arg, n)}</span>
                          <div>
                            <p className={n.type === 'conclusion' ? 'sf-concl' : ''}>{n.text || <span className="dim">[empty]</span>}</p>
                            {arg.nodes
                              .filter((a) => a.target === n.id)
                              .map((a) => (
                                <p key={a.id} className="sf-attach" style={{ ['--nc' as string]: NODE_META[a.type].color }}>
                                  <span>{NODE_META[a.type].label}</span> {a.text}
                                </p>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      className="btn sm"
                      style={{ justifySelf: 'start' }}
                      onClick={() => {
                        navigator.clipboard?.writeText(standardForm(arg))
                        store.toast({ title: 'Copied in standard form', tone: 'success' })
                      }}
                    >
                      <ClipboardCopy /> Copy as text
                    </button>
                    <Link to="/app/essays" className="dim" style={{ fontSize: 'var(--fs-11)' }}>Use this argument in an essay →</Link>
                  </div>
                )}
                {tab === 'analysis' && (
                  <div>
                    {stage >= 0 && <AnalyzingState stage={stage} />}
                    {stage < 0 && analysis && <ArgAnalysisPanel analysis={analysis} onHighlight={setHighlight} onAddObjection={onAddObjection} onAddCounter={onAddCounter} />}
                    {stage < 0 && !analysis && (
                      <div className="empty" style={{ margin: 4 }}>
                        <ScanSearch />
                        <p>Analysis identifies unsupported premises, logical gaps, ambiguities, hidden assumptions, objections and counterarguments — and explains its reasoning.</p>
                        <button className="btn primary sm" onClick={runAnalysis}>Analyze Argument</button>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </aside>
      </div>
    </div>
  )
}
