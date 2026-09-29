import { AnimatePresence, motion } from 'framer-motion'
import { ClipboardCopy, Scissors } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { Source } from '../../model/types'
import { fullCite, shortCite } from '../../research/cite'
import { cardNodes } from '../../research/docModel'
import { useOS } from '../../store'

export type SourceDraft = Omit<Source, 'id' | 'kind' | 'accessed'>

interface Props {
  children: ReactNode
  /** Build the source for a selection. `el` is the element the selection started in. */
  sourceFor: (el: Element | null) => SourceDraft | null
  className?: string
}

/** Select text inside to cut it into the current speech doc with its citation. */
export function CutLayer({ children, sourceFor, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [sel, setSel] = useState<{ text: string; rect: DOMRect; el: Element | null } | null>(null)
  const [tag, setTag] = useState('')
  const [snip, setSnip] = useState(0)
  const docs = useOS((s) => s.docs)
  const target = useOS((s) => s.cutTarget)
  const { setCutTarget, addSource, appendToDoc, toast } = useOS.getState()

  const onUp = useCallback(() => {
    setTimeout(() => {
      const s = window.getSelection()
      if (!s || s.isCollapsed || !ref.current) return
      const range = s.getRangeAt(0)
      if (!ref.current.contains(range.commonAncestorContainer)) return
      const text = s.toString().replace(/\s+\n/g, '\n').replace(/[ \t]+/g, ' ').trim()
      if (text.length < 12) return
      const start = range.startContainer.nodeType === 1 ? (range.startContainer as Element) : range.startContainer.parentElement
      setSel({ text, rect: range.getBoundingClientRect(), el: start })
      setTag('')
    }, 0)
  }, [])

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.cut-pop')) return
      if (ref.current?.contains(e.target as Node)) return
      setSel(null)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setSel(null)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [])

  const draft = sel ? sourceFor(sel.el) : null
  const previewSource: Source | null = draft ? { ...draft, id: 'preview', kind: 'source', accessed: Date.now() } : null
  const targetDoc = docs.find((d) => d.id === target) ?? docs[0]

  const cut = () => {
    if (!sel || !draft || !tag.trim() || !targetDoc) return
    const id = addSource(draft)
    const source = useOS.getState().sources.find((x) => x.id === id)!
    appendToDoc(targetDoc.id, cardNodes(tag.trim(), source, sel.text))
    if (target !== targetDoc.id) setCutTarget(targetDoc.id)
    setSnip((n) => n + 1)
    toast({ title: `Card cut into “${targetDoc.title}”`, body: `${shortCite(source)} · ${sel.text.split(/\s+/).length} words`, tone: 'success' })
    window.getSelection()?.removeAllRanges()
    setSel(null)
  }

  const copy = async () => {
    if (!sel || !previewSource) return
    const t = `${tag ? tag + '\n' : ''}${shortCite(previewSource)} — ${fullCite(previewSource)}\n${sel.text}`
    try {
      await navigator.clipboard.writeText(t)
      toast({ title: 'Copied with citation', tone: 'success' })
    } catch {
      toast({ title: 'Couldn’t copy', body: 'Your browser blocked clipboard access. Select the text and copy it manually.' })
    }
  }



  const W = 380
  const pos = sel
    ? {
        left: Math.min(Math.max(12, sel.rect.left + sel.rect.width / 2 - W / 2), window.innerWidth - W - 12),
        top: sel.rect.bottom + 12 + 260 < window.innerHeight ? sel.rect.bottom + 12 : Math.max(12, sel.rect.top - 272),
      }
    : null

  return (
    <div ref={ref} className={`cut-layer ${className}`} onMouseUp={onUp} onKeyUp={(e) => e.shiftKey && onUp()}>
      {children}
      {createPortal(
        <AnimatePresence>
          {sel && pos && previewSource && (
            <motion.div
              key="pop"
              className="cut-pop"
              style={{ left: pos.left, top: pos.top, width: W }}
              initial={{ opacity: 0, y: 6, rotate: -0.6 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
              role="dialog"
              aria-label="Cut a card"
            >
              <div className="cut-head">
                <Scissors size={14} /> Cut card <span className="cut-words mono">{sel.text.split(/\s+/).length} words</span>
              </div>
              <input
                className="input cut-tag"
                autoFocus
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && cut()}
                placeholder="Write the tag: what does this card prove?"
                aria-label="Tag"
              />
              <div className="cut-cite">
                <strong>{shortCite(previewSource)}</strong> — {fullCite(previewSource)}
              </div>
              <div className="cut-row">
                <label className="dim" htmlFor="cut-target">Into</label>
                <select id="cut-target" className="select" value={targetDoc?.id ?? ''} onChange={(e) => setCutTarget(e.target.value)}>
                  {docs.map((d) => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </select>
              </div>
              <div className="cut-actions">
                <button className="btn ghost sm" onClick={copy} title="Copy with citation"><ClipboardCopy /> Copy</button>
                <span className="spacer" />
                <button className="btn primary sm" onClick={cut} disabled={!tag.trim() || !targetDoc}>
                  <Scissors /> Cut <span className="kbd">↵</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
      <AnimatePresence>
        {snip > 0 && (
          <motion.div key={snip} className="snip-sfx" initial={{ scale: 0.4, opacity: 0, rotate: -12 }} animate={{ scale: 1, opacity: 1, rotate: -6 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }} onAnimationComplete={() => setTimeout(() => setSnip(0), 500)}>
            SNIP!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
