import type { Debate, Essay, NetworkUser, Note, ReadingItem } from '../model/types'

const day = 86_400_000
const now = Date.UTC(2026, 8, 29, 9)

export const currentUser: NetworkUser = {
  id: 'you',
  kind: 'user',
  name: 'Yohaan',
  handle: 'yohaan',
  school: 'Debate · Philosophy',
  interests: ['Ethics', 'Political philosophy', 'Existentialism', 'Parliamentary debate'],
  bio: 'Philosophy & debate student. Currently wrestling with Kant vs. Mill on lying.',
  savedConcepts: ['categorical-imperative', 'veil-of-ignorance', 'bad-faith'],
  hue: 218,
}

export const networkUsers: NetworkUser[] = [
  currentUser,
  { id: 'u-amara', kind: 'user', name: 'Amara Okafor', handle: 'amara', school: 'Kantian', interests: ['Deontology', 'Human rights', 'Kant'], bio: 'Moral philosophy MA. I will defend the categorical imperative in any room.', savedConcepts: ['autonomy', 'categorical-imperative', 'rights'], hue: 268 },
  { id: 'u-leo', kind: 'user', name: 'Leo Brandt', handle: 'leob', school: 'Existentialist', interests: ['Sartre', 'Beauvoir', 'Freedom'], bio: 'Debater. Reading Being and Nothingness slowly and in bad faith.', savedConcepts: ['bad-faith', 'situated-freedom'], hue: 28 },
  { id: 'u-mei', kind: 'user', name: 'Mei Tanaka', handle: 'meit', school: 'Consequentialist', interests: ['Effective altruism', 'Mill', 'Population ethics'], bio: 'Utilitarian with doubts. Mostly about aggregation.', savedConcepts: ['greatest-happiness', 'higher-pleasures'], hue: 160 },
  { id: 'u-sam', kind: 'user', name: 'Samir Haddad', handle: 'samir', school: 'Aristotelian', interests: ['Virtue ethics', 'Aquinas', 'Politics'], bio: 'Teaching ancient philosophy. Everything has a telos, including this bio.', savedConcepts: ['eudaimonia', 'natural-law'], hue: 190 },
  { id: 'u-ines', kind: 'user', name: 'Inès Moreau', handle: 'ines', school: 'Critical theory', interests: ['Marx', 'Beauvoir', 'Ideology critique'], bio: 'Who benefits from this framing?', savedConcepts: ['ideology', 'alienation', 'the-other'], hue: 340 },
]

export const userById = Object.fromEntries(networkUsers.map((u) => [u.id, u])) as Record<string, NetworkUser>

