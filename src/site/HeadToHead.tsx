import { Swords } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { winProbability } from '../rankings/glicko2'
import type { RankedDebater } from '../rankings/types'

const label = (d: RankedDebater) => `${d.name} — ${d.school}`

function Picker({ value, onChange, debaters, placeholder, listId }: { value: RankedDebater | null; onChange: (d: RankedDebater | null) => void; debaters: RankedDebater[]; placeholder: string; listId: string }) {
  const [text, setText] = useState(value ? label(value) : '')
  return (
    <input
      className="input"
      list={listId}
      value={text}
      placeholder={placeholder}
      aria-label={placeholder}
      onChange={(e) => {
        setText(e.target.value)
        onChange(debaters.find((d) => label(d) === e.target.value) ?? null)
      }}
      onFocus={(e) => e.target.select()}
    />
  )
}

/** Win probability between two ranked debaters, from their ratings and deviations. */
export function HeadToHead({ debaters, initialA, initialB, compact = false }: { debaters: RankedDebater[]; initialA?: RankedDebater | null; initialB?: RankedDebater | null; compact?: boolean }) {
  const listId = useId()
  const [a, setA] = useState<RankedDebater | null>(initialA ?? debaters[0] ?? null)
  const [b, setB] = useState<RankedDebater | null>(initialB ?? debaters.find((d) => d.id !== (initialA ?? debaters[0])?.id) ?? null)
  const p = useMemo(() => (a && b && a.id !== b.id ? winProbability({ r: a.rating, rd: a.rd }, { r: b.rating, rd: b.rd }) : null), [a, b])
  return (
    <section className={`h2h card ${compact ? 'compact' : ''}`} aria-label="Head-to-head predictor">
      <div className="h2h-head">
        <h3><Swords size={16} /> Head to head</h3>
        <span className="dim">Glicko-2 win probability</span>
      </div>
      <datalist id={listId}>
        {debaters.map((d) => (
          <option key={d.id} value={label(d)} />
        ))}
      </datalist>
      <div className="h2h-pickers">
        {!initialA && <Picker value={a} onChange={setA} debaters={debaters} placeholder="First debater" listId={listId} />}
        <Picker value={b} onChange={setB} debaters={debaters} placeholder={initialA ? `Opponent for ${initialA.name}` : 'Second debater'} listId={listId} />
      </div>
      {p !== null && a && b ? (
        <div className="h2h-result">
          <div className="h2h-names">
            <Link to={`/debaters/${a.id}`}><b>{a.name}</b></Link>
            <Link to={`/debaters/${b.id}`}><b>{b.name}</b></Link>
          </div>
          <div className="h2h-bar" role="img" aria-label={`${a.name} ${Math.round(p * 100)} percent, ${b.name} ${Math.round((1 - p) * 100)} percent`}>
            <i className="a" style={{ width: `${p * 100}%` }}>{Math.round(p * 100)}%</i>
            <i className="b" style={{ width: `${(1 - p) * 100}%` }}>{Math.round((1 - p) * 100)}%</i>
          </div>
          <p className="h2h-note dim">
            Ratings {Math.round(a.rating)} ± {Math.round(a.rd)} vs {Math.round(b.rating)} ± {Math.round(b.rd)}. Side, judge and topic aren’t modelled; treat it as a rough read, not a prediction you can bank on.
          </p>
        </div>
      ) : (
        <p className="dim h2h-note">Pick two different debaters.</p>
      )}
    </section>
  )
}
