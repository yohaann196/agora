import { extendGraph, staticGraph, type KnowledgeGraph } from '../model/graph'
import type { Argument, Debate, Doc, Essay, Note, Source } from '../model/types'
import { useOS } from './index'

let cache: { key: unknown[]; graph: KnowledgeGraph } | null = null

function graphFor(args: Argument[], debates: Debate[], essays: Essay[], notes: Note[], docs: Doc[], sources: Source[]) {
  const key = [args, debates, essays, notes, docs, sources]
  if (cache && cache.key.every((k, i) => k === key[i])) return cache.graph
  const graph = extendGraph(staticGraph, { arguments: args, debates, essays, notes, docs, sources })
  cache = { key, graph }
  return graph
}

/** The live knowledge graph: static corpus plus the user's own work. Shared across all components. */
export function useKnowledgeGraph(): KnowledgeGraph {
  const args = useOS((s) => s.arguments)
  const debates = useOS((s) => s.debates)
  const essays = useOS((s) => s.essays)
  const notes = useOS((s) => s.notes)
  const docs = useOS((s) => s.docs)
  const sources = useOS((s) => s.sources)
  return graphFor(args, debates, essays, notes, docs, sources)
}

export function getGraph(): KnowledgeGraph {
  const s = useOS.getState()
  return graphFor(s.arguments, s.debates, s.essays, s.notes, s.docs, s.sources)
}
