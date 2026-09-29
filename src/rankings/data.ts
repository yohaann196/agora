import { useEffect, useState } from 'react'
import type { DebaterFile, LdIndex, PoolView, RankingsFile } from './types'

const base = () => `${import.meta.env.BASE_URL}data/ld/`
const cache = new Map<string, Promise<unknown>>()

function load<T>(path: string): Promise<T> {
  if (!cache.has(path)) {
    const p = fetch(base() + path).then((r) => {
      if (!r.ok) throw new Error(`${r.status}`)
      return r.json()
    })
    p.catch(() => cache.delete(path))
    cache.set(path, p)
  }
  return cache.get(path) as Promise<T>
}

export type Loaded<T> = { state: 'loading' } | { state: 'ready'; data: T } | { state: 'error' }

function useJSON<T>(path: string | null): Loaded<T> {
  const [s, setS] = useState<{ path: string | null; value: Loaded<T> }>({ path, value: { state: 'loading' } })
  useEffect(() => {
    if (!path) return
    let live = true
    load<T>(path).then(
      (data) => live && setS({ path, value: { state: 'ready', data } }),
      () => live && setS({ path, value: { state: 'error' } }),
    )
    return () => {
      live = false
    }
  }, [path])
  return s.path === path ? s.value : { state: 'loading' }
}

/** Which seasons exist, the current one, and dataset totals. */
export const useIndex = () => useJSON<LdIndex>('index.json')

export interface RankingsQuery {
  /** Season slug; the current season when omitted. */
  season?: string | null
  period?: string | null
  view?: PoolView
}

/** A season's rankings. Falls back to the circuit view for seasons without local tournaments. */
export function useRankings(q: RankingsQuery = {}): Loaded<RankingsFile> {
  const index = useIndex()
  const idx = index.state === 'ready' ? index.data : null
  const season = idx ? (idx.seasons.find((s) => s.slug === q.season) ?? idx.seasons.find((s) => s.slug === idx.current) ?? idx.seasons[0]) : null
  const period = season?.periods.some((p) => p.slug === q.period) ? q.period! : 'season'
  const all = q.view === 'all' && season?.hasLocal
  const file = useJSON<RankingsFile>(season ? `${season.slug}/rankings-${period}${all ? '-all' : ''}.json` : null)
  return index.state === 'error' ? { state: 'error' } : file
}

export const useDebater = (id: string | undefined) => useJSON<DebaterFile>(id ? `debaters/${encodeURIComponent(id)}.json` : null)

export const schoolSlug = (school: string) =>
  school
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/** "68,770" style counts; rounds down to "68K+" style when `short`. */
export function count(n: number, short = false) {
  if (!short || n < 10000) return n.toLocaleString()
  return `${Math.floor(n / 1000).toLocaleString()}K+`
}
