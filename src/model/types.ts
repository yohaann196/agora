/** Debate Utils data model: evidence sources, vault docs, flows, and the framework library. */

/* ---------------------------- Framework library ---------------------------- */

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

export interface Passage {
  id: string
  kind: 'passage'
  textId: string
  author: string
  locator: string
  translation?: string
  /** Only direct quotations may be cut into cards; summaries are ours. */
  source: 'quotation' | 'summary'
  body: string
  context: string
  concepts: string[]
  featured?: boolean
}

/* -------------------------------- Evidence -------------------------------- */

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

/** TipTap/ProseMirror JSON. */
export interface DocJSON {
  type: string
  attrs?: Record<string, unknown>
  content?: DocJSON[]
  text?: string
  marks?: { type: string; attrs?: Record<string, unknown> }[]
}

/**
 * Vault kinds. Contentions and blocks are the two vaults; speech docs are what
 * you read in round; research files hold raw cards.
 */
export type DocType = 'contention' | 'block' | 'speech' | 'file' | 'research'
export type Side = 'aff' | 'neg' | 'both'

export interface Doc {
  id: string
  kind: 'doc'
  title: string
  type: DocType
  content: DocJSON
  updatedAt: number
  /** The resolution this doc is for. */
  topic?: string
  side?: Side
}

/* ---------------------------------- Flows --------------------------------- */

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

/* --------------------------------- Recents -------------------------------- */

export type RecentKind = 'debater' | 'doc' | 'flow' | 'brief' | 'school'

export interface Recent {
  kind: RecentKind
  id: string
  label?: string
  at: number
}