export const seedDebates: Debate[] = [
  {
    id: 'deb-responsibility',
    kind: 'debate',
    thesis: 'Existentialism provides a stronger account of moral responsibility than Kantian deontology.',
    author: 'u-leo',
    framing: 'Kant grounds responsibility in a universal rational will. Sartre removes every excuse: no nature, no law given in advance. I argue the second makes us more responsible, not less.',
    concepts: ['moral-responsibility', 'existence-precedes-essence', 'autonomy', 'bad-faith'],
    philosophers: ['sartre', 'kant', 'beauvoir'],
    createdAt: now - 2 * day,
    supporters: ['u-ines', 'you'],
    moves: [
      {
        id: 'm1', type: 'objection', author: 'u-amara', createdAt: now - 2 * day + 3600e3,
        body: 'Responsibility requires a standard we can fail to meet. If values are simply chosen, what exactly is the existentialist responsible *for*? Kant gives a standard — the moral law — that binds regardless of what I choose.',
        children: [
          {
            id: 'm1a', type: 'response', author: 'u-leo', createdAt: now - 2 * day + 7200e3,
            body: 'Sartre’s standard is formal too: in choosing for myself I choose an image of humanity. Bad faith is a failure I can be blamed for — lying to myself about my freedom.',
            children: [
              {
                id: 'm1a1', type: 'rebuttal', author: 'u-amara', createdAt: now - 2 * day + 10800e3,
                body: 'But “choosing an image of humanity” looks like a borrowed universalizability test. If that’s the standard, the existentialist account depends on the Kantian one it claims to beat.',
                children: [],
              },
            ],
          },
        ],
      },
      {
        id: 'm2', type: 'counter', author: 'u-ines', createdAt: now - day,
        body: 'Both accounts abstract from situation. Beauvoir’s point: an oppressed person’s range of choices is not the same as their oppressor’s. A strong account of responsibility must be situated.',
        children: [],
      },
    ],
  },
  {
    id: 'deb-veil',
    kind: 'debate',
    thesis: 'Rational parties behind the veil of ignorance would not choose the difference principle.',
    author: 'u-mei',
    framing: 'Rawls needs maximin reasoning to get the difference principle. But maximin is only rational under extreme risk-aversion. Average utility is the better bet.',
    concepts: ['veil-of-ignorance', 'difference-principle', 'original-position', 'greatest-happiness'],
    philosophers: ['rawls', 'mill'],
    createdAt: now - 5 * day,
    supporters: ['u-sam'],
    moves: [
      {
        id: 'v1', type: 'objection', author: 'you', createdAt: now - 4 * day,
        body: 'Rawls argues the original position has special features — grave stakes, no basis for probabilities, an acceptable guaranteed minimum — that make maximin rational there even if not in ordinary gambles.',
        children: [
          {
            id: 'v1a', type: 'response', author: 'u-mei', createdAt: now - 4 * day + 5400e3,
            body: 'Principle of insufficient reason: with no information, assign equal probabilities. Then average utility wins.',
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: 'deb-harm',
    kind: 'debate',
    thesis: 'Mill’s harm principle cannot justify banning hate speech.',
    author: 'u-sam',
    framing: 'If harm means setback to interests, offensive speech usually falls outside it. Either the principle must expand, or it cannot ground such bans.',
    concepts: ['harm-principle', 'liberty', 'rights'],
    philosophers: ['mill'],
    createdAt: now - 7 * day,
    supporters: [],
    moves: [
      {
        id: 'h1', type: 'objection', author: 'u-ines', createdAt: now - 6 * day,
        body: 'Speech that sustains a social hierarchy harms members of the targeted group — not by offending them, but by maintaining their subordinate status.',
        children: [],
      },
      {
        id: 'h2', type: 'support', author: 'u-amara', createdAt: now - 6 * day + 7200e3,
        body: 'Agree with the thesis as a reading of Mill: chapter 2 is explicit that even false and offensive opinions have value in public discussion.',
        children: [],
      },
    ],
  },
]

export const seedEssays: Essay[] = [
  {
    id: 'essay-lying',
    kind: 'essay',
    title: 'Is Lying Ever Justified?',
    prompt: 'Evaluate Kant’s claim that lying is always wrong, with reference to at least one rival framework.',
    references: ['arg-lying-promise', 'p-groundwork-ful', 'p-util-veracity'],
    updatedAt: now - day,
    sections: [
      { id: 'intro', label: 'Introduction', hint: 'Frame the question and why it matters.', body: 'The case of the murderer at the door has become a stress test for moral theories. If a murderer asks where my friend is hiding, may I lie?' },
      { id: 'thesis', label: 'Thesis', hint: 'One sentence. What exactly will you defend?', body: 'I will argue that lying is sometimes justified, because a duty of truthfulness cannot be owed to someone who uses our answer to commit a grave wrong.' },
      { id: 'arg1', label: 'Argument 1', hint: 'Your strongest supporting argument.', body: 'Kant claims that a maxim of lying cannot be universalized. But the maxim of the person at the door is not simply “lie when convenient”; it is “deceive those who seek to murder.”' },
      { id: 'arg2', label: 'Argument 2', hint: 'A second, independent line of support.', body: '' },
      { id: 'counter', label: 'Counterargument', hint: 'The strongest objection to your thesis.', body: '' },
      { id: 'rebuttal', label: 'Rebuttal', hint: 'Answer the objection honestly.', body: '' },
      { id: 'conclusion', label: 'Conclusion', hint: 'What follows, and what remains open?', body: '' },
    ],
  },
]

export const seedNotes: Note[] = [
  {
    id: 'note-maxims',
    kind: 'note',
    title: 'The problem of relevant descriptions',
    body: 'Kant’s universalization test seems to depend on how we describe the maxim. “Lie to murderers” universalizes fine. Is there a principled way to fix the description?\n\nLinks: [[categorical-imperative]] [[universalizability]] [[lying]]',
    links: ['categorical-imperative', 'universalizability', 'lying'],
    pinned: true,
    updatedAt: now - 3600e3 * 5,
  },
  {
    id: 'note-rawls-mill',
    kind: 'note',
    title: 'Rawls on the separateness of persons',
    body: 'Utilitarianism treats society like one big person trading off pains and pleasures. Rawls: this ignores that each person has one life to live.\n\nQuestion: does Mill’s harm principle already partly answer this?\n\nLinks: [[rawls]] [[mill]] [[greatest-happiness]]',
    links: ['rawls', 'mill', 'greatest-happiness'],
    updatedAt: now - day * 2,
  },
  {
    id: 'note-bad-faith',
    kind: 'note',
    title: 'Debate prep: bad faith as a rebuttal',
    body: '“I had no choice” — Sartre would call this bad faith. Useful for rebutting determinist excuses. But see Beauvoir on situated freedom before leaning on it.\n\nLinks: [[bad-faith]] [[situated-freedom]]',
    links: ['bad-faith', 'situated-freedom'],
    updatedAt: now - day * 4,
  },
]

export const seedReading: ReadingItem[] = [
  { textId: 'groundwork', status: 'reading', progress: 0.46, addedAt: now - day * 10 },
  { textId: 'second-sex', status: 'reading', progress: 0.18, addedAt: now - day * 6 },
  { textId: 'theory-of-justice', status: 'queued', progress: 0, addedAt: now - day * 3 },
  { textId: 'beyond-good-evil', status: 'queued', progress: 0, addedAt: now - day * 2 },
  { textId: 'apology', status: 'finished', progress: 1, addedAt: now - day * 30 },
  { textId: 'utilitarianism-1863', status: 'finished', progress: 1, addedAt: now - day * 20 },
]

export const questionsOfTheDay = [
  'If you could not be caught, would you still have reason to be just?',
  'Can you be responsible for an action you could not have avoided?',
  'Is a hypothetical agreement any kind of agreement at all?',
  'What would it take to change your mind about your deepest moral belief?',
  'Is it possible to know something without being able to explain it?',
]
