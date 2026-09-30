import { ArrowRight, Check, History, MapPin, Swords, TableProperties, Timer, Trophy } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useLocation } from 'react-router'
import { Sparkline } from '../components/ui/charts'
import { Avatar, RankChange } from '../components/ui/primitives'
import { RESOLUTION } from '../data/debateSeeds'
import { count, useIndex, useRankings } from '../rankings/data'
import { CARD_COUNTS, CONTENTIONS, TOTAL_CARDS } from '../data/cards'
import { EventTabs } from './EventTabs'
import { updatedLabel } from './RankingsPage'
import './landing.css'

function LiveTop() {
  const load = useRankings()
  const data = load.state === 'ready' ? load.data : null
  return (
    <div className="live-card" aria-label="Current LD top five">
      <div className="lc-head">
        <span className="lc-dot" aria-hidden /> <b>LD rankings</b>
        <span className="dim">{data ? `Updated ${updatedLabel(data)}` : 'Loading…'}</span>
      </div>
      <ol className="lc-list">
        {(data?.debaters.filter((d) => d.rank !== null).slice(0, 5) ?? Array.from({ length: 5 }, () => null)).map((d, i) =>
          d ? (
            <li key={d.id}>
              <span className="lc-rank">{d.rank}</span>
              <Avatar name={d.name} size={32} />
              <Link to={`/debaters/${d.id}`} className="lc-who">
                <b>{d.name}</b>
                <span>{d.school}</span>
              </Link>
              <Sparkline values={d.spark} width={64} height={22} />
              <span className="lc-score num">{d.score.toFixed(0)}</span>
              <RankChange rank={d.rank} prev={d.prevRank} />
            </li>
          ) : (
            <li key={i}><div className="skeleton" style={{ height: 32, width: '100%' }} /></li>
          ),
        )}
      </ol>
      <Link to="/rankings" className="lc-all">Full rankings <ArrowRight size={14} /></Link>
    </div>
  )
}


const FAQ = [
  { q: 'Is Debate Utils free?', a: 'Yes. Everything is free during the beta: the prep vault, flow & timer, rankings and profiles.' },
  { q: 'Where do the rankings come from?', a: 'Public Tabroom round results. National-circuit results come from two open datasets (Shreeram Modi’s debate-rankings, and the NSD × DebateDrills × DebateLand rankings data), refreshed every week. Local tournaments are added on top. Everything is rated with Glicko-2 in one pool, and the methodology page explains every step.' },
  { q: 'Why is my local tournament missing?', a: 'Local results are being added tournament by tournament. Circuit rounds count double a local round, so a strong local record helps, and a circuit result helps more.' },
  { q: 'I have a profile. Can I correct or remove it?', a: 'Yes. Every profile has a link to request a correction or removal, and removal requests are honoured.' },
  { q: 'What about PF, Policy, Parli, BQ and Congress?', a: 'Rankings for Public Forum, Policy, Parliamentary, Big Questions and Congress are coming soon. The prep tools, flows and timers already work for LD, PF and Policy.' },
  { q: 'Where is my work stored?', a: 'In your browser, on your device. There’s no account yet, and nothing you cut or write is uploaded.' },
]

