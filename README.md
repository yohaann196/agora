# Resolved

**Prep like a champion. Compete like one.**

Resolved is a debate platform for the whole season:
- **Prep tools:** evidence search, a card cutter, contention and block vaults, and flow & timer.
- **Competition:** the world’s most comprehensive **Lincoln–Douglas rankings**: six seasons (2021–22 on), national circuit and local tournaments in one Glicko-2 pool, and a career profile for every debater. PF, Policy, Parli, BQ and Congress are coming soon.
- **Monthly Briefs** on the current resolution.

The name is the first word of every resolution. The logo is its colon.

**tools should amplify thinking, not replace it.** 
---

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script              | What it does                                              |
| ------------------- | --------------------------------------------------------- |
| `npm run dev`       | Vite dev server                                           |
| `npm run build`     | Typecheck (strict) + production build to `dist/`          |
| `npm run rankings`  | Pull the source datasets and rebuild `public/data/ld/` (run once before `npm run dev`) |
| `npm test`          | Vitest: Glicko-2, the rankings pipeline, citations, docs, sanitizer |
| `npm run lint`      | ESLint                                                    |
| `npm run typecheck` | `tsc --noEmit`                                            |

## What's in it

### Compete
| Page | What it does |
| --- | --- |
| **LD rankings** `/rankings` | Every season since 2021–22. Switch between **National circuit** and **All tournaments**, pick a state for its own leaderboard, or pick a topic period. Rows show rank and movement over the last week, score, record, aff/neg/elim splits and a rating sparkline. You can search, sort and follow debaters. A **head-to-head predictor** gives the win probability between any two debaters. |
| **Debater profiles** `/debaters/:id` | A whole career, season by season: rank, percentile, score, record, side splits and speaks. Also a rating-over-time chart with the ±2-deviation band, each tournament (Circuit or Local) with dates, records and placement, every round with a linked opponent, best wins, the predictor, and a correction/removal link. |
| **Schools** `/schools/:slug` | A school's ranked debaters and aggregate record. |
| **Methodology** `/rankings/method` | How the rankings work, in plain language, plus the corrections policy. |
| **Monthly Briefs** `/briefs` | One issue a month on the current LD topic: burdens, key terms, aff/neg ground with answers, frameworks, and a reading list of real sources that links straight into the card cutter. Mid-topic issues add "what's winning" from real round data. |

### Prep (`/app`)
| Tool | What it does |
| --- | --- |
| **Evidence** | A research browser with tabs. It searches **Wikipedia**, **OpenAlex** (papers), **Open Library** (books) and a verified public-domain **framework library**. Wikipedia pages open inside the app, sanitized. |
| **Card cutter** | Select a passage and write a tag. The card goes into the doc you're cutting into, with author, qualifications, title, date, URL and access date filled in. **Cut from print or PDF** covers everything else. |
| **Contention vault / Block vault** | TipTap docs with Verbatim conventions: Pocket/Hat/Block/Tag, F4–F12, underline, emphasis, highlight. Also read time from highlighted words, send-block-to-speech, search across all your cards, and copy to Word or Google Docs. Docs are tagged by side and topic. |
| **Flow & Timer** | Flows for LD, PF and Policy in aff and neg ink, with dropped/extend/key marks, sheets and CSV export. Speech and prep clocks keep running in the status bar. |

The dashboard brings together your vaults, the debaters you follow, your flows and the current brief. `⌘K` searches debaters, schools, briefs and your files from anywhere.

Your prep work is saved in your browser (`localStorage`, key `resolved:v1`). There are no accounts yet.

## How the rankings work

