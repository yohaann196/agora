import { philosophers, philosopherById } from '../data/philosophers'
import { concepts, conceptById } from '../data/concepts'
import { schools, schoolById } from '../data/schools'
import { passages, texts, textById } from '../data/texts'
import type { Argument, Debate, EntityKind, EntityRef, Essay, GraphNode, Note, Relationship, RelationType } from './types'

export interface KnowledgeGraph {
  nodes: Map<string, GraphNode>
  edges: Relationship[]
  out: Map<string, Relationship[]>
  in: Map<string, Relationship[]>
}

export const RELATION_LABEL: Record<RelationType, [forward: string, backward: string]> = {
  wrote: ['wrote', 'written by'],
  holds: ['develops', 'developed by'],
  influenced: ['influenced', 'influenced by'],
  critiques: ['critiques', 'critiqued by'],
  memberOf: ['belongs to', 'includes'],
  precursorOf: ['anticipates', 'anticipated by'],
  related: ['related to', 'related to'],
  central: ['centres on', 'central to'],
  discusses: ['discusses', 'discussed in'],
  concerns: ['concerns', 'addressed by'],
  attributedTo: ['argued by', 'argues'],
  excerptOf: ['excerpt of', 'contains'],
  challenges: ['challenges', 'challenged by'],
  references: ['references', 'referenced by'],
  custom: ['relates to', 'relates to'],
}

export const KIND_LABEL: Record<EntityKind, string> = {
  philosopher: 'Philosopher',
  school: 'School',
  concept: 'Concept',
  text: 'Text',
  passage: 'Passage',
  argument: 'Argument',
  debate: 'Debate',
  essay: 'Essay',
  note: 'Note',
  user: 'Person',
}

