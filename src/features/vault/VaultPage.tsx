import { Library, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { PageHeader } from '../../components/ui/primitives'
import { CARD_COUNTS, CONTENTIONS, TOTAL_CARDS, type LibraryCard } from '../../data/cards'
import { RESOLUTION } from '../../data/debateSeeds'
import { useOS } from '../../store'
import { DocsIndex } from '../docs/DocsPage'
import { CardView } from './CardView'
import { cardHaystack } from './cards'
import { sendCardToDoc, useLibrary } from './useLibrary'
import './vault.css'

const PAGE = 30

export function VaultPage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'files' ? 'files' : 'library'
  const setTab = (t: 'library' | 'files') => setParams(t === 'files' ? { tab: 'files' } : {}, { replace: true })

  return (
    <div className="page vault">
      <PageHeader
        eyebrow="Prep"
        title="Prep vault"
        lede={
          <>
            Cut cards for <i>{RESOLUTION}</i> Copy any card into Word or Google Docs with its formatting, or send it into one of your docs.
          </>
        }
      />
      <div className="seg vault-tabs" role="tablist" aria-label="Prep vault">
        <button role="tab" aria-selected={tab === 'library'} onClick={() => setTab('library')}>
          <Library size={13} /> Card library{TOTAL_CARDS ? ` · ${TOTAL_CARDS}` : ''}
        </button>
        <button role="tab" aria-selected={tab === 'files'} onClick={() => setTab('files')}>
          My files
        </button>
      </div>
      {tab === 'library' ? <CardLibrary /> : <DocsIndex embedded />}
    </div>
  )
}

function CardLibrary() {
  const [params, setParams] = useSearchParams()
  const cards = useLibrary()
  const docs = useOS((s) => s.docs)
  const target = useOS((s) => s.cutTarget)
  const setTarget = useOS((s) => s.setCutTarget)
  const toast = useOS((s) => s.toast)
  const [q, setQ] = useState(params.get('q') ?? '')
  const [limit, setLimit] = useState(PAGE)
  const contention = params.get('c') ?? ''
  const current = CONTENTIONS.find((c) => c.id === contention)

  useEffect(() => setLimit(PAGE), [contention, q])

  const pick = (id: string) => {
    const next = new URLSearchParams(params)
    if (id) next.set('c', id)
    else next.delete('c')
    setParams(next, { replace: true })
  }

  const shown = useMemo(() => {
    if (!cards) return []
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    return cards.filter((c) => (!contention || c.contention === contention) && words.every((w) => cardHaystack(c).includes(w)))
  }, [cards, contention, q])

  const send = (card: LibraryCard) => {
    const doc = docs.find((d) => d.id === target)
    if (!doc || !sendCardToDoc(card, doc.id)) {
      toast({ title: 'Pick a doc first', body: 'Choose where cards go with “Send cards to”.' })
      return
    }
    toast({ title: 'Card added', body: `“${card.tag.slice(0, 60)}${card.tag.length > 60 ? '…' : ''}” → ${doc.title}`, tone: 'success' })
  }

  return (
    <div className="lib">
      <aside className="lib-rail" aria-label="Contentions">
        <button className={`lib-c all ${!contention ? 'on' : ''}`} onClick={() => pick('')}>
          <span>All cards</span>
          <em className="num">{TOTAL_CARDS}</em>
        </button>
        {(['aff', 'neg'] as const).map((side) => (
          <div key={side} className="lib-group">
            <div className={`lib-side ${side}`}>{side === 'aff' ? 'Aff' : 'Neg'}</div>
            {CONTENTIONS.filter((c) => c.side === side).map((c) => (
              <button key={c.id} className={`lib-c ${contention === c.id ? 'on' : ''}`} onClick={() => pick(c.id)} title={c.claim}>
                <span>
                  <b>{c.n}</b> {c.title}
                </span>
                <em className="num">{CARD_COUNTS[c.id] ?? 0}</em>
              </button>
            ))}
          </div>
        ))}
      </aside>

      <section className="lib-main">
        <div className="lib-bar">
          <label className="lib-search">
            <Search size={15} aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tags, authors and card text" aria-label="Search cards" />
          </label>
          <label className="lib-target">
            <span>Send cards to</span>
            <select className="select" value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Send cards to">
              <option value="">Choose a doc…</option>
              {docs.map((d) => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
          </label>
        </div>

        {current && (
          <div className={`lib-head ${current.side}`}>
            <span className="lib-head-k">{current.side === 'aff' ? 'Aff' : 'Neg'} contention {current.n}</span>
            <h2>{current.title}</h2>
            <p>{current.claim}</p>
          </div>
        )}

        {!cards && <div className="skeleton" style={{ height: 320 }} />}
        {cards && !cards.length && <div className="empty">The card library couldn’t load. Try reloading the page.</div>}
        {cards && cards.length > 0 && (
          <>
            <p className="lib-count dim">{shown.length} card{shown.length === 1 ? '' : 's'}{q ? ` matching “${q}”` : ''}</p>
            <div className="lib-list">
              {shown.slice(0, limit).map((c) => (
                <CardView key={c.id} card={c} onSend={send} sendLabel="Send to the selected doc" />
              ))}
            </div>
            {shown.length > limit && (
              <button className="btn lib-more" onClick={() => setLimit((l) => l + PAGE)}>
                Show more · {shown.length - limit} left
              </button>
            )}
          </>
        )}
      </section>
    </div>
  )
}
