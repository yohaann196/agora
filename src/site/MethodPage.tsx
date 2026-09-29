import { useEffect } from 'react'
import { Link, useLocation } from 'react-router'
import { useRankings } from '../rankings/data'
import { CORRECTIONS_URL, DATASET_URL } from './links'
import { updatedLabel } from './RankingsPage'
import './briefs.css'

export function MethodPage() {
  const { hash } = useLocation()
  const load = useRankings()
  const data = load.state === 'ready' ? load.data : null
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' })
  }, [hash, data])

  return (
    <div className="wrap article-wrap">
      <header className="pg-head">
        <div className="eyebrow">Rankings methodology</div>
        <h1 className="pg-title">How the LD rankings work</h1>
        <p className="pg-lede">Short version: every decided round is a game, ratings move more when an upset happens, and you’re ranked on a rating we’re confident you’ve earned.</p>
      </header>

      <article className="article">
        <h2>Where the results come from</h2>
        <p>
          Round-by-round results are public on Tabroom. We use the results collected for the {data?.season ?? 'current'} season by the open{' '}
          <a href={DATASET_URL} target="_blank" rel="noreferrer">debate-rankings</a> project, which also defines the method below. Resolved’s code is an independent implementation, and we check that it reproduces the project’s published order.
        </p>
        {data && (
          <p>
            This edition includes <b>{data.tournaments.length} tournaments</b> ({data.tournaments.map((t) => t.name).join(', ')}), <b>{data.field.rounds.toLocaleString()} decided rounds</b> and <b>{data.debaters.length} debaters</b>. Last results update: {updatedLabel(data)}.
          </p>
        )}

        <h2>One debater, one rating</h2>
        <p>
          A debater is identified by school and name, so the same person is followed across tournaments. The few debaters who compete for more than one school are matched on name alone. Byes, split decisions without a majority, and “advances” rows aren’t counted as games.
        </p>

        <h2>Glicko-2</h2>
        <p>
          Everyone starts at a rating of <b>1500</b> with a deviation of <b>350</b>. Deviation measures how sure the system is. After every round, both debaters’ ratings update using{' '}
          <a href="http://www.glicko.net/glicko/glicko2.pdf" target="_blank" rel="noreferrer">Glicko-2</a> (Mark Glickman, 2012). Beating a higher-rated opponent moves you more than beating a lower-rated one. Every debater’s deviation shrinks as they compete, because the system learns more about them.
        </p>
        <ul>
          <li>Rounds are processed in tournament order, prelims then elims.</li>
          <li>Within a round, every match uses ratings from before the round, so pairing order doesn’t matter.</li>
          <li>
            <b>Majors count twice.</b> Rounds at the season’s biggest national tournaments (Greenhill, Glenbrooks, Harvard, TOC and others) are applied twice.
          </li>
          <li>Volatility starts at 0.06 with τ = 0.5, the defaults from Glickman’s paper.</li>
        </ul>

        <h2>The ranking score</h2>
        <p>
          Rankings are sorted by <b>rating − 2 × deviation</b>. A debater who went 6–0 at one tournament has a high rating but a wide deviation, while a debater who has sustained a record across several tournaments has a tighter one. Subtracting two deviations asks: what rating are we about 95% sure this debater has at least? That keeps a single hot weekend from topping the list.
        </p>

        <h2>Head-to-head odds</h2>
        <p>
          The predictor on rankings and profiles uses the same model. It compares the two ratings and folds in both deviations. It doesn’t know about sides, judges or the topic, so read it as a rough sense of the matchup, not a forecast.
        </p>

        <h2>Topic periods</h2>
        <p>LD changes resolutions through the year. Alongside the full-season ranking, we publish a ranking for each topic period, computed only from that period’s tournaments.</p>

        <h2>What this doesn’t capture</h2>
        <ul>
          <li>Only tracked national-circuit tournaments are included. Local and state results aren’t.</li>
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
