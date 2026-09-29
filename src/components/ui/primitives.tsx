import { ArrowDown, ArrowUp, Minus, Quote, ScrollText, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

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

type SourceType = 'quotation' | 'summary'
const SOURCE: Record<SourceType, { label: string; hint: string; icon: LucideIcon }> = {
  quotation: { label: 'Direct quotation', hint: 'Verbatim from the named translation.', icon: Quote },
  summary: { label: 'Summary', hint: 'A summary of what the text says, not verbatim.', icon: ScrollText },
}

export function SourceBadge({ type, label }: { type: SourceType; label?: string }) {
  const s = SOURCE[type]
  return (
    <span className={`src ${type}`} title={s.hint}>
      <s.icon aria-hidden />
      {label ?? s.label}
    </span>
  )
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

/** Movement since the previous tournament: ▲3, ▼2, new, or no change. */
export function RankChange({ rank, prev }: { rank: number; prev: number | null }) {
  if (prev === null) return <span className="rk-change new" title="Newly ranked">New</span>
  const d = prev - rank
  if (d === 0) return <span className="rk-change same" aria-label="No change"><Minus size={11} /></span>
  const Up = d > 0
  return (
    <span className={`rk-change ${Up ? 'up' : 'down'}`} aria-label={`${Up ? 'Up' : 'Down'} ${Math.abs(d)} since the last tournament`}>
      {Up ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
      {Math.abs(d)}
    </span>
  )
}

export const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v)}%`)

export function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

/** A lettered avatar tinted from the name, so profiles are recognisable without photos. */
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360
  return (
    <span className="avatar" aria-hidden style={{ width: size, height: size, fontSize: size * 0.38, ['--h' as string]: h }}>
      {initials(name)}
    </span>
  )
}
