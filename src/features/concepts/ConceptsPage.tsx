import { AppWindow, BrainCircuit, Orbit, Waypoints } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { EntityLink } from '../../components/ui/EntityLink'
import { MiniGraph } from '../../components/ui/MiniGraph'
import { PathTracer } from '../../components/ui/PathTracer'
import { Monogram, PageHeader, SaveButton } from '../../components/ui/primitives'
import { conceptById, concepts } from '../../data/concepts'
import { philosophers } from '../../data/philosophers'
import { schools } from '../../data/schools'
import { passages, texts } from '../../data/texts'
import { neighbors } from '../../model/graph'
import type { Domain } from '../../model/types'
import { useOS } from '../../store'
import { useKnowledgeGraph } from '../../store/graph'
import { PassageCard } from '../library/PhilosopherProfile'
import { NotFound } from '../workspace/NotFound'
import './concepts.css'

const DOMAINS: Domain[] = ['Ethics', 'Political', 'Metaphysics', 'Epistemology', 'Existence', 'Social', 'Mind', 'Religion', 'Logic']

export function ConceptsIndex() {
  const [domain, setDomain] = useState<Domain | 'All'>('All')
  const [q, setQ] = useState('')
  const [focus, setFocus] = useState('justice')
  const g = useKnowledgeGraph()
  const list = useMemo(
    () => concepts.filter((c) => (domain === 'All' || c.domain === domain) && (!q || (c.name + ' ' + c.definition + ' ' + c.keywords.join(' ')).toLowerCase().includes(q.toLowerCase()))),
    [domain, q],
  )
  const byLetter = useMemo(() => {
    const m = new Map<string, typeof list>()
    for (const c of [...list].sort((a, b) => a.name.localeCompare(b.name))) {
      const L = c.name.replace(/^The /, '').charAt(0).toUpperCase()
      m.set(L, [...(m.get(L) ?? []), c])
    }
    return [...m.entries()]
  }, [list])

  return (
    <div className="page">
      <PageHeader
        eyebrow={`Concepts · ${concepts.length} ideas · ${g.edges.length} relations`}
        title="Concepts"
        lede="A living index of philosophical ideas. Every concept links to the thinkers who developed it, the texts that discuss it, and the arguments that depend on it."
        actions={
          <Link to="/app/map" className="btn">
            <Orbit /> Open Idea Map
          </Link>
        }
      />
      <div className="filterbar">
        <div className="seg" role="tablist" aria-label="Domain" style={{ flexWrap: 'wrap' }}>
          {(['All', ...DOMAINS] as const).map((d) => (
            <button key={d} role="tab" aria-selected={domain === d} onClick={() => setDomain(d)}>
              {d}
            </button>
          ))}
        </div>
        <span className="spacer" />
        <input className="input" placeholder="Filter concepts…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter concepts" />
      </div>

      <div className="two-col">
        <div className="glossary">
          {byLetter.map(([L, cs]) => (
            <section key={L} className="gloss-letter">
              <div className="gloss-L serif">{L}</div>
              <div className="gloss-items">
                {cs.map((c) => {
                  const links = neighbors(g, c.id).length
                  return (
                    <Link key={c.id} to={`/app/concepts/${c.id}`} className={`gloss-item ${focus === c.id ? 'on' : ''}`} onMouseEnter={() => setFocus(c.id)} onFocus={() => setFocus(c.id)}>
                      <div className="gloss-head">
                        <span className="gloss-name">{c.name}</span>
                        <span className="gloss-domain mono">{c.domain}</span>
                      </div>
                      <p className="clamp-2">{c.definition}</p>
                      <span className="gloss-links mono">{links} links</span>
                    </Link>
                  )
                })}
              </div>
            </section>
          ))}
          {!list.length && <div className="empty">No concepts match.</div>}
        </div>
        <aside>
          <div className="panel">
            <div className="panel-head">
              <h3>{conceptById[focus]?.name}</h3>
              <span className="dim mono" style={{ fontSize: 10 }}>hover to explore</span>
            </div>
            <div className="panel-body">
              <MiniGraph id={focus} size={300} max={14} />
              <p className="dim" style={{ fontSize: 'var(--fs-12)', marginTop: 10 }}>{conceptById[focus]?.definition}</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export function ConceptPage() {
  const { id = '' } = useParams()
  const c = conceptById[id]
  const navigate = useNavigate()
  const args = useOS((s) => s.arguments)
  const debates = useOS((s) => s.debates)
  const { pushRecent, setIdeaCenter, openWindow } = useOS.getState()
  useEffect(() => {
    if (c) pushRecent({ kind: 'concept', id: c.id })
  }, [c, pushRecent])
  if (!c) return <NotFound />

  const thinkers = philosophers.filter((p) => p.concepts.includes(c.id))
  const inSchools = schools.filter((s) => s.concepts.includes(c.id))
  const inTexts = texts.filter((t) => t.concepts.includes(c.id))
  const ps = passages.filter((p) => p.concepts.includes(c.id))
  const inArgs = args.filter((a) => a.concepts.includes(c.id))
  const inDebates = debates.filter((d) => d.concepts.includes(c.id))
  const reverseRelated = concepts.filter((x) => x.related.includes(c.id) && !c.related.includes(x.id))

  return (
    <div className="page">
      <section className="entity-hero" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}>
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow" style={{ color: 'var(--cyan)' }}>Concept · {c.domain}</div>
          <h1 style={{ marginTop: 8 }}>{c.name}</h1>
          <p className="concept-def">{c.definition}</p>
        </div>
        <div className="actions">
          <SaveButton refItem={{ kind: 'concept', id: c.id }} label size="md" />
          <button className="btn" onClick={() => openWindow('entity', { kind: 'concept', id: c.id })}>
            <AppWindow /> Window
          </button>
          <button
            className="btn"
            onClick={() => {
              setIdeaCenter(c.id)
              navigate('/app/map')
            }}
          >
            <Orbit /> Map it
          </button>
          <button
            className="btn primary"
            onClick={() => {
              useOS.getState().setSocraticMode('tutor')
              navigate(`/app/socratic?q=${encodeURIComponent(`Explain ${c.name.toLowerCase()}`)}`)
            }}
          >
            <BrainCircuit /> Learn with Tutor
          </button>
        </div>
      </section>

      <div className="two-col">
        <div>
          <section className="section">
            <div className="nuance">
              <span className="eyebrow">Nuance</span>
              <p>{c.note}</p>
            </div>
          </section>

          {thinkers.length > 0 && (
            <section className="section">
              <div className="section-title"><h2>Key thinkers <span className="count">{thinkers.length}</span></h2></div>
              <div className="thinker-row">
                {thinkers.map((p) => (
                  <Link key={p.id} to={`/app/library/${p.id}`} className="card thinker-card">
                    <Monogram id={p.id} size={36} />
                    <div style={{ minWidth: 0 }}>
                      <div className="card-title serif" style={{ fontWeight: 400, fontSize: 17 }}>{p.name}</div>
                      <div className="card-sub">{p.dates}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {ps.length > 0 && (
            <section className="section">
              <div className="section-title"><h2>Passages <span className="count">{ps.length}</span></h2></div>
              <div className="grid">
                {ps.slice(0, 5).map((p) => (
                  <PassageCard key={p.id} id={p.id} />
                ))}
              </div>
            </section>
          )}

          <section className="section">
            <div className="section-title">
              <h2><Waypoints size={14} /> Arguments that depend on it <span className="count">{inArgs.length}</span></h2>
            </div>
            {inArgs.length ? (
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))' }}>
                {inArgs.map((a) => (
                  <Link key={a.id} to={`/app/arguments/${a.id}`} className="card">
                    <div className="card-title">{a.title}</div>
                    <p className="dim clamp-2" style={{ fontSize: 'var(--fs-12)' }}>{a.summary}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty">
                No arguments use this concept yet.
                <button className="btn sm" onClick={() => { const nid = useOS.getState().createArgument(`An argument about ${c.name.toLowerCase()}`); useOS.getState().updateArgument(nid, { concepts: [c.id] }); navigate(`/app/arguments/${nid}`) }}>
                  Build one
                </button>
              </div>
            )}
          </section>

          {inDebates.length > 0 && (
            <section className="section">
              <div className="section-title"><h2>Live debates</h2></div>
              <div className="grid">
                {inDebates.map((d) => (
                  <Link key={d.id} to={`/app/debates/${d.id}`} className="card">
                    <div className="serif t0" style={{ fontSize: 18 }}>{d.thesis}</div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside>
          <div className="panel">
            <div className="panel-head"><h3>Neighborhood</h3></div>
            <div className="panel-body"><MiniGraph id={c.id} size={290} /></div>
          </div>
          <div className="panel">
            <div className="panel-head"><h3>Trace a connection</h3></div>
            <div className="panel-body">
              <PathTracer from={c.id} suggestions={['kant', 'marx', 'bad-faith', 'arg-sacrifice'].filter((x) => x !== c.id)} />
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><h3>Related concepts</h3></div>
            <div className="panel-body chips">
              {[...c.related, ...reverseRelated.map((r) => r.id)].map((r) => (
                <EntityLink key={r} id={r} variant="chip" />
              ))}
            </div>
          </div>
          {(inSchools.length > 0 || inTexts.length > 0) && (
            <div className="panel">
              <div className="panel-head"><h3>Where it lives</h3></div>
              <div className="link-list" style={{ padding: 6 }}>
                {inSchools.map((s) => (
                  <div key={s.id} className="link-row"><EntityLink id={s.id} /><span className="rel">central to</span></div>
                ))}
                {inTexts.map((t) => (
                  <div key={t.id} className="link-row"><EntityLink id={t.id}><em>{t.title}</em></EntityLink><span className="rel">discussed in</span></div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
