import {
  BookOpen,
  Bookmark,
  BookmarkCheck,
  FileText,
  Landmark,
  NotebookPen,
  Orbit,
  PenLine,
  Quote,
  ScrollText,
  Sparkles,
  Swords,
  User,
  Waypoints,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { philosopherById } from '../../data/philosophers'
import type { EntityKind, EntityRef, SourceType } from '../../model/types'
import { useOS } from '../../store'

export const KIND_ICON: Record<EntityKind | 'custom', LucideIcon> = {
  philosopher: User,
  concept: Orbit,
  school: Landmark,
  text: BookOpen,
  passage: Quote,
  argument: Waypoints,
  debate: Swords,
  essay: PenLine,
  note: NotebookPen,
  user: User,
  custom: Sparkles,
}

export function KindIcon({ kind, size = 14 }: { kind: EntityKind | 'custom'; size?: number }) {
  const I = KIND_ICON[kind] ?? FileText
  return <I width={size} height={size} className={`k-${kind}`} style={{ color: 'var(--tag)' }} aria-hidden />
}

export function PageHeader({
  eyebrow,
  title,
  lede,
  actions,
  children,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  lede?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <header className="page-header">
      <div className="titles">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {lede && <p className="lede">{lede}</p>}
        {children}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </header>
  )
}

const SOURCE_LABEL: Record<SourceType, string> = {
  quotation: 'Direct quotation',
  summary: 'Summary',
  interpretation: 'AI interpretation',
}
const SOURCE_ICON: Record<SourceType, LucideIcon> = {
  quotation: Quote,
  summary: ScrollText,
  interpretation: Sparkles,
}

export function SourceBadge({ type, label }: { type: SourceType; label?: string }) {
  const I = SOURCE_ICON[type]
  return (
    <span className={`src ${type}`} title={SOURCE_HINT[type]}>
      <I aria-hidden />
      {label ?? SOURCE_LABEL[type]}
    </span>
  )
}
const SOURCE_HINT: Record<SourceType, string> = {
  quotation: 'Verbatim from the named translation.',
  summary: 'A summary of what the text says — not verbatim.',
  interpretation: 'A reconstruction or reading that goes beyond the text.',
}

export function SaveButton({ refItem, size = 'sm', label }: { refItem: EntityRef; size?: 'sm' | 'md'; label?: boolean }) {
  const saved = useOS((s) => s.saved.some((r) => r.id === refItem.id))
  const toggle = useOS((s) => s.toggleSaved)
  const I = saved ? BookmarkCheck : Bookmark
  return (
    <button
      className={`btn ${label ? '' : 'icon'} ${size === 'sm' ? 'sm' : ''} ${saved ? '' : 'ghost'}`}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from saved' : 'Save'}
      title={saved ? 'Saved' : 'Save to workspace'}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggle(refItem)
      }}
      style={saved ? { color: 'var(--amber)' } : undefined}
    >
      <I />
      {label && (saved ? 'Saved' : 'Save')}
    </button>
  )
}

const ERA_HUE: Record<string, string> = {
  Ancient: 'var(--amber)',
  Medieval: 'var(--orange)',
  'Early Modern': 'var(--cyan)',
  Modern: 'var(--violet)',
  Contemporary: 'var(--blue)',
}

/** A typographic portrait: monogram in a hairline medallion, tinted by era. */
export function Monogram({ id, size = 44 }: { id: string; size?: number }) {
  const p = philosopherById[id]
  if (!p) return null
  const hue = ERA_HUE[p.era]
  return (
    <span
      className="monogram"
      aria-hidden
      style={{
        width: size,
        height: size,
        ['--hue' as string]: hue,
        fontSize: size * (p.monogram.length > 1 ? 0.36 : 0.46),
      }}
    >
      {p.monogram}
    </span>
  )
}

export function eraColor(era: string) {
  return ERA_HUE[era] ?? 'var(--text-2)'
}

export function timeAgo(ts: number) {
  const s = Math.round((Date.now() - ts) / 1000)
  if (s < 45) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="stat">
      <div className="stat-v">{value}</div>
      <div className="stat-l">{label}</div>
    </div>
  )
}

