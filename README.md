# Phil OS

**An operating system for thinking.**

PhilOS (or philosophyOS) is a workspace for philosophy and debate students. You can read primary texts, build formal arguments, compare how philosophers answer the same question, write essays, and argue with other people. Every thinker, concept, text and argument in it is a node on one knowledge graph.

It rests on one principle: **AI should amplify philosophical thinking, not replace it.** The AI layer asks questions, surfaces assumptions and explains its reasoning. It never declares an argument "correct", and it never invents a quotation.

---

## Running it

```bash
npm install
npm run dev        # http://localhost:5173  (landing page at /, the OS at /app)
```

| Script              | What it does                                   |
| ------------------- | ---------------------------------------------- |
| `npm run dev`       | Vite dev server                                |
| `npm run build`     | Typecheck (strict) + production build to `dist/` |
| `npm run preview`   | Serve the production build                     |
| `npm run typecheck` | `tsc --noEmit`                                 |
| `npm run lint`      | ESLint (typescript-eslint + react-hooks)       |
| `npm test`          | Vitest: knowledge-base integrity, graph, reasoning engine |

The app uses client-side routing. If you deploy `dist/` to a static host, configure it to serve `index.html` for unknown paths (SPA fallback).

## What's inside

| App | What it does |
| --- | --- |
| **Home** | Command center: rotating verified quotation, app cards (reorderable in Settings), recent ideas and texts, debate activity, question of the day. |
| **Library** | 14 philosophers across five eras, with a timeline, cards and a shelf of 37 works. Each profile has a biography, works, passages, arguments, lineage (influences, influenced, critiques), related thinkers and a neighborhood graph. |
| **Concepts** | A glossary of 63 concepts with nuance notes, key thinkers, passages, dependent arguments and a **Trace a connection** path-finder that works across the whole graph. |
| **Arguments** | The Argument Builder is a pannable, zoomable canvas of connected cards (Claim, Premises, Inference, Conclusion). You can attach objections, counterarguments, rebuttals, evidence, definitions and assumptions, drag cards to rearrange them, drag a port to connect them, auto-tidy the layout, and switch to a standard-form view. **Analyze Argument** reports unsupported premises, logical gaps, ambiguities, hidden assumptions, objections, counterarguments and relevant traditions. |
| **Philosopher Compare** | Side-by-side positions on one question. Each position separates textual support, summary and interpretation, and ends in a *Key difference* with a comparison table. For questions outside the curated set, it generates a sketch that is clearly labelled as interpretation. |
| **Essay Studio** | Outline, a distraction-free serif editor, focus mode and citation insertion. An analysis rail covers thesis clarity, premise support, counterarguments, definitions, logical consistency, evidence and philosophical context. It does not check grammar. |
| **Socratic AI** | Six modes: Socratic, Devil's Advocate, Tutor, Philosopher, Fallacy Detector and Debate Coach. Conversations read as a dialogue transcript, with a live *thinking trace* of your position, surfaced assumptions and concepts touched. You can turn a dialogue into an argument or a note. |
| **Idea Map** | A force-directed graph. Click a node to expand its relationships. You can drag and pin nodes, recenter on any idea, add your own ideas and name your own relationships. |
| **Schools** | 14 traditions on a timeline, each with core commitments and the open question it can't settle. |
| **Text Explorer** | Search by phrase, concept, philosopher, work or school. Every result is badged **Direct quotation**, **Summary** or **AI interpretation**, and can show its context. |
| **Debate Network** | Published theses with threads structured as Argument → Objection → Response → Rebuttal, sorted by how developed or contested a thread is (there are no likes). A "check my reasoning" step runs before you publish. Profiles are built from arguments. |
| **Workspace** | Notes with `[[entity-id]]` links into the graph, a reading list with progress, saved items, and settings. |

### Operating-system details

- **Command palette** `⌘K`: navigate, open any entity, create things, switch Socratic modes, change the accent color, or ask a question
- **Quick launch** `⌘J`, **shortcut sheet** `?`, **go-to chords** `G` then a letter (e.g. `G A` for Arguments), `/` to focus search, `N` for a new note window
- **Floating windows**: `⌥`-click any entity link to preview it in a draggable window. Notes and Socratic AI also pop out into windows, and minimized windows dock in the status bar.
- **Global search** with scopes, **hover cards** on every entity link, **notifications**, **recents**, a **status bar**, and animated page transitions
- **Customizable workspace**: accent color, density, reduced motion, and the order and visibility of Home cards
- Everything persists locally (zustand + `localStorage`). You can export your workspace as JSON.

## Architecture

```
src/
  model/        types.ts (the data model), graph.ts (unified knowledge graph, search, path-finding)
  data/         philosophers, concepts, schools, texts + passages, arguments, compare, social seed data
  store/        zustand store (persisted), useKnowledgeGraph() = static corpus + your own work
  ai/           the reasoning engine, one module per task (see below)
  components/   shell (sidebar, top bar, palette, windows, status bar) and UI primitives
  features/     one folder per app, each with its own CSS
  landing/      the marketing page, which embeds live app components
```

**Data model.** Every entity (Philosopher, School, Concept, Text, Passage, Argument with its nodes and links, Debate with its moves, Essay, Note, User) has a globally unique `id` and a `kind`. `model/graph.ts` builds typed relationships from the corpus: *wrote*, *develops*, *influenced*, *critiques*, *belongs to*, *anticipates*, *related to*, *centres on*, *discusses*, *excerpt of*. It then layers your arguments, debates, essays and notes on top (*concerns*, *argued by*, *references*). That graph is what makes everything linkable: entity links, hover cards, the Idea Map, neighborhood graphs, path tracing and search.

**Reasoning engine.** `ai/` is a local, deterministic engine grounded in the knowledge base:

- `analyzeArgument.ts` detects unsupported and normative premises, conclusion terms that no premise introduces, is→ought jumps, circularity, scope shifts, loaded and ambiguous terms, quantifiers and hidden-assumption patterns. It also builds objections and counterarguments from rival traditions.
- `socratic.ts` implements the six modes. Socratic mode cycles through strategies: defining terms, counterexamples, surfacing assumptions, tracing implications, and pressing from a philosopher's perspective.
- `essay.ts`, `fallacies.ts` and `interpret.ts` handle essay signals, fallacy patterns, passage interpretation and comparison sketches.
- `engine.ts` streams replies and can optionally call **Claude** (via `@anthropic-ai/sdk`, from the browser) when you add your own API key in *Settings → Reasoning engine*. It falls back to the local engine on any error.

## Content integrity

- **Quotations are verbatim** from the named translation (e.g. Abbott's *Groundwork*, Jowett's *Republic*, Kaufmann's Nietzsche) and are kept short.
- Where exact wording couldn't be guaranteed, the passage is stored as a **summary** and labelled as one.
- Interpretive claims, including every Philosopher-mode reply and every generated comparison column, are labelled **interpretation**.
- The test suite checks that every reference in the corpus resolves, that every passage belongs to its text's author, and that no comparison labels a summary as a quotation.

## Stack

Vite · React 19 · TypeScript (strict) · React Router · zustand · framer-motion · d3-force · lucide-react · self-hosted Inter, Newsreader and JetBrains Mono · Vitest · ESLint
