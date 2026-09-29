import { create } from 'zustand'
import type { FlowFormat } from '../../model/types'
import { FORMATS } from '../../research/formats'

type PrepSide = 'aff' | 'neg'

interface TimerState {
  format: FlowFormat
  /** Minute overrides keyed `${format}:${speechId}`; tournaments vary. */
  minutes: Record<string, number>
  speech: number
  running: boolean
  endsAt: number
  left: number
  prep: Record<PrepSide, number>
  prepRunning: PrepSide | null
  prepEndsAt: number
  /** Last clock that hit zero, for the "TIME!" burst. */
  expired: { what: string; at: number } | null
  now: number

  setFormat: (f: FlowFormat) => void
  selectSpeech: (i: number) => void
  setMinutes: (speechId: string, m: number) => void
  start: () => void
  pause: () => void
  reset: () => void
  next: () => void
  togglePrep: (side: PrepSide) => void
  resetPrep: () => void
  tick: () => void
}

export const speechMinutes = (s: Pick<TimerState, 'format' | 'minutes'>, i: number) => {
  const sp = FORMATS[s.format].speeches[i]
  return s.minutes[`${s.format}:${sp.id}`] ?? sp.minutes
}

const fullPrep = (f: FlowFormat) => ({ aff: FORMATS[f].prepMinutes * 60000, neg: FORMATS[f].prepMinutes * 60000 })

let audio: AudioContext | null = null
/** Three short square-wave beeps, like a hand timer. */
export function beep(times = 3) {
  try {
    audio ??= new AudioContext()
    const ctx = audio
    for (let i = 0; i < times; i++) {
      const t = ctx.currentTime + i * 0.22
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'square'
      o.frequency.value = 880
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
      o.connect(g).connect(ctx.destination)
      o.start(t)
      o.stop(t + 0.18)
    }
  } catch {
    // Audio is optional.
  }
}

export const useTimer = create<TimerState>()((set, get) => ({
  format: 'ld',
  minutes: {},
  speech: 0,
  running: false,
  endsAt: 0,
  left: FORMATS.ld.speeches[0].minutes * 60000,
  prep: fullPrep('ld'),
  prepRunning: null,
  prepEndsAt: 0,
  expired: null,
  now: Date.now(),

  setFormat: (format) => {
    if (format === get().format) return
    set((s) => ({ format, speech: 0, running: false, prepRunning: null, prep: fullPrep(format), left: speechMinutes({ format, minutes: s.minutes }, 0) * 60000 }))
  },
  selectSpeech: (i) => set((s) => ({ speech: i, running: false, left: speechMinutes(s, i) * 60000 })),
  setMinutes: (speechId, m) =>
    set((s) => {
      const minutes = { ...s.minutes, [`${s.format}:${speechId}`]: m }
      const cur = FORMATS[s.format].speeches[s.speech]
      return cur.id === speechId && !s.running ? { minutes, left: m * 60000 } : { minutes }
    }),
  start: () => {
    const s = get()
    if (s.running || s.left <= 0) return
    // Only one clock runs at a time: starting a speech stops prep.
    const prep = s.prepRunning ? { ...s.prep, [s.prepRunning]: Math.max(0, s.prepEndsAt - Date.now()) } : s.prep
    set({ running: true, endsAt: Date.now() + s.left, prepRunning: null, prep, now: Date.now() })
  },
  pause: () => {
    const s = get()
    if (!s.running) return
    set({ running: false, left: Math.max(0, s.endsAt - Date.now()) })
  },
  reset: () => set((s) => ({ running: false, left: speechMinutes(s, s.speech) * 60000 })),
  next: () => {
    const s = get()
    const n = Math.min(FORMATS[s.format].speeches.length - 1, s.speech + 1)
    set({ speech: n, running: false, left: speechMinutes(s, n) * 60000 })
  },
  togglePrep: (side) => {
    const s = get()
    const t = Date.now()
    if (s.prepRunning === side) {
      set({ prepRunning: null, prep: { ...s.prep, [side]: Math.max(0, s.prepEndsAt - t) } })
      return
    }
    if (s.prep[side] <= 0) return
    const prep = s.prepRunning ? { ...s.prep, [s.prepRunning]: Math.max(0, s.prepEndsAt - t) } : s.prep
    const left = s.running ? Math.max(0, s.endsAt - t) : s.left
    set({ prep, prepRunning: side, prepEndsAt: t + prep[side], running: false, left, now: t })
  },
  resetPrep: () => set((s) => ({ prep: fullPrep(s.format), prepRunning: null })),
  tick: () => {
    const s = get()
    const t = Date.now()
    if (s.running && s.endsAt <= t) {
      beep()
      set({ running: false, left: 0, now: t, expired: { what: FORMATS[s.format].speeches[s.speech].label, at: t } })
      return
    }
    if (s.prepRunning && s.prepEndsAt <= t) {
      beep(2)
      const side = s.prepRunning
      set({ prepRunning: null, prep: { ...s.prep, [side]: 0 }, now: t, expired: { what: `${side === 'aff' ? FORMATS[s.format].affLabel : FORMATS[s.format].negLabel} prep`, at: t } })
      return
    }
    if (s.running || s.prepRunning) set({ now: t })
  },
}))

export const mainLeft = (s: TimerState) => (s.running ? Math.max(0, s.endsAt - s.now) : s.left)
export const prepLeft = (s: TimerState, side: PrepSide) => (s.prepRunning === side ? Math.max(0, s.prepEndsAt - s.now) : s.prep[side])

export function clock(ms: number) {
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const sec = total % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

let ticker: number | undefined
/** Runs one shared interval while any clock is going. Safe to call from several components. */
export function ensureTicker() {
  if (ticker !== undefined) return
  ticker = window.setInterval(() => {
    const s = useTimer.getState()
    if (s.running || s.prepRunning) s.tick()
  }, 200)
}
