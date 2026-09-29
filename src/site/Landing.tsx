import { ArrowRight, BookMarked, Check, FileStack, Globe, LineChart, Newspaper, Scissors, Shield, Swords, TableProperties, Timer, Trophy, UserRound } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useLocation } from 'react-router'
import { Sparkline } from '../components/ui/charts'
import { Avatar, RankChange } from '../components/ui/primitives'
import { RESOLUTION } from '../data/debateSeeds'
import { currentBrief } from '../data/briefs'
import { useRankings } from '../rankings/data'
import { BriefCover } from './BriefsPage'
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
        {(data?.debaters.slice(0, 5) ?? Array.from({ length: 5 }, () => null)).map((d, i) =>
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

const PREP = [
  { icon: Globe, title: 'Evidence search', body: 'Search encyclopedias, scholarly papers and books in one place, plus every card you’ve already cut. Open a source and read it without leaving Resolved.', to: '/app/evidence' },
  { icon: Scissors, title: 'Card cutter', body: 'Select a passage, write a tag, cut. Author, date, title and URL are filled in for you, so every card is cited the moment it exists.', to: '/app/evidence' },
  { icon: FileStack, title: 'Contention vault', body: 'Build cases in Pockets, Hats, Blocks and Tags with Verbatim keys, underlining and highlighting. Read time counts only what you’ll actually read.', to: '/app/vaults?type=contention' },
  { icon: Shield, title: 'Block vault', body: 'Keep frontlines and framework blocks in one searchable place, and send any block into your speech with one click.', to: '/app/vaults?type=block' },
]

const FAQ = [
  { q: 'Is Resolved free?', a: 'Yes, everything is free during the beta: prep tools, rankings, profiles and monthly briefs.' },
  { q: 'Where do the rankings come from?', a: 'Public Tabroom round results from national-circuit tournaments, rated with Glicko-2. The methodology page explains every step, and the data source is open.' },
  { q: 'I have a profile. Can I correct or remove it?', a: 'Yes. Every profile has a link to request a correction or removal, and removal requests are honoured.' },
  { q: 'Does it work for PF and Policy?', a: 'The prep tools, flows and timers work for LD, PF and Policy. Rankings and briefs start with LD; more events are on the way.' },
  { q: 'Where is my work stored?', a: 'In your browser, on your device. There’s no account yet, and nothing you cut or write is uploaded.' },
]

export function Landing() {
  const { pathname } = useLocation()
  const load = useRankings()
  const data = load.state === 'ready' ? load.data : null
  const top = data?.debaters[0]

  useEffect(() => {
    document.title = 'Resolved — Debate prep, rankings & briefs'
    if (pathname === '/prep') document.getElementById('prep')?.scrollIntoView({ block: 'start' })
  }, [pathname])

  return (
    <div className="landing">
      <section className="hero wrap">
        <div className="hero-copy">
          <span className="hero-eyebrow">For Lincoln–Douglas, Public Forum &amp; Policy</span>
          <h1 className="hero-title">
            Prep like a champion.<br />
            <span>Compete like one.</span>
          </h1>
          <p className="hero-lede">
            Resolved is the debate platform for the whole season. Find evidence, cut cards, build contention and block vaults, flow your rounds, and see exactly where you stand in the national LD rankings.
          </p>
          <div className="hero-ctas">
            <Link to="/app" className="btn primary lg">Open Resolved <ArrowRight /></Link>
            <Link to="/rankings" className="btn lg">See the LD rankings</Link>
          </div>
          <p className="hero-fine"><Check size={14} /> Free during the beta · no account needed</p>
        </div>
        <LiveTop />
      </section>

      <Link to={`/briefs/${currentBrief.id}`} className="topic-strip">
        <span className="ts-label">Current LD topic</span>
        <span className="ts-res">{RESOLUTION}</span>
        <span className="ts-cta">Read the brief <ArrowRight size={14} /></span>
      </Link>

      <section className="wrap section" id="prep">
        <div className="sec-head">
          <span className="sec-kicker">Prep</span>
          <h2 className="sec-title">Every tool between the topic and the round.</h2>
          <p className="sec-lede">Four tools that work together: what you find becomes a card, cards go into vaults, vaults become speeches.</p>
        </div>
        <div className="prep-grid">
          {PREP.map((p, i) => (
            <Link key={p.title} to={p.to} className={`prep-card pc${i}`}>
              <span className="pc-icon"><p.icon /></span>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
              <span className="pc-go">Open <ArrowRight size={14} /></span>
            </Link>
          ))}
        </div>
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
            <h2 className="sec-title light">Know where you stand.</h2>
            <p className="sec-lede light">National LD rankings from real round results, updated as the season goes, with a profile for every ranked debater.</p>
          </div>
          <div className="compete-grid">
            <div className="stat-tiles">
              <div><b>{data ? data.debaters.length : '—'}</b><span>ranked debaters</span></div>
              <div><b>{data ? data.field.rounds.toLocaleString() : '—'}</b><span>rounds rated</span></div>
              <div><b>{data ? data.tournaments.length : '—'}</b><span>tournaments this season</span></div>
            </div>
            <div className="compete-features">
              {[
                [Trophy, 'Glicko-2 rankings', 'Every decided round is a rated game. Upsets move you more, and majors count double.'],
                [UserRound, 'A profile for every debater', 'Rating history, tournament placements, round-by-round results and best wins.'],
                [Swords, 'Head-to-head odds', 'Pick any two ranked debaters and see the win probability.'],
                [LineChart, 'Topic-period rankings', 'See who’s best on each topic, as well as across the season.'],
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
                    <span className="eyebrow">#{top.rank} in LD</span>
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

      <section className="wrap section briefs-band">
        <div className="bb-copy">
          <span className="sec-kicker"><Newspaper size={14} /> Monthly Briefs</span>
          <h2 className="sec-title">A new brief every month. Know the topic before your first round.</h2>
          <p className="sec-lede">
            Each issue breaks down the current LD resolution: definitions and burdens, the best aff and neg arguments with their answers, the frameworks that fit, and a reading list of real sources you can cut from in one click. Once the season starts, it adds what real results say is winning.
          </p>
          <ul className="bb-list">
            {['Topic primer the week a resolution drops', 'Mid-topic meta from real round data', 'Reading lists linked straight into the card cutter'].map((t) => (
              <li key={t}><BookMarked size={16} /> {t}</li>
            ))}
          </ul>
          <div className="hero-ctas">
            <Link to={`/briefs/${currentBrief.id}`} className="btn primary lg">Read the {currentBrief.month.split(' ')[0]} brief <ArrowRight /></Link>
            <Link to="/briefs" className="btn lg">All issues</Link>
          </div>
        </div>
        <BriefCover b={currentBrief} big />
      </section>

      <section className="wrap section">
        <div className="pricing card">
          <div>
            <span className="sec-kicker">Pricing</span>
            <h2 className="sec-title">Free while we’re in beta.</h2>
            <p className="sec-lede">Everything is included. Team plans for squads and coaches are coming later this season.</p>
          </div>
          <ul className="price-list">
            {['Evidence search and card cutter', 'Contention and block vaults', 'Flow & Timer for LD, PF and Policy', 'LD rankings and debater profiles', 'Monthly Briefs'].map((t) => (
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
