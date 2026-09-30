import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useOutlet } from 'react-router'
import { APPS } from '../../lib/apps'
import { isTyping } from '../../lib/hooks'
import { useOS } from '../../store'
import { CommandPalette, useGlobalPaletteKeys } from './CommandPalette'
import { ShortcutSheet, Toasts } from './Overlays'
import { Sidebar } from './Sidebar'
import { StatusBar } from './StatusBar'
import { TopBar } from './TopBar'

function useWorkspaceKeys() {
  const navigate = useNavigate()
  const chord = useRef(0)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useOS.getState()
      if (e.key === 'Escape') {
        if (s.paletteOpen || s.shortcutsOpen) {
          s.setPalette(false)
          s.setShortcuts(false)
        }
        return
      }
      if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey || s.paletteOpen) return
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
      if (e.key === 'g') chord.current = now
      else if (e.key === '/') {
        e.preventDefault()
        s.setPalette(true)
      } else if (e.key === '?') s.setShortcuts(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])
}

/** Keeps the outgoing route's element on screen while it animates out. */
function FrozenOutlet({ outlet }: { outlet: ReactNode }) {
  const [frozen] = useState(outlet)
  return <>{frozen}</>
}

export function AppShell() {
  const location = useLocation()
  const outlet = useOutlet()
  const reduceMotion = useOS((s) => s.settings.reduceMotion)
  const viewport = useRef<HTMLDivElement>(null)
  useWorkspaceKeys()
  useGlobalPaletteKeys()

  // The workspace scrolls inside its panes, not the page.
  useEffect(() => {
    document.body.classList.add('app-body')
    return () => document.body.classList.remove('app-body')
  }, [])

  const key = location.pathname
  // An open flow takes the whole screen; the sidebar slides in over it on demand.
  const focus = /^\/app\/flow\/[^/]+/.test(location.pathname)
  useEffect(() => {
    viewport.current?.scrollTo({ top: 0 })
    useOS.getState().setMobileNav(false)
  }, [key])

  return (
    <MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}>
      <div className={`shell ${focus ? 'focus' : ''}`}>
        <Sidebar />
        <div className="main">
          <TopBar />
          <main className="viewport" ref={viewport} id="main">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={key} className="route" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}>
                <Suspense fallback={<div className="route-loading" aria-label="Loading" />}>
                  <FrozenOutlet outlet={outlet} />
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
        <StatusBar />
        <CommandPalette />
        <ShortcutSheet />
        <Toasts />
      </div>
    </MotionConfig>
  )
}
