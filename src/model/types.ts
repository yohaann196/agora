/**
 * Agora data model.
 *
 * Every entity has a globally unique `id` and a `kind`, so any entity can be
 * addressed, linked, saved, searched, and placed on the knowledge graph.
 */

export type EntityKind =
  | 'philosopher'
  | 'school'
  | 'concept'
  | 'text'
  | 'passage'
  | 'argument'
  | 'debate'
  | 'essay'
  | 'note'
  | 'user'
  | 'source'
  | 'doc'
  | 'flow'

export interface EntityRef {
  kind: EntityKind
  id: string
}

export type Era = 'Ancient' | 'Medieval' | 'Early Modern' | 'Modern' | 'Contemporary'
export const ERAS: Era[] = ['Ancient', 'Medieval', 'Early Modern', 'Modern', 'Contemporary']

export type Domain =
  | 'Ethics'
  | 'Metaphysics'
  | 'Epistemology'
  | 'Political'
  | 'Mind'
  | 'Religion'
  | 'Logic'
  | 'Social'
  | 'Existence'

export interface Work {
  textId: string
  title: string
  year: string
}

export interface Philosopher {
  id: string
  kind: 'philosopher'
  name: string
  born: string
  died: string
  dates: string
  era: Era
  origin: string
  epithet: string
  schools: string[]
  works: string[] // text ids
  concepts: string[]
  influences: string[]
  influenced: string[]
  critiques: string[]
  bio: string[]
  signature: string // one-line summary of their project
  monogram: string
}

export interface School {
  id: string
  kind: 'school'
  name: string
  span: string
  startYear: number
  endYear: number
  members: string[]
  precursors: string[]
  concepts: string[]
  summary: string
  coreIdeas: string[]
  tension: string
}

export interface Concept {
  id: string
  kind: 'concept'
  name: string
  domain: Domain
  definition: string
  note: string
  related: string[]
  keywords: string[]
}

export interface Text {
  id: string
  kind: 'text'
  title: string
  author: string
  year: string
  form: string
  summary: string
  concepts: string[]
  structure: string[]
}

export type SourceType = 'quotation' | 'summary' | 'interpretation'

export interface Passage {
  id: string
  kind: 'passage'
  textId: string
  author: string
  locator: string
  translation?: string
  source: 'quotation' | 'summary'
  body: string
  context: string
  concepts: string[]
  featured?: boolean
}

/* ------------------------------------------------------------------ */
/* Arguments                                                           */
/* ------------------------------------------------------------------ */

export type ArgNodeType =
  | 'claim'
  | 'premise'
  | 'inference'
  | 'conclusion'
  | 'objection'
  | 'counter'
  | 'rebuttal'
  | 'evidence'
  | 'definition'
  | 'assumption'

export const CORE_NODE_TYPES: ArgNodeType[] = ['claim', 'premise', 'inference', 'conclusion']
export const ATTACHMENT_TYPES: ArgNodeType[] = [
  'objection',
  'counter',
  'rebuttal',
  'evidence',
  'definition',
  'assumption',
]

export interface ArgNode {
  id: string
  type: ArgNodeType
  text: string
  x: number
  y: number
  /** For attachments: the node this attaches to. */
  target?: string
  refs?: string[]
}

export type ArgLinkKind = 'supports' | 'infers' | 'challenges' | 'rebuts' | 'defines' | 'grounds' | 'assumes'

export interface ArgLink {
  id: string
  from: string
  to: string
  kind: ArgLinkKind
}

export interface Argument {
  id: string
  kind: 'argument'
  title: string
  author: string // philosopher id, 'you', or a network user handle
  tradition?: string
  summary: string
  nodes: ArgNode[]
  links: ArgLink[]
  concepts: string[]
  philosophers: string[]
  updatedAt: number
  seeded?: boolean
}

/* ------------------------------------------------------------------ */
/* Compare                                                             */
/* ------------------------------------------------------------------ */

