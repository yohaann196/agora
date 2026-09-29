import { AnimatePresence, motion, useDragControls, useMotionValue } from 'framer-motion'
import { ArrowUpRight, BrainCircuit, Minus, NotebookPen, Send, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { MODE_META } from '../../ai/socratic'
import { useSocraticChat } from '../../features/socratic/useChat'
import { KIND_LABEL, neighbors, routeFor } from '../../model/graph'
import { useOS, type OSWindow } from '../../store'
import { useKnowledgeGraph } from '../../store/graph'
import { EntityLink } from '../ui/EntityLink'
import { KindIcon } from '../ui/primitives'
import { RichText } from '../ui/RichText'

export function WindowLayer() {
  const windows = useOS((s) => s.windows)
  const topZ = Math.max(0, ...windows.map((w) => w.z))
  return (
    <AnimatePresence>
      {windows
        .filter((w) => !w.minimized)
        .map((w) => (
          <FloatingWindow key={w.id} w={w} focused={w.z === topZ} />
        ))}
    </AnimatePresence>
  )
}

function FloatingWindow({ w, focused }: { w: OSWindow; focused: boolean }) {
  const controls = useDragControls()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const { moveWindow, closeWindow, focusWindow, toggleMinimize } = useOS.getState()
  const g = useKnowledgeGraph()
  const note = useOS((s) => (w.type === 'note' ? s.notes.find((n) => n.id === w.refId) : undefined))

  let title = 'Window'
  let Icon = NotebookPen
  if (w.type === 'note') title = note?.title ?? 'Note'
  if (w.type === 'socratic') {
    title = 'Socratic Coach'
    Icon = BrainCircuit
  }
  if (w.type === 'entity') title = g.nodes.get(w.refId ?? '')?.label ?? 'Preview'

  return (
    <motion.section
      className={`os-window glass ${focused ? 'focused' : ''}`}
      style={{ left: w.x, top: w.y, zIndex: 60 + w.z, x, y }}
      drag
      dragControls={controls}
      dragListener={false}
      dragMomentum={false}
      dragElastic={0}
      onDragEnd={(_, info) => {
        const nx = Math.min(Math.max(8, w.x + info.offset.x), window.innerWidth - 120)
        const ny = Math.min(Math.max(8, w.y + info.offset.y), window.innerHeight - 60)
        moveWindow(w.id, nx, ny)
        x.set(0)
        y.set(0)
      }}
      onPointerDown={() => focusWindow(w.id)}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      role="dialog"
      aria-label={title}
    >
      <div className="win-bar" onPointerDown={(e) => controls.start(e)}>
        <div className="win-title">
          {w.type === 'entity' && w.refKind ? <span style={{ display: 'inline-block', marginRight: 6, verticalAlign: -2 }}><KindIcon kind={w.refKind} size={12} /></span> : <Icon />}
          {title}
        </div>
        <button className="win-ctrl" aria-label="Minimize" onPointerDown={(e) => e.stopPropagation()} onClick={() => toggleMinimize(w.id)}>
          <Minus />
        </button>
        <button className="win-ctrl" aria-label="Close" onPointerDown={(e) => e.stopPropagation()} onClick={() => closeWindow(w.id)}>
          <X />
        </button>
      </div>
      {w.type === 'note' && <NoteWindow id={w.refId!} />}
      {w.type === 'socratic' && <SocraticWindow />}
      {w.type === 'entity' && <EntityWindow id={w.refId!} winId={w.id} />}
    </motion.section>
  )
}

function NoteWindow({ id }: { id: string }) {
  const note = useOS((s) => s.notes.find((n) => n.id === id))
  const update = useOS((s) => s.updateNote)
  if (!note) return <div className="win-body dim">This note was deleted.</div>
  return (
    <div className="win-body" style={{ display: 'grid', gap: 10 }}>
      <input className="input" value={note.title} onChange={(e) => update(id, { title: e.target.value })} aria-label="Note title" style={{ fontWeight: 500 }} />
      <textarea
        className="textarea"
        rows={9}
        value={note.body}
        onChange={(e) => update(id, { body: e.target.value })}
        placeholder="Write freely. Link ideas with [[concept-id]], e.g. [[justice]] or [[kant]]."
        aria-label="Note body"
        style={{ fontFamily: 'var(--font-serif)', fontSize: 15 }}
      />
      {note.links.length > 0 && (
        <div className="chips">
          {note.links.map((l) => (
            <EntityLink key={l} id={l} variant="chip" />
          ))}
        </div>
      )}
      <div className="dim" style={{ fontSize: 'var(--fs-11)' }}>Saved automatically · linked into the knowledge graph</div>
    </div>
  )
}

function SocraticWindow() {
  const chat = useOS((s) => s.chat)
  const mode = useOS((s) => s.socraticMode)
  const { send, busy } = useSocraticChat()
  const [draft, setDraft] = useState('')
  const last = chat.slice(-4)
  return (
    <div className="win-body" style={{ display: 'grid', gap: 12 }}>
      <div className="hstack">
        <span className="tag" style={{ ['--tag' as string]: 'var(--green)' }}>
          <span className="dot" /> {MODE_META[mode].label}
        </span>
        <span className="dim" style={{ fontSize: 'var(--fs-11)' }}>{MODE_META[mode].short}</span>
      </div>
      <div style={{ display: 'grid', gap: 12, maxHeight: 300, overflow: 'auto' }}>
        {last.length === 0 && <p className="dim">{MODE_META[mode].blurb}</p>}
        {last.map((m) => (
          <div key={m.id} style={{ fontSize: 'var(--fs-12)' }}>
            <div className="eyebrow" style={{ marginBottom: 4 }}>{m.role === 'user' ? 'You' : 'Socratic Coach'}</div>
            {m.role === 'user' ? <p className="t0">{m.text}</p> : <RichText text={m.text || '…'} className={m.pending ? 'caret' : ''} />}
          </div>
        ))}
      </div>
      <form
        className="hstack"
        onSubmit={(e) => {
          e.preventDefault()
          send(draft)
          setDraft('')
        }}
      >
        <input className="input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={MODE_META[mode].placeholder} aria-label="Message" />
        <button className="btn icon primary" disabled={busy || !draft.trim()} aria-label="Send">
          <Send />
        </button>
      </form>
    </div>
  )
}

function EntityWindow({ id, winId }: { id: string; winId: string }) {
  const g = useKnowledgeGraph()
  const navigate = useNavigate()
  const close = useOS((s) => s.closeWindow)
  const node = g.nodes.get(id)
  if (!node) return <div className="win-body dim">Not found.</div>
  const nb = neighbors(g, id).slice(0, 14)
  return (
    <div className="win-body" style={{ display: 'grid', gap: 12 }}>
      <div>
        <div className="eyebrow">{KIND_LABEL[node.kind]} · {node.sublabel}</div>
        <div className="serif t0" style={{ fontSize: 22, lineHeight: 1.2, marginTop: 4 }}>{node.label}</div>
      </div>
      <p style={{ fontSize: 'var(--fs-12)', lineHeight: 1.6 }} className={node.kind === 'passage' ? 'serif t0' : ''}>{node.summary}</p>
      <div className="divider-label">Connections</div>
      <div style={{ display: 'grid', gap: 6 }}>
        {nb.map((n, i) => (
          <div key={i} className="hstack" style={{ fontSize: 'var(--fs-12)' }}>
            <span className="dim" style={{ width: 96, flex: 'none' }}>{n.label}</span>
            <EntityLink id={n.node.id} />
          </div>
        ))}
      </div>
      <button
        className="btn sm"
        style={{ justifySelf: 'start' }}
        onClick={() => {
          navigate(routeFor(node))
          close(winId)
        }}
      >
        Open full view <ArrowUpRight />
      </button>
    </div>
  )
}
