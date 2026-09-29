# Resolved

**Prep like a champion. Compete like one.**

Resolved is a debate platform for the whole season:
- **Prep tools:** evidence search, a card cutter, contention and block vaults, and flow & timer.
- **Competition:** national **Lincoln–Douglas rankings**, with a profile for every ranked debater.
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
| `npm run rankings`  | Rebuild the LD rankings data in `public/data/ld/`         |
| `npm test`          | Vitest: Glicko-2, the rankings pipeline, citations, docs, sanitizer |
| `npm run lint`      | ESLint                                                    |
| `npm run typecheck` | `tsc --noEmit`                                            |

## What's in it

### Compete
| Page | What it does |
| --- | --- |
| **LD rankings** `/rankings` | Every debater with a decided round at a tracked national-circuit tournament. Rows show rank and movement since the last tournament, score, record, aff/neg/elim splits and a rating sparkline. You can search, filter by state, sort, follow debaters, and switch between topic periods. A **head-to-head predictor** gives the win probability between any two debaters. |
| **Debater profiles** `/debaters/:id` | Rank, percentile, score, record, side splits and speaks. Also a rating-over-time chart with the ±2-deviation band, each tournament with records and placement (Champion, Finalist…), every round with a linked opponent, best wins, the predictor, and a correction/removal link. |
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

The pipeline lives in `src/rankings/` and `scripts/rankings/build.ts`, and follows the method of the open [debate-rankings](https://github.com/shreerammodi/debate-rankings) project:

1. **Data.** Tabroom round results (entries plus one CSV per round) for the current season, read from that project's `tournaments/hsld/` folder and its `config/hsld-config.json`, which sets tournament order, majors, multi-school debaters and topic boundaries.
2. **Identity.** A debater is school + name (normalized), or name alone for debaters listed as competing for multiple schools. Byes, "advances" rows and split decisions without a majority are skipped.
3. **Glicko-2** ([Glickman 2012](http://www.glicko.net/glicko/glicko2.pdf)), written from scratch in `src/rankings/glicko2.ts`:
   - Starting values: 1500 / 350 / 0.06, τ = 0.5.
   - Every decided round is a game. Within a round, all matches use pre-round ratings.
   - **Majors count twice.**
4. **Ranking score = rating − 2 × deviation.** This keeps one strong weekend from outranking a sustained record.
5. **Elims** are labelled by bracket size, working back from the last elim round. That places closeouts correctly, and still works when a tournament's final wasn't posted.
6. **Output.** `public/data/ld/rankings-<period>.json` holds the full season plus each topic period. `public/data/ld/debaters/<id>.json` holds one file per profile.

**Validation.** The test suite reproduces Glickman's worked example (1464.06 / 151.52 / 0.05999). On the current data, this implementation matches the reference project's published order with a Spearman correlation of 0.9999 and an identical top 50.

**Freshness.** The Pages workflow runs `npm run rankings` on every deploy and once a day. If the fetch fails, it keeps the committed JSON.

**Data use.** Results come from public Tabroom postings, collected by the debate-rankings project. That repository doesn't publish a license, so **ask its author (Shreeram Modi) before relying on the data long-term**. Profiles show competition data only: name, school, location, results. Every profile links to a [correction/removal issue form](.github/ISSUE_TEMPLATE/profile-correction.yml).

## Publishing on GitHub Pages

`.github/workflows/deploy.yml` runs on every push to `main`, daily, and on demand. Each run refreshes the rankings, typechecks, tests, builds with hash routes (`/#/rankings`), and deploys. To turn it on:

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
scripts/rankings/build.ts   builds public/data/ld from the results dataset
```

## Content rules

- Cards are only ever the source's own words. Seeded cards come from verified public-domain translations, and a test checks that.
- Briefs are Resolved's analysis and contain no quotations. Positions attributed to authors summarise the works in each issue's reading list.
- Rankings are unofficial and not affiliated with the NSDA, Tabroom or any tournament.

## Stack

Vite · React 19 · TypeScript (strict) · React Router · zustand · TipTap 3 · framer-motion · lucide-react · self-hosted Archivo, Newsreader and JetBrains Mono · Vitest · ESLint · tsx
