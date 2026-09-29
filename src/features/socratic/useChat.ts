import { useCallback, useRef, useState } from 'react'
import { askSocratic } from '../../ai/engine'
import { useOS } from '../../store'

/** Shared conversation driver for the Socratic page and its floating window. */
export function useSocraticChat() {
  const [busy, setBusy] = useState(false)
  const abort = useRef<AbortController | null>(null)

  const send = useCallback(async (input: string) => {
    const text = input.trim()
    if (!text) return
    const s = useOS.getState()
    const mode = s.socraticMode
    const philosopher = s.socraticPhilosopher
    const history = s.chat.filter((m) => !m.pending).slice(-12).map((m) => ({ role: m.role, text: m.text }))
    s.pushChat({ role: 'user', mode, text, philosopher: mode === 'philosopher' ? philosopher : undefined })
    const id = s.pushChat({ role: 'ai', mode, text: '', pending: true, philosopher: mode === 'philosopher' ? philosopher : undefined })
    setBusy(true)
    abort.current?.abort()
    const ctrl = new AbortController()
    abort.current = ctrl
    try {
      const res = await askSocratic({
        input: text,
        mode,
        history,
        philosopher,
        settings: s.settings,
        signal: ctrl.signal,
        onDelta: (full) => useOS.getState().patchChat(id, { text: full }),
      })
      useOS.getState().patchChat(id, {
        text: res.text,
        pending: false,
        meta: { concepts: res.concepts, assumptions: res.assumptions, fallacies: res.fallacies },
      })
      if (res.error) {
        useOS.getState().toast({ title: 'Claude unavailable — used local engine', body: res.error.slice(0, 120) })
      }
    } finally {
      setBusy(false)
    }
  }, [])

  const stop = useCallback(() => {
    abort.current?.abort()
    const s = useOS.getState()
    for (const m of s.chat) if (m.pending) s.patchChat(m.id, { pending: false })
    setBusy(false)
  }, [])

  return { send, stop, busy }
}
