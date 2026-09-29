import { AnimatePresence, motion } from 'framer-motion'
import {
  AppWindow,
  BrainCircuit,
  CornerDownLeft,
  FileText,
  Globe,
  Keyboard,
  NotebookPen,
  Palette,
  PenLine,
  Search,
  Sparkles,
  Swords,
  TableProperties,
  Timer,
  Waypoints,
  type LucideIcon,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { MODE_META } from '../../ai/socratic'
import { ACCENT_INK, ACCENT_NAME, APPS } from '../../lib/apps'
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
      { id: 'new-speech', section: 'Create', label: 'New speech doc', hint: 'Speech Docs', icon: icon(FileText, 'var(--oxblood)'), keywords: 'create verbatim case aff neg', run: () => go(`/app/docs/${s.createDoc('speech')}`) },
      { id: 'new-file', section: 'Create', label: 'New research file', hint: 'Speech Docs', icon: icon(FileText, 'var(--slate)'), keywords: 'create frontlines blocks', run: () => go(`/app/docs/${s.createDoc('file')}`) },
      { id: 'new-flow-ld', section: 'Create', label: 'New LD flow', hint: 'Flow & Timer', icon: icon(TableProperties, 'var(--slate)'), keywords: 'create round lincoln douglas', run: () => go(`/app/flow/${s.createFlow('ld')}`) },
      { id: 'new-flow-policy', section: 'Create', label: 'New Policy flow', hint: 'Flow & Timer', icon: icon(TableProperties, 'var(--slate)'), keywords: 'create round cx', run: () => go(`/app/flow/${s.createFlow('policy')}`) },
      { id: 'new-flow-pf', section: 'Create', label: 'New Public Forum flow', hint: 'Flow & Timer', icon: icon(TableProperties, 'var(--slate)'), keywords: 'create round pf', run: () => go(`/app/flow/${s.createFlow('pf')}`) },
      { id: 'timer', section: 'Round', label: 'Open the round timer', hint: 'Flow & Timer', icon: icon(Timer, 'var(--oxblood)'), keywords: 'prep speech clock', run: () => go('/app/flow') },
      { id: 'new-tab', section: 'Research', label: 'New browser tab', hint: <span className="kbd">⌘T</span>, icon: icon(Globe, 'var(--k-source)'), keywords: 'web search browse', run: () => { s.openTab('agora:new', 'New tab'); go('/app/browser') } },
      { id: 'new-arg', section: 'Create', label: 'New argument', hint: 'Argument Builder', icon: icon(Waypoints, 'var(--slate)'), keywords: 'create build', run: () => go(`/app/arguments/${s.createArgument()}`) },
      {
        id: 'new-note', section: 'Create', label: 'New note in a window', hint: <span className="kbd">N</span>, icon: icon(NotebookPen, 'var(--k-note)'), keywords: 'create write',
        run: () => {
          const id = s.createNote({ title: 'Scratch note' })
          s.openWindow('note', { kind: 'note', id })
          close()
        },
      },
      { id: 'new-essay', section: 'Create', label: 'New essay draft', hint: 'Essay Studio', icon: icon(PenLine, 'var(--olive)'), keywords: 'create write', run: () => go(`/app/essays/${s.createEssay()}`) },
      { id: 'new-thesis', section: 'Create', label: 'Publish a thesis to the Debate Network', icon: icon(Swords, 'var(--oxblood)'), keywords: 'debate publish', run: () => go('/app/debates?compose=1') },
      { id: 'socratic-win', section: 'Windows', label: 'Open the Socratic Coach in a floating window', icon: icon(AppWindow, 'var(--oxblood)'), keywords: 'chat window ai', run: () => { s.openWindow('socratic'); close() } },
      { id: 'shortcuts', section: 'System', label: 'Keyboard shortcuts', hint: <span className="kbd">?</span>, icon: icon(Keyboard), run: () => s.setShortcuts(true) },
      { id: 'launch', section: 'System', label: 'Quick launch', hint: <span className="kbd">⌘J</span>, icon: icon(Sparkles), run: () => s.setQuickLaunch(true) },
      { id: 'motion', section: 'System', label: s.settings.reduceMotion ? 'Enable animations' : 'Reduce motion', icon: icon(Sparkles), run: () => { s.updateSettings({ reduceMotion: !s.settings.reduceMotion }); close() } },
    )
    for (const a of Object.keys(ACCENT_NAME) as Accent[]) {
      list.push({ id: `accent-${a}`, section: 'System', label: `Spot ink: ${ACCENT_NAME[a]}`, icon: icon(Palette, ACCENT_INK[a]), keywords: 'theme color accent', run: () => { s.updateSettings({ accent: a }); close() } })
    }
    for (const m of Object.keys(MODE_META) as SocraticMode[]) {
      list.push({
        id: `mode-${m}`, section: 'Socratic Coach', label: `Socratic Coach · ${MODE_META[m].label}`, hint: MODE_META[m].short, icon: icon(BrainCircuit, 'var(--oxblood)'),
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
      const ask: Cmd[] = [
        { id: 'web', section: 'Ask', label: `Research “${q.trim()}” in the browser`, icon: icon(Globe, 'var(--k-source)'), run: () => go(`/app/browser?q=${encodeURIComponent(q.trim())}`) },
        { id: 'ask', section: 'Ask', label: `Ask the Socratic Coach: “${q.trim()}”`, icon: icon(BrainCircuit, 'var(--oxblood)'), run: () => go(`/app/socratic?q=${encodeURIComponent(q.trim())}`) },
      ]
      for (const h of search(g, q, undefined, 8)) {
        out.push({
          id: `e-${h.node.id}`, section: 'On your desk', label: h.node.label, hint: KIND_LABEL[h.node.kind], icon: <KindIcon kind={h.node.kind} />,
          run: () => { s.pushRecent({ kind: h.node.kind, id: h.node.id }); go(routeFor(h.node)) },
        })
      }
      ask.push({ id: 'search-texts', section: 'Ask', label: `Search verified passages for “${q.trim()}”`, icon: icon(Search, 'var(--ochre-ink)'), run: () => go(`/app/explorer?q=${encodeURIComponent(q.trim())}`) })
      // Exact command matches first, then things on your desk, then open-ended asks.
      return [...cmds, ...out, ...ask].slice(0, 60)
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
            placeholder="Type a command, find evidence, or ask a question…"
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
