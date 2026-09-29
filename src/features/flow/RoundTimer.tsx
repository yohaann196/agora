import { AnimatePresence, motion } from 'framer-motion'
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { FlowFormat } from '../../model/types'
import { FORMATS, sideFor } from '../../research/formats'
import { clock, ensureTicker, mainLeft, prepLeft, speechMinutes, useTimer } from './timerStore'

export function RoundTimer({ format, affFirst = true, compact = false }: { format: FlowFormat; affFirst?: boolean; compact?: boolean }) {
  const t = useTimer()
  const def = FORMATS[t.format]
  const [burst, setBurst] = useState(false)

  useEffect(() => {
    ensureTicker()
  }, [])

  // Follow the flow's format unless a clock is mid-speech.
  useEffect(() => {
    const s = useTimer.getState()
    if (!s.running && !s.prepRunning) s.setFormat(format)
  }, [format])

  useEffect(() => {
    if (!t.expired) return
    setBurst(true)
    const id = window.setTimeout(() => setBurst(false), 2600)
    return () => window.clearTimeout(id)
  }, [t.expired])

  const cur = def.speeches[t.speech]
  const left = mainLeft(t)
  const side = cur.side === 'both' ? 'both' : sideFor(t.format, cur.side, affFirst)
  const sideLabel = side === 'both' ? 'Both' : side === 'aff' ? def.affLabel : def.negLabel
  const low = left > 0 && left <= 30000

  return (
    <div className={`round-timer ${compact ? 'compact' : ''}`}>
      <div className="rt-head">
        <span>The round</span>
        <span className="rt-format">{def.label}</span>
      </div>

      <div className={`rt-face ${t.running ? 'running' : ''} ${low ? 'low' : ''} side-${side}`}>
        <div className="rt-speech">
          <span className="rt-side">{sideLabel}</span>
          <span className="rt-label">{cur.label}</span>
        </div>
        <div className="rt-digits" role="timer" aria-live="off" aria-label={`${cur.label}: ${clock(left)} left`}>{clock(left)}</div>
        {t.running && <span className="rt-tick" aria-hidden>TICK</span>}
        <AnimatePresence>
          {burst && t.expired && (
            <motion.div className="rt-burst" initial={{ scale: 0.4, rotate: -12, opacity: 0 }} animate={{ scale: 1, rotate: -6, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 16 }}>
              TIME!
              <small>{t.expired.what}</small>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="rt-controls">
        {t.running ? (
          <button className="btn primary" onClick={t.pause}><Pause /> Pause</button>
        ) : (
          <button className="btn primary" onClick={t.start} disabled={left <= 0}><Play /> {left < speechMinutes(t, t.speech) * 60000 && left > 0 ? 'Resume' : 'Start'}</button>
        )}
        <button className="btn icon" aria-label="Reset speech clock" title="Reset" onClick={t.reset}><RotateCcw /></button>
        <button className="btn icon" aria-label="Next speech" title="Next speech" onClick={t.next}><SkipForward /></button>
      </div>

      <div className="rt-prep">
        {(['aff', 'neg'] as const).map((p) => {
          const ms = prepLeft(t, p)
          return (
            <button key={p} className={`rt-prep-btn ${p} ${t.prepRunning === p ? 'on' : ''}`} onClick={() => t.togglePrep(p)} disabled={ms <= 0 && t.prepRunning !== p} aria-pressed={t.prepRunning === p}>
              <span className="rt-prep-label">{p === 'aff' ? def.affLabel : def.negLabel} prep</span>
              <span className="rt-prep-time">{clock(ms)}</span>
            </button>
          )
        })}
        <button className="btn ghost sm rt-prep-reset" onClick={t.resetPrep}>Reset prep</button>
      </div>

      {!compact && (
        <ol className="rt-list" aria-label="Speeches">
          {def.speeches.map((sp, i) => {
            const sd = sp.side === 'both' ? 'both' : sideFor(t.format, sp.side, affFirst)
            return (
              <li key={sp.id + i} className={`rt-row ${i === t.speech ? 'on' : ''} ${i < t.speech ? 'done' : ''}`}>
                <button className="rt-row-main" onClick={() => t.selectSpeech(i)}>
                  <span className={`rt-dot side-${sd}`} aria-hidden />
                  <span className="rt-row-label">{sp.label}</span>
                  {sp.cross && <span className="rt-cx">cross</span>}
                </button>
                <label className="rt-min">
                  <input
                    type="number"
                    min={0.5}
                    max={15}
                    step={0.5}
                    value={speechMinutes(t, i)}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      if (v > 0) t.setMinutes(sp.id, v)
                    }}
                    aria-label={`${sp.label} minutes`}
                  />
                  <span>min</span>
                </label>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
