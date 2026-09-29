import { BrainCircuit, Command, Keyboard, NotebookPen, Orbit } from 'lucide-react'
import { useNow } from '../../lib/hooks'
import { useOS } from '../../store'
import { useKnowledgeGraph } from '../../store/graph'

export function StatusBar() {
  const now = useNow(15_000)
  const g = useKnowledgeGraph()
  const windows = useOS((s) => s.windows)
  const notes = useOS((s) => s.notes)
  const provider = useOS((s) => s.settings.aiProvider)
  const hasKey = useOS((s) => !!s.settings.apiKey)
  const { toggleMinimize, focusWindow, setPalette, setShortcuts } = useOS.getState()
  const time = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const engine = provider === 'anthropic' && hasKey ? 'Claude' : 'Local reasoning engine'
  return (
    <footer className="statusbar" aria-label="Status bar">
      <span className="sb-item">
        <span className="sb-led" aria-hidden /> Workspace synced · local
      </span>
      <span className="sb-item sb-hide-sm">
        <Orbit aria-hidden /> {g.nodes.size} nodes · {g.edges.length} relations
      </span>
      <span className="sb-item sb-hide-sm">
        <BrainCircuit aria-hidden /> {engine}
      </span>
      <div className="sb-dock" aria-label="Open windows">
        {windows.map((w) => {
          const label = w.type === 'socratic' ? 'Socratic AI' : w.type === 'note' ? notes.find((n) => n.id === w.refId)?.title ?? 'Note' : g.nodes.get(w.refId ?? '')?.label ?? 'Preview'
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
