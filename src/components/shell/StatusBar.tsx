import { BrainCircuit, Command, FileText, Keyboard, NotebookPen, Orbit, Timer } from 'lucide-react'
import { useEffect } from 'react'
import { Link } from 'react-router'
import { clock, ensureTicker, mainLeft, prepLeft, useTimer } from '../../features/flow/timerStore'
import { useNow } from '../../lib/hooks'
import { FORMATS } from '../../research/formats'
import { useOS } from '../../store'
import { useKnowledgeGraph } from '../../store/graph'

/** A running speech or prep clock stays visible from every app. */
function LiveClock() {
  const t = useTimer()
  useEffect(() => {
    if (t.running || t.prepRunning) ensureTicker()
  }, [t.running, t.prepRunning])
  if (!t.running && !t.prepRunning) return null
  const def = FORMATS[t.format]
  const label = t.running ? def.speeches[t.speech].label : `${t.prepRunning === 'aff' ? def.affLabel : def.negLabel} prep`
  const ms = t.running ? mainLeft(t) : prepLeft(t, t.prepRunning!)
  return (
    <Link to="/app/flow" className={`sb-item sb-clock ${ms <= 30000 ? 'low' : ''}`} title="Open Flow & Timer">
      <Timer aria-hidden /> {label} <b className="mono">{clock(ms)}</b>
    </Link>
  )
}

export function StatusBar() {
  const now = useNow(15_000)
  const g = useKnowledgeGraph()
  const windows = useOS((s) => s.windows)
  const notes = useOS((s) => s.notes)
  const target = useOS((s) => s.docs.find((d) => d.id === s.cutTarget))
  const provider = useOS((s) => s.settings.aiProvider)
  const hasKey = useOS((s) => !!s.settings.apiKey)
  const { toggleMinimize, focusWindow, setPalette, setShortcuts } = useOS.getState()
  const time = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const engine = provider === 'anthropic' && hasKey ? 'Claude' : 'Local coach'
  return (
    <footer className="statusbar" aria-label="Status bar">
      <span className="sb-item">
        <span className="sb-led" aria-hidden /> Saved locally
      </span>
      {target && (
        <Link to={`/app/docs/${target.id}`} className="sb-item sb-hide-sm" title="Cards you cut go here">
          <FileText aria-hidden /> Cutting into <b className="truncate" style={{ maxWidth: 200 }}>{target.title}</b>
        </Link>
      )}
      <LiveClock />
      <span className="sb-item sb-hide-sm">
        <Orbit aria-hidden /> {g.nodes.size} nodes
      </span>
      <span className="sb-item sb-hide-sm">
        <BrainCircuit aria-hidden /> {engine}
      </span>
      <div className="sb-dock" aria-label="Open windows">
        {windows.map((w) => {
          const label = w.type === 'socratic' ? 'Socratic Coach' : w.type === 'note' ? notes.find((n) => n.id === w.refId)?.title ?? 'Note' : g.nodes.get(w.refId ?? '')?.label ?? 'Preview'
          return (
            <button
              key={w.id}
              onClick={() => {
                if (w.minimized) toggleMinimize(w.id)
                focusWindow(w.id)
              }}
              title={w.minimized ? 'Restore window' : 'Focus window'}
              style={w.minimized ? { opacity: 0.6 } : undefined}
            >
              {w.type === 'note' ? <NotebookPen size={10} /> : w.type === 'socratic' ? <BrainCircuit size={10} /> : <Orbit size={10} />}
              <span className="truncate">{label}</span>
            </button>
          )
        })}
      </div>
      <span className="spacer" />
      <button className="sb-item sb-hide-sm" onClick={() => setShortcuts(true)}>
        <Keyboard aria-hidden /> Shortcuts
      </button>
      <button className="sb-item" onClick={() => setPalette(true)}>
        <Command aria-hidden /> K
      </button>
      <span className="sb-item">{time}</span>
    </footer>
  )
}