export interface Support {
  source: SourceType
  text: string
  passageId?: string
  citation?: string
}

export interface Position {
  philosopher: string
  stance: string
  headline: string
  reasoning: string[]
  support: Support[]
  concepts: string[]
}

export interface CompareQuestion {
  id: string
  question: string
  domain: Domain
  positions: Position[]
  keyDifference: string
  axes: { label: string; values: Record<string, string> }[]
}

/* ------------------------------------------------------------------ */
/* Social / workspace                                                  */
/* ------------------------------------------------------------------ */

export type DebateMoveType = 'objection' | 'response' | 'rebuttal' | 'support' | 'comment' | 'counter'

export interface DebateMove {
  id: string
  type: DebateMoveType
  author: string
  body: string
  createdAt: number
  children: DebateMove[]
}

export interface Debate {
  id: string
  kind: 'debate'
  thesis: string
  author: string
  framing: string
  concepts: string[]
  philosophers: string[]
  createdAt: number
  moves: DebateMove[]
  supporters: string[]
}

export interface NetworkUser {
  id: string
  kind: 'user'
  name: string
  handle: string
  school: string
  interests: string[]
  bio: string
  savedConcepts: string[]
  hue: number
}

export interface EssaySection {
  id: string
  label: string
  hint: string
  body: string
}

export interface Essay {
  id: string
  kind: 'essay'
  title: string
  prompt: string
  sections: EssaySection[]
  references: string[]
  updatedAt: number
}

export interface Note {
  id: string
  kind: 'note'
  title: string
  body: string
  links: string[]
  pinned?: boolean
  updatedAt: number
}

export interface ReadingItem {
  textId: string
  status: 'reading' | 'queued' | 'finished'
  progress: number
  addedAt: number
}

export interface Citation {
  passageId: string
  note?: string
}

/* ------------------------------------------------------------------ */
/* Knowledge graph                                                     */
/* ------------------------------------------------------------------ */

export type RelationType =
  | 'wrote'
  | 'holds'
  | 'influenced'
  | 'critiques'
  | 'memberOf'
  | 'precursorOf'
  | 'related'
  | 'central'
  | 'discusses'
  | 'concerns'
  | 'attributedTo'
  | 'excerptOf'
  | 'challenges'
  | 'references'
  | 'custom'

export interface Relationship {
  from: string
  to: string
  type: RelationType
  label?: string
}

export interface GraphNode {
  id: string
  kind: EntityKind
  label: string
  sublabel: string
  summary: string
  search: string
}

/* ------------------------------------------------------------------ */
/* Research & debate                                                   */
/* ------------------------------------------------------------------ */

export type SourceProvider = 'wikipedia' | 'openalex' | 'openlibrary' | 'web' | 'agora' | 'manual'

export interface Source {
  id: string
  kind: 'source'
  provider: SourceProvider
  title: string
  authors: string[]
  qualifications?: string
  container?: string // journal, publisher, website
  date?: string // publication date or year
  url?: string
  doi?: string
  page?: string
  accessed: number
  note?: string
}

/** A TipTap/ProseMirror JSON document. */
export interface DocJSON {
  type: string
  attrs?: Record<string, unknown>
  content?: DocJSON[]
  text?: string
  marks?: { type: string; attrs?: Record<string, unknown> }[]
}

export type DocType = 'speech' | 'file' | 'research'

export interface Doc {
  id: string
  kind: 'doc'
  title: string
  type: DocType
  content: DocJSON
  updatedAt: number
}

export type FlowFormat = 'policy' | 'ld' | 'pf'

export interface FlowSheet {
  id: string
  title: string
  /** columns[speechIndex][row] */
  columns: string[][]
  marks: Record<string, 'dropped' | 'extend' | 'key'>
}

export interface Flow {
  id: string
  kind: 'flow'
  title: string
  format: FlowFormat
  affFirst: boolean
  sheets: FlowSheet[]
  updatedAt: number
}
