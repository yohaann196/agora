import { useEffect } from 'react'
import { Link, useLocation } from 'react-router'
import { count, useIndex } from '../rankings/data'
import { MIN_ROUNDS } from '../rankings/pipeline'
import { CORRECTIONS_URL } from './links'
import './briefs.css'

export function MethodPage() {
  const { hash } = useLocation()
  const load = useIndex()
  const idx = load.state === 'ready' ? load.data : null
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' })
  }, [hash, idx])

  return (
    <div className="wrap article-wrap">
      <header className="pg-head">
        <div className="eyebrow">Rankings methodology</div>
        <h1 className="pg-title">How the LD rankings work</h1>
        <p className="pg-lede">Short version: every decided round is a game, ratings move more when an upset happens, circuit rounds count double, and you’re ranked on a rating we’re confident you’ve earned.</p>
      </header>

      <article className="article">
        <h2>Where the results come from</h2>
        <p>Round-by-round results are public on Tabroom. Resolved combines every open collection of them we know of, and refreshes them every week:</p>
        <ul>
          {(idx?.sources ?? []).map((s) => (
            <li key={s.repo}>
              <a href={s.repo} target="_blank" rel="noreferrer">{s.name}</a>, last updated {new Date(s.committedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}.
            </li>
          ))}
          <li>Local tournaments, added by hand from their public results.</li>
        </ul>
        <p>When two sources have the same tournament, we keep one copy. Resolved’s code is an independent implementation: on the current season it reproduces the debate-rankings project’s published order with a rank correlation above 0.99.</p>
        {idx && (
          <p>
            Altogether that’s <b>{count(idx.totals.rounds)} decided rounds</b> from <b>{idx.totals.tournaments} tournaments</b> across <b>{idx.totals.seasons} seasons</b> ({idx.seasons.at(-1)!.label} to {idx.seasons[0].label}), and <b>{count(idx.totals.debaters)} debaters</b>.
          </p>
        )}

        <h2>One debater, one rating</h2>
        <p>
          A debater is identified by school and name, so the same person is followed across tournaments and seasons. The few debaters who compete for more than one school are matched on name alone. Byes, split decisions without a majority, and “advances” rows aren’t counted as games.
        </p>

        <h2>Glicko-2</h2>
        <p>
          Everyone starts each season at a rating of <b>1500</b> with a deviation of <b>350</b>. Deviation measures how sure the system is. After every round, both debaters’ ratings update using{' '}
          <a href="http://www.glicko.net/glicko/glicko2.pdf" target="_blank" rel="noreferrer">Glicko-2</a> (Mark Glickman, 2012). Beating a higher-rated opponent moves you more than beating a lower-rated one. Every debater’s deviation shrinks as they compete, because the system learns more about them.
        </p>
        <ul>
          <li>Tournaments are processed in the order they finished, and each tournament’s rounds in order, prelims then elims.</li>
          <li>Within a round, every match uses ratings from before the round, so pairing order doesn’t matter.</li>
          <li>
            <b>Circuit rounds count double.</b> A round at a national-circuit tournament counts as a full game; a round at a local tournament counts as half of one. Deep national fields tell us more about a debater, so their results carry more weight.
          </li>
          <li>Volatility starts at 0.06 with τ = 0.5, the defaults from Glickman’s paper.</li>
        </ul>

        <h2>The ranking score</h2>
        <p>
          Rankings are sorted by <b>rating − 2 × deviation</b>. A debater who went 6–0 at one tournament has a high rating but a wide deviation, while a debater who has sustained a record across several tournaments has a tighter one. Subtracting two deviations asks: what rating are we about 95% sure this debater has at least? That keeps a single hot weekend from topping the list.
        </p>

        <h2>National circuit, all tournaments and states</h2>
        <p>Every tournament is rated in one pool, so a local result and a circuit result land on the same scale. The rankings page has two views of that pool:</p>
        <ul>
          <li><b>National circuit</b> lists debaters with at least one circuit tournament.</li>
          <li><b>All tournaments</b> lists everyone. A national rank there needs at least {MIN_ROUNDS} decided rounds.</li>
        </ul>
        <p>
          Ratings are only comparable between debaters who are linked by a chain of opponents. If a group of local debaters has never met anyone connected to the national pool, their ratings are on their own scale. They get no national rank, but they’re ranked on their state leaderboard.
        </p>

        <h2>Head-to-head odds</h2>
        <p>
          The predictor on rankings and profiles uses the same model. It compares the two ratings and folds in both deviations. It doesn’t know about sides, judges or the topic, so read it as a rough sense of the matchup, not a forecast.
        </p>

        <h2>Seasons and topic periods</h2>
        <p>Each season is rated on its own, and profiles keep every season. For the current season we also publish a ranking for each topic period, computed only from that period’s tournaments.</p>

        <h2>What this doesn’t capture</h2>
        <ul>
          <li>A tournament we don’t have results for can’t count. Local results are still being added.</li>
          <li>Early in the season, deviations are wide and rankings move a lot.</li>
          <li>A change of school or a spelling change on Tabroom can split one debater into two entries until it’s corrected.</li>
          <li>Rankings are unofficial and aren’t endorsed by the NSDA, Tabroom or any tournament.</li>
        </ul>

        <h2 id="corrections">Corrections and removal</h2>
        <p>
          Profiles show only competition results that are already public: name, school, location and round results. If something is wrong, or you’d like your profile removed, <a href={CORRECTIONS_URL()} target="_blank" rel="noreferrer">open a correction request</a>. Removal requests are honoured without question.
        </p>
        <p>
          <Link to="/rankings" className="btn primary">See the rankings</Link>
        </p>
      </article>
    </div>
  )
}