function norm(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

function addNode(g: KnowledgeGraph, node: Omit<GraphNode, 'search'> & { extra?: string }) {
  const { extra, ...rest } = node
  g.nodes.set(node.id, { ...rest, search: norm([node.label, node.sublabel, node.summary, extra ?? ''].join(' ')) })
}

function addEdge(g: KnowledgeGraph, from: string, to: string, type: RelationType, label?: string) {
  if (from === to) return
  const rel: Relationship = { from, to, type, label }
  g.edges.push(rel)
  if (!g.out.has(from)) g.out.set(from, [])
  if (!g.in.has(to)) g.in.set(to, [])
  g.out.get(from)!.push(rel)
  g.in.get(to)!.push(rel)
}

function empty(): KnowledgeGraph {
  return { nodes: new Map(), edges: [], out: new Map(), in: new Map() }
}

function buildStatic(): KnowledgeGraph {
  const g = empty()
  for (const p of philosophers) {
    addNode(g, { id: p.id, kind: 'philosopher', label: p.name, sublabel: p.dates, summary: p.signature, extra: p.epithet + ' ' + p.era })
  }
  for (const c of concepts) {
    addNode(g, { id: c.id, kind: 'concept', label: c.name, sublabel: c.domain, summary: c.definition, extra: c.keywords.join(' ') })
  }
  for (const s of schools) {
    addNode(g, { id: s.id, kind: 'school', label: s.name, sublabel: s.span, summary: s.summary })
  }
  for (const t of texts) {
    addNode(g, { id: t.id, kind: 'text', label: t.title, sublabel: `${philosopherById[t.author]?.name ?? ''} · ${t.year}`, summary: t.summary })
  }
  for (const p of passages) {
    const t = textById[p.textId]
    addNode(g, {
      id: p.id,
      kind: 'passage',
      label: `${t?.title ?? ''} ${p.locator}`,
      sublabel: philosopherById[p.author]?.name ?? '',
      summary: p.body,
      extra: p.context,
    })
  }

  for (const p of philosophers) {
    for (const w of p.works) if (textById[w]?.author === p.id) addEdge(g, p.id, w, 'wrote')
    for (const c of p.concepts) addEdge(g, p.id, c, 'holds')
    for (const s of p.schools) addEdge(g, p.id, s, 'memberOf')
    for (const i of p.influenced) addEdge(g, p.id, i, 'influenced')
    for (const c of p.critiques) addEdge(g, p.id, c, 'critiques')
  }
  const seen = new Set<string>()
  for (const c of concepts) {
    for (const r of c.related) {
      const key = [c.id, r].sort().join('|')
      if (seen.has(key) || !conceptById[r]) continue
      seen.add(key)
      addEdge(g, c.id, r, 'related')
    }
  }
  for (const s of schools) {
    for (const c of s.concepts) addEdge(g, s.id, c, 'central')
    for (const pre of s.precursors) addEdge(g, pre, s.id, 'precursorOf')
  }
  for (const t of texts) for (const c of t.concepts) addEdge(g, t.id, c, 'discusses')
  for (const p of passages) addEdge(g, p.id, p.textId, 'excerptOf')
  return g
}

export const staticGraph = buildStatic()

/** Layer user- and network-created entities onto the static knowledge graph. */
export function extendGraph(
  base: KnowledgeGraph,
  layer: { arguments: Argument[]; debates: Debate[]; essays: Essay[]; notes: Note[] },
): KnowledgeGraph {
  const g: KnowledgeGraph = {
    nodes: new Map(base.nodes),
    edges: [...base.edges],
    out: new Map([...base.out].map(([k, v]) => [k, [...v]])),
    in: new Map([...base.in].map(([k, v]) => [k, [...v]])),
  }
  for (const a of layer.arguments) {
    const byline = a.author === 'you' ? 'Your argument' : philosopherById[a.author]?.name ?? a.author
    addNode(g, { id: a.id, kind: 'argument', label: a.title, sublabel: byline, summary: a.summary, extra: a.nodes.map((n) => n.text).join(' ') })
    for (const c of a.concepts) if (g.nodes.has(c)) addEdge(g, a.id, c, 'concerns')
    if (philosopherById[a.author]) addEdge(g, a.id, a.author, 'attributedTo')
    for (const p of a.philosophers) if (p !== a.author && g.nodes.has(p)) addEdge(g, a.id, p, 'references')
    if (a.tradition && schoolById[a.tradition]) addEdge(g, a.id, a.tradition, 'concerns')
  }
  for (const d of layer.debates) {
    addNode(g, { id: d.id, kind: 'debate', label: d.thesis, sublabel: 'Debate', summary: d.framing })
    for (const c of d.concepts) if (g.nodes.has(c)) addEdge(g, d.id, c, 'concerns')
    for (const p of d.philosophers) if (g.nodes.has(p)) addEdge(g, d.id, p, 'references')
  }
  for (const e of layer.essays) {
    addNode(g, { id: e.id, kind: 'essay', label: e.title, sublabel: 'Essay draft', summary: e.prompt, extra: e.sections.map((s) => s.body).join(' ') })
    for (const r of e.references) if (g.nodes.has(r)) addEdge(g, e.id, r, 'references')
  }
  for (const n of layer.notes) {
    addNode(g, { id: n.id, kind: 'note', label: n.title, sublabel: 'Note', summary: n.body.slice(0, 160), extra: n.body })
    for (const l of n.links) if (g.nodes.has(l)) addEdge(g, n.id, l, 'references')
  }
  return g
}

export interface Neighbor {
  node: GraphNode
  rel: Relationship
  direction: 'out' | 'in'
  label: string
}

export function neighbors(g: KnowledgeGraph, id: string): Neighbor[] {
  const res: Neighbor[] = []
  for (const rel of g.out.get(id) ?? []) {
    const node = g.nodes.get(rel.to)
    if (node) res.push({ node, rel, direction: 'out', label: rel.label ?? RELATION_LABEL[rel.type][0] })
  }
  for (const rel of g.in.get(id) ?? []) {
    const node = g.nodes.get(rel.from)
    if (node) res.push({ node, rel, direction: 'in', label: rel.label ?? RELATION_LABEL[rel.type][1] })
  }
  return res
}

/** Breadth-first shortest path between two entities (undirected). */
export function findPath(g: KnowledgeGraph, from: string, to: string, maxDepth = 6): string[] | null {
  if (from === to) return [from]
  const prev = new Map<string, string>()
  const queue: [string, number][] = [[from, 0]]
  const seen = new Set([from])
  while (queue.length) {
    const [cur, d] = queue.shift()!
    if (d >= maxDepth) continue
    for (const nb of neighbors(g, cur)) {
      const id = nb.node.id
      if (seen.has(id)) continue
      seen.add(id)
      prev.set(id, cur)
      if (id === to) {
        const path = [to]
        let p = to
        while (prev.has(p)) {
          p = prev.get(p)!
          path.unshift(p)
        }
        return path
      }
      queue.push([id, d + 1])
    }
  }
  return null
}

export interface SearchHit {
  node: GraphNode
  score: number
}

export function search(g: KnowledgeGraph, query: string, kinds?: EntityKind[], limit = 20): SearchHit[] {
  const q = norm(query.trim())
  if (!q) return []
  const terms = q.split(/\s+/).filter(Boolean)
  const hits: SearchHit[] = []
  for (const node of g.nodes.values()) {
    if (kinds && !kinds.includes(node.kind)) continue
    const label = norm(node.label)
    let score = 0
    if (label === q) score += 100
    else if (label.startsWith(q)) score += 60
    else if (label.includes(q)) score += 40
    else if (node.search.includes(q)) score += 18
    // Whole-word hits in the label ("rawls" in "John Rawls") outrank prefix hits in longer titles.
    if (label.split(/[\s-]+/).includes(q)) score += node.kind === 'philosopher' || node.kind === 'concept' || node.kind === 'school' ? 55 : 30
    let allTerms = true
    for (const t of terms) {
      if (label.includes(t)) score += 8
      else if (node.search.includes(t)) score += 3
      else allTerms = false
    }
    if (!allTerms && score < 40) continue
    if (score <= 0) continue
    if (node.kind === 'passage') score -= 6
    if (node.kind === 'philosopher' || node.kind === 'concept') score += 2
    hits.push({ node, score })
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit)
}

export function routeFor(ref: EntityRef | GraphNode | { kind: EntityKind; id: string }): string {
  switch (ref.kind) {
    case 'philosopher':
      return `/app/library/${ref.id}`
    case 'concept':
      return `/app/concepts/${ref.id}`
    case 'school':
      return `/app/schools/${ref.id}`
    case 'text':
      return `/app/texts/${ref.id}`
    case 'passage': {
      const p = passages.find((x) => x.id === ref.id)
      return p ? `/app/texts/${p.textId}#${p.id}` : '/app/explorer'
    }
    case 'argument':
      return `/app/arguments/${ref.id}`
    case 'debate':
      return `/app/debates/${ref.id}`
    case 'essay':
      return `/app/essays/${ref.id}`
    case 'note':
      return `/app/notes/${ref.id}`
    case 'user':
      return `/app/debates/people/${ref.id}`
  }
}

export function kindOf(id: string): EntityKind | undefined {
  return staticGraph.nodes.get(id)?.kind
}
