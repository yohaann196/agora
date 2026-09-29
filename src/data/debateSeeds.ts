import type { Doc, Flow, Source } from '../model/types'
import { cardNodes, heading, para, text } from '../research/docModel'

const t0 = Date.UTC(2026, 8, 27, 18)

/**
 * Seed sources. Card text below is taken only from verified quotations in the
 * framework library (see data/texts.ts), so every seeded card is real source text.
 */
export const seedSources: Source[] = [
  { id: 'src-rawls-tj', kind: 'source', provider: 'agora', title: 'A Theory of Justice', authors: ['John Rawls'], qualifications: 'Professor of Philosophy at Harvard University', container: 'Harvard University Press', date: '1971', page: '§1', accessed: t0 },
  { id: 'src-rawls-tj5', kind: 'source', provider: 'agora', title: 'A Theory of Justice', authors: ['John Rawls'], qualifications: 'Professor of Philosophy at Harvard University', container: 'Harvard University Press', date: '1971', page: '§5', accessed: t0 },
  { id: 'src-kant-gw', kind: 'source', provider: 'agora', title: 'Groundwork of the Metaphysics of Morals', authors: ['Immanuel Kant'], qualifications: 'Professor of Logic and Metaphysics at the University of Königsberg (trans. T. K. Abbott)', date: '1785', page: '4:429', accessed: t0 },
  { id: 'src-beauvoir-ea', kind: 'source', provider: 'agora', title: 'The Ethics of Ambiguity', authors: ['Simone de Beauvoir'], qualifications: 'French philosopher (trans. Bernard Frechtman)', date: '1947', page: 'Part III', accessed: t0 },
  { id: 'src-mill-ol', kind: 'source', provider: 'agora', title: 'On Liberty', authors: ['John Stuart Mill'], qualifications: 'British philosopher and economist', date: '1859', page: 'ch. 1', accessed: t0 },
  { id: 'src-mill-util', kind: 'source', provider: 'agora', title: 'Utilitarianism', authors: ['John Stuart Mill'], qualifications: 'British philosopher and economist', date: '1863', page: 'ch. 2', accessed: t0 },
]

const S = Object.fromEntries(seedSources.map((s) => [s.id, s])) as Record<string, Source>

export const RESOLUTION = 'Resolved: Outer space colonization is a moral imperative.'

/** A heading, then an empty cite and card slot to cut evidence into. */
const slot = (tag: string) => [heading(4, tag), para([], 'cite'), para([], 'card')]

