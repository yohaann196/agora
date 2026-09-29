import { useMemo } from 'react'
import { briefs } from '../data/briefs'
import { schoolSlug, useRankings } from '../rankings/data'
import { useOS } from '../store'

export type HitKind = 'debater' | 'school' | 'brief' | 'doc' | 'flow'

export interface Hit {
  kind: HitKind
  id: string
  label: string
  sub: string
  to: string
  score: number
}

const norm = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Higher is better: exact prefix, word prefix, then substring. */
function match(hay: string, q: string) {
  const h = norm(hay)
  if (h.startsWith(q)) return 3
  if (h.split(/[\s\-—·,]+/).some((w) => w.startsWith(q))) return 2
  if (h.includes(q)) return 1
  const words = q.split(/\s+/).filter(Boolean)
  return words.length > 1 && words.every((w) => h.includes(w)) ? 0.5 : 0
}

export function useSearch(q: string, limit = 12): Hit[] {
  const rankings = useRankings()
  const docs = useOS((s) => s.docs)
  const flows = useOS((s) => s.flows)
  const debaters = rankings.state === 'ready' ? rankings.data.debaters : null
  return useMemo(() => {
    const t = norm(q.trim())
    if (!t) return []
    const hits: Hit[] = []
    const schools = new Map<string, { name: string; state: string; n: number }>()
    for (const d of debaters ?? []) {
      const m = match(d.name, t) || match(d.school, t) * 0.5
      if (m) hits.push({ kind: 'debater', id: d.id, label: d.name, sub: `#${d.rank} · ${d.school}`, to: `/debaters/${d.id}`, score: m + (500 - Math.min(d.rank, 500)) / 1000 })
      const s = schools.get(d.school) ?? { name: d.school, state: d.state, n: 0 }
      s.n++
      schools.set(d.school, s)
    }
    for (const s of schools.values()) {
      const m = match(s.name, t)
      if (m) hits.push({ kind: 'school', id: s.name, label: s.name, sub: `${s.n} ranked debater${s.n === 1 ? '' : 's'}${s.state ? ` · ${s.state}` : ''}`, to: `/schools/${schoolSlug(s.name)}`, score: m + 0.2 })
    }
    for (const b of briefs.filter((x) => x.status === 'published')) {
      const m = Math.max(match(b.title, t), match(b.topic, t) * 0.8, match(`brief ${b.month}`, t))
      if (m) hits.push({ kind: 'brief', id: b.id, label: b.title, sub: `Brief No. ${b.issue} · ${b.month}`, to: `/briefs/${b.id}`, score: m + 0.3 })
    }
    for (const d of docs) {
      const m = match(d.title, t)
      if (m) hits.push({ kind: 'doc', id: d.id, label: d.title, sub: d.type === 'block' ? 'Block vault' : d.type === 'contention' ? 'Contention vault' : 'Vault', to: `/app/vaults/${d.id}`, score: m + 0.4 })
    }
    for (const f of flows) {
      const m = match(f.title, t)
      if (m) hits.push({ kind: 'flow', id: f.id, label: f.title, sub: 'Flow', to: `/app/flow/${f.id}`, score: m + 0.3 })
    }
    return hits.sort((a, b) => b.score - a.score).slice(0, limit)
  }, [q, debaters, docs, flows, limit])
}