export function Landing() {
  const { pathname } = useLocation()
  const load = useRankings()
  const index = useIndex()
  const data = load.state === 'ready' ? load.data : null
  const idx = index.state === 'ready' ? index.data : null
  const top = data?.debaters.find((d) => d.rank === 1)

  useEffect(() => {
    document.title = 'Debate Utils — Yohaan’s debate tools & LD rankings'
    if (pathname === '/prep') document.getElementById('prep')?.scrollIntoView({ block: 'start' })
  }, [pathname])

  return (
    <div className="landing">
      <section className="hero wrap">
        <div className="hero-copy">
          <Link to="/rankings" className="hero-eyebrow">The world’s most comprehensive LD rankings are live <ArrowRight size={13} /></Link>
          <h1 className="hero-title">
            All of Yohaan’s<br />
            <span>debate utilities.</span>
          </h1>
          <p className="hero-lede">
            Rankings and prep in one place. Pull cut cards for every contention on the topic, flow rounds next to your speech docs, and see exactly where you stand in the biggest LD rankings ever built.
          </p>
          <div className="hero-ctas">
            <Link to="/app" className="btn primary lg">Open the tools <ArrowRight /></Link>
            <Link to="/rankings" className="btn lg">See the LD rankings</Link>
          </div>
          <p className="hero-fine"><Check size={14} /> Free during the beta · no account needed</p>
        </div>
        <LiveTop />
      </section>

      <Link to="/app/vault" className="topic-strip">
        <span className="ts-label">Current LD topic</span>
        <span className="ts-res">{RESOLUTION}</span>
        <span className="ts-cta">Open the prep vault <ArrowRight size={14} /></span>
      </Link>

      <section className="wrap section" id="prep">
        <div className="sec-head">
          <span className="sec-kicker">Prep</span>
          <h2 className="sec-title">Prep vault.</h2>
          <p className="sec-lede">
            {TOTAL_CARDS ? `${TOTAL_CARDS} cut cards` : 'Cut cards'} for the current LD topic, split into five aff and five neg contentions. Every card is the source’s own words with a full cite, underlined and highlighted. Copy one into Word or Google Docs with the formatting intact, or send it straight into a speech doc. Your cases, blocks and speech docs live here too.
          </p>
        </div>
        <Link to="/app/vault" className="vault-card">
          {(['aff', 'neg'] as const).map((side) => (
            <div key={side} className={`vc-side ${side}`}>
              <span className="vc-label">{side === 'aff' ? 'Aff' : 'Neg'}</span>
              <ol>
                {CONTENTIONS.filter((c) => c.side === side).map((c) => (
                  <li key={c.id}>
                    <b>{c.title}</b>
                    <span>{c.claim}</span>
                    {CARD_COUNTS[c.id] ? <em className="num">{CARD_COUNTS[c.id]}</em> : null}
                  </li>
                ))}
              </ol>
            </div>
          ))}
          <span className="vc-go">Open the prep vault <ArrowRight size={15} /></span>
        </Link>
        <div className="flow-band">
          <div>
            <h3><TableProperties /> Flow &amp; Timer</h3>
            <p>Flow in aff and neg ink, mark drops and extensions, and run speech and prep clocks for LD, PF and Policy. The timer keeps running while you work in other tools.</p>
          </div>
          <div className="fb-clock" aria-hidden>
            <span className="fb-speech"><i>Aff</i> 1AR</span>
            <span className="fb-digits">3:47</span>
          </div>
          <Link to="/app/flow" className="btn"><Timer /> Open Flow &amp; Timer</Link>
        </div>
      </section>

      <section className="compete">
        <div className="wrap section">
          <div className="sec-head">
            <span className="sec-kicker light">Compete</span>
            <h2 className="sec-title light">The world’s most comprehensive LD rankings.</h2>
            <p className="sec-lede light">
              The largest LD results dataset anywhere, and the most careful ratings: {idx ? `${count(idx.totals.rounds)} rounds from ${idx.totals.tournaments} tournaments across ${idx.totals.seasons} seasons` : 'every round we can find'}, national circuit and local, rated in one Glicko-2 pool and refreshed every week. Every debater gets a profile with their whole career.
            </p>
          </div>
          <div className="compete-events">
            <EventTabs dark />
            <span>Lincoln–Douglas is live. Public Forum, Policy, Parli, Big Questions and Congress are coming soon.</span>
          </div>
          <div className="compete-grid">
            <div className="stat-tiles">
              <div><b>{idx ? count(idx.totals.rounds, true) : '—'}</b><span>rounds rated</span></div>
              <div><b>{idx ? idx.totals.tournaments : '—'}</b><span>tournaments since {idx ? idx.seasons.at(-1)!.label.slice(0, 4) : '—'}</span></div>
              <div><b>{idx ? count(idx.totals.debaters, true) : '—'}</b><span>debater profiles</span></div>
            </div>
            <div className="compete-features">
              {[
                [Trophy, 'Glicko-2, not guesswork', 'Every decided round is a rated game. Upsets move you more, uncertainty is measured, and circuit rounds count double a local one.'],
                [MapPin, 'One ranking for everyone', 'National circuit and local tournaments rated together in one list. Pick a state for its own leaderboard.'],
                [History, 'Whole careers', 'Seasons back to 2021–22, with rating history, placements and every round on each profile.'],
                [Swords, 'Head-to-head odds', 'Pick any two debaters and see the win probability.'],
              ].map(([I, t, b]) => {
                const Icon = I as typeof Trophy
                return (
                  <div key={t as string} className="cf">
                    <Icon />
                    <div>
                      <b>{t as string}</b>
                      <p>{b as string}</p>
                    </div>
                  </div>
                )
              })}
            </div>
            {top && (
              <Link to={`/debaters/${top.id}`} className="profile-teaser">
                <div className="pt-head">
                  <Avatar name={top.name} size={52} />
                  <div>
                    <span className="eyebrow">#1 in LD · {data?.season}</span>
                    <b>{top.name}</b>
                    <span>{top.school}</span>
                  </div>
                </div>
                <div className="pt-stats">
                  <div><b className="num">{top.score.toFixed(0)}</b><span>score</span></div>
                  <div><b className="num">{top.wins}–{top.losses}</b><span>record</span></div>
                  <div><b className="num">{top.elimWins}–{top.elimLosses}</b><span>elims</span></div>
                </div>
                <Sparkline values={top.spark} width={260} height={48} />
                <span className="pt-go">View profile <ArrowRight size={14} /></span>
              </Link>
            )}
          </div>
          <div className="compete-ctas">
            <Link to="/rankings" className="btn lg accent">Explore the rankings <ArrowRight /></Link>
            <Link to="/rankings/method" className="btn lg ghost light-ghost">How it works</Link>
          </div>
        </div>
      </section>

      <section className="wrap section">
        <div className="pricing card">
          <div>
            <span className="sec-kicker">Pricing</span>
            <h2 className="sec-title">Free while we’re in beta.</h2>
            <p className="sec-lede">Everything is included. Team plans for squads and coaches are coming later this season.</p>
          </div>
          <ul className="price-list">
            {['Prep vault: cut cards for every contention', 'Your cases, blocks and speech docs', 'Flow & Timer with speech docs alongside', 'LD rankings and debater profiles'].map((t) => (
              <li key={t}><Check size={16} /> {t}</li>
            ))}
          </ul>
          <Link to="/app" className="btn primary lg">Start prepping <ArrowRight /></Link>
        </div>
      </section>

      <section className="wrap section faq">
        <h2 className="sec-title">Questions</h2>
        <div className="faq-list">
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}