The pipeline lives in `src/rankings/` and `scripts/rankings/build.ts`. It follows the method of the open [debate-rankings](https://github.com/shreerammodi/debate-rankings) project, extended to more data.

1. **Data.** Public Tabroom round results (an entries file plus one CSV per round), merged season by season from three sources:
   - [shreerammodi/debate-rankings](https://github.com/shreerammodi/debate-rankings): current-season national circuit (`tournaments/hsld/` and `config/hsld-config.json`).
   - [skumar-ml/debate-rankings](https://github.com/skumar-ml/debate-rankings) (NSD × DebateDrills × DebateLand): national circuit from 2021–22 on, in `<season>/LD/<Tournament>/{Prelims,Elims}`. Tournament order comes from that repo's `LDRankings.py`, and current-season dates come from its TOC bid calendar.
   - [`data/uploads/`](data/uploads/README.md): local tournaments added by hand.

   A tournament that appears in more than one source is kept once.
2. **Identity.** A debater is school + name (normalized), or name alone for debaters listed as competing for multiple schools. Byes, "advances" rows and split decisions without a majority are skipped.
3. **Glicko-2** ([Glickman 2012](http://www.glicko.net/glicko/glicko2.pdf)), written from scratch in `src/rankings/glicko2.ts`:
   - Starting values: 1500 / 350 / 0.06, τ = 0.5. Each season is rated on its own.
   - Tournaments are rated in the order they finished (source order when dates are unknown). Within a round, all matches use pre-round ratings.
   - **Circuit rounds count double a local round.** Circuit rounds are weight-1 games and local rounds weight ½. This is a weighted Glicko-2 update, so all-circuit seasons match the reference method.
4. **Ranking score = rating − 2 × deviation.** This keeps one strong weekend from outranking a sustained record.
5. **One pool, two views.** *National circuit* lists debaters with a circuit tournament. *All tournaments* lists everyone, and a national rank there needs 4 decided rounds. Local groups that no chain of opponents links to the main pool get no national rank, but they appear on their state leaderboard.
6. **Elims** are labelled by name, by `Elims/` folder, or by bracket size working back from the last elim round. That handles closeouts and missing finals.
7. **Output** (generated, not committed):
   - `public/data/ld/index.json`: seasons, totals and sources.
   - `<season>/rankings-<period>[-all].json`: the rankings files.
   - `debaters/<id>.json`: one career file per debater.

**Validation.**
- The test suite reproduces Glickman's worked example.
- On the 2026–27 data, the circuit ranking matches debate-rankings' published order with a Spearman correlation of 0.9975.

**Freshness.** `.github/workflows/deploy.yml` runs every Monday (09:17 UTC), on every push to `main`, and on demand. It pulls both source repositories, rebuilds the rankings and redeploys. If a source can't be reached the job fails, and the last good deployment stays live.

**Data use.**
- Neither source repository publishes a license. debate-rankings says to ask Shreeram Modi; the NSD data says to email info@nsdebatecamp.com. **Ask both before relying on the data long-term.**
- Profiles show competition data only: name, school, location, results.
- Every profile links to a [correction/removal issue form](.github/ISSUE_TEMPLATE/profile-correction.yml). Removed profiles go in `data/removals.json` (`{"ids": [...]}`).
- Resolved does not scrape Tabroom. Its robots.txt disallows the results pages and API, which now require a login.

## Publishing on GitHub Pages

`.github/workflows/deploy.yml` runs on every push to `main`, every Monday, and on demand. Each run pulls the source datasets, rebuilds the rankings, typechecks, tests, builds with hash routes (`/#/rankings`), and deploys. To turn it on:

1. Go to **Settings → Pages** and set **Source** to **GitHub Actions**.
2. Merge the working branch into `main`.

To match the new name, rename the repository to `resolved` (**Settings → General**). The Pages base path follows the repository name automatically. If you rename it, also update `REPO_URL` in `src/site/links.ts` so correction links point to the right place.

## Architecture

```
src/
  site/        public site: landing, rankings, profiles, schools, methodology, briefs (+ SiteShell)
  app/         workspace dashboard
  features/    browser (evidence + cutter), docs (vaults), flow (flow + timer), workspace (settings)
  rankings/    glicko2.ts, pipeline.ts, csv.ts, types.ts, data.ts (fetch hooks)
  research/    citations, doc model, evidence providers, debate formats
  data/        briefs, seed vault docs, framework library (verified public-domain passages)
  components/  workspace shell, command palette, charts, primitives
scripts/rankings/build.ts   builds public/data/ld from the source datasets + data/uploads
data/uploads/               local tournament results (see its README)
```

## Content rules

- Cards are only ever the source's own words. Seeded cards come from verified public-domain translations, and a test checks that.
- Briefs are Resolved's analysis and contain no quotations. Positions attributed to authors summarise the works in each issue's reading list.
- Rankings are unofficial and not affiliated with the NSDA, Tabroom or any tournament.

## Stack

Vite · React 19 · TypeScript (strict) · React Router · zustand · TipTap 3 · framer-motion · lucide-react · self-hosted Archivo, Newsreader and JetBrains Mono · Vitest · ESLint · tsx
