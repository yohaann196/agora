import { motion } from 'framer-motion'
import { Command } from 'lucide-react'
import { NavLink, useLocation } from 'react-router'
import { APPS, appForPath } from '../../lib/apps'
import { routeFor } from '../../model/graph'
import { useOS } from '../../store'
import { useKnowledgeGraph } from '../../store/graph'
import { KindIcon } from '../ui/primitives'

export function PhiMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs>
        <linearGradient id="phi-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgb(var(--accent-rgb))" />
          <stop offset="1" stopColor="var(--violet)" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="9" fill="none" stroke="url(#phi-g)" strokeWidth="1.6" />
      <line x1="16" y1="3.5" x2="16" y2="28.5" stroke="var(--text-0)" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="25" cy="16" r="1.9" fill="var(--cyan)" />
      <circle cx="7" cy="16" r="1.1" fill="var(--text-2)" />
    </svg>
  )
}

export function Sidebar() {
  const location = useLocation()
  const active = appForPath(location.pathname)
  const open = useOS((s) => s.mobileNavOpen)
  const setOpen = useOS((s) => s.setMobileNav)
  const setQuickLaunch = useOS((s) => s.setQuickLaunch)
  const recents = useOS((s) => s.recents)
  const g = useKnowledgeGraph()

  const item = (a: (typeof APPS)[number]) => {
    const isActive = active.id === a.id
    const I = a.icon
    return (
      <NavLink
        key={a.id}
        to={a.path}
        end={a.path === '/app'}
        className={`nav-item ${isActive ? 'active' : ''}`}
        style={{ ['--nav-accent' as string]: a.accent }}
        onClick={() => setOpen(false)}
        title={a.label}
        aria-current={isActive ? 'page' : undefined}
      >
        {isActive && <motion.span layoutId="nav-active" className="nav-active-bg" transition={{ type: 'spring', stiffness: 520, damping: 42 }} />}
        <I aria-hidden />
        <span className="label">{a.label}</span>
        <span className="chord" aria-hidden>
          G {a.chord.toUpperCase()}
        </span>
      </NavLink>
    )
  }

  return (
    <>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Primary">
        <div className="sidebar-brand">
          <PhiMark />
          <span className="brand-word">
            Philosophy<span>OS</span>
          </span>
          <span className="brand-ver">v1.0</span>
        </div>
        <nav className="sidebar-scroll">
          <div className="nav-section">{APPS.filter((a) => a.group === 'system').map(item)}</div>
          <div className="nav-divider" />
          <div className="nav-label eyebrow">Workspace</div>
          <div className="nav-section">{APPS.filter((a) => a.group === 'workspace').map(item)}</div>
          <div className="recent-block">
            <div className="nav-label eyebrow">Recently opened</div>
            <div className="recent-mini">
              {recents.slice(0, 5).map((r) => {
                const n = g.nodes.get(r.id)
                if (!n) return null
                return (
                  <NavLink key={r.id} to={routeFor(n)} onClick={() => setOpen(false)} className={`k-${n.kind}`}>
                    <KindIcon kind={n.kind} size={12} />
                    <span className="truncate">{n.label}</span>
                  </NavLink>
                )
              })}
            </div>
          </div>
        </nav>
        <div className="sidebar-foot">
          <button className="ql-button" onClick={() => setQuickLaunch(true)} title="Quick launch">
            <Command aria-hidden />
            <span className="ql-text">Quick launch</span>
            <span className="kbd">⌘J</span>
          </button>
        </div>
      </aside>
    </>
  )
}
