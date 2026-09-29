import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell,
  BookOpen,
  BrainCircuit,
  ChevronRight,
  Globe,
  Keyboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Sparkles,
  Swords,
  User,
} from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { appForPath } from '../../lib/apps'
import { highlight, useClickOutside, useListNav } from '../../lib/hooks'
import { KIND_LABEL, routeFor, search } from '../../model/graph'
import type { EntityKind, GraphNode } from '../../model/types'
import { useOS, type OSNotification } from '../../store'
import { useKnowledgeGraph } from '../../store/graph'
import { KindIcon, timeAgo } from '../ui/primitives'

const SCOPES: { id: string; label: string; kinds?: EntityKind[] }[] = [
  { id: 'all', label: 'All' },
  { id: 'evidence', label: 'Evidence', kinds: ['doc', 'source', 'passage'] },
  { id: 'thinkers', label: 'Thinkers', kinds: ['philosopher', 'school'] },
  { id: 'concepts', label: 'Concepts', kinds: ['concept'] },
  { id: 'arguments', label: 'Arguments', kinds: ['argument', 'debate'] },
]

const pop = {
  initial: { opacity: 0, y: -4, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -4, scale: 0.98 },
  transition: { duration: 0.14 },
}

export function GlobalSearch() {
  const g = useKnowledgeGraph()
  const navigate = useNavigate()
  const pushRecent = useOS((s) => s.pushRecent)
  const [q, setQ] = useState('')
  const [scope, setScope] = useState('all')
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  useClickOutside(wrap, useCallback(() => setOpen(false), []), open)

  const hits = useMemo(() => search(g, q, SCOPES.find((s) => s.id === scope)?.kinds, 18), [g, q, scope])
  const groups = useMemo(() => {
    const m = new Map<EntityKind, GraphNode[]>()
    for (const h of hits) m.set(h.node.kind, [...(m.get(h.node.kind) ?? []), h.node])
    return [...m.entries()]
  }, [hits])
  const flat = groups.flatMap(([, ns]) => ns)

  const close = () => {
    setOpen(false)
    setQ('')
    ;(document.activeElement as HTMLElement | null)?.blur()
  }
  const go = (n: GraphNode) => {
    pushRecent({ kind: n.kind, id: n.id })
    navigate(routeFor(n))
    close()
  }
  // The last row always offers to take the query to the open web.
  const webSearch = () => {
    navigate(`/app/browser?q=${encodeURIComponent(q.trim())}`)
    close()
  }
  const nav = useListNav(flat.length + 1, (i) => (i < flat.length ? go(flat[i]) : webSearch()), [q, scope])

  return (
    <div className="search" ref={wrap}>
      <div className="search-box">
        <Search aria-hidden />
        <input
          id="global-search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={nav.onKeyDown}
          placeholder="Search your desk…"
          aria-label="Global search"
          role="combobox"
          aria-expanded={open && !!q}
          aria-controls="search-results"
          autoComplete="off"
        />
        <div className="search-scope" role="group" aria-label="Search scope">
          {SCOPES.map((s) => (
            <button key={s.id} aria-pressed={scope === s.id} onClick={() => setScope(s.id)} tabIndex={-1}>
              {s.label}
            </button>
          ))}
        </div>
        <span className="kbd" aria-hidden>
          /
        </span>
      </div>
      <AnimatePresence>
        {open && q.trim() && (
          <motion.div {...pop} className="search-results glass" id="search-results" role="listbox">
            {flat.length === 0 && <div className="dim letter" style={{ padding: '12px 14px 4px' }}>Nothing on your desk matches “{q}”.</div>}
            {groups.map(([kind, nodes]) => (
              <div className="search-group" key={kind}>
                <div className="eyebrow">{KIND_LABEL[kind]}s</div>
                {nodes.map((n) => {
                  const i = flat.indexOf(n)
                  const parts = highlight(n.label, q)
                  return (
                    <button key={n.id} className={`result-row k-${n.kind}`} role="option" aria-selected={nav.index === i} onMouseEnter={() => nav.setIndex(i)} onClick={() => go(n)}>
                      <KindIcon kind={n.kind} />
                      <span className="r-text">
                        <span className="r-label">{parts.map((p, j) => (typeof p === 'string' ? p : <mark key={j}>{p.mark}</mark>))}</span>
                        <span className="r-sub">{n.kind === 'passage' ? n.summary : n.sublabel}</span>
                      </span>
                      <span className="r-kind">{KIND_LABEL[n.kind]}</span>
                    </button>
                  )
                })}
              </div>
            ))}
            <div className="search-group">
              <button className="result-row k-source" role="option" aria-selected={nav.index === flat.length} onMouseEnter={() => nav.setIndex(flat.length)} onClick={webSearch}>
                <Globe />
                <span className="r-text">
                  <span className="r-label">Research “{q.trim()}” on the web</span>
                  <span className="r-sub">Wikipedia, OpenAlex papers, Open Library books</span>
                </span>
                <span className="r-kind">Browser</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const NOTIF_ICON: Record<OSNotification['tone'], typeof Bell> = { debate: Swords, reading: BookOpen, system: Sparkles, ai: BrainCircuit }
const NOTIF_COLOR: Record<OSNotification['tone'], string> = { debate: 'var(--oxblood)', reading: 'var(--ochre-ink)', system: 'var(--slate)', ai: 'var(--verdigris)' }

function Notifications() {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  useClickOutside(wrap, useCallback(() => setOpen(false), []), open)
  const items = useOS((s) => s.notifications)
  const markAllRead = useOS((s) => s.markAllRead)
  const navigate = useNavigate()
  const unread = items.filter((n) => !n.read).length
  return (
    <div style={{ position: 'relative' }} ref={wrap}>
      <button className="icon-btn" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Bell />
        {unread > 0 && <span className="badge-dot" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div {...pop} className="popover glass" role="dialog" aria-label="Notifications">
            <div className="popover-head">
              <h4>Notifications</h4>
              <button className="btn ghost sm" onClick={markAllRead} disabled={!unread}>
                Mark all read
              </button>
            </div>
            <div style={{ maxHeight: 400, overflow: 'auto' }}>
              {items.length === 0 && <div className="dim" style={{ padding: 16 }}>All quiet.</div>}
              {items.map((n) => {
                const I = NOTIF_ICON[n.tone]
                return (
                  <div
                    key={n.id}
                    className={`notif ${n.read ? '' : 'unread'}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (n.href) navigate(n.href)
                      setOpen(false)
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && n.href && navigate(n.href)}
                  >
                    <I style={{ color: NOTIF_COLOR[n.tone] }} />
                    <div>
                      <div className="n-title">{n.title}</div>
                      <div className="n-body">{n.body}</div>
                      <div className="n-time">{timeAgo(n.at)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ProfileMenu() {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  useClickOutside(wrap, useCallback(() => setOpen(false), []), open)
  const name = useOS((s) => s.settings.name)
  const setShortcuts = useOS((s) => s.setShortcuts)
  const navigate = useNavigate()
  const go = (to: string) => {
    navigate(to)
    setOpen(false)
  }
  return (
    <div style={{ position: 'relative' }} ref={wrap}>
      <button className="icon-btn" style={{ width: 'auto', padding: '0 4px', gap: 6, display: 'flex' }} aria-label="Profile menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="avatar">{name.charAt(0).toUpperCase()}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div {...pop} className="popover glass" style={{ width: 260 }} role="menu">
            <div className="hstack" style={{ padding: 14, gap: 12, borderBottom: '1px solid var(--line-1)' }}>
              <span className="avatar lg">{name.charAt(0).toUpperCase()}</span>
              <div style={{ minWidth: 0 }}>
                <div className="t0" style={{ fontWeight: 500 }}>{name}</div>
                <div className="dim" style={{ fontSize: 'var(--fs-11)' }}>@{name.toLowerCase()} · LD · Policy · PF</div>
              </div>
            </div>
            <div className="menu-list">
              <button className="menu-item" role="menuitem" onClick={() => go('/app/debates/people/you')}>
                <User /> Public profile
              </button>
              <button className="menu-item" role="menuitem" onClick={() => go('/app/saved')}>
                <BookOpen /> Saved & reading
              </button>
              <button className="menu-item" role="menuitem" onClick={() => { setShortcuts(true); setOpen(false) }}>
                <Keyboard /> Keyboard shortcuts <span className="kbd">?</span>
              </button>
              <button className="menu-item" role="menuitem" onClick={() => go('/app/settings')}>
                <Settings /> Settings <span className="kbd">G ,</span>
              </button>
              <hr style={{ margin: '4px 0' }} />
              <button className="menu-item" role="menuitem" onClick={() => go('/')}>
                <LogOut /> Exit to landing page
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function TopBar() {
  const location = useLocation()
  const app = appForPath(location.pathname)
  const setMobileNav = useOS((s) => s.setMobileNav)
  const g = useKnowledgeGraph()
  const seg = location.pathname.split('/')[3]
  const entity = seg ? g.nodes.get(decodeURIComponent(seg)) : undefined
  const I = app.icon
  return (
    <header className="topbar">
      <button className="icon-btn menu-toggle" aria-label="Open navigation" onClick={() => setMobileNav(true)}>
        <Menu />
      </button>
      <div className="crumbs" aria-label="Breadcrumb">
        <I style={{ color: app.accent }} aria-hidden />
        <span className={entity ? '' : 'cur'}>{app.label}</span>
        {entity && (
          <>
            <ChevronRight className="sep" aria-hidden />
            <span className="cur truncate" style={{ maxWidth: 220 }}>{entity.label}</span>
          </>
        )}
      </div>
      <GlobalSearch />
      <div className="topbar-right">
        <Notifications />
        <ProfileMenu />
      </div>
    </header>
  )
}
