import type { DocJSON, Source } from '../model/types'
import { fullCite, shortCite } from './cite'
import { READ_WPM } from './formats'

/**
 * Speech docs follow the Verbatim conventions debaters already use:
 * Heading 1 = Pocket, 2 = Hat, 3 = Block, 4 = Tag.
 * A card is a Tag, then a cite paragraph, then card text.
 */
export const LEVEL_NAME: Record<number, string> = { 1: 'Pocket', 2: 'Hat', 3: 'Block', 4: 'Tag' }

type Mark = { type: string; attrs?: Record<string, unknown> }
export type Segment = [text: string, marks?: ('u' | 'h' | 'e' | 'b')[]]

const MARK: Record<string, Mark> = {
  u: { type: 'underline' },
  h: { type: 'highlight', attrs: { color: '#f2dc55' } },
  e: { type: 'emphasis' },
  b: { type: 'bold' },
}

export const text = (t: string, marks?: Mark[]): DocJSON => (marks?.length ? { type: 'text', text: t, marks } : { type: 'text', text: t })
export const heading = (level: number, t: string): DocJSON => ({ type: 'heading', attrs: { level }, content: t ? [text(t)] : [] })
export const para = (content: DocJSON[], role: 'card' | 'cite' | null = null): DocJSON => ({ type: 'paragraph', attrs: { role }, content })

export function segments(segs: Segment[]): DocJSON[] {
  return segs.filter(([t]) => t.length).map(([t, m]) => text(t, m?.map((k) => MARK[k])))
}

export function citeParagraph(source: Source): DocJSON {
  return para([text(shortCite(source), [{ type: 'bold' }]), text(' — ' + fullCite(source))], 'cite')
}

export function cardNodes(tag: string, source: Source, body: Segment[] | string): DocJSON[] {
  const segs: Segment[] = typeof body === 'string' ? [[body]] : body
  return [heading(4, tag), citeParagraph(source), para(segments(segs), 'card')]
}

const STARTER: Record<string, string> = { contention: 'Contention', block: 'Block', speech: 'Speech', file: 'New file' }

export function emptyDoc(kind: 'contention' | 'block' | 'speech' | 'file' | 'research' = 'speech'): DocJSON {
  if (kind === 'research') return { type: 'doc', content: [heading(1, 'Research notes'), para([])] }
  return { type: 'doc', content: [heading(1, STARTER[kind]), heading(4, ''), para([], 'cite'), para([], 'card')] }
}

export function appendNodes(doc: DocJSON, nodes: DocJSON[]): DocJSON {
  const content = [...(doc.content ?? [])]
  // Drop the empty starter block (a blank tag, cite and card) so appended cards don't leave gaps.
  const blank = (n: DocJSON) => (n.type === 'paragraph' || (n.type === 'heading' && Number(n.attrs?.level) === 4)) && !plainText(n).trim()
  while (content.length && blank(content[content.length - 1])) content.pop()
  return { ...doc, content: [...content, ...nodes] }
}

export function plainText(node: DocJSON): string {
  if (node.type === 'text') return node.text ?? ''
  return (node.content ?? []).map(plainText).join(node.type === 'doc' ? '\n' : '')
}

function textWithMark(node: DocJSON, mark: string): string {
  if (node.type === 'text') return node.marks?.some((m) => m.type === mark) ? node.text ?? '' : ''
  return (node.content ?? []).map((n) => textWithMark(n, mark)).join(' ')
}

const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0)

export interface OutlineItem {
  index: number
  level: number
  title: string
}

export function outline(doc: DocJSON): OutlineItem[] {
  return (doc.content ?? [])
    .map((n, index) => ({ n, index }))
    .filter(({ n }) => n.type === 'heading')
    .map(({ n, index }) => ({ index, level: Number(n.attrs?.level ?? 1), title: plainText(n) || `Untitled ${LEVEL_NAME[Number(n.attrs?.level ?? 1)] ?? 'heading'}` }))
}

export interface CardInfo {
  index: number
  tag: string
  cite: string
  body: string
  highlighted: string
}

/** Cards = each Tag heading with the cite and card text that follow it. */
export function cards(doc: DocJSON): CardInfo[] {
  const nodes = doc.content ?? []
  const out: CardInfo[] = []
  nodes.forEach((n, i) => {
    if (n.type !== 'heading' || Number(n.attrs?.level) !== 4) return
    let cite = ''
    let body = ''
    let highlighted = ''
    for (let j = i + 1; j < nodes.length && nodes[j].type !== 'heading'; j++) {
      const role = nodes[j].attrs?.role
      if (role === 'cite' && !cite) cite = plainText(nodes[j])
      else {
        body += plainText(nodes[j]) + ' '
        highlighted += textWithMark(nodes[j], 'highlight') + ' '
      }
    }
    const tag = plainText(n)
    // An untouched starter block isn't a card yet.
    if (!tag.trim() && !cite.trim() && !body.trim()) return
    out.push({ index: i, tag, cite, body: body.trim(), highlighted: highlighted.trim() })
  })
  return out
}

export function docStats(doc: DocJSON) {
  const all = plainText(doc)
  const hl = textWithMark(doc, 'highlight')
  const readWords = words(hl)
  return {
    words: words(all),
    highlightedWords: readWords,
    readSeconds: Math.round((readWords / READ_WPM) * 60),
    cards: cards(doc).length,
  }
}

export function formatSeconds(s: number) {
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}
