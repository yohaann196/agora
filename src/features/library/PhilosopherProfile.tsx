import { AppWindow, ArrowDownLeft, ArrowUpRight, BrainCircuit, Columns3, Swords, Waypoints } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { EntityLink } from '../../components/ui/EntityLink'
import { MiniGraph } from '../../components/ui/MiniGraph'
import { Monogram, SaveButton, SourceBadge, eraColor } from '../../components/ui/primitives'
import { conceptById } from '../../data/concepts'
import { philosopherById, philosophers } from '../../data/philosophers'
import { schoolById } from '../../data/schools'
import { passages, textById } from '../../data/texts'
import { useOS } from '../../store'
import { NotFound } from '../workspace/NotFound'
import './library.css'

export function PassageCard({ id, showWork = true }: { id: string; showWork?: boolean }) {
  const p = passages.find((x) => x.id === id)
  if (!p) return null
  const t = textById[p.textId]
  return (
    <article className={`passage-card ${p.source}`} id={p.id}>
      <div className="p-body">{p.source === 'quotation' ? `“${p.body}”` : p.body}</div>
      <div className="p-meta">
        <SourceBadge type={p.source} />
        {showWork && (
          <EntityLink id={t.id}>
            <em>{t.title}</em>
          </EntityLink>
        )}
        <span className="mono">{p.locator}</span>
        {p.translation && <span className="dim">{p.translation}</span>}
        <span className="spacer" />
        <SaveButton refItem={{ kind: 'passage', id: p.id }} />
      </div>
      <div className="p-context">
        <span className="eyebrow" style={{ marginRight: 8 }}>Context</span>
        {p.context}
      </div>
    </article>
  )
}

