import { ArrowRight, BookOpenCheck, CalendarClock, Check, Newspaper } from 'lucide-react'
import { Link } from 'react-router'
import { briefs, currentBrief, type Brief } from '../data/briefs'
import './briefs.css'

export function BriefCover({ b, big = false }: { b: Brief; big?: boolean }) {
  const inner = (
    <>
      <div className="bc-top">
        <span className="bc-issue">No. {b.issue}</span>
        <span className="bc-month">{b.month}</span>
      </div>
      <div className="bc-title">{b.title}</div>
      <p className="bc-dek">{b.dek}</p>
      <div className="bc-foot">
        <span className="tag">{b.event}</span>
        {b.status === 'published' ? <span className="dim">{b.readMinutes} min read</span> : <span className="tag gold"><CalendarClock size={12} /> Coming soon</span>}
        {b.status === 'published' && <ArrowRight size={16} className="bc-arrow" />}
      </div>
    </>
  )
  if (b.status !== 'published') return <div className={`brief-cover upcoming ${big ? 'big' : ''}`}>{inner}</div>
  return (
    <Link to={`/briefs/${b.id}`} className={`brief-cover ${big ? 'big' : ''}`}>
      {inner}
    </Link>
  )
}

export function BriefsPage() {
  const archive = briefs.filter((b) => b.id !== currentBrief.id)
  return (
    <div className="wrap briefs">
      <header className="pg-head briefs-head">
        <div className="eyebrow"><Newspaper size={13} style={{ display: 'inline', verticalAlign: -2 }} /> Debate Utils Monthly Briefs</div>
        <h1 className="pg-title">Know the topic before your first round.</h1>
        <p className="pg-lede">Every month, a brief on the current LD resolution: what it actually asks, the burdens, the strongest ground on both sides, the frameworks that fit, and a reading list you can cut from. Once the season starts, each issue adds what the results say is winning.</p>
      </header>

      <div className="briefs-hero">
        <BriefCover b={currentBrief} big />
        <aside className="card briefs-what">
          <h2><BookOpenCheck size={18} /> In every issue</h2>
          <ul>
            {['Plain-language breakdown of the resolution and its burdens', 'Key terms and the definitions debates turn on', 'Aff and neg arguments with their best answers', 'Frameworks that fit, and how each side uses them', 'Reading list of real, citable sources', 'What’s winning, from real round results'].map((t) => (
              <li key={t}><Check size={15} /> {t}</li>
            ))}
          </ul>
          <p className="dim">Free during the beta. New issues appear here and on your Debate Utils dashboard.</p>
        </aside>
      </div>

      <h2 className="briefs-sub">All issues</h2>
      <div className="briefs-grid">
        {archive.map((b) => (
          <BriefCover key={b.id} b={b} />
        ))}
      </div>
    </div>
  )
}
