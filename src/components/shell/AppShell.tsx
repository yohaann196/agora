import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useOutlet } from 'react-router'
import { APPS } from '../../lib/apps'
import { isTyping } from '../../lib/hooks'
import { useOS } from '../../store'
import { CommandPalette } from './CommandPalette'
import { QuickLaunch, ShortcutSheet, Toasts } from './Overlays'
import { Sidebar } from './Sidebar'
import { StatusBar } from './StatusBar'
import { TopBar } from './TopBar'
import { WindowLayer } from './WindowLayer'

function useGlobalShortcuts() {
  const navigate = useNavigate()
  const chord = useRef<number>(0)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useOS.getState()
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        s.setPalette(!s.paletteOpen)
        return
      }
      if (mod && e.key.toLowerCase() === 'j') {
        e.preventDefault()
        s.setQuickLaunch(!s.quickLaunchOpen)
        return
      }
      if (mod && e.key === '/') {
        e.preventDefault()
        s.setShortcuts(!s.shortcutsOpen)
        return
      }
      if (e.key === 'Escape') {
        if (s.paletteOpen || s.quickLaunchOpen || s.shortcutsOpen) {
          s.setPalette(false)
          s.setQuickLaunch(false)
          s.setShortcuts(false)
        }
        return
      }
      if (isTyping(e) || mod || e.altKey) return
      if (s.paletteOpen || s.quickLaunchOpen) return

      const now = Date.now()
      if (now - chord.current < 900) {
        chord.current = 0
        const app = APPS.find((a) => a.chord === e.key.toLowerCase())
        if (app) {
          e.preventDefault()
          navigate(app.path)
        }
        return
      }
      if (e.key === 'g') {
        chord.current = now
        return
      }
      if (e.key === '/') {
        e.preventDefault()
        document.getElementById('global-search')?.focus()
      } else if (e.key === '?') {
        s.setShortcuts(true)
      } else if (e.key === 'n') {
        e.preventDefault()
        const id = s.createNote({ title: 'Scratch note' })
        s.openWindow('note', { kind: 'note', id })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])
}

function useAppearance() {
  const { accent, density, reduceMotion } = useOS((s) => s.settings)
  useEffect(() => {
    const el = document.documentElement
    el.dataset.accent = accent
    el.dataset.density = density
    el.dataset.reduceMotion = String(reduceMotion)
  }, [accent, density, reduceMotion])
  return reduceMotion
}

/** Keeps the outgoing route's element on screen while it animates out. */
function FrozenOutlet({ outlet }: { outlet: ReactNode }) {
  const [frozen] = useState(outlet)
  return <>{frozen}</>
}

export function AppShell() {
  const location = useLocation()
  const outlet = useOutlet()
  const reduceMotion = useAppearance()
  const viewport = useRef<HTMLDivElement>(null)
  useGlobalShortcuts()

  // Top-level app key: transitions happen between apps and entities, not on hash changes.
  const key = location.pathname
  useEffect(() => {
    if (!location.hash) viewport.current?.scrollTo({ top: 0 })
    useOS.getState().setMobileNav(false)
  }, [key, location.hash])

  return (
    <MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}>
      <div className="shell">
        <Sidebar />
        <div className="main">
          <TopBar />
          <main className="viewport" ref={viewport} id="main">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={key}
                className="route"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              >
                <Suspense fallback={<div className="route-loading" aria-label="Loading" />}>
                  <FrozenOutlet outlet={outlet} />
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
        <StatusBar />
        <WindowLayer />
        <CommandPalette />
        <QuickLaunch />
        <ShortcutSheet />
        <Toasts />
      </div>
    </MotionConfig>
  )
}
