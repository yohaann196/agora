/** "Resolved:" — the word every resolution starts with. The colon is the mark. */
export function Logo({ size = 22, mark = false }: { size?: number; mark?: boolean }) {
  if (mark) return <ColonMark size={size} />
  return (
    <span className="logo" style={{ fontSize: size }} aria-label="Resolved">
      Resolved<span className="logo-colon" aria-hidden>:</span>
    </span>
  )
}

export function ColonMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="colon-mark">
      <rect width="32" height="32" rx="8" fill="var(--ink)" />
      <circle cx="16" cy="10.5" r="3.6" fill="var(--accent)" />
      <circle cx="16" cy="21.5" r="3.6" fill="#fff" />
    </svg>
  )
}
