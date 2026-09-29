import { motion } from 'framer-motion'
import { BookOpen, LayoutGrid, Rows3 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { EntityLink } from '../../components/ui/EntityLink'
import { Monogram, PageHeader, SaveButton, eraColor } from '../../components/ui/primitives'
import { conceptById } from '../../data/concepts'
import { philosopherById, philosophers } from '../../data/philosophers'
import { schoolById } from '../../data/schools'
import { passages, textById, texts } from '../../data/texts'
import { ERAS, type Era, type Philosopher } from '../../model/types'
import { useOS } from '../../store'
import './library.css'

const YEAR: Record<string, [number, number]> = {
  socrates: [-470, -399], plato: [-428, -348], aristotle: [-384, -322], augustine: [354, 430], aquinas: [1225, 1274],
  descartes: [1596, 1650], hume: [1711, 1776], kant: [1724, 1804], mill: [1806, 1873], nietzsche: [1844, 1900],
  marx: [1818, 1883], rawls: [1921, 2002], sartre: [1905, 1980], beauvoir: [1908, 1986],
}
export const lifespan = (id: string) => YEAR[id]
export const shortName = (p: Philosopher) => (p.id === 'augustine' ? 'Augustine' : p.id === 'beauvoir' ? 'Beauvoir' : p.name.split(' ').slice(-1)[0])

function Timeline({ era, onPick }: { era: Era | 'All'; onPick: (e: Era) => void }) {
  // Piecewise scale: compress the medieval gap so every era gets room.
  const stops: [number, number][] = [[-500, 0], [-300, 0.2], [300, 0.26], [1300, 0.44], [1580, 0.48], [1820, 0.7], [2010, 1]]
  const x = (y: number) => {
    for (let i = 0; i < stops.length - 1; i++) {
      const [a, pa] = stops[i]
      const [b, pb] = stops[i + 1]
      if (y <= b) return (pa + ((y - a) / (b - a)) * (pb - pa)) * 100
    }
    return 100
  }
  // Greedy row packing: a bar plus its label must not overlap the previous item in its row.
  const rowEnds: number[] = []
  const rows = [...philosophers]
    .sort((a, b) => YEAR[a.id][0] - YEAR[b.id][0])
    .map((p) => {
      const start = x(YEAR[p.id][0])
      const labelRight = x(YEAR[p.id][1]) > 79
      const end = labelRight ? x(YEAR[p.id][1]) : x(YEAR[p.id][1]) + shortName(p).length * 0.62 + 1.4
      let row = rowEnds.findIndex((e) => e < start - 0.6)
      if (row === -1) row = rowEnds.length
      rowEnds[row] = end
      return { p, row, labelRight }
    })
  return (
    <div className="timeline" aria-label="Timeline of philosophers" style={{ height: 40 + rowEnds.length * 22 }}>
      <div className="tl-axis">
        {[-400, 0, 400, 1200, 1600, 1800, 1900, 2000].map((y) => (
          <span key={y} style={{ left: `${x(y)}%` }}>{y < 0 ? `${-y} BCE` : y === 0 ? '0' : y}</span>
        ))}
      </div>
      {rows.map(({ p, row, labelRight }) => {
        const [b, d] = YEAR[p.id]
        const dim = era !== 'All' && p.era !== era
        return (
          <Link
            key={p.id}
            to={`/app/library/${p.id}`}
            className={`tl-bar ${dim ? 'dim' : ''} ${labelRight ? 'label-in' : ''}`}
            style={{ left: `${x(b)}%`, width: `${Math.max(1.2, x(d) - x(b))}%`, top: 14 + row * 22, ['--c' as string]: eraColor(p.era) }}
            onClick={() => onPick(p.era)}
            title={`${p.name} (${p.dates})`}
          >
            <span>{shortName(p)}</span>
          </Link>
        )
      })}
    </div>
  )
}

export function PhilosopherCard({ p, index = 0 }: { p: Philosopher; index?: number }) {
  const pushRecent = useOS((s) => s.pushRecent)
  return (
    <motion.article layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.025, duration: 0.35 }} className="ph-card" style={{ ['--c' as string]: eraColor(p.era) }}>
      <Link to={`/app/library/${p.id}`} className="ph-card-link" onClick={() => pushRecent({ kind: 'philosopher', id: p.id })} aria-label={`Open ${p.name}`} />
      <header className="ph-card-head">
        <Monogram id={p.id} size={46} />
        <div style={{ minWidth: 0 }}>
          <h3 className="ph-name">{p.name}</h3>
          <div className="ph-dates mono">{p.dates}</div>
        </div>
        <div className="ph-save">
          <SaveButton refItem={{ kind: 'philosopher', id: p.id }} />
        </div>
      </header>
      <p className="ph-epithet">{p.signature}</p>
      <dl className="ph-meta">
        <dt>Schools</dt>
        <dd className="chips">
          {p.schools.map((s) => (
            <EntityLink key={s} id={s} variant="chip" hover={false}>
              {schoolById[s].name}
            </EntityLink>
          ))}
        </dd>
        <dt>Works</dt>
        <dd className="ph-works">
          {p.works.slice(0, 3).map((w, i) => (
            <span key={w}>
              <EntityLink id={w} hover={false}>
                <em>{textById[w].title}</em>
              </EntityLink>
              {i < Math.min(3, p.works.length) - 1 ? ', ' : ''}
            </span>
          ))}
          {p.works.length > 3 && <span className="dim"> +{p.works.length - 3}</span>}
        </dd>
        <dt>Concepts</dt>
        <dd className="chips">
          {p.concepts.slice(0, 4).map((c) => (
            <EntityLink key={c} id={c} variant="chip" hover={false}>
              {conceptById[c]?.name}
            </EntityLink>
          ))}
        </dd>
      </dl>
    </motion.article>
  )
}

