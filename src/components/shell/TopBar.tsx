import { ChevronRight, Keyboard, Menu, Search } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { appForPath } from '../../lib/apps'
import { useOS } from '../../store'

export function TopBar() {
  const location = useLocation()
  const app = appForPath(location.pathname)
  const docTitle = useOS((s) => (location.pathname.startsWith('/app/vaults/') ? s.docs.find((d) => d.id === location.pathname.split('/')[3])?.title : undefined))
  const flowTitle = useOS((s) => (location.pathname.startsWith('/app/flow/') ? s.flows.find((f) => f.id === location.pathname.split('/')[3])?.title : undefined))
  const { setMobileNav, setPalette, setShortcuts } = useOS.getState()
  const sub = docTitle ?? flowTitle
  return (
    <header className="topbar">
      <button className="btn icon ghost menu-toggle" aria-label="Open navigation" onClick={() => setMobileNav(true)}>
        <Menu />
      </button>
      <div className="crumbs" aria-label="Breadcrumb">
        <app.icon aria-hidden />
        <span className={sub ? '' : 'cur'}>{app.label}</span>
        {sub && (
          <>
            <ChevronRight className="sep" aria-hidden />
            <span className="cur truncate">{sub}</span>
          </>
        )}
      </div>
      <button className="search-trigger" onClick={() => setPalette(true)} aria-label="Search debaters and your prep">
        <Search aria-hidden />
        <span className="st-text">Search debaters, schools, your prep…</span>
        <span className="kbd">⌘K</span>
      </button>
      <div className="topbar-right">
        <Link to="/rankings" className="btn ghost sm tb-hide-sm">Rankings</Link>
        <button className="btn icon ghost sm" aria-label="Keyboard shortcuts" onClick={() => setShortcuts(true)}>
          <Keyboard />
        </button>
      </div>
    </header>
  )
}
