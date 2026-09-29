import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Info, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { APPS } from '../../lib/apps'
import { useOS } from '../../store'

const overlayMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.12 },
}
const panelMotion = {
  initial: { opacity: 0, y: -8, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 0.98 },
  transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] as const },
}

export function QuickLaunch() {
  const open = useOS((s) => s.quickLaunchOpen)
  const setOpen = useOS((s) => s.setQuickLaunch)
  return <AnimatePresence>{open && <QuickLaunchInner close={() => setOpen(false)} />}</AnimatePresence>
}

function QuickLaunchInner({ close }: { close: () => void }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const apps = useMemo(() => APPS.filter((a) => a.label.toLowerCase().includes(q.toLowerCase())), [q])
  const launch = (i: number) => {
    const a = apps[i]
    if (!a) return
    navigate(a.path)
    close()
  }
  return (
    <motion.div className="overlay" {...overlayMotion} onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <motion.div className="launch glass" role="dialog" aria-modal="true" aria-label="Quick launch" {...panelMotion}>
        <div className="hstack" style={{ justifyContent: 'space-between' }}>
          <div>
            <div className="eyebrow">Quick launch</div>
            <div className="serif t0" style={{ fontSize: 24, marginTop: 4 }}>Where does your thinking go next?</div>
          </div>
          <span className="kbd">esc</span>
        </div>
        <input
          autoFocus
          className="input"
          style={{ marginTop: 16 }}
          placeholder="Filter applications…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setIdx(0)
          }}
          onKeyDown={(e) => {
            const cols = 5
            if (e.key === 'Escape') close()
            if (e.key === 'Enter') launch(idx)
            if (e.key === 'ArrowRight') setIdx((i) => Math.min(apps.length - 1, i + 1))
            if (e.key === 'ArrowLeft') setIdx((i) => Math.max(0, i - 1))
            if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(apps.length - 1, i + cols)) }
            if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - cols)) }
          }}
          aria-label="Filter applications"
        />
        <div className="launch-grid" role="listbox">
          {apps.map((a, i) => {
            const I = a.icon
            return (
              <motion.button
                key={a.id}
                className="launch-app"
                role="option"
                aria-selected={i === idx}
                style={{ ['--a' as string]: a.accent }}
                onClick={() => launch(i)}
                onMouseEnter={() => setIdx(i)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.015, duration: 0.2 }}
              >
                <span className="launch-icon">
                  <I />
                </span>
                {a.label}
              </motion.button>
            )
          })}
        </div>
      </motion.div>
    </motion.div>
  )
}

const SHORTCUTS: { group: string; items: [string[], string][] }[] = [
  {
    group: 'System',
    items: [
      [['⌘', 'K'], 'Command palette'],
      [['⌘', 'J'], 'Quick launch'],
      [['/'], 'Focus global search'],
      [['?'], 'This sheet'],
      [['N'], 'New note in a floating window'],
      [['Esc'], 'Close overlay'],
    ],
  },
  {
    group: 'Go to',
    items: APPS.map((a) => [['G', a.chord.toUpperCase()], a.label] as [string[], string]),
  },
  {
    group: 'Anywhere',
    items: [
      [['⌥', 'Click'], 'Open any link in a floating window'],
      [['⌘', 'Enter'], 'Send / run analysis'],
    ],
  },
]

export function ShortcutSheet() {
  const open = useOS((s) => s.shortcutsOpen)
  const setOpen = useOS((s) => s.setShortcuts)
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="overlay" {...overlayMotion} onPointerDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <motion.div className="sheet glass" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" {...panelMotion}>
            <div className="hstack" style={{ justifyContent: 'space-between' }}>
              <div className="serif t0" style={{ fontSize: 24 }}>Keyboard shortcuts</div>
              <button className="btn ghost sm" onClick={() => setOpen(false)} autoFocus>
                Close <span className="kbd">esc</span>
              </button>
            </div>
            <div className="sheet-grid">
              {SHORTCUTS.map((g) => (
                <div key={g.group}>
                  <div className="eyebrow" style={{ margin: '10px 0 4px' }}>{g.group}</div>
                  {g.items.map(([keys, label]) => (
                    <div className="sheet-row" key={label}>
                      <span>{label}</span>
                      <span className="keys">
                        {keys.map((k) => (
                          <span className="kbd" key={k}>{k}</span>
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Toasts() {
  const toasts = useOS((s) => s.toasts)
  const dismiss = useOS((s) => s.dismissToast)
  return (
    <div className="toasts" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => {
          const I = t.tone === 'success' ? CheckCircle2 : t.tone === 'ai' ? Sparkles : Info
          const color = t.tone === 'success' ? 'var(--green)' : t.tone === 'ai' ? 'var(--violet)' : 'var(--blue)'
          return (
            <motion.div
              key={t.id}
              className="toast glass"
              layout
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              onClick={() => dismiss(t.id)}
            >
              <I style={{ color }} />
              <div>
                <div className="t-title">{t.title}</div>
                {t.body && <div className="t-body">{t.body}</div>}
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