export function Library() {
  const [params, setParams] = useSearchParams()
  const era = (params.get('era') as Era | null) ?? 'All'
  const [q, setQ] = useState('')
  const [view, setView] = useState<'cards' | 'shelf'>('cards')
  const setEra = (e: Era | 'All') => setParams(e === 'All' ? {} : { era: e }, { replace: true })

  const list = useMemo(
    () =>
      philosophers.filter(
        (p) =>
          (era === 'All' || p.era === era) &&
          (!q || (p.name + ' ' + p.signature + ' ' + p.concepts.join(' ') + ' ' + p.schools.join(' ')).toLowerCase().includes(q.toLowerCase())),
      ),
    [era, q],
  )
  const shelf = useMemo(() => texts.filter((t) => era === 'All' || philosopherById[t.author].era === era), [era])

  return (
    <div className="page">
      <PageHeader
        eyebrow="Library · 14 thinkers · 2,400 years"
        title="The Library"
        lede="Read and explore philosophical texts. Every thinker, work and idea here is a node on your knowledge graph."
        actions={
          <div className="seg" role="group" aria-label="View">
            <button aria-pressed={view === 'cards'} onClick={() => setView('cards')}>
              <LayoutGrid size={13} style={{ display: 'inline', verticalAlign: -2, marginRight: 6 }} />
              Thinkers
            </button>
            <button aria-pressed={view === 'shelf'} onClick={() => setView('shelf')}>
              <Rows3 size={13} style={{ display: 'inline', verticalAlign: -2, marginRight: 6 }} />
              Shelf
            </button>
          </div>
        }
      />

      <Timeline era={era} onPick={() => undefined} />

      <div className="filterbar">
        <div className="seg" role="tablist" aria-label="Era">
          {(['All', ...ERAS] as const).map((e) => (
            <button key={e} role="tab" aria-selected={era === e} onClick={() => setEra(e)}>
              {e !== 'All' && <span className="era-dot" style={{ background: eraColor(e) }} />}
              {e}
              <span className="dim mono" style={{ marginLeft: 6, fontSize: 10 }}>
                {e === 'All' ? philosophers.length : philosophers.filter((p) => p.era === e).length}
              </span>
            </button>
          ))}
        </div>
        <span className="spacer" />
        <input className="input" placeholder="Filter by name, school, concept…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter philosophers" />
      </div>

      {view === 'cards' ? (
        <div className="ph-grid">
          {list.map((p, i) => (
            <PhilosopherCard key={p.id} p={p} index={i} />
          ))}
          {!list.length && <div className="empty">No thinkers match “{q}”.</div>}
        </div>
      ) : (
        <div className="shelf">
          {ERAS.filter((e) => era === 'All' || e === era).map((e) => {
            const items = shelf.filter((t) => philosopherById[t.author].era === e)
            if (!items.length) return null
            return (
              <section key={e} className="shelf-era">
                <div className="divider-label" style={{ ['--c' as string]: eraColor(e) }}>{e}</div>
                <div className="shelf-rows">
                  {items.map((t) => {
                    const n = passages.filter((p) => p.textId === t.id).length
                    return (
                      <Link key={t.id} to={`/app/texts/${t.id}`} className="shelf-row" style={{ ['--c' as string]: eraColor(e) }}>
                        <span className="spine" aria-hidden />
                        <span className="shelf-title serif">{t.title}</span>
                        <span className="dim">{philosopherById[t.author].name}</span>
                        <span className="dim mono shelf-year">{t.year}</span>
                        <span className="tag plain">{t.form}</span>
                        <span className="dim mono" style={{ fontSize: 10.5, width: 86, textAlign: 'right' }}>
                          <BookOpen size={11} style={{ display: 'inline', verticalAlign: -1, marginRight: 4 }} />
                          {n} passage{n === 1 ? '' : 's'}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
