import type { Doc, Flow, Source } from '../model/types'
import { cardNodes, heading, para, text } from '../research/docModel'

const t0 = Date.UTC(2026, 8, 27, 18)

/**
 * Seed sources. Card text below is taken only from verified quotations in the
 * Agora corpus (see data/texts.ts), so every seeded card is real source text.
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

export const seedDocs: Doc[] = [
  {
    id: 'doc-ac',
    kind: 'doc',
    title: 'AC — Civil disobedience',
    type: 'speech',
    updatedAt: t0,
    content: {
      type: 'doc',
      content: [
        heading(1, 'AC — Civil disobedience'),
        para([text('Resolved: In a democracy, civil disobedience is morally justified. ', [{ type: 'bold' }]), text('Practice file — rewrite the tags in your own words before you read it.')]),
        heading(2, 'Framework'),
        heading(3, 'Value — Justice'),
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
        heading(3, 'Standard — Respecting persons'),
        ...cardNodes('Treat people as ends, never merely as means', S['src-kant-gw'], [
          ['So act as to treat humanity, whether in thine own person or in that of any other, ', ['u']],
          ['in every case as an end', ['u', 'h']],
          [' withal, ', ['u']],
          ['never as means only', ['u', 'h', 'e']],
          ['.', ['u']],
        ]),
        heading(2, 'Contention 1 — Freedom is shared'),
        ...cardNodes('Willing your own freedom commits you to others’ freedom', S['src-beauvoir-ea'], [
          ['To will oneself free is also to ', ['u']],
          ['will others free', ['u', 'h']],
          ['.', ['u']],
        ]),
      ],
    },
  },
  {
    id: 'doc-frontlines',
    kind: 'doc',
    title: 'Frontlines — Utilitarian NCs',
    type: 'file',
    updatedAt: t0 - 86_400_000,
    content: {
      type: 'doc',
      content: [
        heading(1, 'Frontlines — Utilitarian NCs'),
        heading(2, 'AT: Maximize happiness'),
        heading(3, 'Separateness of persons'),
        ...cardNodes('Utilitarianism treats society as one person and ignores who bears the cost', S['src-rawls-tj5'], [
          ['Utilitarianism ', ['u']],
          ['does not take seriously the distinction between persons', ['u', 'h']],
          ['.', ['u']],
        ]),
        heading(3, 'Their author: the harm principle'),
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
    id: 'flow-cd',
    kind: 'flow',
    title: 'Round 3 — Civil disobedience (LD)',
    format: 'ld',
    affFirst: true,
    updatedAt: t0,
    sheets: [
      {
        id: 'sh-ac',
        title: 'AC',
        marks: { '0:3': 'key', '1:2': 'dropped' },
        columns: [
          ['V: Justice — first virtue of institutions (Rawls 71)', 'VC: Respect persons as ends (Kant 1785)', 'C1: Freedom is shared (Beauvoir 47)', 'C2: Disobedience restores equal standing'],
          ['Justice ≠ law; aff conflates', 'Kant: lying/law-breaking fails universalizability', '—', 'Turn: disobedience breeds more disobedience'],
          ['Extend Rawls — institutions answer to justice', 'Maxim is “resist injustice,” universalizes fine', 'Extend C1: conceded', 'No link — they read no evidence on escalation'],
          ['', '', '', ''],
          ['', '', '', ''],
        ],
      },
      {
        id: 'sh-nc',
        title: 'NC — Rule of law',
        marks: {},
        columns: [
          ['', '', ''],
          ['V: Morality · VC: Upholding democratic law', 'C1: Democracy provides legal channels', 'C2: Selective obedience is self-exemption'],
          ['Channels fail minorities — Beauvoir: situated freedom', 'Self-exemption? No — disobedience accepts the penalty', ''],
          ['', '', ''],
          ['', '', ''],
        ],
      },
    ],
  },
]
