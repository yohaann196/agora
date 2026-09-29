import { EditorContent } from '@tiptap/react'
import { Library, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import type { Doc, Flow } from '../../model/types'
import { docStats, formatSeconds, heading, para } from '../../research/docModel'
import { useOS } from '../../store'
import { Ribbon, useVerbatimEditor } from '../docs/DocsPage'
import { CardView } from '../vault/CardView'
import { cardHaystack } from '../vault/cards'
import { sendCardToDoc, useLibrary } from '../vault/useLibrary'
import '../docs/docs.css'
import '../vault/vault.css'

const TABS = 5
const LD_TABS = ['AC', 'NC', '1AR', 'NR', '2AR']

export const tabLabels = (flow: Flow) => (flow.format === 'ld' ? LD_TABS : Array.from({ length: TABS }, (_, i) => `Doc ${i + 1}`))

/** Five speech docs beside the flow, one per tab, like a speech-doc sheet next to a flowing workbook. */
export function SpeechDocs({ flow }: { flow: Flow }) {
  const docs = useOS((s) => s.docs)
  const [tab, setTab] = useState(0)
  const [library, setLibrary] = useState(false)
  const labels = tabLabels(flow)
  const ids = flow.docs ?? []
  const doc = docs.find((d) => d.id === ids[tab])

  /** Point a tab at a doc: an existing one from the vault, or a fresh speech doc. */
  const bind = (i: number, docId?: string) => {
    const s = useOS.getState()
    let id = docId
    if (!id) {
      id = s.createDoc('speech', `${labels[i]} — ${flow.title}`)
      // Start with the speech's name and a plain paragraph, ready to type into.
      s.updateDoc(id, { content: { type: 'doc', content: [heading(1, labels[i]), para([])] } })
    }
    const next = Array.from({ length: TABS }, (_, j) => (j === i ? id : ids[j] ?? ''))
    s.updateFlow(flow.id, { docs: next })
  }

  return (
    <section className="sd" aria-label="Speech docs">
      <div className="sd-tabs" role="tablist" aria-label="Speech docs">
        {labels.map((l, i) => (
          <button key={l} role="tab" aria-selected={tab === i} className={`sd-tab ${tab === i ? 'on' : ''} ${docs.some((d) => d.id === ids[i]) ? 'has' : ''}`} onClick={() => setTab(i)}>
            {l}
          </button>
        ))}
        <span className="spacer" />
        <button className={`btn sm ${library ? 'primary' : 'ghost'}`} onClick={() => setLibrary((v) => !v)} aria-pressed={library} title="Pull cards from the prep vault">
          <Library /> Cards
        </button>
      </div>

      {doc ? (
        <>
          <div className="sd-bar">
            <select className="select sm" value={doc.id} onChange={(e) => (e.target.value === '__new' ? bind(tab) : bind(tab, e.target.value))} aria-label={`Doc for ${labels[tab]}`}>
              {docs.map((d) => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
              <option value="__new">+ New blank speech doc</option>
            </select>
            <Link to={`/app/vaults/${doc.id}`} className="btn ghost sm">Open full doc</Link>
          </div>
          <div className={`sd-body ${library ? 'with-lib' : ''}`}>
            <MiniEditor key={doc.id} doc={doc} />
            {library && <LibraryPicker docId={doc.id} onClose={() => setLibrary(false)} />}
          </div>
        </>
      ) : (
        <div className="sd-empty">
          <p>
            <b>{labels[tab]}</b> has no doc yet.
          </p>
          <button className="btn primary" onClick={() => bind(tab)}>Start a blank {labels[tab]} doc</button>
          {docs.length > 0 && (
            <label className="sd-pick">
              <span>or use one from your vault</span>
              <select className="select" value="" onChange={(e) => e.target.value && bind(tab, e.target.value)} aria-label={`Use a vault doc for ${labels[tab]}`}>
                <option value="">Choose a doc…</option>
                {docs.map((d) => (
                  <option key={d.id} value={d.id}>{d.title}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}
    </section>
  )
}

function MiniEditor({ doc }: { doc: Doc }) {
  const { editor, json } = useVerbatimEditor(doc, 'Type your speech, or pull cards in with Cards')
  const stats = useMemo(() => docStats(json), [json])
  if (!editor) return null
  return (
    <div className="sd-editor">
      <Ribbon editor={editor} />
      <div className="sd-scroll">
        <div className="doc-sheet sd-sheet">
          <EditorContent editor={editor} className="verbatim" />
        </div>
      </div>
      <div className="sd-foot mono dim">
        <span>{stats.cards} cards</span>
        <span>{formatSeconds(stats.readSeconds)} read</span>
      </div>
    </div>
  )
}

function LibraryPicker({ docId, onClose }: { docId: string; onClose: () => void }) {
  const cards = useLibrary()
  const toast = useOS((s) => s.toast)
  const [q, setQ] = useState('')
  const shown = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    return (cards ?? []).filter((c) => words.every((w) => cardHaystack(c).includes(w))).slice(0, 40)
  }, [cards, q])
  return (
    <aside className="sd-lib" aria-label="Card library">
      <div className="sd-lib-head">
        <label className="lib-search">
          <Search size={14} aria-hidden />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search cards" aria-label="Search cards" />
        </label>
        <button className="btn icon ghost sm" onClick={onClose} aria-label="Close card library"><X /></button>
      </div>
      <div className="sd-lib-list">
        {!cards && <div className="skeleton" style={{ height: 120 }} />}
        {cards && !cards.length && <p className="dim">The card library is being cut.</p>}
        {shown.map((c) => (
          <CardView
            key={c.id}
            card={c}
            compact
            sendLabel="Insert at the end of this speech doc"
            onSend={(card) => {
              sendCardToDoc(card, docId)
              toast({ title: 'Card inserted', body: card.tag.slice(0, 70), tone: 'success' })
            }}
          />
        ))}
      </div>
    </aside>
  )
}
