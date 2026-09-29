import { useEffect, useState } from 'react'
import type { DebaterFile, RankingsFile } from './types'

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

export const useRankings = (period = 'season') => useJSON<RankingsFile>(`rankings-${period}.json`)
export const useDebater = (id: string | undefined) => useJSON<DebaterFile>(id ? `debaters/${encodeURIComponent(id)}.json` : null)

export const schoolSlug = (school: string) =>
  school
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
