import { describe, expect, it } from 'vitest'
import { concepts } from '../data/concepts'
import { philosophers } from '../data/philosophers'
import { schools } from '../data/schools'
import { passages, texts } from '../data/texts'
import { compareQuestions } from '../data/compare'
import { seedArguments } from '../data/arguments'
import { extendGraph, findPath, neighbors, search, staticGraph } from '../model/graph'

describe('knowledge base integrity', () => {
  const ids = new Set([...philosophers, ...concepts, ...schools, ...texts, ...passages].map((x) => x.id))

  it('has globally unique ids', () => {
    const all = [...philosophers, ...concepts, ...schools, ...texts, ...passages].map((x) => x.id)
    expect(new Set(all).size).toBe(all.length)
  })

  it('only references entities that exist', () => {
    for (const p of philosophers) {
      for (const r of [...p.schools, ...p.works, ...p.concepts, ...p.influences, ...p.influenced, ...p.critiques]) expect(ids.has(r), `${p.id} → ${r}`).toBe(true)
    }
    for (const c of concepts) for (const r of c.related) expect(ids.has(r), `${c.id} → ${r}`).toBe(true)
    for (const s of schools) for (const r of [...s.members, ...s.precursors, ...s.concepts]) expect(ids.has(r), `${s.id} → ${r}`).toBe(true)
    for (const t of texts) for (const r of [t.author, ...t.concepts]) expect(ids.has(r), `${t.id} → ${r}`).toBe(true)
    for (const p of passages) for (const r of [p.textId, p.author, ...p.concepts]) expect(ids.has(r), `${p.id} → ${r}`).toBe(true)
  })

  it('attributes every passage to the author of its text', () => {
    for (const p of passages) expect(texts.find((t) => t.id === p.textId)?.author, p.id).toBe(p.author)
  })

  it('gives every quotation a locator, and every comparison a real passage', () => {
    for (const p of passages.filter((x) => x.source === 'quotation')) expect(p.locator.length).toBeGreaterThan(0)
    for (const q of compareQuestions)
      for (const pos of q.positions) for (const s of pos.support) if (s.passageId) expect(passages.some((p) => p.id === s.passageId), s.passageId).toBe(true)
  })

  it('never labels a comparison quotation with a summary passage', () => {
    for (const q of compareQuestions)
      for (const pos of q.positions)
        for (const s of pos.support.filter((x) => x.source === 'quotation')) expect(passages.find((p) => p.id === s.passageId)?.source).toBe('quotation')
  })
})

describe('knowledge graph', () => {
  it('connects Kant to his works, concepts and schools', () => {
    const nb = neighbors(staticGraph, 'kant').map((n) => n.node.id)
    expect(nb).toContain('groundwork')
    expect(nb).toContain('categorical-imperative')
    expect(nb).toContain('kantianism')
    expect(nb).toContain('rawls')
  })

  it('labels relationships in both directions', () => {
    const toKant = neighbors(staticGraph, 'groundwork').find((n) => n.node.id === 'kant')
    expect(toKant?.label).toBe('written by')
  })

  it('finds a path from Kant to lying', () => {
    const path = findPath(staticGraph, 'kant', 'lying')
    expect(path?.[0]).toBe('kant')
    expect(path?.[path.length - 1]).toBe('lying')
  })

  it('ranks exact label matches first', () => {
    expect(search(staticGraph, 'justice')[0].node.id).toBe('justice')
    expect(search(staticGraph, 'kant', ['philosopher'])[0].node.id).toBe('kant')
  })

  it('layers user arguments onto the graph', () => {
    const g = extendGraph(staticGraph, { arguments: seedArguments, debates: [], essays: [], notes: [] })
    expect(g.nodes.get('arg-sacrifice')?.kind).toBe('argument')
    expect(neighbors(g, 'greatest-happiness').some((n) => n.node.id === 'arg-sacrifice')).toBe(true)
    expect(staticGraph.nodes.has('arg-sacrifice')).toBe(false)
  })
})