export function PhilosopherProfile() {
  const { id = '' } = useParams()
  const p = philosopherById[id]
  const navigate = useNavigate()
  const args = useOS((s) => s.arguments)
  const debates = useOS((s) => s.debates)
  const { pushRecent, setSocraticMode, setSocraticPhilosopher, openWindow } = useOS.getState()
  useEffect(() => {
    if (p) pushRecent({ kind: 'philosopher', id: p.id })
  }, [p, pushRecent])
  if (!p) return <NotFound />

  const influencedBy = philosophers.filter((x) => x.influenced.includes(p.id) && !p.influences.includes(x.id))
  const influences = [...p.influences.map((i) => philosopherById[i]), ...influencedBy]
  const influenced = [...new Set([...p.influenced, ...philosophers.filter((x) => x.influences.includes(p.id)).map((x) => x.id)])].map((i) => philosopherById[i])
  const critiquedBy = philosophers.filter((x) => x.critiques.includes(p.id))
  const related = philosophers
    .filter((x) => x.id !== p.id)
    .map((x) => ({ x, score: x.schools.filter((s) => p.schools.includes(s)).length * 2 + x.concepts.filter((c) => p.concepts.includes(c)).length }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
  const myPassages = passages.filter((x) => x.author === p.id)
  const myArgs = args.filter((a) => a.author === p.id || a.philosophers.includes(p.id))
  const myDebates = debates.filter((d) => d.philosophers.includes(p.id))

  return (
    <div className="page">
      <section className="entity-hero" style={{ ['--accent-line' as string]: eraColor(p.era) }}>
        <Monogram id={p.id} size={84} />
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow" style={{ color: eraColor(p.era) }}>{p.era} · {p.epithet}</div>
          <h1 style={{ marginTop: 8 }}>{p.name}</h1>
          <div className="meta">
            <span className="mono">{p.dates}</span>
            <span className="dim">·</span>
            <span>{p.origin}</span>
            <span className="dim">·</span>
            <span className="chips">
              {p.schools.map((s) => (
                <EntityLink key={s} id={s} variant="chip">
                  {schoolById[s].name}
                </EntityLink>
              ))}
            </span>
          </div>
        </div>
        <div className="actions">
          <SaveButton refItem={{ kind: 'philosopher', id: p.id }} label size="md" />
          <button className="btn" onClick={() => openWindow('entity', { kind: 'philosopher', id: p.id })}>
            <AppWindow /> Window
          </button>
          <button className="btn" onClick={() => navigate(`/app/compare?with=${p.id}`)}>
            <Columns3 /> Compare
          </button>
          <button
            className="btn primary"
            onClick={() => {
              setSocraticMode('philosopher')
              setSocraticPhilosopher(p.id)
              navigate('/app/socratic')
            }}
          >
            <BrainCircuit /> Put a claim to {p.name.split(' ').slice(-1)[0]}
          </button>
        </div>
      </section>

      <div className="two-col">
        <div>
          <section className="section">
            <p className="signature" style={{ ['--accent-line' as string]: eraColor(p.era) }}>{p.signature}</p>
          </section>

          <section className="section">
            <div className="section-title"><h2>Biography</h2></div>
            <div className="prose">
              {p.bio.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </section>

          <section className="section">
            <div className="section-title">
              <h2>Major works <span className="count">{p.works.length}</span></h2>
            </div>
            <div className="works-grid">
              {p.works.map((w) => {
                const t = textById[w]
                return (
                  <Link key={w} to={`/app/texts/${w}`} className="card work-card">
                    <div className="card-sub">{t.year} · {t.form}</div>
                    <div className="w-title">{t.title}</div>
                    <p className="clamp-3">{t.summary}</p>
                  </Link>
                )
              })}
            </div>
          </section>

          {myPassages.length > 0 && (
            <section className="section">
              <div className="section-title">
                <h2>In their words <span className="count">{myPassages.length}</span></h2>
                <span className="dim" style={{ fontSize: 'var(--fs-11)' }}>Quotations are verbatim from named translations; summaries are labelled.</span>
              </div>
              <div className="grid">
                {myPassages.slice(0, 4).map((x) => (
                  <PassageCard key={x.id} id={x.id} />
                ))}
              </div>
            </section>
          )}

          <section className="section">
            <div className="section-title">
              <h2><Waypoints size={14} /> Arguments <span className="count">{myArgs.length}</span></h2>
              <Link to="/app/arguments" className="btn ghost sm">All arguments <ArrowUpRight /></Link>
            </div>
            {myArgs.length ? (
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
                {myArgs.map((a) => (
                  <Link key={a.id} to={`/app/arguments/${a.id}`} className="card">
                    <div className="card-sub">{a.author === p.id ? `Argued by ${p.name.split(' ').slice(-1)[0]}` : 'References this thinker'} · {a.nodes.length} nodes</div>
                    <div className="card-title">{a.title}</div>
                    <p className="dim clamp-2" style={{ fontSize: 'var(--fs-12)' }}>{a.summary}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty">No arguments reference {p.name} yet.</div>
            )}
          </section>

          {myDebates.length > 0 && (
            <section className="section">
              <div className="section-title"><h2><Swords size={14} /> In debate</h2></div>
              <div className="grid">
                {myDebates.map((d) => (
                  <Link key={d.id} to={`/app/debates/${d.id}`} className="card">
                    <div className="card-title serif" style={{ fontSize: 18, fontWeight: 400 }}>{d.thesis}</div>
                    <div className="card-sub">{d.moves.length} threads · {d.supporters.length} supporters</div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside>
          <div className="panel">
            <div className="panel-head"><h3>Neighborhood</h3><span className="dim mono" style={{ fontSize: 10 }}>knowledge graph</span></div>
            <div className="panel-body"><MiniGraph id={p.id} size={290} /></div>
          </div>
          <div className="panel">
            <div className="panel-head"><h3>Concepts</h3></div>
            <div className="panel-body chips">
              {p.concepts.map((c) => (
                <EntityLink key={c} id={c} variant="chip">{conceptById[c]?.name}</EntityLink>
              ))}
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><h3>Lineage</h3></div>
            <div className="panel-body rel-grid">
              <div className="rel-block">
                <h4><ArrowDownLeft /> Influenced by</h4>
                <div className="chips">
                  {influences.length ? influences.map((x) => <EntityLink key={x.id} id={x.id} variant="chip" />) : <span className="dim" style={{ fontSize: 'var(--fs-11)' }}>Sources outside this library (e.g. the Presocratics)</span>}
                </div>
              </div>
              <div className="rel-block">
                <h4><ArrowUpRight /> Influenced</h4>
                <div className="chips">
                  {influenced.length ? influenced.map((x) => <EntityLink key={x.id} id={x.id} variant="chip" />) : <span className="dim" style={{ fontSize: 'var(--fs-11)' }}>—</span>}
                </div>
              </div>
              {(p.critiques.length > 0 || critiquedBy.length > 0) && (
                <div className="rel-block">
                  <h4><Swords /> Critical engagements</h4>
                  <div className="link-list">
                    {p.critiques.map((c) => (
                      <div className="link-row" key={c}><EntityLink id={c} /><span className="rel">critiques</span></div>
                    ))}
                    {critiquedBy.map((c) => (
                      <div className="link-row" key={c.id}><EntityLink id={c.id} /><span className="rel">critiqued by</span></div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><h3>Related thinkers</h3></div>
            <div className="link-list" style={{ padding: 6 }}>
              {related.map(({ x }) => (
                <Link key={x.id} to={`/app/library/${x.id}`} className="link-row">
                  <Monogram id={x.id} size={26} />
                  <span className="t0">{x.name}</span>
                  <span className="rel">{x.schools.filter((s) => p.schools.includes(s)).map((s) => schoolById[s].name)[0] ?? 'shared concepts'}</span>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
