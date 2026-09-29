import { useId, useMemo, useState } from 'react'

/** A tiny line of recent ratings. Decorative: the numbers sit next to it. */
export function Sparkline({ values, width = 84, height = 24 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return <svg width={width} height={height} aria-hidden />
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => [(i / (values.length - 1)) * (width - 4) + 2, height - 3 - ((v - min) / span) * (height - 6)])
  const up = values[values.length - 1] >= values[0]
  return (
    <svg width={width} height={height} aria-hidden className="sparkline">
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={up ? 'var(--up)' : 'var(--down)'} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.2" fill={up ? 'var(--up)' : 'var(--down)'} />
    </svg>
  )
}

export interface RatingPoint {
  rating: number
  rd: number
  label: string
  group: string
  won: boolean
}

/**
 * Rating after every round, with the ±2 deviation band the ranking score is built on.
 * Tournaments are marked along the bottom.
 */
export function RatingChart({ points, height = 240 }: { points: RatingPoint[]; height?: number }) {
  const id = useId()
  const [hover, setHover] = useState<number | null>(null)
  const W = 720
  const H = height
  const pad = { l: 44, r: 12, t: 12, b: 34 }
  const all = [1500, ...points.flatMap((p) => [p.rating - 2 * p.rd, p.rating + 2 * p.rd])]
  const lo = Math.floor(Math.min(...all) / 100) * 100
  const hi = Math.ceil(Math.max(...all) / 100) * 100
  const series = [{ rating: 1500, rd: 350, label: 'Start', group: '', won: true }, ...points]
  const x = (i: number) => pad.l + (i / Math.max(1, series.length - 1)) * (W - pad.l - pad.r)
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b)
  const ticks = useMemo(() => {
    const step = (hi - lo) / 100 > 8 ? 400 : (hi - lo) / 100 > 4 ? 200 : 100
    const out: number[] = []
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(v)
    return out
  }, [lo, hi])
  const line = series.map((p, i) => `${x(i)},${y(p.rating)}`).join(' ')
  const band = [...series.map((p, i) => `${x(i)},${y(Math.min(hi, p.rating + 2 * p.rd))}`), ...series.map((p, i) => `${x(i)},${y(Math.max(lo, p.rating - 2 * p.rd))}`).reverse()].join(' ')
  // First round index of each tournament, for the axis.
  const groups: { i: number; label: string }[] = []
  series.forEach((p, i) => {
    if (i > 0 && p.group !== series[i - 1].group) groups.push({ i, label: p.group })
  })
  const h = hover === null ? null : series[hover]
  return (
    <div className="rating-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Rating over ${points.length} rounds, from 1500 to ${Math.round(series[series.length - 1].rating)}`} onMouseLeave={() => setHover(null)}>
        <defs>
          <clipPath id={`clip${id}`}>
            <rect x={pad.l} y={pad.t} width={W - pad.l - pad.r} height={H - pad.t - pad.b} />
          </clipPath>
        </defs>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--line-1)" />
            <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--text-3)">{v}</text>
          </g>
        ))}
        {groups.map((g) => (
          <g key={g.i}>
            <line x1={x(g.i) - 0.5} x2={x(g.i) - 0.5} y1={pad.t} y2={H - pad.b} stroke="var(--line-2)" strokeDasharray="3 3" />
            <text x={x(g.i) + 3} y={H - pad.b + 16} fontSize="10.5" fill="var(--text-2)">{g.label.length > 18 ? g.label.slice(0, 17) + '…' : g.label}</text>
          </g>
        ))}
        <g clipPath={`url(#clip${id})`}>
          <polygon points={band} fill="var(--accent)" opacity="0.1" />
          <polyline points={line} fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinejoin="round" />
        </g>
        {series.map((p, i) => (
          <g key={i}>
            {i > 0 && <circle cx={x(i)} cy={y(p.rating)} r={hover === i ? 4.5 : 2.6} fill={p.won ? 'var(--accent)' : 'var(--paper-hi)'} stroke="var(--accent)" strokeWidth="1.5" />}
            <rect x={x(i) - (W - pad.l - pad.r) / series.length / 2} y={pad.t} width={(W - pad.l - pad.r) / series.length} height={H - pad.t - pad.b} fill="transparent" onMouseEnter={() => setHover(i)} />
          </g>
        ))}
      </svg>
      <div className="rc-readout" aria-live="polite">
        {h ? (
          <>
            <b>{Math.round(h.rating)}</b> <span className="dim">±{Math.round(2 * h.rd)}</span> · {h.label}
            {hover ? <span className={h.won ? 'won' : 'lost'}>{h.won ? 'Won' : 'Lost'}</span> : null}
          </>
        ) : (
          <span className="dim">Hover the line for each round. Filled dots are wins; the band is ±2 deviations.</span>
        )}
      </div>
    </div>
  )
}
