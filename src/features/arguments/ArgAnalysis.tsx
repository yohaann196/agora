import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  CircleHelp,
  EyeOff,
  GitFork,
  Landmark,
  Link2Off,
  Plus,
  Scale,
  Swords,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import type { ArgumentAnalysis, Finding } from '../../ai/analyzeArgument'
import { EntityLink } from '../../components/ui/EntityLink'
import { SourceBadge } from '../../components/ui/primitives'
import { schoolById } from '../../data/schools'

const STAGES = ['Reading the structure', 'Checking what supports what', 'Scanning for ambiguous terms', 'Surfacing hidden assumptions', 'Consulting rival traditions']

export function AnalyzingState({ stage }: { stage: number }) {
  return (
    <div className="analyzing">
      {STAGES.map((s, i) => (
        <motion.div key={s} className={`stage ${i < stage ? 'done' : i === stage ? 'now' : ''}`} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
          <span className="stage-dot" />
          {s}
        </motion.div>
      ))}
    </div>
  )
}
export const ANALYSIS_STAGES = STAGES.length

interface SectionDef {
  key: keyof Pick<ArgumentAnalysis, 'unsupported' | 'gaps' | 'ambiguities' | 'assumptions' | 'objections' | 'counterarguments'>
  label: string
  icon: LucideIcon
  color: string
  blurb: string
}

const SECTIONS: SectionDef[] = [
  { key: 'unsupported', label: 'Unsupported premises', icon: AlertTriangle, color: 'var(--amber)', blurb: 'Steps that nothing else in the map supports.' },
  { key: 'gaps', label: 'Possible logical gaps', icon: Link2Off, color: 'var(--rose)', blurb: 'Places where the conclusion may not follow.' },
  { key: 'ambiguities', label: 'Ambiguities', icon: CircleHelp, color: 'var(--cyan)', blurb: 'Terms that could shift meaning.' },
  { key: 'assumptions', label: 'Hidden assumptions', icon: EyeOff, color: 'var(--violet)', blurb: 'What must be true that you haven’t said.' },
  { key: 'objections', label: 'Objections', icon: Swords, color: 'var(--orange)', blurb: 'What a well-prepared opponent would say.' },
  { key: 'counterarguments', label: 'Counterarguments', icon: GitFork, color: 'var(--blue)', blurb: 'Rival arguments for a different conclusion.' },
]

export function ArgAnalysisPanel({
  analysis,
  onHighlight,
  onAddObjection,
  onAddCounter,
}: {
  analysis: ArgumentAnalysis
  onHighlight: (ids: string[]) => void
  onAddObjection: (f: Finding) => void
  onAddCounter: (f: Finding) => void
}) {
  const [open, setOpen] = useState<string[]>(['unsupported', 'gaps', 'objections'])
  const toggle = (k: string) => setOpen((o) => (o.includes(k) ? o.filter((x) => x !== k) : [...o, k]))
  return (
    <div className="analysis">
      <div className="analysis-note">
        <Scale size={14} />
        <p>
          Agora doesn’t declare arguments correct or incorrect. It shows where the reasoning needs work — <strong>you decide</strong> what to do about it.
        </p>
      </div>
      <div className="analysis-overview">
        <div className="eyebrow">{analysis.form}</div>
        <p>{analysis.overview}</p>
      </div>

      {SECTIONS.map((sec, si) => {
        const items = analysis[sec.key]
        const isOpen = open.includes(sec.key)
        const I = sec.icon
        return (
          <motion.section key={sec.key} className="an-sec" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * si }} style={{ ['--sc' as string]: sec.color }}>
            <button className="an-head" onClick={() => toggle(sec.key)} aria-expanded={isOpen}>
              <I aria-hidden />
              <span>{sec.label}</span>
              <span className="an-count mono">{items.length}</span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                  <div className="an-items">
                    {items.length === 0 && <p className="dim an-empty">{sec.key === 'unsupported' ? 'Every premise has support in the map.' : 'Nothing flagged here.'}</p>}
                    {items.map((f) => (
                      <div key={f.id} className="finding" onMouseEnter={() => onHighlight(f.nodeIds ?? [])} onMouseLeave={() => onHighlight([])}>
                        <div className="f-title">{f.title}</div>
                        <p className="f-detail">{f.detail}</p>
                        {f.sketch && (
                          <ol className="sketch">
                            {f.sketch.map((s, i) => (
                              <li key={i} className={i === f.sketch!.length - 1 ? 'concl' : ''}>
                                <span className="mono">{i === f.sketch!.length - 1 ? '∴' : `P${i + 1}`}</span>
                                {s}
                              </li>
                            ))}
                          </ol>
                        )}
                        {f.question && <p className="f-q">{f.question}</p>}
                        <div className="f-foot">
                          {f.refs?.map((r) => <EntityLink key={r} id={r} variant="chip" />)}
                          <span className="spacer" />
                          {sec.key === 'objections' && !f.id.startsWith('ou-') && (
                            <button className="btn ghost sm" onClick={() => onAddObjection(f)}>
                              <Plus /> Add to map
                            </button>
                          )}
                          {sec.key === 'counterarguments' && (
                            <button className="btn ghost sm" onClick={() => onAddCounter(f)}>
                              <Plus /> Add to map
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        )
      })}

      <section className="an-sec" style={{ ['--sc' as string]: 'var(--green)' }}>
        <div className="an-head static">
          <Landmark aria-hidden />
          <span>Relevant traditions</span>
          <span className="an-count mono">{analysis.traditions.length}</span>
        </div>
        <div className="an-items">
          {analysis.traditions.map((t) => (
            <div key={t.school} className="finding">
              <EntityLink id={t.school}>{schoolById[t.school]?.name}</EntityLink>
              <p className="f-detail">{t.why}</p>
              <div className="chips">
                {t.philosophers.map((p) => (
                  <EntityLink key={p} id={p} variant="chip" />
                ))}
              </div>
            </div>
          ))}
          {!analysis.traditions.length && <p className="dim an-empty">Link concepts to your nodes to situate this argument in a tradition.</p>}
        </div>
      </section>

      <section className="an-questions">
        <div className="hstack" style={{ justifyContent: 'space-between' }}>
          <div className="eyebrow">Questions to sit with</div>
          <SourceBadge type="interpretation" label="Generated" />
        </div>
        <ol>
          {analysis.questions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ol>
      </section>
    </div>
  )
}
