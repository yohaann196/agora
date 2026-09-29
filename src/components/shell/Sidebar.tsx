import { motion } from 'framer-motion'
import { Command } from 'lucide-react'
import { NavLink, useLocation } from 'react-router'
import { APPS, GROUP_LABEL, appForPath, type AppGroup } from '../../lib/apps'
import { routeFor } from '../../model/graph'
import { useOS } from '../../store'
import { useKnowledgeGraph } from '../../store/graph'
import { AgoraMark } from '../ui/AgoraMark'
import { KindIcon } from '../ui/primitives'

const GROUPS: AppGroup[] = ['research', 'debate', 'write', 'workspace']

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
        <NavLink to="/app" className="sidebar-brand" onClick={() => setOpen(false)} aria-label="Agora — Desk">
          <AgoraMark size={34} />
          <span className="brand-text">
            <span className="brand-word">Agora</span>
            <span className="brand-sub">Research &amp; Debate</span>
          </span>
        </NavLink>
        <nav className="sidebar-scroll">
          <div className="nav-section">{APPS.filter((a) => a.group === 'desk').map(item)}</div>
          {GROUPS.map((grp) => (
            <div key={grp} className="nav-group">
              <div className="nav-label">{GROUP_LABEL[grp]}</div>
              <div className="nav-section">{APPS.filter((a) => a.group === grp).map(item)}</div>
            </div>
          ))}
          <div className="recent-block">
            <div className="nav-label">Recently opened</div>
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
