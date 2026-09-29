# Agora

**Research & debate, in one place.**

Agora is a web app for debaters and philosophy students. It combines a **research browser** that cuts evidence with the citation attached, Verbatim-style speech docs, flows and round timers for Policy, Lincoln–Douglas and Public Forum, and a library of verified philosophical texts. There is also a Socratic coach that asks questions instead of handing out answers.

**tools should amplify thinking, not replace it.** 
---

## Running it

```bash
npm install
npm run dev        # http://localhost:5173  (comic landing page at /, the app at /app)
```

| Script              | What it does                                   |
| ------------------- | ---------------------------------------------- |
| `npm run dev`       | Vite dev server                                |
| `npm run build`     | Typecheck (strict) + production build to `dist/` |
| `npm run preview`   | Serve the production build                     |
| `npm run typecheck` | `tsc --noEmit`                                 |
| `npm run lint`      | ESLint (typescript-eslint + react-hooks)       |
| `npm test`          | Vitest: citations, doc model, sanitizer, timer, corpus integrity, reasoning engine |

## Publishing on GitHub Pages

`.github/workflows/deploy.yml` typechecks, tests, builds and deploys the site every time `main` changes. You can also run it by hand from the Actions tab. To turn it on:

1. On GitHub, open **Settings → Pages** and set **Source** to **GitHub Actions**.
2. Merge this branch into `main`, or run the **Deploy to GitHub Pages** workflow by hand.

The site will be at `https://<user>.github.io/<repo>/`; for this repo that is **https://yohaann196.github.io/philOS/**. Pages has no fallback for single-page apps, so the Pages build uses hash routes such as `/#/app/docs`. Any other static host works too: build with `VITE_HASH_ROUTER=1` and set `--base` to the path you serve from.

## The apps

### Research

| App | What it does |
| --- | --- |
| **Research Browser** | A browser with tabs, back/forward, an address bar and a research trail. It searches **Wikipedia**, **OpenAlex** (scholarly papers) and **Open Library** (books), plus Agora's own verified library. Wikipedia articles open inside the app as sanitized reading pages. Select any passage, write a tag, and **Cut**: the card goes into the doc you're cutting into, with author, qualifications, title, date, URL and access date filled in. Sites that allow embedding open in a sandboxed frame. Everything else opens in a new tab, and **Cut from print or PDF** builds a card from text you paste. A research rail shows your cards, sources (copy them as a card cite, MLA or APA) and trail. |
| **Library** | 14 philosophers across five eras, with profiles, lineage, works and a neighborhood graph. |
| **Text Explorer** | Verified passages, searchable by phrase, concept, thinker or school. Each result is badged **Direct quotation**, **Summary** or **Interpretation**. |
| **Concepts · Idea Map · Schools** | A glossary wired into a knowledge graph, a force-directed map of how ideas connect, and 14 traditions on a timeline. |

### Debate

| App | What it does |
| --- | --- |
| **Speech Docs** | A document editor with debate conventions: **Pocket / Hat / Block / Tag** headings, cite lines, card text, underline, emphasis and highlight. It uses Verbatim function keys (`F4`–`F12`, or `⌘⌥1`–`6` and `⌘⇧E/H/X`). A navigation pane jumps through the outline. Read time counts only highlighted words, and the words-per-minute rate is adjustable. **Send block** moves the card or block at your cursor into your speech. **Find a card** searches every doc. **Copy for Word / Docs** keeps the formatting when you paste, and you can also download the doc as `.html`. |
| **Flow & Timer** | Flows with a column per speech in aff and neg ink. `Enter` starts a new row and `Tab` moves to the next speech. You can mark arguments **dropped**, **extended** or **key**, add sheets for each position, and use *Flow a doc…* to pull a speech doc's blocks and tags into a column. Export a sheet as CSV. The round timer covers speeches and both prep clocks for Policy, LD and PF (NSDA defaults, every time editable). It keeps running while you use other apps, shows in the status bar, and beeps at zero. |
| **Argument Builder** | A canvas for claim → premises → inference → conclusion, with objections, rebuttals, evidence and definitions. **Analyze** reports unsupported premises, gaps, ambiguities and hidden assumptions. It never gives a verdict. |
| **Socratic Coach** | Six modes: Socratic, Devil's Advocate, Tutor, Philosopher, Fallacy Detector and Debate Coach. The conversation reads like a comic: your turns in caption boxes, the coach's in speech balloons. A trace tracks your position and the assumptions surfaced. |
| **Compare · Debate Network** | Thinkers side by side on one question, and threaded theses with objections and rebuttals. |

### Write and workspace

**Essay Studio** gives argument-aware feedback, and **Notes** link into the graph. There is also a reading list and a saved-items list. **Settings** covers your profile, research sources (switch each API on or off, and add an optional contact email for OpenAlex), spot ink, density, motion, Desk layout, the reasoning engine and data export.

Across the app you also get:
- the command palette `⌘K`
- quick launch `⌘J`
- go-to chords such as `G B` (Browser), `G D` (Docs) and `G F` (Flow)
- floating windows and notifications

Everything is saved in your browser (zustand + `localStorage`, key `agora:v1`). No account is needed.

## Architecture

```
src/
  research/     cite.ts (short cite, card cite, MLA, APA), docModel.ts (Verbatim doc model),
                providers.ts (Wikipedia / OpenAlex / Open Library clients + HTML sanitizer), formats.ts
  features/
    browser/    the Research Browser, readers, and the cut layer
    docs/       the TipTap speech-doc editor, Verbatim keys and extensions, rich export
    flow/       flows and the shared round-timer store
    …           the other apps, each with its own CSS
  model/        types and the unified knowledge graph (sources, docs and flows are nodes too)
  store/        the persisted zustand store
  ai/           the local reasoning engine (optional Claude provider with your own key)
  landing/      the scrolling-comic landing page (hand-drawn SVG ink illustration)
  styles/       paper and ink design tokens, global and shell styles
```

**Network.** All research calls go straight from the browser to public, CORS-enabled APIs: `en.wikipedia.org` (action API and REST v1), `api.openalex.org` and `openlibrary.org`. There is no Agora server. Wikipedia HTML is sanitized before it is shown: scripts, frames, event handlers, inline styles, non-Wikimedia images and reference sections are all removed.

> **Testing note.** The development sandbox that built this release could not reach these APIs. So the browser flows were tested end to end with recorded fixture responses (search → open article → select → cut → card in doc), and the sanitizer and parsers have unit tests. If an API changes shape or is down, the browser shows an error with a retry button, and the Agora library and **Cut from print or PDF** keep working offline.

## Content integrity

- Seeded evidence cards use only **verbatim** quotations from the verified corpus, and a test enforces this.
- Quotations name their translation (for example Abbott's *Groundwork* or Hicks's Diogenes Laërtius). When exact wording can't be guaranteed, the text is stored as a labelled **summary**.
- Interpretive output, including Philosopher-mode replies and generated comparison columns, is labelled **interpretation**.

## Stack

Vite · React 19 · TypeScript (strict) · React Router · zustand · TipTap 3 · framer-motion · d3-force · lucide-react · self-hosted Archivo, Shantell Sans, IM Fell English, Newsreader and JetBrains Mono · Vitest · ESLint · Playwright (e2e, local)
