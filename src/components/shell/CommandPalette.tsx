import { AnimatePresence, motion } from 'framer-motion'
import { CornerDownLeft, FileStack, FileText, Globe, Keyboard, School, Search, Shield, TableProperties, Timer, Trophy, UserRound, type LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { APPS } from '../../lib/apps'
import { useListNav } from '../../lib/hooks'
import { useSearch, type HitKind } from '../../lib/search'
import { useOS } from '../../store'
import { panelMotion } from './Overlays'

interface Cmd {
  id: string
  section: string
  label: string
  hint?: ReactNode
  icon: LucideIcon
  keywords?: string
  run: () => void
}

const HIT_ICON: Record<HitKind, LucideIcon> = { debater: UserRound, school: School, doc: FileText, flow: TableProperties }
const HIT_SECTION: Record<HitKind, string> = { debater: 'Debaters', school: 'Schools', doc: 'Your files', flow: 'Your flows' }

/** ⌘K anywhere: search debaters, schools and your files, or run a command. */
export function useGlobalPaletteKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useOS.getState()
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        s.setPalette(!s.paletteOpen)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

export function CommandPalette() {
  const open = useOS((s) => s.paletteOpen)
  return <AnimatePresence>{open && <PaletteInner />}</AnimatePresence>
}

function PaletteInner() {
  const s = useOS.getState()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const hits = useSearch(q, 10)
  const close = () => s.setPalette(false)
  const go = (to: string) => {
    navigate(to)
    close()
  }

  const commands = useMemo<Cmd[]>(
    () => [
      { id: 'new-contention', section: 'Create', label: 'New contention', icon: FileStack, keywords: 'case aff neg vault', run: () => go(`/app/vaults/${s.createDoc('contention')}`) },
      { id: 'new-block', section: 'Create', label: 'New block', icon: Shield, keywords: 'frontline vault', run: () => go(`/app/vaults/${s.createDoc('block')}`) },
      { id: 'new-speech', section: 'Create', label: 'New speech doc', icon: FileText, keywords: 'verbatim', run: () => go(`/app/vaults/${s.createDoc('speech')}`) },
      { id: 'new-flow', section: 'Create', label: 'New LD flow', icon: TableProperties, keywords: 'round lincoln douglas', run: () => go(`/app/flow/${s.createFlow('ld')}`) },
      { id: 'new-flow-pf', section: 'Create', label: 'New PF flow', icon: TableProperties, keywords: 'round public forum', run: () => go(`/app/flow/${s.createFlow('pf')}`) },
      { id: 'new-flow-cx', section: 'Create', label: 'New Policy flow', icon: TableProperties, keywords: 'round cx', run: () => go(`/app/flow/${s.createFlow('policy')}`) },
      { id: 'timer', section: 'Round', label: 'Open the round timer', icon: Timer, keywords: 'prep speech clock', run: () => go('/app/flow') },
      { id: 'rankings', section: 'Compete', label: 'LD rankings', icon: Trophy, run: () => go('/rankings') },
      { id: 'shortcuts', section: 'Help', label: 'Keyboard shortcuts', hint: <span className="kbd">?</span>, icon: Keyboard, run: () => s.setShortcuts(true) },
      ...APPS.map((a) => ({ id: `go-${a.id}`, section: 'Go to', label: a.label, hint: <span className="kbd">G {a.chord.toUpperCase()}</span>, icon: a.icon, keywords: a.description, run: () => go(a.path) })),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const results: Cmd[] = useMemo(() => {
    const t = q.trim().toLowerCase()
    const cmds = t ? commands.filter((c) => `${c.label} ${c.keywords ?? ''} ${c.section}`.toLowerCase().includes(t)) : commands
    const found: Cmd[] = hits.map((h) => ({ id: `${h.kind}-${h.id}`, section: HIT_SECTION[h.kind], label: h.label, hint: h.sub, icon: HIT_ICON[h.kind], run: () => go(h.to) }))
    const research: Cmd[] = t ? [{ id: 'research', section: 'Research', label: `Search sources for “${q.trim()}”`, icon: Globe, run: () => go(`/app/evidence?q=${encodeURIComponent(q.trim())}`) }] : []
    // Group by section so headers appear once.
    const ordered = [...found, ...cmds, ...research]
    const sections = [...new Set(ordered.map((c) => c.section))]
    return sections.flatMap((sec) => ordered.filter((c) => c.section === sec)).slice(0, 40)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, hits, commands])

  const nav = useListNav(results.length, (i) => results[i]?.run(), [q])
  let lastSection = ''

  return (
    <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <motion.div className="palette" role="dialog" aria-modal="true" aria-label="Search and commands" {...panelMotion}>
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
            placeholder="Search debaters, schools, your prep…"
            aria-label="Search and commands"
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
                {header && <div className="eyebrow palette-sec">{c.section}</div>}
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
                  <c.icon className="p-icon" />
                  <span className="truncate">{c.label}</span>
                  <span className="p-hint">{c.hint}</span>
                </button>
              </div>
            )
          })}
          {!results.length && <div className="empty">Nothing matches “{q}”.</div>}
        </div>
        <div className="palette-foot">
          <span><span className="kbd">↑</span><span className="kbd">↓</span> navigate</span>
          <span><span className="kbd"><CornerDownLeft size={10} /></span> open</span>
        </div>
      </motion.div>
    </motion.div>
  )
}
