import { ArrowUpRight } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { APPS, GROUP_LABEL, appForPath, type AppDef } from '../../lib/apps'
import { useOS } from '../../store'
import { Logo } from '../ui/Brand'

const GROUPS: AppDef['group'][] = ['prep', 'compete', 'you']

export function Sidebar() {
  const location = useLocation()
  const active = appForPath(location.pathname, location.search)
  const open = useOS((s) => s.mobileNavOpen)
  const setOpen = useOS((s) => s.setMobileNav)
  const recents = useOS((s) => s.recents)

  return (
    <>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Workspace">
        <Link to="/" className="sidebar-brand" aria-label="Resolved home">
          <Logo size={24} />
        </Link>
        <nav className="sidebar-scroll">
          {GROUPS.map((grp) => (
            <div key={grp} className="nav-group">
              <div className="nav-label">{GROUP_LABEL[grp]}</div>
              {APPS.filter((a) => a.group === grp).map((a) => {
                const on = active.id === a.id
                return (
                  <Link key={a.id} to={a.path} className={`nav-item ${on ? 'active' : ''}`} aria-current={on ? 'page' : undefined} onClick={() => setOpen(false)} title={a.description}>
                    <a.icon aria-hidden />
                    <span className="label">{a.label}</span>
                    {a.external ? <ArrowUpRight className="nav-ext" aria-hidden /> : <span className="chord" aria-hidden>G {a.chord.toUpperCase()}</span>}
                  </Link>
                )
              })}
            </div>
          ))}
          {recents.length > 0 && (
            <div className="nav-group recent-block">
              <div className="nav-label">Recent</div>
              {recents.slice(0, 5).map((r) => (
                <Link
                  key={r.kind + r.id}
                  className="recent-link"
                  to={r.kind === 'debater' ? `/debaters/${r.id}` : r.kind === 'brief' ? `/briefs/${r.id}` : r.kind === 'flow' ? `/app/flow/${r.id}` : r.kind === 'school' ? `/schools/${r.id}` : `/app/vaults/${r.id}`}
                  onClick={() => setOpen(false)}
                >
                  <span className={`rk-dot ${r.kind}`} aria-hidden />
                  <span className="truncate">{r.label ?? r.id}</span>
                </Link>
              ))}
            </div>
          )}
        </nav>
        <div className="sidebar-foot">
          <span className="beta-pill">Beta</span>
          <span className="dim">Your work is saved in this browser.</span>
        </div>
      </aside>
    </>
  )
}
