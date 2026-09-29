import { Check, ClipboardCopy, Send } from 'lucide-react'
import { useState } from 'react'
import type { LibraryCard } from '../../data/cards'
import { copyRich } from '../docs/docExport'
import { cardHtml, cardPlain } from './cards'

/** A cut card: tag, cite, and the source's words with underlining and highlighting. */
export function CardView({ card, onSend, sendLabel, compact = false }: { card: LibraryCard; onSend?: (c: LibraryCard) => void; sendLabel?: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await copyRich(cardHtml(card), cardPlain(card))
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      // Clipboard can be refused; the text is still selectable.
    }
  }
  return (
    <article className={`lib-card ${compact ? 'compact' : ''}`} id={card.id}>
      <header className="lc-top">
        <h3 className="lc-tag">{card.tag}</h3>
        <div className="lc-actions">
          <button className="btn ghost sm" onClick={copy} title="Copy with formatting for Word or Google Docs">
            {copied ? <Check /> : <ClipboardCopy />} {copied ? 'Copied' : 'Copy'}
          </button>
          {onSend && (
            <button className="btn sm" onClick={() => onSend(card)} title={sendLabel}>
              <Send /> {compact ? 'Insert' : 'Send'}
            </button>
          )}
        </div>
      </header>
      <p className="lc-cite">
        <b>{card.short}</b> [{card.cite}]
      </p>
      {card.url && (
        <a className="lc-url" href={card.url} target="_blank" rel="noreferrer">
          {card.url}
        </a>
      )}
      <p className="lc-body">
        {card.body.map(([t, marks], i) => {
          const u = marks?.includes('u') || marks?.includes('e')
          const h = marks?.includes('h')
          const cls = [u ? 'u' : 'small', h ? 'h' : '', marks?.includes('e') ? 'e' : ''].filter(Boolean).join(' ')
          return (
            <span key={i} className={cls}>
              {t}
            </span>
          )
        })}
      </p>
    </article>
  )
}
