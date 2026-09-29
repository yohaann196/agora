import { BrainCircuit, Swords } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { EntityLink } from '../../components/ui/EntityLink'
import { MiniGraph } from '../../components/ui/MiniGraph'
import { Monogram, PageHeader, SaveButton } from '../../components/ui/primitives'
import { conceptById } from '../../data/concepts'
import { philosopherById } from '../../data/philosophers'
import { schoolById, schools } from '../../data/schools'
import { texts } from '../../data/texts'
import { useOS } from '../../store'
import { NotFound } from '../workspace/NotFound'
import '../concepts/concepts.css'

const MIN = -450
const MAX = 2026
const pct = (y: number) => ((Math.max(MIN, y) - MIN) / (MAX - MIN)) * 100

export function SchoolsIndex() {
  const sorted = [...schools].sort((a, b) => a.startYear - b.startYear)
  return (
    <div className="page">
      <PageHeader
        eyebrow={`Schools · ${schools.length} traditions`}
        title="Schools & Traditions"
        lede="Traditions are long arguments carried across generations. Each one is organized around a few core commitments — and an unresolved tension."
      />
      <div className="school-lanes" aria-label="Timeline of traditions">
        {sorted.map((s) => (
          <div className="lane" key={s.id}>
            <Link to={`/app/schools/${s.id}`} className="lane-bar" style={{ left: `${pct(s.startYear)}%`, width: `max(${pct(s.endYear) - pct(s.startYear)}%, 120px)`, maxWidth: `${100 - pct(s.startYear)}%` }}>
              {s.name}
            </Link>
          </div>
        ))}
        <div className="lane-axis">
          <span>450 BCE</span>
          <span>0</span>
          <span>500</span>
          <span>1000</span>
          <span>1500</span>
          <span>2026</span>
        </div>
      </div>
      <div className="school-grid">
        {sorted.map((s) => (
          <article key={s.id} className="card school-card hoverable">
            <div className="hstack" style={{ justifyContent: 'space-between' }}>
              <span className="eyebrow" style={{ color: 'var(--green)' }}>{s.span}</span>
              <SaveButton refItem={{ kind: 'school', id: s.id }} />
            </div>
            <Link to={`/app/schools/${s.id}`}>
              <h3>{s.name}</h3>
            </Link>
            <p className="dim" style={{ fontSize: 'var(--fs-12)', lineHeight: 1.55 }}>{s.summary}</p>
            <ul className="ideas">
              {s.coreIdeas.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
            <div className="members">
              {s.members.map((m) => (
                <Link key={m} to={`/app/library/${m}`} title={philosopherById[m].name}>
                  <Monogram id={m} size={28} />
                </Link>
              ))}
              {s.precursors.length > 0 && <span className="dim" style={{ fontSize: 'var(--fs-11)', marginLeft: 6 }}>precursors: {s.precursors.map((p) => philosopherById[p].name.split(' ').slice(-1)[0]).join(', ')}</span>}
            </div>
            <p className="tension">{s.tension}</p>
          </article>
        ))}
      </div>
    </div>
  )
}

export function SchoolPage() {
  const { id = '' } = useParams()
  const s = schoolById[id]
  const navigate = useNavigate()
  const args = useOS((st) => st.arguments)
  const pushRecent = useOS((st) => st.pushRecent)
  useEffect(() => {
    if (s) pushRecent({ kind: 'school', id: s.id })
  }, [s, pushRecent])
  if (!s) return <NotFound />
  const works = texts.filter((t) => s.members.includes(t.author))
  const inArgs = args.filter((a) => a.tradition === s.id)
  const rivals = schools.filter((x) => x.id !== s.id && !x.concepts.some((c) => s.concepts.includes(c))).slice(0, 4)

  return (
    <div className="page">
      <section className="entity-hero" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}>
        <div>
          <div className="eyebrow" style={{ color: 'var(--green)' }}>School · {s.span}</div>
          <h1 style={{ marginTop: 8 }}>{s.name}</h1>
          <p className="concept-def">{s.summary}</p>
        </div>
        <div className="actions">
          <SaveButton refItem={{ kind: 'school', id: s.id }} label size="md" />
          <button
            className="btn primary"
            onClick={() => {
              useOS.getState().setSocraticMode('devil')
              navigate(`/app/socratic?q=${encodeURIComponent(`I think ${s.name} is right that ${s.coreIdeas[0].charAt(0).toLowerCase() + s.coreIdeas[0].slice(1)}.`)}`)
            }}
          >
            <Swords /> Challenge its core idea
          </button>
        </div>
      </section>
      <div className="two-col">
        <div>
          <section className="section">
            <div className="section-title"><h2>Core commitments</h2></div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              {s.coreIdeas.map((c, i) => (
                <div key={c} className="card">
                  <div className="card-sub">{String(i + 1).padStart(2, '0')}</div>
                  <div className="serif t0" style={{ fontSize: 18, lineHeight: 1.3 }}>{c}</div>
                </div>
              ))}
            </div>
          </section>
          <section className="section">
            <div className="section-title"><h2>The open question</h2></div>
            <div className="nuance" style={{ background: 'linear-gradient(90deg, rgba(114,224,166,0.07), transparent)', borderColor: 'rgba(114,224,166,0.18)' }}>
              <p className="serif" style={{ fontSize: 20, fontStyle: 'italic' }}>{s.tension}</p>
              <button className="btn sm" style={{ justifySelf: 'start', marginTop: 6 }} onClick={() => navigate(`/app/socratic?q=${encodeURIComponent(s.tension)}`)}>
                <BrainCircuit /> Think it through
              </button>
            </div>
          </section>
          <section className="section">
            <div className="section-title"><h2>Thinkers</h2></div>
            <div className="thinker-row">
              {[...s.members, ...s.precursors].map((m) => (
                <Link key={m} to={`/app/library/${m}`} className="card thinker-card">
                  <Monogram id={m} size={36} />
                  <div>
                    <div className="serif t0" style={{ fontSize: 17 }}>{philosopherById[m].name}</div>
                    <div className="card-sub">{s.members.includes(m) ? 'member' : 'precursor'} · {philosopherById[m].dates}</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
          <section className="section">
            <div className="section-title"><h2>Works <span className="count">{works.length}</span></h2></div>
            <div className="link-list">
              {works.map((t) => (
                <Link key={t.id} to={`/app/texts/${t.id}`} className="link-row">
                  <span className="serif t0" style={{ fontSize: 16 }}>{t.title}</span>
                  <span className="dim">{philosopherById[t.author].name}</span>
                  <span className="rel">{t.year}</span>
                </Link>
              ))}
            </div>
          </section>
          {inArgs.length > 0 && (
            <section className="section">
              <div className="section-title"><h2>Arguments in this tradition</h2></div>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))' }}>
                {inArgs.map((a) => (
                  <Link key={a.id} to={`/app/arguments/${a.id}`} className="card">
                    <div className="card-title">{a.title}</div>
                    <p className="dim clamp-2" style={{ fontSize: 'var(--fs-12)' }}>{a.summary}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
        <aside>
          <div className="panel">
            <div className="panel-head"><h3>Neighborhood</h3></div>
            <div className="panel-body"><MiniGraph id={s.id} size={290} /></div>
          </div>
          <div className="panel">
            <div className="panel-head"><h3>Central concepts</h3></div>
            <div className="panel-body chips">
              {s.concepts.map((c) => (
                <EntityLink key={c} id={c} variant="chip">{conceptById[c]?.name}</EntityLink>
              ))}
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><h3>Contrasting traditions</h3></div>
            <div className="link-list" style={{ padding: 6 }}>
              {rivals.map((r) => (
                <div key={r.id} className="link-row"><EntityLink id={r.id} /><span className="rel">{r.span}</span></div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
