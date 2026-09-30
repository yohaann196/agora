import { motion } from 'framer-motion'
import { ArrowRight, Download, FileInput, PanelLeft, PanelRightClose, PanelRightOpen, Plus, Star, Trash2, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { PageHeader, timeAgo } from '../../components/ui/primitives'
import type { Flow, FlowFormat, FlowSheet } from '../../model/types'
import { outline } from '../../research/docModel'
import { FORMATS, sideFor } from '../../research/formats'
import { useOS } from '../../store'
import { download } from '../docs/docExport'
import { NotFound } from '../workspace/NotFound'
import { RoundTimer } from './RoundTimer'
import { SpeechDocs } from './SpeechDocs'
import { useTimer } from './timerStore'
import './flow.css'

type Mark = 'dropped' | 'extend' | 'key'
const MARK_LABEL: Record<Mark, string> = { dropped: 'Dropped', extend: 'Extend', key: 'Key' }

const rowCount = (sh: FlowSheet) => Math.max(1, ...sh.columns.map((c) => c.length))

/** Pad every column to the same height so rows line up across speeches. */
function normalize(columns: string[][], rows: number) {
  return columns.map((c) => (c.length >= rows ? c : [...c, ...Array(rows - c.length).fill('')]))
}

function remap(sheet: FlowSheet, format: FlowFormat): FlowSheet {
  const n = FORMATS[format].flowColumns.length
  const rows = rowCount(sheet)
  const columns = Array.from({ length: n }, (_, i) => sheet.columns[i] ?? [])
  return { ...sheet, columns: normalize(columns, rows) }
}

function toCsv(flow: Flow, sheet: FlowSheet) {
  const cols = FORMATS[flow.format].flowColumns
  const rows = rowCount(sheet)
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`
  const lines = [cols.map((c) => q(c.label)).join(',')]
  for (let r = 0; r < rows; r++) lines.push(cols.map((_, c) => q(sheet.columns[c]?.[r] ?? '')).join(','))
  return lines.join('\n')
}

/* ------------------------------------------------------------------ */

export function FlowIndex() {
  const flows = useOS((s) => s.flows)
  const navigate = useNavigate()
  const timerFormat = useTimer((s) => s.format)
  const [format, setFormat] = useState<FlowFormat>(timerFormat)
  const create = (f: FlowFormat) => navigate(`/app/flow/${useOS.getState().createFlow(f)}`)
  return (
    <div className="page">
      <PageHeader
        eyebrow="Debate · flowing & timing"
        title="Flow & Timer"
        lede="Flow the round speech by speech, mark what was dropped or extended, and keep time for speeches and prep. Everything saves as you type."
        actions={
          <>
            <button className="btn" onClick={() => create('policy')}><Plus /> Policy flow</button>
            <button className="btn" onClick={() => create('pf')}><Plus /> PF flow</button>
            <button className="btn primary" onClick={() => create('ld')}><Plus /> LD flow</button>
          </>
        }
      />
      <div className="flow-index">
        <div className="flow-cards">
          {flows.map((f, i) => {
            const cells = f.sheets.reduce((n, sh) => n + sh.columns.flat().filter((x) => x.trim()).length, 0)
            return (
              <motion.div key={f.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} style={{ display: 'grid' }}>
                <Link to={`/app/flow/${f.id}`} className="flow-card">
                  <span className="fc-format">{FORMATS[f.format].label}</span>
                  <h3 className="fc-title">{f.title}</h3>
                  <div className="fc-sheets">
                    {f.sheets.map((sh) => (
                      <span key={sh.id}>{sh.title}</span>
                    ))}
                  </div>
                  <div className="fc-strip" aria-hidden>
                    {FORMATS[f.format].flowColumns.map((c, j) => (
                      <i key={j} className={sideFor(f.format, c.side, f.affFirst)} />
                    ))}
                  </div>
                  <div className="dc-foot mono">
                    <span>{f.sheets.length} sheets</span>
                    <span>{cells} arguments</span>
                    <span className="spacer" />
                    <span>{timeAgo(f.updatedAt)}</span>
                  </div>
                </Link>
              </motion.div>
            )
          })}
          {!flows.length && <p className="dim letter">No flows yet. Start one for your next round.</p>}
        </div>
        <aside className="flow-index-timer">
          <div className="seg" role="radiogroup" aria-label="Timer format">
            {(Object.keys(FORMATS) as FlowFormat[]).map((f) => (
              <button key={f} role="radio" aria-checked={format === f} onClick={() => setFormat(f)}>{FORMATS[f].short}</button>
            ))}
          </div>
          <RoundTimer format={format} />
        </aside>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Cell({ value, mark, side, c, r, onChange, onKey, onFocus }: { value: string; mark?: Mark; side: 'aff' | 'neg'; c: number; r: number; onChange: (v: string) => void; onKey: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void; onFocus: () => void }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  return (
    <div className={`fl-cell ${side} ${mark ? `m-${mark}` : ''}`}>
      <textarea ref={ref} rows={1} value={value} data-cell={`${c}:${r}`} onChange={(e) => onChange(e.target.value)} onKeyDown={onKey} onFocus={onFocus} spellCheck={false} aria-label={`Column ${c + 1}, row ${r + 1}`} />
      {mark === 'dropped' && <span className="fl-stamp">Dropped</span>}
      {mark === 'extend' && <ArrowRight className="fl-extend" size={14} aria-label="Extended" />}
      {mark === 'key' && <Star className="fl-key" size={13} aria-label="Key argument" />}
    </div>
  )
}

function FlowBoard({ flow }: { flow: Flow }) {
  const { updateFlow, updateSheet, addSheet, removeSheet, deleteFlow, toast } = useOS.getState()
  const docs = useOS((s) => s.docs)
  const navigate = useNavigate()
  const [sheetId, setSheetId] = useState(flow.sheets[0]?.id ?? '')
  const [renaming, setRenaming] = useState<string | null>(null)
  const [focus, setFocus] = useState<{ c: number; r: number } | null>(null)
  const pending = useRef<string | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const [split, setSplit] = useState(() => {
    try {
      return Number(localStorage.getItem('du:flow-split')) || 42
    } catch {
      return 42
    }
  })
  const [docsOpen, setDocsOpen] = useState(true)

  /** Drag the divider to trade space between the flow and the speech docs. */
  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault()
    const rect = pageRef.current?.getBoundingClientRect()
    if (!rect) return
    const onMove = (ev: PointerEvent) => setSplit(Math.min(70, Math.max(24, ((rect.right - ev.clientX) / rect.width) * 100)))
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      setSplit((v) => {
        try {
          localStorage.setItem('du:flow-split', String(Math.round(v)))
        } catch {
          // Width just won't be remembered.
        }
        return v
      })
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const sheet = flow.sheets.find((s) => s.id === sheetId) ?? flow.sheets[0]
  const cols = FORMATS[flow.format].flowColumns
  const rows = rowCount(sheet)
  const columns = useMemo(() => normalize(sheet.columns, rows), [sheet.columns, rows])

  useEffect(() => {
    if (!pending.current) return
    const el = boardRef.current?.querySelector<HTMLTextAreaElement>(`[data-cell="${pending.current}"]`)
    pending.current = null
    el?.focus()
  })

  const setCell = (c: number, r: number, v: string) => {
    const next = columns.map((col) => [...col])
    next[c][r] = v
    updateSheet(flow.id, sheet.id, { columns: next })
  }

  const move = (c: number, r: number) => {
    const el = boardRef.current?.querySelector<HTMLTextAreaElement>(`[data-cell="${c}:${r}"]`)
    if (el) el.focus()
    else pending.current = `${c}:${r}`
  }

  const insertRow = (at: number) => {
    const next = columns.map((col) => [...col.slice(0, at), '', ...col.slice(at)])
    // Marks below the insertion point shift down with their cells.
    const marks: FlowSheet['marks'] = {}
    for (const [k, m] of Object.entries(sheet.marks)) {
      const [c, r] = k.split(':').map(Number)
      marks[`${c}:${r >= at ? r + 1 : r}`] = m
    }
    updateSheet(flow.id, sheet.id, { columns: next, marks })
  }

  const deleteRow = (at: number) => {
    if (rows <= 1) return
    const next = columns.map((col) => col.filter((_, i) => i !== at))
    const marks: FlowSheet['marks'] = {}
    for (const [k, m] of Object.entries(sheet.marks)) {
      const [c, r] = k.split(':').map(Number)
      if (r !== at) marks[`${c}:${r > at ? r - 1 : r}`] = m
    }
    updateSheet(flow.id, sheet.id, { columns: next, marks })
    setFocus(null)
  }

  const toggleMark = (m: Mark, at = focus) => {
    if (!at) return
    const k = `${at.c}:${at.r}`
    const marks = { ...sheet.marks }
    if (marks[k] === m) delete marks[k]
    else marks[k] = m
    updateSheet(flow.id, sheet.id, { marks })
  }

  const onKey = (c: number, r: number) => (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.altKey) {
      e.preventDefault()
      if (r + 1 >= rows) {
        updateSheet(flow.id, sheet.id, { columns: columns.map((col) => [...col, '']) })
        pending.current = `${c}:${r + 1}`
      } else move(c, r + 1)
      return
    }
    if (e.altKey && e.key.startsWith('Arrow')) {
      e.preventDefault()
      if (e.key === 'ArrowDown') move(c, Math.min(rows - 1, r + 1))
      if (e.key === 'ArrowUp') move(c, Math.max(0, r - 1))
      if (e.key === 'ArrowRight') move(Math.min(cols.length - 1, c + 1), r)
      if (e.key === 'ArrowLeft') move(Math.max(0, c - 1), r)
      return
    }
    if (e.altKey && ['Digit1', 'Digit2', 'Digit3'].includes(e.code)) {
      e.preventDefault()
      toggleMark(e.code === 'Digit1' ? 'dropped' : e.code === 'Digit2' ? 'extend' : 'key', { c, r })
    }
  }

  const changeFormat = (format: FlowFormat) => {
    if (format === flow.format) return
    updateFlow(flow.id, { format, sheets: flow.sheets.map((sh) => remap(sh, format)) })
  }

  const newSheet = () => {
    const title = `Sheet ${flow.sheets.length + 1}`
    addSheet(flow.id, title)
    const added = useOS.getState().flows.find((f) => f.id === flow.id)?.sheets.at(-1)
    if (added) {
      setSheetId(added.id)
      setRenaming(added.id)
    }
  }

  const importTags = (docId: string) => {
    const doc = docs.find((d) => d.id === docId)
    if (!doc) return
    const items = outline(doc.content).filter((it) => it.level >= 3 && it.title.trim())
    if (!items.length) {
      toast({ title: 'No blocks or tags in that doc' })
      return
    }
    const c = focus?.c ?? 0
    let start = columns[c].length
    while (start > 0 && !columns[c][start - 1].trim()) start--
    const need = Math.max(rows, start + items.length)
    const next = normalize(columns.map((col) => [...col]), need)
    items.forEach((it, i) => {
      next[c][start + i] = it.level === 3 ? it.title.toUpperCase() : it.title
    })
    updateSheet(flow.id, sheet.id, { columns: next })
    toast({ title: `Flowed ${items.length} tags from “${doc.title}”`, body: `Into the ${cols[c].label} column.`, tone: 'success' })
  }

  const focusedMark = focus ? sheet.marks[`${focus.c}:${focus.r}`] : undefined

  return (
    <div className={`page flow-page ${docsOpen ? '' : 'no-docs'}`} ref={pageRef} style={{ ['--split' as string]: `${split}%` }}>
      <section className="fl-main">
        <header className="fl-head">
          <button className="btn icon ghost sm" onClick={() => useOS.getState().setMobileNav(true)} aria-label="Open the sidebar" title="Open the sidebar">
            <PanelLeft />
          </button>
          <input className="fl-title" value={flow.title} onChange={(e) => updateFlow(flow.id, { title: e.target.value })} aria-label="Flow title" />
          <div className="seg" role="radiogroup" aria-label="Format">
            {(Object.keys(FORMATS) as FlowFormat[]).map((f) => (
              <button key={f} role="radio" aria-checked={flow.format === f} onClick={() => changeFormat(f)}>{FORMATS[f].short}</button>
            ))}
          </div>
          {flow.format === 'pf' && (
            <label className="fl-toggle">
              <input type="checkbox" checked={flow.affFirst} onChange={(e) => updateFlow(flow.id, { affFirst: e.target.checked })} /> Pro speaks first
            </label>
          )}
          <span className="spacer" />
          <button className="btn sm ghost" onClick={() => setDocsOpen((v) => !v)} aria-pressed={docsOpen} title={docsOpen ? 'Hide speech docs' : 'Show speech docs'}>
            {docsOpen ? <PanelRightClose /> : <PanelRightOpen />} Docs
          </button>
          <button className="btn sm" onClick={() => download(`${flow.title} — ${sheet.title}.csv`.replace(/[\\/:*?"<>|]+/g, ''), toCsv(flow, sheet), 'text/csv')}><Download /> CSV</button>
          <button
            className="btn ghost sm danger"
            onClick={() => {
              deleteFlow(flow.id)
              navigate('/app/flow')
            }}
          >
            <Trash2 /> Delete
          </button>
        </header>

        <div className="fl-sheets" role="tablist" aria-label="Sheets">
          {flow.sheets.map((sh) => (
            <div key={sh.id} className={`fl-sheet-tab ${sh.id === sheet.id ? 'on' : ''}`}>
              {renaming === sh.id ? (
                <input
                  autoFocus
                  className="fl-sheet-input"
                  defaultValue={sh.title}
                  onFocus={(e) => e.target.select()}
                  onBlur={(e) => {
                    updateSheet(flow.id, sh.id, { title: e.target.value.trim() || sh.title })
                    setRenaming(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur()
                  }}
                  aria-label="Sheet name"
                />
              ) : (
                <button role="tab" aria-selected={sh.id === sheet.id} onClick={() => setSheetId(sh.id)} onDoubleClick={() => setRenaming(sh.id)} title="Double-click to rename">
                  {sh.title}
                </button>
              )}
              {flow.sheets.length > 1 && (
                <button className="fl-sheet-x" aria-label={`Remove ${sh.title}`} onClick={() => removeSheet(flow.id, sh.id)}>
                  <X size={11} />
                </button>
              )}
            </div>
          ))}
          <button className="fl-sheet-add" onClick={newSheet} aria-label="Add sheet" title="Add sheet (e.g. a DA, CP or K)"><Plus size={14} /></button>
        </div>

        <div className="fl-tools" role="toolbar" aria-label="Flow tools">
          <div className="fl-marks">
            {(Object.keys(MARK_LABEL) as Mark[]).map((m, i) => (
              <button key={m} className={`fl-mark-btn ${m} ${focusedMark === m ? 'on' : ''}`} disabled={!focus} onMouseDown={(e) => e.preventDefault()} onClick={() => toggleMark(m)} title={`${MARK_LABEL[m]} (Alt+${i + 1})`} aria-pressed={focusedMark === m}>
                {MARK_LABEL[m]}
              </button>
            ))}
          </div>
          <button className="btn ghost sm" disabled={!focus} onMouseDown={(e) => e.preventDefault()} onClick={() => focus && insertRow(focus.r)}>Row above</button>
          <button className="btn ghost sm" disabled={!focus || rows <= 1} onMouseDown={(e) => e.preventDefault()} onClick={() => focus && deleteRow(focus.r)}>Delete row</button>
          <span className="spacer" />
          <label className="fl-import" title="Flow the blocks and tags of a speech doc into the selected column">
            <FileInput size={14} />
            <select value="" onChange={(e) => importTags(e.target.value)} aria-label="Flow tags from a doc">
              <option value="">Flow a doc…</option>
              {docs.map((d) => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="fl-scroll">
          <div className="fl-grid" ref={boardRef} style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(168px, 1fr))` }}>
            {cols.map((col, c) => {
              const side = sideFor(flow.format, col.side, flow.affFirst)
              return (
                <div key={`h${c}`} className={`fl-col-head ${side} ${focus?.c === c ? 'focus' : ''}`}>
                  <span>{col.label}</span>
                  <small>{side === 'aff' ? FORMATS[flow.format].affLabel : FORMATS[flow.format].negLabel}</small>
                </div>
              )
            })}
            {Array.from({ length: rows }, (_, r) =>
              cols.map((col, c) => (
                <Cell
                  key={`${c}:${r}`}
                  c={c}
                  r={r}
                  value={columns[c][r]}
                  mark={sheet.marks[`${c}:${r}`]}
                  side={sideFor(flow.format, col.side, flow.affFirst)}
                  onChange={(v) => setCell(c, r, v)}
                  onKey={onKey(c, r)}
                  onFocus={() => setFocus({ c, r })}
                />
              )),
            )}
          </div>
          <p className="fl-hint dim">
            <kbd>Enter</kbd> next row · <kbd>Tab</kbd> next speech · <kbd>Shift</kbd>+<kbd>Enter</kbd> new line · <kbd>Alt</kbd>+arrows move · <kbd>Alt</kbd>+<kbd>1</kbd>/<kbd>2</kbd>/<kbd>3</kbd> dropped / extend / key
          </p>
        </div>
      </section>
      {docsOpen && (
        <>
          <div className="fl-divider" role="separator" aria-orientation="vertical" aria-label="Resize speech docs" onPointerDown={startDrag} />
          <aside className="fl-side">
            <RoundTimer format={flow.format} affFirst={flow.affFirst} compact />
            <SpeechDocs flow={flow} />
          </aside>
        </>
      )}
    </div>
  )
}

export function FlowPage() {
  const { id = '' } = useParams()
  const flow = useOS((s) => s.flows.find((f) => f.id === id))
  const pushRecent = useOS((s) => s.pushRecent)
  useEffect(() => {
    if (flow) pushRecent({ kind: 'flow', id: flow.id, label: flow.title })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])
  if (!flow) return <NotFound />
  return <FlowBoard key={flow.id} flow={flow} />
}
