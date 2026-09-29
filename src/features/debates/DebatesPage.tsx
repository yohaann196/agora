import { AnimatePresence, motion } from 'framer-motion'
import { CornerDownRight, GitBranch, HandHeart, MessageSquare, Plus, ScanSearch, ShieldQuestion, Swords, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { detectFallacies } from '../../ai/fallacies'
import { detectConcepts, detectPhilosophers } from '../../ai/lexicon'
import { EntityLink } from '../../components/ui/EntityLink'
import { PageHeader, SaveButton, timeAgo } from '../../components/ui/primitives'
import { conceptById } from '../../data/concepts'
import { currentUser, networkUsers, userById } from '../../data/social'
import type { Debate, DebateMove, DebateMoveType } from '../../model/types'
import { useOS } from '../../store'
import { NotFound } from '../workspace/NotFound'
import './debates.css'

const MOVE_LABEL: Record<DebateMoveType, string> = {
  objection: 'Objection',
  counter: 'Counterargument',
  response: 'Response',
  rebuttal: 'Rebuttal',
  support: 'Support',
  comment: 'Comment',
}

function flat(moves: DebateMove[]): DebateMove[] {
  return moves.flatMap((m) => [m, ...flat(m.children)])
}
function depth(moves: DebateMove[]): number {
  return moves.length ? 1 + Math.max(...moves.map((m) => depth(m.children))) : 0
}

export function Avatar({ id, size = 'md' }: { id: string; size?: 'sm' | 'md' | 'lg' }) {
  const u = userById[id] ?? currentUser
  return (
    <span className={`avatar ${size === 'md' ? '' : size}`} style={{ ['--h' as string]: u.hue }} aria-hidden>
      {u.name.charAt(0)}
    </span>
  )
}

function Composer({ onSubmit, types, placeholder, autoFocus, onCancel }: { onSubmit: (t: DebateMoveType, body: string) => void; types: DebateMoveType[]; placeholder: string; autoFocus?: boolean; onCancel?: () => void }) {
  const [type, setType] = useState<DebateMoveType>(types[0])
  const [body, setBody] = useState('')
  const [checked, setChecked] = useState(false)
  const flags = checked ? detectFallacies(body) : []
  return (
    <form
      className="composer-box"
      onSubmit={(e) => {
        e.preventDefault()
        if (!body.trim()) return
        onSubmit(type, body.trim())
        setBody('')
        setChecked(false)
      }}
    >
      <div className="seg" role="group" aria-label="Move type">
        {types.map((t) => (
          <button type="button" key={t} aria-pressed={type === t} onClick={() => setType(t)}>
            <span className={`mini-dot ${t}`} /> {MOVE_LABEL[t]}
          </button>
        ))}
      </div>
      <textarea className="textarea" rows={3} value={body} onChange={(e) => { setBody(e.target.value); setChecked(false) }} placeholder={placeholder} autoFocus={autoFocus} aria-label="Your contribution" />
      {checked && (
        <div className="fallacy-check">
          {flags.length ? (
            flags.map((f) => (
              <p key={f.id}>
                <strong>Possible {f.name.toLowerCase()}.</strong> {f.question}
              </p>
            ))
          ) : (
            <p>No common fallacy patterns found. Have you stated the other side’s view at its strongest?</p>
          )}
        </div>
      )}
      <div className="hstack" style={{ justifyContent: 'space-between' }}>
        <button type="button" className="btn ghost sm" onClick={() => setChecked(true)} disabled={!body.trim()}>
          <ScanSearch /> Check my reasoning
        </button>
        <div className="hstack">
          {onCancel && (
            <button type="button" className="btn ghost sm" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button className="btn primary sm" disabled={!body.trim()}>
            Publish {MOVE_LABEL[type].toLowerCase()}
          </button>
        </div>
      </div>
    </form>
  )
}

const REPLY_TYPES: Record<DebateMoveType, DebateMoveType[]> = {
  objection: ['response', 'comment'],
  counter: ['response', 'comment'],
  response: ['rebuttal', 'objection', 'comment'],
  rebuttal: ['response', 'comment'],
  support: ['objection', 'comment'],
  comment: ['comment', 'objection'],
}

function MoveNode({ m, debateId, level }: { m: DebateMove; debateId: string; level: number }) {
  const [replying, setReplying] = useState(false)
  const addMove = useOS((s) => s.addMove)
  const u = userById[m.author] ?? currentUser
  return (
    <motion.div className={`move ${m.type}`} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
      <div className="move-card">
        <div className="move-head">
          <span className={`move-pill ${m.type}`}>{MOVE_LABEL[m.type]}</span>
          <Link to={`/app/debates/people/${u.id}`} className="hstack" style={{ gap: 6 }}>
            <Avatar id={u.id} size="sm" />
            <span className="t0" style={{ fontSize: 'var(--fs-12)' }}>{u.id === 'you' ? 'You' : u.name}</span>
          </Link>
          <span className="dim mono" style={{ fontSize: 10 }}>{u.school}</span>
          <span className="spacer" />
          <span className="dim mono" style={{ fontSize: 10 }}>{timeAgo(m.createdAt)}</span>
        </div>
        <p className="move-body">{m.body.replace(/\*(.*?)\*/g, '$1')}</p>
        <div className="move-actions">
          <button className="btn ghost sm" onClick={() => setReplying((r) => !r)}>
            <CornerDownRight /> {m.type === 'objection' || m.type === 'counter' ? 'Respond' : m.type === 'response' ? 'Rebut' : 'Reply'}
          </button>
          {detectConcepts(m.body, 2).map((c) => (
            <EntityLink key={c} id={c} variant="chip" />
          ))}
        </div>
        <AnimatePresence>
          {replying && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
              <Composer
                autoFocus
                types={REPLY_TYPES[m.type]}
                placeholder={m.type === 'objection' ? 'Answer the objection directly — without restating your original claim.' : m.type === 'response' ? 'Where does the response fall short?' : 'Add to the exchange…'}
                onSubmit={(t, body) => {
                  addMove(debateId, m.id, t, body)
                  setReplying(false)
                  useOS.getState().toast({ title: `${MOVE_LABEL[t]} published`, tone: 'success' })
                }}
                onCancel={() => setReplying(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {m.children.length > 0 && (
        <div className="move-children" style={{ ['--lvl' as string]: level }}>
          {m.children.map((c) => (
            <MoveNode key={c.id} m={c} debateId={debateId} level={level + 1} />
          ))}
        </div>
      )}
    </motion.div>
  )
}

function DebateCard({ d, i }: { d: Debate; i: number }) {
  const all = flat(d.moves)
  const count = (t: DebateMoveType) => all.filter((m) => m.type === t).length
  const u = userById[d.author] ?? currentUser
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
      <Link to={`/app/debates/${d.id}`} className="card debate-card">
        <div className="hstack" style={{ gap: 8 }}>
          <Avatar id={u.id} size="sm" />
          <span style={{ fontSize: 'var(--fs-12)' }} className="t0">{u.id === 'you' ? 'You' : u.name}</span>
          <span className="dim mono" style={{ fontSize: 10 }}>{u.school} · {timeAgo(d.createdAt)}</span>
          <span className="spacer" />
          <SaveButton refItem={{ kind: 'debate', id: d.id }} />
        </div>
        <h3 className="debate-thesis">{d.thesis}</h3>
        <p className="dim clamp-2" style={{ fontSize: 'var(--fs-12)', lineHeight: 1.55 }}>{d.framing}</p>
        <div className="debate-structure">
          <span><i className="mini-dot objection" /> {count('objection') + count('counter')} challenges</span>
          <span><i className="mini-dot response" /> {count('response')} responses</span>
          <span><i className="mini-dot rebuttal" /> {count('rebuttal')} rebuttals</span>
          <span className="dim"><GitBranch size={11} /> depth {depth(d.moves)}</span>
          <span className="spacer" />
          <span className="dim"><HandHeart size={11} /> {d.supporters.length}</span>
        </div>
      </Link>
    </motion.div>
  )
}

type Sort = 'developed' | 'contested' | 'newest'

export function DebatesIndex() {
  const debates = useOS((s) => s.debates)
  const createDebate = useOS((s) => s.createDebate)
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [sort, setSort] = useState<Sort>('developed')
  const composing = params.get('compose') === '1'
  const [thesis, setThesis] = useState('')
  const [framing, setFraming] = useState('')
  const sorted = useMemo(() => {
    const score = (d: Debate) => (sort === 'developed' ? depth(d.moves) * 10 + flat(d.moves).length : sort === 'contested' ? flat(d.moves).filter((m) => m.type === 'objection' || m.type === 'counter').length : d.createdAt)
    return [...debates].sort((a, b) => score(b) - score(a))
  }, [debates, sort])

  return (
    <div className="page">
      <PageHeader
        eyebrow="Debate Network"
        title="Debate Network"
        lede="Publish a thesis. Others object, respond and rebut. Discussions are structured as arguments — and ranked by how well they’re tested, not how popular they are."
        actions={
          <button className="btn primary" onClick={() => setParams({ compose: '1' })}>
            <Plus /> Publish a thesis
          </button>
        }
      />
      <AnimatePresence>
        {composing && (
          <motion.form
            className="publish panel"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            onSubmit={(e) => {
              e.preventDefault()
              if (!thesis.trim()) return
              const text = thesis + ' ' + framing
              const id = createDebate({ thesis: thesis.trim(), framing: framing.trim(), concepts: detectConcepts(text, 5), philosophers: detectPhilosophers(text) })
              useOS.getState().toast({ title: 'Thesis published', body: 'Others can now object, respond and rebut.', tone: 'success' })
              navigate(`/app/debates/${id}`)
            }}
          >
            <div className="hstack" style={{ justifyContent: 'space-between' }}>
              <div className="eyebrow">New thesis</div>
              <button type="button" className="btn icon sm ghost" aria-label="Close" onClick={() => setParams({})}><X /></button>
            </div>
            <input className="thesis-input" autoFocus value={thesis} onChange={(e) => setThesis(e.target.value)} placeholder="State a thesis someone could reasonably deny…" aria-label="Thesis" />
            <textarea className="textarea" rows={3} value={framing} onChange={(e) => setFraming(e.target.value)} placeholder="Frame it: what’s at stake, and what’s your main reason?" aria-label="Framing" />
            {(thesis || framing) && (
              <div className="chips">
                {detectConcepts(thesis + ' ' + framing, 5).map((c) => <EntityLink key={c} id={c} variant="chip" />)}
              </div>
            )}
            <div className="hstack" style={{ justifyContent: 'flex-end' }}>
              <button className="btn primary sm" disabled={!thesis.trim()}>Publish</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="two-col">
        <div>
          <div className="filterbar">
            <div className="seg" role="tablist" aria-label="Sort">
              {(['developed', 'contested', 'newest'] as Sort[]).map((s) => (
                <button key={s} role="tab" aria-selected={sort === s} onClick={() => setSort(s)}>
                  {s === 'developed' ? 'Most developed' : s === 'contested' ? 'Most contested' : 'Newest'}
                </button>
              ))}
            </div>
          </div>
          <div className="grid">
            {sorted.map((d, i) => (
              <DebateCard key={d.id} d={d} i={i} />
            ))}
          </div>
        </div>
        <aside>
          <div className="panel principles">
            <div className="panel-head"><h3><ShieldQuestion /> House rules</h3></div>
            <ul className="panel-body">
              <li>No likes, no follower counts. Arguments rise by how well they’re developed and tested.</li>
              <li>Steelman first: state the view you’re challenging at its strongest.</li>
              <li>Every objection deserves a response; every response can be rebutted.</li>
              <li>Attack arguments, never people.</li>
            </ul>
          </div>
          <div className="panel">
            <div className="panel-head"><h3>Thinkers on the network</h3></div>
            <div className="link-list" style={{ padding: 6 }}>
              {networkUsers.map((u) => (
                <Link key={u.id} to={`/app/debates/people/${u.id}`} className="link-row">
                  <Avatar id={u.id} size="sm" />
                  <span className="t0">{u.id === 'you' ? `${u.name} (you)` : u.name}</span>
                  <span className="rel">{u.school}</span>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export function DebateThread() {
  const { id = '' } = useParams()
  const d = useOS((s) => s.debates.find((x) => x.id === id))
  const { addMove, toggleSupport, pushRecent, toast } = useOS.getState()
  useEffect(() => {
    if (d) pushRecent({ kind: 'debate', id: d.id })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])
  if (!d) return <NotFound />
  const u = userById[d.author] ?? currentUser
  const supported = d.supporters.includes('you')
  const all = flat(d.moves)
  return (
    <div className="page">
      <div className="two-col">
        <div>
          <section className="thread-hero">
            <div className="hstack" style={{ gap: 8 }}>
              <span className="move-pill argument">Argument</span>
              <Link to={`/app/debates/people/${u.id}`} className="hstack" style={{ gap: 6 }}>
                <Avatar id={u.id} size="sm" />
                <span className="t0" style={{ fontSize: 'var(--fs-12)' }}>{u.id === 'you' ? 'You' : u.name}</span>
              </Link>
              <span className="dim mono" style={{ fontSize: 10 }}>{u.school} · {timeAgo(d.createdAt)}</span>
            </div>
            <h1 className="thread-thesis">{d.thesis}</h1>
            {d.framing && <p className="thread-framing">{d.framing}</p>}
            <div className="chips">
              {d.philosophers.map((p) => <EntityLink key={p} id={p} variant="chip" />)}
              {d.concepts.map((c) => <EntityLink key={c} id={c} variant="chip">{conceptById[c]?.name}</EntityLink>)}
            </div>
            <div className="hstack" style={{ marginTop: 6 }}>
              <button className={`btn sm ${supported ? 'primary' : ''}`} onClick={() => toggleSupport(d.id)} aria-pressed={supported}>
                <HandHeart /> {supported ? 'Supporting' : 'Support'} · {d.supporters.length}
              </button>
              <button className="btn sm" onClick={() => document.getElementById('root-composer')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
                <Swords /> Challenge
              </button>
              <SaveButton refItem={{ kind: 'debate', id: d.id }} label />
            </div>
          </section>

          <div className="flow-legend">
            {(['argument', 'objection', 'response', 'rebuttal'] as const).map((t, i) => (
              <span key={t}>
                <span className={`move-pill ${t}`}>{t === 'argument' ? 'Argument' : MOVE_LABEL[t]}</span>
                {i < 3 && <span className="dim">→</span>}
              </span>
            ))}
          </div>

          <div className="thread">
            {d.moves.map((m) => (
              <MoveNode key={m.id} m={m} debateId={d.id} level={1} />
            ))}
            {!d.moves.length && <div className="empty">No challenges yet. Be the first to test this thesis.</div>}
          </div>

          <div id="root-composer" className="panel" style={{ padding: 14, marginTop: 18 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Add to the debate</div>
            <Composer
              types={['objection', 'counter', 'support', 'comment']}
              placeholder="Steelman first: state the thesis at its strongest — then say where it fails."
              onSubmit={(t, body) => {
                addMove(d.id, null, t, body)
                toast({ title: `${MOVE_LABEL[t]} published`, tone: 'success' })
              }}
            />
          </div>
        </div>
        <aside>
          <div className="panel">
            <div className="panel-head"><h3><MessageSquare /> Structure</h3></div>
            <div className="panel-body thread-stats">
              {(['objection', 'counter', 'response', 'rebuttal', 'support', 'comment'] as DebateMoveType[]).map((t) => (
                <div key={t}>
                  <span className={`mini-dot ${t}`} />
                  <span>{MOVE_LABEL[t]}s</span>
                  <span className="mono t0">{all.filter((m) => m.type === t).length}</span>
                </div>
              ))}
              <div>
                <GitBranch size={12} />
                <span>Deepest exchange</span>
                <span className="mono t0">{depth(d.moves)}</span>
              </div>
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><h3>Unanswered challenges</h3></div>
            <div className="panel-body" style={{ display: 'grid', gap: 8 }}>
              {all.filter((m) => (m.type === 'objection' || m.type === 'counter') && !m.children.some((c) => c.type === 'response')).map((m) => (
                <p key={m.id} className="dim clamp-3" style={{ fontSize: 'var(--fs-12)' }}>
                  <span className={`mini-dot ${m.type}`} style={{ marginRight: 6 }} />
                  {m.body}
                </p>
              ))}
              {!all.some((m) => (m.type === 'objection' || m.type === 'counter') && !m.children.some((c) => c.type === 'response')) && <p className="dim" style={{ fontSize: 'var(--fs-12)' }}>Every challenge has a response.</p>}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export function DebateProfile() {
  const { id = '' } = useParams()
  const u = userById[id]
  const debates = useOS((s) => s.debates)
  const args = useOS((s) => s.arguments)
  const saved = useOS((s) => s.saved)
  const name = useOS((s) => s.settings.name)
  if (!u) return <NotFound />
  const isYou = u.id === 'you'
  const authored = debates.filter((d) => d.author === u.id)
  const participated = debates.filter((d) => d.author !== u.id && flat(d.moves).some((m) => m.author === u.id))
  const moves = debates.flatMap((d) => flat(d.moves)).filter((m) => m.author === u.id)
  const savedConcepts = isYou ? saved.filter((s) => s.kind === 'concept').map((s) => s.id).concat(u.savedConcepts).filter((v, i, a) => a.indexOf(v) === i) : u.savedConcepts
  const myArgs = isYou ? args.filter((a) => a.author === 'you') : []
  return (
    <div className="page">
      <section className="entity-hero">
        <Avatar id={u.id} size="lg" />
        <div>
          <div className="eyebrow">@{isYou ? name.toLowerCase() : u.handle} · {u.school}</div>
          <h1 style={{ marginTop: 8 }}>{isYou ? name : u.name}</h1>
          <p className="dim" style={{ marginTop: 10, maxWidth: 560 }}>{u.bio}</p>
        </div>
        <div className="profile-stats">
          <div><span className="serif t0">{authored.length + myArgs.length}</span><span>arguments</span></div>
          <div><span className="serif t0">{moves.filter((m) => m.type === 'objection' || m.type === 'counter').length}</span><span>challenges raised</span></div>
          <div><span className="serif t0">{moves.filter((m) => m.type === 'response' || m.type === 'rebuttal').length}</span><span>replies</span></div>
        </div>
      </section>
      <div className="two-col">
        <div>
          <section className="section">
            <div className="section-title"><h2>Arguments <span className="count">{authored.length + myArgs.length}</span></h2></div>
            <div className="grid">
              {authored.map((d, i) => <DebateCard key={d.id} d={d} i={i} />)}
              {myArgs.map((a) => (
                <Link key={a.id} to={`/app/arguments/${a.id}`} className="card">
                  <div className="card-sub">Argument map · {a.nodes.length} nodes</div>
                  <div className="serif t0" style={{ fontSize: 19 }}>{a.title}</div>
                </Link>
              ))}
              {!authored.length && !myArgs.length && <div className="empty">No published arguments yet.</div>}
            </div>
          </section>
          <section className="section">
            <div className="section-title"><h2>Debates <span className="count">{participated.length}</span></h2></div>
            <div className="grid">
              {participated.map((d, i) => <DebateCard key={d.id} d={d} i={i} />)}
              {!participated.length && <div className="empty">Hasn’t joined other debates yet.</div>}
            </div>
          </section>
        </div>
        <aside>
          <div className="panel">
            <div className="panel-head"><h3>Philosophical interests</h3></div>
            <div className="panel-body chips">
              {u.interests.map((i) => <span key={i} className="tag plain">{i}</span>)}
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><h3>Saved concepts</h3></div>
            <div className="panel-body chips">
              {savedConcepts.map((c) => <EntityLink key={c} id={c} variant="chip" />)}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
