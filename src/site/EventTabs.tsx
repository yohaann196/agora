/** Events Resolved ranks. LD is live; the rest are on the way. */
export const EVENTS = [
  { key: 'ld', label: 'Lincoln–Douglas', short: 'LD', live: true },
  { key: 'pf', label: 'Public Forum', short: 'PF', live: false },
  { key: 'cx', label: 'Policy', short: 'Policy', live: false },
  { key: 'parli', label: 'Parliamentary', short: 'Parli', live: false },
  { key: 'bq', label: 'Big Questions', short: 'BQ', live: false },
  { key: 'congress', label: 'Congress', short: 'Congress', live: false },
] as const

export function EventTabs({ dark = false }: { dark?: boolean }) {
  return (
    <div className={`event-tabs ${dark ? 'dark' : ''}`} role="list" aria-label="Events">
      {EVENTS.map((e) => (
        <span key={e.key} role="listitem" className={`event-tab ${e.live ? 'live' : 'soon'}`} title={e.live ? `${e.label} rankings` : `${e.label} rankings are coming soon`}>
          {e.short}
          {!e.live && <em>Soon</em>}
        </span>
      ))}
    </div>
  )
}
