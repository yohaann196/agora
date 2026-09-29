import { FileText, Keyboard, Timer } from 'lucide-react'
import { useEffect } from 'react'
import { Link } from 'react-router'
import { clock, ensureTicker, mainLeft, prepLeft, useTimer } from '../../features/flow/timerStore'
import { useNow } from '../../lib/hooks'
import { FORMATS } from '../../research/formats'
import { useOS } from '../../store'

/** A running speech or prep clock stays visible from every tool. */
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
  const target = useOS((s) => s.docs.find((d) => d.id === s.cutTarget))
  const setShortcuts = useOS((s) => s.setShortcuts)
  const time = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return (
    <footer className="statusbar" aria-label="Status bar">
      <span className="sb-item">
        <span className="sb-led" aria-hidden /> Saved in this browser
      </span>
      {target && (
        <Link to={`/app/vaults/${target.id}`} className="sb-item sb-hide-sm" title="Cards you cut go here">
          <FileText aria-hidden /> Cutting into <b className="truncate" style={{ maxWidth: 220 }}>{target.title}</b>
        </Link>
      )}
      <LiveClock />
      <span className="spacer" />
      <button className="sb-item sb-hide-sm" onClick={() => setShortcuts(true)}>
        <Keyboard aria-hidden /> Shortcuts
      </button>
      <span className="sb-item">{time}</span>
    </footer>
  )
}
