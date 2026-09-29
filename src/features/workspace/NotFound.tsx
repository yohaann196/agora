import { Compass } from 'lucide-react'
import { Link } from 'react-router'

export function NotFound() {
  return (
    <div className="page" style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', display: 'grid', gap: 14, justifyItems: 'center', maxWidth: 440 }}>
        <Compass size={28} style={{ color: 'var(--text-3)' }} />
        <p className="quote" style={{ fontSize: 26 }}>This path leads nowhere — yet.</p>
        <p className="dim">The page you were looking for isn’t on the knowledge graph. Perhaps it was an idea you haven’t had.</p>
        <div className="hstack">
          <Link to="/app" className="btn primary">Return home</Link>
          <button className="btn" onClick={() => document.getElementById('global-search')?.focus()}>Search</button>
        </div>
      </div>
    </div>
  )
}
