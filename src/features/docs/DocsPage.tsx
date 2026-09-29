import Highlight from '@tiptap/extension-highlight'
import Placeholder from '@tiptap/extension-placeholder'
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { motion } from 'framer-motion'
import { ClipboardCopy, Download, FileText, Globe, Plus, Redo2, Search, Send, Timer, Trash2, Undo2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { PageHeader, timeAgo } from '../../components/ui/primitives'
import type { Doc, DocJSON, DocType, Side } from '../../model/types'
import { LEVEL_NAME, cards, docStats, formatSeconds, outline, plainText } from '../../research/docModel'
import { READ_WPM } from '../../research/formats'
import { useOS } from '../../store'
import { NotFound } from '../workspace/NotFound'
import { copyRich, docToHtml, download } from './docExport'
import { Emphasis, HIGHLIGHT, Roles, VerbatimKeys, clearFormatting, condense, setRole } from './editorExtensions'
import './docs.css'

const TYPE_LABEL: Record<DocType, string> = { contention: 'Contention', block: 'Block', speech: 'Speech doc', file: 'Research file', research: 'Notes' }
const VAULTS: { type: DocType | 'all'; label: string; lede: string }[] = [
  { type: 'contention', label: 'Contention vault', lede: 'Your cases for each topic and side: framework, contentions and the cards that prove them.' },
  { type: 'block', label: 'Block vault', lede: 'Frontlines, answers and framework blocks you can send into any speech.' },
  { type: 'all', label: 'All docs', lede: 'Every contention, block, speech doc and research file.' },
]

export function DocsIndex() {
  const all = useOS((s) => s.docs)
  const target = useOS((s) => s.cutTarget)
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [side, setSide] = useState<'all' | 'aff' | 'neg'>('all')
  const type = (params.get('type') ?? 'contention') as DocType | 'all'
  const vault = VAULTS.find((v) => v.type === type) ?? VAULTS[2]
  const docs = all.filter((d) => (type === 'all' || d.type === type) && (side === 'all' || d.side === side || d.side === 'both'))
  const create = (t: DocType) => navigate(`/app/vaults/${useOS.getState().createDoc(t, undefined, side !== 'all' ? { side } : undefined)}`)
  return (
    <div className="page">
      <PageHeader
        eyebrow="Prep · vaults"
        title={vault.label}
        lede={vault.lede}
        actions={
          <>
            {type !== 'block' && <button className="btn" onClick={() => create('block')}><Plus /> Block</button>}
            <button className="btn" onClick={() => create('speech')}><Plus /> Speech doc</button>
            <button className="btn primary" onClick={() => create(type === 'block' ? 'block' : 'contention')}><Plus /> {type === 'block' ? 'New block' : 'New contention'}</button>
          </>
        }
      />
      <div className="vault-bar">
        <div className="seg" role="tablist" aria-label="Vault">
          {VAULTS.map((v) => (
            <button key={v.type} role="tab" aria-selected={type === v.type} onClick={() => setParams({ type: v.type }, { replace: true })}>
              {v.label.replace(' vault', 's').replace('Contentions', 'Contentions')}
            </button>
          ))}
        </div>
        <div className="seg" role="radiogroup" aria-label="Side">
          {(['all', 'aff', 'neg'] as const).map((sd) => (
            <button key={sd} role="radio" aria-checked={side === sd} onClick={() => setSide(sd)}>{sd === 'all' ? 'Both sides' : sd === 'aff' ? 'Aff' : 'Neg'}</button>
          ))}
        </div>
      </div>
      <div className="doc-grid">
        {docs.map((d, i) => {
          const st = docStats(d.content)
          const tags = cards(d.content).filter((c) => c.tag).slice(0, 3)
          return (
            <motion.div key={d.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} style={{ display: 'grid' }}>
              <Link to={`/app/vaults/${d.id}`} className={`doc-card ${d.type}`}>
                <div className="dc-top">
                  <span className="dc-type">{TYPE_LABEL[d.type]}</span>
                  {d.side && d.side !== 'both' && <span className={`tag ${d.side}`}>{d.side === 'aff' ? 'Aff' : 'Neg'}</span>}
                  {d.id === target && <span className="dc-target">Cutting into</span>}
                </div>
                <h3 className="dc-title">{d.title}</h3>
                <ul className="dc-tags">
                  {tags.map((c) => (
                    <li key={c.index}>{c.tag}</li>
                  ))}
                  {!tags.length && <li className="dim">No cards yet</li>}
                </ul>
                <div className="dc-foot mono">
                  <span>{st.cards} cards</span>
                  <span>{formatSeconds(st.readSeconds)} read</span>
                  <span className="spacer" />
                  <span>{timeAgo(d.updatedAt)}</span>
                </div>
              </Link>
            </motion.div>
          )
        })}
        {!docs.length && <div className="empty">Nothing here yet. Create one, or cut cards from Evidence.</div>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function indexToPos(editor: Editor, index: number) {
  let pos = 0
  for (let i = 0; i < index && i < editor.state.doc.childCount; i++) pos += editor.state.doc.child(i).nodeSize
  return pos
}

/** The block at the cursor: the nearest heading above it and everything under it. */
function blockAtCursor(editor: Editor): DocJSON[] {
  const json = editor.getJSON() as DocJSON
  const nodes = json.content ?? []
  const idx = editor.state.selection.$from.index(0)
  let start = idx
  while (start > 0 && nodes[start].type !== 'heading') start--
  if (nodes[start]?.type !== 'heading') return nodes.slice(idx, idx + 1)
  const level = Number(nodes[start].attrs?.level ?? 4)
  let end = start + 1
  while (end < nodes.length && !(nodes[end].type === 'heading' && Number(nodes[end].attrs?.level ?? 4) <= level)) end++
  return nodes.slice(start, end)
}

function Ribbon({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h1: e.isActive('heading', { level: 1 }),
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      h4: e.isActive('heading', { level: 4 }),
      cite: e.isActive('paragraph', { role: 'cite' }),
      card: e.isActive('paragraph', { role: 'card' }),
      u: e.isActive('underline'),
      em: e.isActive('emphasis'),
      hl: e.isActive('highlight'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  })
  const b = (label: string, key: string, on: boolean, run: () => void, cls = '') => (
    <button className={`rb ${cls} ${on ? 'on' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={run} title={`${label} (${key})`} aria-pressed={on}>
      <span className="rb-label">{label}</span>
      <span className="rb-key">{key}</span>
    </button>
  )
  const h = (level: 1 | 2 | 3 | 4) => () => editor.chain().focus().toggleHeading({ level }).run()
  return (
    <div className="ribbon" role="toolbar" aria-label="Formatting">
      <div className="rb-group">
        {b('Pocket', 'F4', s.h1, h(1), 'rb-pocket')}
        {b('Hat', 'F5', s.h2, h(2), 'rb-hat')}
        {b('Block', 'F6', s.h3, h(3), 'rb-block')}
        {b('Tag', 'F7', s.h4, h(4), 'rb-tag')}
        {b('Cite', 'F8', s.cite, () => setRole(editor, s.cite ? null : 'cite'))}
        {b('Card', '⌘⌥6', s.card, () => setRole(editor, s.card ? null : 'card'))}
      </div>
      <div className="rb-group">
        {b('Underline', 'F9', s.u, () => editor.chain().focus().toggleUnderline().run(), 'rb-u')}
        {b('Emphasis', 'F10', s.em, () => editor.chain().focus().toggleMark('emphasis').run(), 'rb-em')}
        {b('Highlight', 'F11', s.hl, () => editor.chain().focus().toggleHighlight({ color: HIGHLIGHT }).run(), 'rb-hl')}
        {b('Clear', 'F12', false, () => clearFormatting(editor))}
        {b('Condense', 'join', false, () => condense(editor))}
      </div>
      <div className="rb-group">
        <button className="btn icon sm ghost" aria-label="Undo" disabled={!s.canUndo} onClick={() => editor.chain().focus().undo().run()}><Undo2 /></button>
        <button className="btn icon sm ghost" aria-label="Redo" disabled={!s.canRedo} onClick={() => editor.chain().focus().redo().run()}><Redo2 /></button>
      </div>
    </div>
  )
}

function DocEditor({ doc }: { doc: Doc }) {
  const { updateDoc, deleteDoc, appendToDoc, createDoc, toast, setCutTarget } = useOS.getState()
  const docs = useOS((s) => s.docs)
  const target = useOS((s) => s.cutTarget)
  const navigate = useNavigate()
  const lastSaved = useRef(JSON.stringify(doc.content))
  const timer = useRef<number | undefined>(undefined)
  const [json, setJson] = useState<DocJSON>(doc.content)
  const [sendTo, setSendTo] = useState(() => docs.find((d) => d.id !== doc.id && d.type === 'speech')?.id ?? '')
  const [q, setQ] = useState('')
  const [wpm, setWpm] = useState(READ_WPM)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] }, codeBlock: false, code: false, link: { openOnClick: false } }),
      Highlight.configure({ multicolor: true }),
      Emphasis,
      Roles,
      VerbatimKeys,
      Placeholder.configure({
        placeholder: ({ node }) => (node.type.name === 'heading' ? `${LEVEL_NAME[node.attrs.level as number]}…` : node.attrs.role === 'cite' ? 'Author YY — qualifications, title, publication, date, URL' : node.attrs.role === 'card' ? 'Card text — paste it exactly as written' : 'Type, or cut cards in the Research Browser'),
      }),
    ],
    content: doc.content,
    onUpdate: ({ editor: e }) => {
      const next = e.getJSON() as DocJSON
      setJson(next)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        lastSaved.current = JSON.stringify(next)
        updateDoc(doc.id, { content: next })
      }, 350)
    },
  })

  // Cards cut in the browser (or sent from another doc) arrive through the store.
  useEffect(() => {
    const str = JSON.stringify(doc.content)
    if (editor && str !== lastSaved.current) {
      lastSaved.current = str
      editor.commands.setContent(doc.content, { emitUpdate: false })
      setJson(doc.content)
    }
  }, [doc.content, editor])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const items = useMemo(() => outline(json), [json])
  const stats = useMemo(() => docStats(json), [json])
  const readSeconds = Math.round((stats.highlightedWords / wpm) * 60)
  const allCards = useMemo(
    () =>
      q.trim()
        ? docs.flatMap((d) => cards(d.content).map((c) => ({ ...c, doc: d }))).filter((c) => `${c.tag} ${c.cite} ${c.body}`.toLowerCase().includes(q.toLowerCase())).slice(0, 12)
        : [],
    [docs, q],
  )

  if (!editor) return null

  const jump = (index: number) => {
    const pos = indexToPos(editor, index)
    editor.chain().focus().setTextSelection(pos + 1).run()
    const dom = editor.view.nodeDOM(pos) as HTMLElement | null
    dom?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const send = () => {
    const nodes = blockAtCursor(editor)
    let dest = sendTo
    if (!dest) {
      dest = createDoc('speech', `Speech — ${doc.title}`)
      setSendTo(dest)
    }
    appendToDoc(dest, nodes)
    const d = useOS.getState().docs.find((x) => x.id === dest)
    toast({ title: `Sent to “${d?.title}”`, body: `${nodes.length} paragraph${nodes.length === 1 ? '' : 's'}: ${plainText(nodes[0]).slice(0, 60)}`, tone: 'success' })
  }

  const insertCard = (docId: string, index: number) => {
    const src = docs.find((d) => d.id === docId)!
    const nodes = src.content.content ?? []
    let end = index + 1
    while (end < nodes.length && nodes[end].type !== 'heading') end++
    editor.chain().focus().insertContent(nodes.slice(index, end)).run()
    toast({ title: 'Card inserted', tone: 'success' })
  }

  const exportHtml = docToHtml(json, doc.title)

  return (
    <div className="page doc-page">
      <aside className="doc-nav" aria-label="Navigation pane">
        <input className="doc-title-input" value={doc.title} onChange={(e) => updateDoc(doc.id, { title: e.target.value })} aria-label="Document title" />
        <div className="hstack" style={{ gap: 6, flexWrap: 'wrap' }}>
          <select className="select doc-mini-select" value={doc.type} onChange={(e) => updateDoc(doc.id, { type: e.target.value as DocType })} aria-label="Vault">
            <option value="contention">Contention</option>
            <option value="block">Block</option>
            <option value="speech">Speech doc</option>
            <option value="file">Research file</option>
            <option value="research">Notes</option>
          </select>
          <select className="select doc-mini-select" value={doc.side ?? 'both'} onChange={(e) => updateDoc(doc.id, { side: e.target.value as Side })} aria-label="Side">
            <option value="aff">Aff</option>
            <option value="neg">Neg</option>
            <option value="both">Both sides</option>
          </select>
          {target === doc.id ? (
            <span className="dc-target">Cutting into</span>
          ) : (
            <button className="btn ghost sm" onClick={() => setCutTarget(doc.id)}>Cut into this</button>
          )}
        </div>
        <div className="eyebrow" style={{ marginTop: 12 }}>Navigation</div>
        <nav className="doc-outline">
          {items.map((it) => (
            <button key={it.index} className={`do-item l${it.level}`} onClick={() => jump(it.index)}>
              <span className="do-lvl">{LEVEL_NAME[it.level]?.[0]}</span>
              <span className="truncate">{it.title}</span>
            </button>
          ))}
          {!items.length && <p className="dim letter" style={{ fontSize: 'var(--fs-11)' }}>Headings you add appear here.</p>}
        </nav>
        <div className="doc-nav-foot">
          <Link to="/app/evidence" className="btn sm"><Globe /> Evidence</Link>
          <button
            className="btn ghost sm danger"
            onClick={() => {
              deleteDoc(doc.id)
              navigate(`/app/vaults?type=${doc.type === 'block' ? 'block' : 'contention'}`)
            }}
          >
            <Trash2 /> Delete
          </button>
        </div>
      </aside>

      <section className="doc-main">
        <Ribbon editor={editor} />
        <div className="doc-scroll">
          <div className="doc-sheet">
            <EditorContent editor={editor} className="verbatim" />
          </div>
        </div>
      </section>

      <aside className="doc-side">
        <div className="panel">
          <div className="panel-head"><h3><Timer /> Read time</h3></div>
          <div className="panel-body doc-stats">
            <div className="big-time">{formatSeconds(readSeconds)}</div>
            <p className="dim" style={{ fontSize: 'var(--fs-11)' }}>{stats.highlightedWords} highlighted words at</p>
            <label className="hstack" style={{ gap: 6, fontSize: 'var(--fs-11)' }}>
              <input className="input" type="number" min={120} max={450} step={10} value={wpm} onChange={(e) => setWpm(Math.max(60, Number(e.target.value) || READ_WPM))} style={{ width: 80, padding: '3px 6px' }} aria-label="Words per minute" /> words per minute
            </label>
            <div className="stat-row mono">
              <span>{stats.cards} cards</span>
              <span>{stats.words} words</span>
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><h3><Send /> Send to speech</h3></div>
          <div className="panel-body" style={{ display: 'grid', gap: 8 }}>
            <p className="dim" style={{ fontSize: 'var(--fs-11)' }}>Sends the card or block at your cursor to another doc.</p>
            <select className="select" value={sendTo} onChange={(e) => setSendTo(e.target.value)} aria-label="Send to document">
              <option value="">New speech doc</option>
              {docs.filter((d) => d.id !== doc.id).map((d) => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
            <button className="btn primary sm" onClick={send}><Send /> Send block</button>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><h3><Search /> Find a card</h3></div>
          <div className="panel-body" style={{ display: 'grid', gap: 8 }}>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tags, cites, text in every doc" aria-label="Search cards" />
            {allCards.map((c) => (
              <button key={c.doc.id + c.index} className="card-hit" onClick={() => insertCard(c.doc.id, c.index)} title="Insert at cursor">
                <span className="ch-tag">{c.tag}</span>
                <span className="ch-cite mono">{c.cite.split(' — ')[0]} · {c.doc.title}</span>
              </button>
            ))}
            {q.trim() && !allCards.length && <p className="dim" style={{ fontSize: 'var(--fs-11)' }}>No cards match.</p>}
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><h3><FileText /> Export</h3></div>
          <div className="panel-body" style={{ display: 'grid', gap: 6 }}>
            <button
              className="btn sm"
              onClick={async () => {
                try {
                  await copyRich(exportHtml, plainText(json))
                  toast({ title: 'Copied with formatting', body: 'Paste into Word or Google Docs.', tone: 'success' })
                } catch {
                  toast({ title: 'Couldn’t copy', body: 'Your browser blocked clipboard access. Use Download instead.' })
                }
              }}
            >
              <ClipboardCopy /> Copy for Word / Docs
            </button>
            <button className="btn sm" onClick={() => download(`${doc.title.replace(/[^\w\- ]+/g, '').trim() || 'speech-doc'}.html`, exportHtml, 'text/html')}>
              <Download /> Download .html (opens in Word)
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}

export function DocPage() {
  const { id = '' } = useParams()
  const doc = useOS((s) => s.docs.find((d) => d.id === id))
  const pushRecent = useOS((s) => s.pushRecent)
  useEffect(() => {
    if (doc) pushRecent({ kind: 'doc', id: doc.id, label: doc.title })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])
  if (!doc) return <NotFound />
  return <DocEditor key={doc.id} doc={doc} />
}
