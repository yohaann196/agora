import { BookMarked, Check } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { EntityLink } from '../../components/ui/EntityLink'
import { MiniGraph } from '../../components/ui/MiniGraph'
import { Monogram, SaveButton } from '../../components/ui/primitives'
import { conceptById } from '../../data/concepts'
import { philosopherById } from '../../data/philosophers'
import { passages, textById, texts } from '../../data/texts'
import { useOS } from '../../store'
import { PassageCard } from '../library/PhilosopherProfile'
import { NotFound } from '../workspace/NotFound'
import './texts.css'

export function TextPage() {
  const { id = '' } = useParams()
  const { hash } = useLocation()
  const t = textById[id]
  const reading = useOS((s) => s.reading.find((r) => r.textId === id))
  const { addReading, updateReading, pushRecent } = useOS.getState()
  useEffect(() => {
    if (t) pushRecent({ kind: 'text', id: t.id })
  }, [t, pushRecent])
  useEffect(() => {
    if (!hash) return
    const el = document.getElementById(hash.slice(1))
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)
  }, [hash])
  if (!t) return <NotFound />
  const author = philosopherById[t.author]
  const ps = passages.filter((p) => p.textId === t.id)
  const others = texts.filter((x) => x.author === t.author && x.id !== t.id)

  return (
    <div className="page">
      <section className="entity-hero">
        <div className="book-cover" style={{ ['--c' as string]: 'var(--orange)' }} aria-hidden>
          <span className="serif">{t.title}</span>
          <span className="mono">{author.name.split(' ').slice(-1)[0]}</span>
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow" style={{ color: 'var(--orange)' }}>{t.form} · {t.year}</div>
          <h1 style={{ marginTop: 8 }}>{t.title}</h1>
          <div className="meta">
            <Monogram id={author.id} size={22} />
            <EntityLink id={author.id} />
            <span className="dim">·</span>
            <span>{ps.length} passage{ps.length === 1 ? '' : 's'} in corpus</span>
          </div>
        </div>
        <div className="actions">
          <SaveButton refItem={{ kind: 'text', id: t.id }} label size="md" />
          {reading ? (
            <span className="btn" style={{ pointerEvents: 'none' }}>
              <Check /> On reading list
            </span>
          ) : (
            <button className="btn primary" onClick={() => addReading(t.id)}>
              <BookMarked /> Add to reading list
            </button>
          )}
        </div>
      </section>

      <div className="two-col">
        <div>
          <section className="section">
            <p className="concept-def" style={{ marginTop: 0 }}>{t.summary}</p>
          </section>
          {reading && (
            <section className="section">
              <div className="panel" style={{ padding: 14, display: 'grid', gap: 10 }}>
                <div className="hstack" style={{ justifyContent: 'space-between' }}>
                  <span className="eyebrow">Your progress</span>
                  <span className="mono dim" style={{ fontSize: 11 }}>{Math.round(reading.progress * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(reading.progress * 100)}
                  onChange={(e) => {
                    const v = Number(e.target.value) / 100
                    updateReading(t.id, { progress: v, status: v >= 1 ? 'finished' : v > 0 ? 'reading' : 'queued' })
                  }}
                  aria-label="Reading progress"
                  className="range"
                />
              </div>
            </section>
          )}
          <section className="section">
            <div className="section-title"><h2>Passages <span className="count">{ps.length}</span></h2></div>
            <div className="grid">
              {ps.map((p) => (
                <div key={p.id} className={hash === `#${p.id}` ? 'target-wrap' : ''}>
                  <PassageCard id={p.id} showWork={false} />
                </div>
              ))}
              {!ps.length && <div className="empty">No passages from this work are in the verified corpus yet.</div>}
            </div>
          </section>
        </div>
        <aside>
          <div className="panel">
            <div className="panel-head"><h3>Structure</h3></div>
            <ol className="toc">
              {t.structure.map((s, i) => (
                <li key={s}>
                  <span className="mono dim">{String(i + 1).padStart(2, '0')}</span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
          <div className="panel">
            <div className="panel-head"><h3>Concepts discussed</h3></div>
            <div className="panel-body chips">
              {t.concepts.map((c) => (
                <EntityLink key={c} id={c} variant="chip">{conceptById[c]?.name}</EntityLink>
              ))}
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><h3>Neighborhood</h3></div>
            <div className="panel-body"><MiniGraph id={t.id} size={280} /></div>
          </div>
          {others.length > 0 && (
            <div className="panel">
              <div className="panel-head"><h3>Also by {author.name.split(' ').slice(-1)[0]}</h3></div>
              <div className="link-list" style={{ padding: 6 }}>
                {others.map((o) => (
                  <Link key={o.id} to={`/app/texts/${o.id}`} className="link-row">
                    <span className="serif t0" style={{ fontSize: 15 }}>{o.title}</span>
                    <span className="rel">{o.year}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
