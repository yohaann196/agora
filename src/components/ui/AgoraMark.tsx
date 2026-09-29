/** The Agora medallion: an Ionic column stamped in a ring, with an oxblood seal. */
export function AgoraMark({ size = 30, className = '' }: { size?: number; className?: string }) {
  return (
    <svg className={`agora-mark ${className}`} width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <circle cx="16" cy="16" r="14" fill="var(--paper-hi)" stroke="var(--ink)" strokeWidth="2" />
      <circle cx="16" cy="16" r="11.2" fill="none" stroke="var(--ink)" strokeWidth="0.8" strokeDasharray="1.2 1.4" />
      <path
        d="M9.5 10.5h13M10.5 12.2c0-1.4 1.1-1.7 1.9-1.1M21.5 12.2c0-1.4-1.1-1.7-1.9-1.1M12.5 12.6v8.8M15 12.6v8.8M17 12.6v8.8M19.5 12.6v8.8M10.5 22h11M9.5 23.8h13"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="25.4" cy="8.2" r="2.3" fill="var(--oxblood)" stroke="var(--ink)" strokeWidth="0.8" />
    </svg>
  )
}
