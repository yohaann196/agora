import { AnimatePresence, motion } from 'framer-motion'
import {
  AppWindow,
  BrainCircuit,
  CornerDownLeft,
  Keyboard,
  NotebookPen,
  Palette,
  PenLine,
  Search,
  Sparkles,
  Swords,
  Waypoints,
  type LucideIcon,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { MODE_META } from '../../ai/socratic'
import { APPS } from '../../lib/apps'
import { useListNav } from '../../lib/hooks'
import { KIND_LABEL, routeFor, search } from '../../model/graph'
import { useOS, type Accent, type SocraticMode } from '../../store'
import { useKnowledgeGraph } from '../../store/graph'
import { KindIcon } from '../ui/primitives'

interface Cmd {
  id: string
  section: string
  label: string
  hint?: ReactNode
  icon: ReactNode
  keywords?: string
  run: () => void
}

const icon = (I: LucideIcon, color?: string) => <I style={color ? { color } : undefined} />

export function CommandPalette() {
  const open = useOS((s) => s.paletteOpen)
  return <AnimatePresence>{open && <PaletteInner />}</AnimatePresence>
}

function PaletteInner() {
  const s = useOS()
  const g = useKnowledgeGraph()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const close = () => s.setPalette(false)
  const go = (to: string) => {
    navigate(to)
    close()
  }

  const commands = useMemo<Cmd[]>(() => {
    const list: Cmd[] = []
    list.push(
      { id: 'new-arg', section: 'Create', label: 'New argument', hint: 'Argument Builder', icon: icon(Waypoints, 'var(--blue)'), keywords: 'create build', run: () => go(`/app/arguments/${s.createArgument()}`) },
      {
        id: 'new-note', section: 'Create', label: 'New note in a window', hint: <span className="kbd">N</span>, icon: icon(NotebookPen, 'var(--k-note)'), keywords: 'create write',
        run: () => {
          const id = s.createNote({ title: 'Scratch note' })
          s.openWindow('note', { kind: 'note', id })
          close()
        },
      },
      { id: 'new-essay', section: 'Create', label: 'New essay draft', hint: 'Essay Studio', icon: icon(PenLine, 'var(--amber)'), keywords: 'create write', run: () => go(`/app/essays/${s.createEssay()}`) },
      { id: 'new-thesis', section: 'Create', label: 'Publish a thesis to the Debate Network', icon: icon(Swords, 'var(--rose)'), keywords: 'debate publish', run: () => go('/app/debates?compose=1') },
      { id: 'socratic-win', section: 'Windows', label: 'Open Socratic AI in a floating window', icon: icon(AppWindow, 'var(--green)'), keywords: 'chat window', run: () => { s.openWindow('socratic'); close() } },
      { id: 'shortcuts', section: 'System', label: 'Keyboard shortcuts', hint: <span className="kbd">?</span>, icon: icon(Keyboard), run: () => s.setShortcuts(true) },
      { id: 'launch', section: 'System', label: 'Quick launch', hint: <span className="kbd">⌘J</span>, icon: icon(Sparkles), run: () => s.setQuickLaunch(true) },
      { id: 'motion', section: 'System', label: s.settings.reduceMotion ? 'Enable animations' : 'Reduce motion', icon: icon(Sparkles), run: () => { s.updateSettings({ reduceMotion: !s.settings.reduceMotion }); close() } },
    )
    for (const a of ['blue', 'violet', 'cyan', 'green', 'orange'] as Accent[]) {
      list.push({ id: `accent-${a}`, section: 'System', label: `Accent: ${a}`, icon: icon(Palette, `var(--${a})`), keywords: 'theme color', run: () => { s.updateSettings({ accent: a }); close() } })
    }
    for (const m of Object.keys(MODE_META) as SocraticMode[]) {
      list.push({
        id: `mode-${m}`, section: 'Socratic AI', label: `Socratic AI · ${MODE_META[m].label}`, hint: MODE_META[m].short, icon: icon(BrainCircuit, 'var(--green)'),
        run: () => { s.setSocraticMode(m); go('/app/socratic') },
      })
    }
    for (const a of APPS) {
      list.push({ id: `go-${a.id}`, section: 'Go to', label: a.label, hint: <span className="kbd">G {a.chord.toUpperCase()}</span>, icon: icon(a.icon, a.accent), keywords: a.description, run: () => go(a.path) })
    }
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.settings.reduceMotion])

  const results = useMemo(() => {
    const t = q.trim().toLowerCase()
    const cmds = t ? commands.filter((c) => (c.label + ' ' + (c.keywords ?? '') + ' ' + c.section).toLowerCase().includes(t)) : commands
    const out: Cmd[] = []
    if (t) {
      out.push({
        id: 'ask', section: 'Ask', label: `Ask Socratic AI: “${q.trim()}”`, icon: icon(BrainCircuit, 'var(--green)'),
        run: () => go(`/app/socratic?q=${encodeURIComponent(q.trim())}`),
      })
      for (const h of search(g, q, undefined, 8)) {
        out.push({
          id: `e-${h.node.id}`, section: 'Knowledge graph', label: h.node.label, hint: KIND_LABEL[h.node.kind], icon: <KindIcon kind={h.node.kind} />,
          run: () => { s.pushRecent({ kind: h.node.kind, id: h.node.id }); go(routeFor(h.node)) },
        })
      }
      out.push({ id: 'search-texts', section: 'Ask', label: `Search texts for “${q.trim()}”`, icon: icon(Search, 'var(--orange)'), run: () => go(`/app/explorer?q=${encodeURIComponent(q.trim())}`) })
    } else {
      for (const r of s.recents.slice(0, 5)) {
        const n = g.nodes.get(r.id)
        if (n) out.push({ id: `r-${n.id}`, section: 'Recent', label: n.label, hint: KIND_LABEL[n.kind], icon: <KindIcon kind={n.kind} />, run: () => go(routeFor(n)) })
      }
    }
    return [...out, ...cmds].slice(0, 60)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, commands, g])

  const nav = useListNav(results.length, (i) => results[i]?.run(), [q])
  let lastSection = ''

  return (
    <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <motion.div
        className="palette glass"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.98 }}
        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="palette-input">
          <Search aria-hidden />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') close()
              nav.onKeyDown(e)
            }}
            placeholder="Type a command, search the graph, or ask a question…"
            aria-label="Command"
            aria-activedescendant={results[nav.index] ? `cmd-${results[nav.index].id}` : undefined}
          />
          <span className="kbd">esc</span>
        </div>
        <div className="palette-list" role="listbox">
          {results.map((c, i) => {
            const header = c.section !== lastSection
            lastSection = c.section
            return (
              <div key={c.id}>
                {header && <div className="eyebrow" style={{ padding: '10px 12px 4px' }}>{c.section}</div>}
                <button
                  id={`cmd-${c.id}`}
                  className="p-row"
                  role="option"
                  aria-selected={nav.index === i}
                  onMouseMove={() => nav.index !== i && nav.setIndex(i)}
                  onClick={() => c.run()}
                  ref={(el) => {
                    if (el && nav.index === i) el.scrollIntoView({ block: 'nearest' })
                  }}
                >
                  <span className="p-icon">{c.icon}</span>
                  <span className="truncate">{c.label}</span>
                  <span className="p-hint">{c.hint}</span>
                </button>
              </div>
            )
          })}
        </div>
        <div className="palette-foot">
          <span><span className="kbd">↑</span><span className="kbd">↓</span> navigate</span>
          <span><span className="kbd"><CornerDownLeft size={10} /></span> run</span>
          <span><span className="kbd">⌥</span> click any link to open it in a window</span>
        </div>
      </motion.div>
    </motion.div>
  )
}
