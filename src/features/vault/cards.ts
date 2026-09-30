import type { LibraryCard } from '../../data/cards'
import type { DocJSON } from '../../model/types'
import { heading, para, segments, text } from '../../research/docModel'
import { docToHtml } from '../docs/docExport'

/** A library card as speech-doc nodes: Tag, cite, card text (Verbatim conventions). */
export function cardToNodes(c: LibraryCard): DocJSON[] {
  return [heading(4, c.tag), para([text(c.short, [{ type: 'bold' }]), text(` — ${c.cite}${c.url ? ` ${c.url}` : ''}`)], 'cite'), para(segments(c.body), 'card')]
}

export const cardPlain = (c: LibraryCard) => `${c.tag}\n${c.short} — ${c.cite} ${c.url}\n${c.body.map(([t]) => t).join('')}`

export const cardHtml = (c: LibraryCard) => docToHtml({ type: 'doc', content: cardToNodes(c) }, c.tag)

/** Search text for a card: tag, cite and body. */
export const cardHaystack = (c: LibraryCard) => `${c.tag} ${c.short} ${c.cite} ${c.body.map(([t]) => t).join('')}`.toLowerCase()
