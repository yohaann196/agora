import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Info } from 'lucide-react'
import { APPS } from '../../lib/apps'
import { useOS } from '../../store'

const overlayMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.12 },
}
export const panelMotion = {
  initial: { opacity: 0, y: -8, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 0.98 },
  transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] as const },
}

const SHORTCUTS: { group: string; items: [string[], string][] }[] = [
  {
    group: 'Anywhere',
    items: [
      [['⌘', 'K'], 'Command palette & search'],
      [['/'], 'Focus search'],
      [['?'], 'This sheet'],
      [['Esc'], 'Close overlay'],
    ],
  },
  { group: 'Go to', items: APPS.map((a) => [['G', a.chord.toUpperCase()], a.label] as [string[], string]) },
  {
    group: 'Evidence',
    items: [
      [['⌘', 'T'], 'New tab'],
      [['⌘', 'L'], 'Focus the address bar'],
      [['⌘', '⇧', 'W'], 'Close tab'],
      [['Select'], 'Select text to cut a card'],
    ],
  },
  {
    group: 'Vaults',
    items: [
      [['F4', 'F5', 'F6', 'F7'], 'Pocket · Hat · Block · Tag'],
      [['F8'], 'Cite'],
      [['F9'], 'Underline'],
      [['F10'], 'Emphasis'],
      [['F11'], 'Highlight'],
      [['F12'], 'Clear formatting'],
    ],
  },
  {
    group: 'Flow',
    items: [
      [['Enter'], 'Next row'],
      [['Tab'], 'Next speech'],
      [['⌥', '↑↓←→'], 'Move between cells'],
      [['⌥', '1', '2', '3'], 'Dropped · extend · key'],
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
          <motion.div className="sheet" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" {...panelMotion}>
            <div className="hstack" style={{ justifyContent: 'space-between' }}>
              <h2 className="sheet-title">Keyboard shortcuts</h2>
              <button className="btn ghost sm" onClick={() => setOpen(false)} autoFocus>
                Close <span className="kbd">esc</span>
              </button>
            </div>
            <div className="sheet-grid">
              {SHORTCUTS.map((g) => (
                <div key={g.group}>
                  <div className="eyebrow" style={{ margin: '12px 0 4px' }}>{g.group}</div>
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
          const I = t.tone === 'success' ? CheckCircle2 : Info
          return (
            <motion.div key={t.id} className={`toast ${t.tone ?? ''}`} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.2 }} onClick={() => dismiss(t.id)}>
              <I />
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
