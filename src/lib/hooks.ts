import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from 'react'

export function useClickOutside<T extends HTMLElement>(ref: RefObject<T | null>, onOutside: () => void, active = true) {
  useEffect(() => {
    if (!active) return
    const handler = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside()
    }
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onOutside()
    document.addEventListener('pointerdown', handler)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('pointerdown', handler)
      document.removeEventListener('keydown', key)
    }
  }, [ref, onOutside, active])
}

export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

export function useNow(interval = 30_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), interval)
    return () => clearInterval(t)
  }, [interval])
  return now
}

export function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null
  if (!t) return false
  return t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)
}

/** Keyboard list navigation shared by search, palette and launcher. */
export function useListNav(length: number, onEnter: (i: number) => void, deps: unknown[] = []) {
  const [index, setIndex] = useState(0)
  const ref = useRef(onEnter)
  ref.current = onEnter
  useEffect(() => setIndex(0), deps) // eslint-disable-line react-hooks/exhaustive-deps
  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndex((i) => Math.min(length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndex((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter' && length) {
      e.preventDefault()
      ref.current(index)
    }
  }
  return { index, setIndex, onKeyDown }
}

export function highlight(text: string, q: string) {
  if (!q.trim()) return [text]
  const i = text.toLowerCase().indexOf(q.toLowerCase().trim())
  if (i < 0) return [text]
  return [text.slice(0, i), { mark: text.slice(i, i + q.trim().length) }, text.slice(i + q.trim().length)] as const
}
