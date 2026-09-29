import { motion } from 'framer-motion'
import { Plus, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { PageHeader, SaveButton, timeAgo } from '../../components/ui/primitives'
import { philosopherById } from '../../data/philosophers'
import { schoolById } from '../../data/schools'
import { useOS } from '../../store'
import { NODE_META, coreOrder } from './argModel'
import './arguments.css'

type Filter = 'all' | 'yours' | 'classic'

export function ArgumentsIndex() {
  const args = useOS((s) => s.arguments)
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('all')
  const list = args.filter((a) => filter === 'all' || (filter === 'yours' ? a.author === 'you' : a.author !== 'you'))
  const create = () => navigate(`/app/arguments/${useOS.getState().createArgument()}`)

  return (
    <div className="page">
      <PageHeader
        eyebrow="Arguments · construct · analyze · challenge"
        title="Arguments"
        lede="Build formal arguments as connected cards. Attach objections, evidence and definitions — then ask PhilosophyOS where the reasoning needs work."
        actions={
          <button className="btn primary" onClick={create}>
            <Plus /> New argument
          </button>
        }
      />
      <div className="filterbar">
        <div className="seg" role="tablist">
          {(['all', 'yours', 'classic'] as Filter[]).map((f) => (
            <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'yours' ? 'Yours' : 'Classic arguments'}
              <span className="dim mono" style={{ marginLeft: 6, fontSize: 10 }}>
                {args.filter((a) => f === 'all' || (f === 'yours' ? a.author === 'you' : a.author !== 'you')).length}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="arg-grid">
        <motion.button className="card arg-card hoverable new-arg" onClick={create} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'left', borderStyle: 'dashed' }}>
          <div className="arg-glyph">
            {(['claim', 'premise', 'conclusion'] as const).map((t) => (
              <i key={t} style={{ ['--nc' as string]: NODE_META[t].color, opacity: 0.35 }} />
            ))}
          </div>
          <div style={{ display: 'grid', gap: 6, alignContent: 'center' }}>
            <h3 style={{ color: 'var(--text-1)' }}>Start a new argument</h3>
            <p className="dim" style={{ fontSize: 'var(--fs-12)' }}>Claim → Premises → Inference → Conclusion</p>
          </div>
        </motion.button>
        {list.map((a, i) => {
          const order = coreOrder(a)
          const concl = order.filter((n) => n.type === 'conclusion').pop()
          const unanswered = a.nodes.filter((n) => (n.type === 'objection' || n.type === 'counter') && !a.nodes.some((r) => r.target === n.id && r.type === 'rebuttal')).length
          const byline = a.author === 'you' ? 'You' : philosopherById[a.author]?.name ?? a.author
          return (
            <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} style={{ display: 'grid' }}>
              <Link to={`/app/arguments/${a.id}`} className="card arg-card">
                <div className="arg-glyph" aria-hidden>
                  {order.map((n) => (
                    <span key={n.id} style={{ display: 'grid', gap: 3 }}>
                      <i style={{ ['--nc' as string]: NODE_META[n.type].color }} />
                      {a.nodes
                        .filter((x) => x.target === n.id)
                        .map((x) => (
                          <i key={x.id} className="att" style={{ ['--nc' as string]: NODE_META[x.type].color }} />
                        ))}
                    </span>
                  ))}
                </div>
                <div style={{ display: 'grid', gap: 8, minWidth: 0 }}>
                  <div className="hstack" style={{ justifyContent: 'space-between' }}>
                    <span className="card-sub">
                      {byline}
                      {a.tradition ? ` · ${schoolById[a.tradition]?.name}` : ''}
                    </span>
                    <SaveButton refItem={{ kind: 'argument', id: a.id }} />
                  </div>
                  <h3>{a.title || 'Untitled argument'}</h3>
                  {concl?.text && <p className="conc clamp-2">∴ {concl.text.replace(/^Therefore,?\s*/i, '')}</p>}
                  <div className="hstack dim" style={{ fontSize: 'var(--fs-11)', gap: 12 }}>
                    <span>{a.nodes.length} nodes</span>
                    {unanswered > 0 && (
                      <span style={{ color: 'var(--rose)' }} className="hstack">
                        <ShieldAlert size={12} /> {unanswered} unanswered
                      </span>
                    )}
                    <span className="spacer" />
                    <span className="mono" style={{ fontSize: 10 }}>{a.author === 'you' ? timeAgo(a.updatedAt) : 'classic'}</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
