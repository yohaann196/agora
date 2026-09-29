import { AppWindow, Eye, Link2, NotebookPen, Pencil, Pin, PinOff, Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { EntityLink } from '../../components/ui/EntityLink'
import { timeAgo } from '../../components/ui/primitives'
import { RichText } from '../../components/ui/RichText'
import { search } from '../../model/graph'
import { useOS } from '../../store'
import { useKnowledgeGraph } from '../../store/graph'
import './workspace.css'

function LinkInserter({ onInsert }: { onInsert: (id: string) => void }) {
  const g = useKnowledgeGraph()
  const [q, setQ] = useState('')
  const hits = useMemo(() => (q.trim() ? search(g, q, ['concept', 'philosopher', 'text', 'school', 'argument'], 6) : []), [g, q])
  return (
    <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
      <input className="input" style={{ height: 28, fontSize: 'var(--fs-12)' }} placeholder="Link an idea…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Insert link" />
      {hits.length > 0 && (
        <div className="glass" style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 5, borderRadius: 'var(--r-2)', padding: 4 }}>
          {hits.map((h) => (
            <button key={h.node.id} className={`result-row k-${h.node.kind}`} onClick={() => { onInsert(h.node.id); setQ('') }}>
              <span style={{ width: 6, height: 6, borderRadius: 6, background: 'var(--tag)' }} />
              <span className="r-label">{h.node.label}</span>
              <span className="r-kind">{h.node.kind}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function NotesPage() {
  const { id } = useParams()
  const notes = useOS((s) => s.notes)
  const { createNote, updateNote, deleteNote, openWindow, pushRecent } = useOS.getState()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [preview, setPreview] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const sorted = useMemo(
    () => [...notes].filter((n) => !q || (n.title + n.body).toLowerCase().includes(q.toLowerCase())).sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.updatedAt - a.updatedAt),
    [notes, q],
  )
  const current = notes.find((n) => n.id === id) ?? sorted[0]
  useEffect(() => {
    if (current) pushRecent({ kind: 'note', id: current.id })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id])

  const backlinks = current ? notes.filter((n) => n.id !== current.id && n.links.some((l) => current.links.includes(l))) : []

  const insertLink = (lid: string) => {
    if (!current) return
    const el = bodyRef.current
    const pos = el?.selectionStart ?? current.body.length
    updateNote(current.id, { body: current.body.slice(0, pos) + `[[${lid}]]` + current.body.slice(pos) })
  }

  return (
    <div className="page notes-page">
      <aside className="notes-list">
        <div className="hstack" style={{ justifyContent: 'space-between', padding: '0 4px' }}>
          <div className="t0" style={{ fontWeight: 500 }}>Notes</div>
          <button className="btn sm primary" onClick={() => navigate(`/app/notes/${createNote()}`)}>
            <Plus /> New
          </button>
        </div>
        <div className="search-box" style={{ margin: '10px 0' }}>
          <Search aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes" aria-label="Search notes" />
        </div>
        <div className="notes-scroll">
          {sorted.map((n) => (
            <button key={n.id} className={`note-item ${current?.id === n.id ? 'on' : ''}`} onClick={() => navigate(`/app/notes/${n.id}`)}>
              <div className="hstack" style={{ justifyContent: 'space-between' }}>
                <span className="t0 truncate" style={{ fontWeight: 500 }}>{n.title || 'Untitled'}</span>
                {n.pinned && <Pin size={11} style={{ color: 'var(--amber)', flex: 'none' }} />}
              </div>
              <p className="clamp-2">{n.body.replace(/\[\[([a-z0-9-]+)\]\]/g, '$1').replace(/Links:.*/s, '') || 'Empty note'}</p>
              <span className="mono dim" style={{ fontSize: 10 }}>{timeAgo(n.updatedAt)} · {n.links.length} links</span>
            </button>
          ))}
          {!sorted.length && <p className="dim" style={{ padding: 10, fontSize: 'var(--fs-12)' }}>No notes match.</p>}
        </div>
      </aside>

      <section className="note-editor">
        {current ? (
          <>
            <div className="note-bar">
              <div className="seg" role="group" aria-label="Mode">
                <button aria-pressed={!preview} onClick={() => setPreview(false)}><Pencil size={12} style={{ display: 'inline', verticalAlign: -1, marginRight: 5 }} />Write</button>
                <button aria-pressed={preview} onClick={() => setPreview(true)}><Eye size={12} style={{ display: 'inline', verticalAlign: -1, marginRight: 5 }} />Linked view</button>
              </div>
              {!preview && (
                <>
                  <Link2 size={14} className="dim" />
                  <LinkInserter onInsert={insertLink} />
                </>
              )}
              <span className="spacer" />
              <button className="btn ghost sm" onClick={() => updateNote(current.id, { pinned: !current.pinned })}>
                {current.pinned ? <PinOff /> : <Pin />} {current.pinned ? 'Unpin' : 'Pin'}
              </button>
              <button className="btn ghost sm" onClick={() => openWindow('note', { kind: 'note', id: current.id })}>
                <AppWindow /> Window
              </button>
              <button className="btn ghost sm danger" onClick={() => { deleteNote(current.id); navigate('/app/notes') }}>
                <Trash2 />
              </button>
            </div>
            <div className="note-doc">
              <input className="note-title" value={current.title} onChange={(e) => updateNote(current.id, { title: e.target.value })} aria-label="Note title" placeholder="Untitled" />
              <div className="mono dim" style={{ fontSize: 10.5, marginBottom: 20 }}>Edited {timeAgo(current.updatedAt)} · autosaved</div>
              {preview ? (
                <RichText text={current.body || '*Nothing here yet.*'} className="note-rich" />
              ) : (
                <textarea
                  ref={bodyRef}
                  className="note-body"
                  value={current.body}
                  onChange={(e) => updateNote(current.id, { body: e.target.value })}
                  placeholder={'Think on the page.\n\nLink ideas with [[justice]], [[kant]] or [[bad-faith]] — they become edges on your knowledge graph.'}
                  aria-label="Note body"
                />
              )}
            </div>
          </>
        ) : (
          <div className="empty" style={{ margin: 40 }}>
            <NotebookPen />
            <p>No notes yet.</p>
            <button className="btn primary sm" onClick={() => navigate(`/app/notes/${createNote()}`)}>Write the first one</button>
          </div>
        )}
      </section>

      {current && (
        <aside className="note-side">
          <div className="eyebrow">Linked ideas</div>
          <div className="chips">
            {current.links.map((l) => <EntityLink key={l} id={l} variant="chip" />)}
            {!current.links.length && <p className="dim" style={{ fontSize: 'var(--fs-11)' }}>Type [[ ]] around an id, or use “Link an idea”.</p>}
          </div>
          <div className="eyebrow" style={{ marginTop: 18 }}>Related notes</div>
          <div className="link-list">
            {backlinks.map((b) => (
              <button key={b.id} className="link-row" style={{ textAlign: 'left' }} onClick={() => navigate(`/app/notes/${b.id}`)}>
                <NotebookPen size={12} className="dim" />
                <span className="t0 truncate">{b.title}</span>
                <span className="rel">{b.links.filter((l) => current.links.includes(l)).length} shared</span>
              </button>
            ))}
            {!backlinks.length && <p className="dim" style={{ fontSize: 'var(--fs-11)' }}>No other notes share these links.</p>}
          </div>
        </aside>
      )}
    </div>
  )
}