export const seedDocs: Doc[] = [
  {
    id: 'doc-space-ac',
    kind: 'doc',
    title: 'AC — Space colonization',
    type: 'contention',
    side: 'aff',
    topic: RESOLUTION,
    updatedAt: t0,
    content: {
      type: 'doc',
      content: [
        heading(1, 'AC — Space colonization'),
        para([text(`${RESOLUTION} `, [{ type: 'bold' }]), text('Template: the structure is here, the evidence is yours. Open Evidence, find a source, select a passage and cut it into a slot.')]),
        heading(2, 'Framework'),
        heading(3, 'Value — Morality'),
        ...slot('An imperative is an obligation, not just a good idea — the aff must show we are required to act'),
        heading(3, 'Standard — Minimizing existential risk'),
        ...slot('Extinction forecloses every future person’s life, so risks to humanity’s survival outweigh'),
        heading(2, 'Contention 1 — One planet is a single point of failure'),
        ...slot('A single-planet species can be ended by one catastrophe'),
        ...slot('Settlements elsewhere make humanity’s survival independent of Earth'),
        heading(2, 'Contention 2 — Obligations to future generations'),
        ...slot('We owe future people the chance to exist'),
      ],
    },
  },
  {
    id: 'doc-space-nc',
    kind: 'doc',
    title: 'NC — Space colonization',
    type: 'contention',
    side: 'neg',
    topic: RESOLUTION,
    updatedAt: t0 - 3_600_000,
    content: {
      type: 'doc',
      content: [
        heading(1, 'NC — Space colonization'),
        para([text(`${RESOLUTION} `, [{ type: 'bold' }]), text('Template for the negative. Cut your evidence into the slots.')]),
        heading(2, 'Framework'),
        heading(3, 'Imperative means obligation'),
        ...slot('Showing colonization is good or permissible does not show it is required'),
        heading(2, 'Contention 1 — Present obligations come first'),
        ...slot('Resources spent off-world are resources not spent on people suffering now'),
        heading(2, 'Contention 2 — Planetary protection'),
        ...slot('Colonization risks contaminating other worlds before we know whether they hold life'),
        heading(2, 'Contention 3 — Colonial logics'),
        ...slot('“Colonization” carries the moral baggage of conquest and appropriation'),
      ],
    },
  },
  {
    id: 'doc-fw-blocks',
    kind: 'doc',
    title: 'Framework blocks — Rawls, Kant, Beauvoir',
    type: 'block',
    side: 'both',
    updatedAt: t0 - 86_400_000,
    content: {
      type: 'doc',
      content: [
        heading(1, 'Framework blocks'),
        para([text('Verified quotations from the framework library. They fit most LD resolutions; rewrite the tags for yours.')]),
        heading(2, 'Justice first'),
        ...cardNodes('Justice comes first: an institution that is efficient but unjust must be reformed', S['src-rawls-tj'], [
          ['Justice is the ', ['u']],
          ['first virtue of social institutions', ['u', 'h']],
          [', as truth is of systems of thought.', ['u']],
        ]),
        ...cardNodes('Every person has an inviolability that aggregate welfare cannot outweigh', S['src-rawls-tj'], [
          ['Each person possesses an ', ['u']],
          ['inviolability', ['u', 'h', 'e']],
          [' founded on justice that ', ['u']],
          ['even the welfare of society as a whole cannot override', ['u', 'h']],
          ['.', ['u']],
        ]),
        heading(2, 'Respect for persons'),
        ...cardNodes('Treat people as ends, never merely as means', S['src-kant-gw'], [
          ['So act as to treat humanity, whether in thine own person or in that of any other, ', ['u']],
          ['in every case as an end', ['u', 'h']],
          [' withal, ', ['u']],
          ['never as means only', ['u', 'h', 'e']],
          ['.', ['u']],
        ]),
        heading(2, 'Freedom is shared'),
        ...cardNodes('Willing your own freedom commits you to others’ freedom', S['src-beauvoir-ea'], [
          ['To will oneself free is also to ', ['u']],
          ['will others free', ['u', 'h']],
          ['.', ['u']],
        ]),
      ],
    },
  },
  {
    id: 'doc-a2-util',
    kind: 'doc',
    title: 'A2 Util frameworks',
    type: 'block',
    side: 'both',
    updatedAt: t0 - 2 * 86_400_000,
    content: {
      type: 'doc',
      content: [
        heading(1, 'A2 Util frameworks'),
        heading(2, 'Separateness of persons'),
        ...cardNodes('Utilitarianism treats society as one person and ignores who bears the cost', S['src-rawls-tj5'], [
          ['Utilitarianism ', ['u']],
          ['does not take seriously the distinction between persons', ['u', 'h']],
          ['.', ['u']],
        ]),
        heading(2, 'Their author: the harm principle'),
        ...cardNodes('Coercion is legitimate only to prevent harm to others', S['src-mill-ol'], [
          ['That the ', ['u']],
          ['only purpose', ['u', 'h']],
          [' for which power can be rightfully exercised over any member of a civilised community, against his will, is ', ['u']],
          ['to prevent harm to others', ['u', 'h']],
          ['. His own good, either physical or moral, is not a sufficient warrant.', ['u']],
        ]),
        ...cardNodes('Their own author defines the standard as happiness', S['src-mill-util'], [
          ['The creed which accepts as the foundation of morals, Utility, or the Greatest Happiness Principle, holds that ', ['u']],
          ['actions are right in proportion as they tend to promote happiness', ['u', 'h']],
          [', wrong as they tend to produce the reverse of happiness.', ['u']],
        ]),
      ],
    },
  },
]

export const seedFlows: Flow[] = [
  {
    id: 'flow-space',
    kind: 'flow',
    title: 'Practice round — Space colonization (LD)',
    format: 'ld',
    affFirst: true,
    updatedAt: t0,
    sheets: [
      {
        id: 'sh-ac',
        title: 'AC',
        marks: { '0:2': 'key', '1:3': 'dropped' },
        columns: [
          ['V: Morality · Std: minimize existential risk', 'Imperative = obligation', 'C1: One planet = single point of failure', 'C2: Obligations to future people'],
          ['Existential risk std. is util in disguise', 'Obligation needs a duty-bearer: who?', 'Settlements won’t be self-sufficient for centuries', ''],
          ['Extend std — they concede extinction outweighs', 'Humanity as a collective can bear duties', 'Timeframe doesn’t matter to an imperative', 'Extend C2 — dropped'],
          ['', '', '', ''],
          ['', '', '', ''],
        ],
      },
      {
        id: 'sh-nc',
        title: 'NC — Present obligations',
        marks: {},
        columns: [
          ['', '', ''],
          ['Imperative ≠ good idea', 'C1: Present obligations first', 'C2: Planetary protection'],
          ['Not mutually exclusive — we can do both', 'Opportunity cost is small vs. budgets', 'Protect known-sterile worlds only'],
          ['', '', ''],
          ['', '', ''],
        ],
      },
    ],
  },
]
