import { Link } from 'react-router'

export function NotFound({ what = 'page' }: { what?: string }) {
  return (
    <div className="page" style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', display: 'grid', gap: 14, justifyItems: 'center', maxWidth: 440 }}>
        <div className="display" style={{ fontSize: 72 }}>
          404<span className="spot">:</span>
        </div>
        <p className="muted">We couldn’t find that {what}. It may have been renamed or removed.</p>
        <div className="hstack">
          <Link to="/" className="btn primary">Home</Link>
          <Link to="/rankings" className="btn">Rankings</Link>
        </div>
      </div>
    </div>
  )
}
