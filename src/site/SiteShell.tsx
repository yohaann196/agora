import { Menu, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { CommandPalette, useGlobalPaletteKeys } from '../components/shell/CommandPalette'
import { Toasts } from '../components/shell/Overlays'
import { Logo } from '../components/ui/Brand'
import { useOS } from '../store'
import './site.css'

const NAV = [
  { to: '/rankings', label: 'Rankings' },
  { to: '/prep', label: 'Prep tools' },
]

export function SiteShell() {
  const [open, setOpen] = useState(false)
  const { pathname, hash } = useLocation()
  useGlobalPaletteKeys()
  // New page, new scroll position; pages that jump to a section handle their own.
  useEffect(() => {
    setOpen(false)
    if (pathname !== '/prep' && !hash) window.scrollTo({ top: 0 })
  }, [pathname, hash])
  return (
    <div className="site">
      <header className="site-nav">
        <div className="site-nav-inner">
          <Link to="/" className="site-brand" aria-label="Debate Utils home">
            <Logo size={24} />
          </Link>
          <nav className={`site-links ${open ? 'open' : ''}`} aria-label="Main">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `site-link ${isActive ? 'on' : ''}`}>
                {n.label}
              </NavLink>
            ))}
            <button className="btn ghost site-search" onClick={() => useOS.getState().setPalette(true)} aria-label="Search debaters and schools">
              <Search /> <span>Search</span> <span className="kbd">⌘K</span>
            </button>
            <Link to="/app" className="btn primary site-cta">Open the tools</Link>
          </nav>
          <button className="btn icon ghost site-menu" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <main className="site-main">
        <Outlet />
      </main>
      <footer className="site-foot">
        <div className="site-foot-inner">
          <div className="sf-brand">
            <Logo size={22} />
            <p>All of Yohaan’s debate utilities in one place: LD rankings, a prep vault of cut cards, and flow &amp; timer.</p>
          </div>
          <div className="sf-col">
            <b>Compete</b>
            <Link to="/rankings">LD rankings</Link>
            <Link to="/rankings/method">How rankings work</Link>
          </div>
          <div className="sf-col">
            <b>Prep</b>
            <Link to="/app/vault">Prep vault</Link>
            <Link to="/app/vault?tab=files">Your cases &amp; blocks</Link>
            <Link to="/app/flow">Flow &amp; timer</Link>
          </div>
          <div className="sf-col">
            <b>Data</b>
            <Link to="/rankings/method#corrections">Corrections &amp; removal</Link>
            <Link to="/rankings/method">Data sources &amp; method</Link>
            <a href="https://github.com/shreerammodi/debate-rankings" target="_blank" rel="noreferrer">debate-rankings (Modi)</a>
            <a href="https://github.com/skumar-ml/debate-rankings" target="_blank" rel="noreferrer">NSD × DebateDrills × DebateLand data</a>
          </div>
        </div>
        <p className="sf-fine">Rankings are unofficial and computed from public Tabroom results. Debate Utils is an independent project by Yohaan and is not affiliated with the NSDA, Tabroom or any tournament.</p>
      </footer>
      <CommandPalette />
      <Toasts />
    </div>
  )
}
