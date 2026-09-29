/** Debate Utils: all of Yohaan's debate utilities. The mark is a "du" monogram. */
export function Logo({ size = 22, mark = false }: { size?: number; mark?: boolean }) {
  if (mark) return <BrandMark size={size} />
  return (
    <span className="logo" style={{ fontSize: size }} aria-label="Debate Utils">
      <BrandMark size={Math.round(size * 1.15)} />
      <span aria-hidden>
        Debate<span className="logo-accent">Utils</span>
      </span>
    </span>
  )
}

export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="brand-mark">
      <rect width="32" height="32" rx="8" fill="var(--ink)" />
      <text x="16" y="22.6" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="850" fontSize="19.5" letterSpacing="-0.6" fill="#fff">
        d<tspan fill="var(--accent-on-ink, #8f98ff)">u</tspan>
      </text>
    </svg>
  )
}
