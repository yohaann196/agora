/**
 * Resolved Monthly Briefs.
 *
 * Everything here is Resolved's own analysis. There are no quotations; where a
 * position is attributed to an author, it is a summary of a published work
 * listed in the reading list, so debaters can find and cut the original.
 */

export type BriefBlock =
  | { p: string }
  | { list: string[] }
  | { callout: string; title?: string }
  | { args: { side: 'aff' | 'neg'; title: string; warrant: string; answers: string[] }[] }
  | { terms: { term: string; meaning: string }[] }
  | { reading: { author: string; title: string; detail: string; why: string; search: string }[] }
  | { data: 'field' | 'leaders' }

export interface BriefSection {
  id: string
  heading: string
  blocks: BriefBlock[]
}

export interface Brief {
  id: string
  issue: number
  month: string
  event: 'LD'
  topic: string
  title: string
  dek: string
  status: 'published' | 'upcoming'
  readMinutes: number
  sections: BriefSection[]
}

const SPACE = 'Resolved: Outer space colonization is a moral imperative.'

export const briefs: Brief[] = [
  {
    id: '2026-11-ld',
    issue: 3,
    month: 'November 2026',
    event: 'LD',
    topic: 'Nov–Dec LD topic',
    title: 'The Nov–Dec topic, broken down',
    dek: 'Definitions, burdens, the best ground on both sides and a reading list, published once the NSDA announces the November–December resolution.',
    status: 'upcoming',
    readMinutes: 0,
    sections: [],
  },
  {
    id: '2026-10-ld',
    issue: 2,
    month: 'October 2026',
    event: 'LD',
    topic: SPACE,
    title: 'One month into space: what’s winning',
    dek: 'The Sep–Oct topic after the season’s opening tournaments: side balance from real results, who’s on top, and how to adjust before the topic changes.',
    status: 'published',
    readMinutes: 7,
    sections: [
      {
        id: 'numbers',
        heading: 'The numbers so far',
        blocks: [
          { p: 'These figures come straight from the decided rounds behind the Resolved LD rankings. They update whenever new tournament results are added.' },
          { data: 'field' },
          {
            callout:
              'A neg lean in elims is common early in a topic, when panels hear new affs for the first time and negatives can run the widest range of arguments. Treat one month of data as a signal, not a law.',
            title: 'Reading the split',
          },
        ],
      },
      {
        id: 'leaders',
        heading: 'Who’s on top',
        blocks: [{ p: 'The current top ten, ranked by rating minus two deviations. Follow anyone from their profile to track them on your dashboard.' }, { data: 'leaders' }],
      },
      {
        id: 'aff-adjust',
        heading: 'If you’re affirming',
        blocks: [
          {
            list: [
              'Win the burden debate early. Negatives are leaning on the gap between “good” and “imperative”. Define imperative in the AC and explain why your offense meets it, rather than waiting for the 1AR.',
              'Pick an agent. The resolution names no actor. An aff that defends collective human obligation should say so, and be ready to explain why an obligation can bind a collective.',
              'Weigh time frames explicitly. Existential-risk offense is long-term. Neg opportunity-cost arguments are immediate. Have a reason your time frame should come first.',
              'Pre-empt planetary protection. A sentence in the AC committing to contamination safeguards takes a whole neg contention off the table.',
            ],
          },
        ],
      },
      {
        id: 'neg-adjust',
        heading: 'If you’re negating',
        blocks: [
          {
            list: [
              'Keep the burden argument simple and extend it in every speech. It’s the cleanest route to the ballot when the aff’s offense is really about benefits.',
              'Contest self-sufficiency. Much aff offense assumes settlements could survive without Earth. Evidence on how far away that is undercuts the insurance argument at its root.',
              'Turn existential risk. Scholarship arguing that space expansion raises catastrophic risk (militarization, new conflict) meets the aff on its own framework.',
              'Have a short, carded answer to the non-identity problem if you rely on obligations to future people yourself.',
            ],
          },
        ],
      },
      {
        id: 'next',
        heading: 'Before the topic changes',
        blocks: [
          { p: 'The Nov–Dec LD resolution is announced in early October. The next issue breaks it down as soon as it’s out. Most framework evidence carries over: keep your framework blocks in the Block vault and retag them for the new resolution.' },
        ],
      },
    ],
  },
  {
    id: '2026-09-ld',
    issue: 1,
    month: 'September 2026',
    event: 'LD',
    topic: SPACE,
    title: 'Outer space colonization: the topic primer',
    dek: 'What the resolution really asks, the burdens it creates, the strongest ground on both sides, the frameworks that fit, and where to find evidence.',
    status: 'published',
    readMinutes: 12,
    sections: [
      {
        id: 'question',
        heading: 'What the resolution asks',
        blocks: [
          { p: SPACE },
          {
            p: 'The resolution isn’t about whether space colonization is exciting, profitable or even good. It asks whether it is morally required: whether there is an obligation to establish human settlements beyond Earth. That word, imperative, sets the burdens for the whole topic.',
          },
          {
            callout: 'An aff that proves colonization would be beneficial hasn’t yet proved an imperative. A neg that concedes benefits can still win by showing no obligation follows.',
            title: 'The core tension',
          },
        ],
      },
      {
        id: 'terms',
        heading: 'Key terms',
        blocks: [
          {
            terms: [
              { term: 'Outer space', meaning: 'Space beyond Earth’s atmosphere. The 100 km Kármán line is a common convention, but there is no internationally agreed legal boundary. Most rounds won’t turn on this.' },
              { term: 'Colonization', meaning: 'Establishing permanent human settlements, as distinct from exploration, orbiting stations or temporary crewed missions. Expect debates over whether settlements must be self-sustaining, and over the word’s historical baggage.' },
              { term: 'Moral', meaning: 'Grounded in ethics rather than law, prudence or national interest. Economic or strategic arguments need a moral link.' },
              { term: 'Imperative', meaning: 'A requirement or obligation. The aff must show a duty; the neg can win by showing the act is permissible, or good, but not required.' },
              { term: 'The missing agent', meaning: 'The resolution names no actor. Humanity collectively, states and private companies each change the debate. Specify in the AC to control the ground.' },
            ],
          },
        ],
      },
      {
        id: 'aff',
        heading: 'Affirmative ground',
        blocks: [
          {
            args: [
              {
                side: 'aff',
                title: 'Existential insurance',
                warrant: 'A species confined to one planet can be ended by a single catastrophe: an asteroid impact, an engineered pandemic, nuclear war. Settlements elsewhere make human survival independent of any one world. If extinction is the worst outcome, the duty to reduce its risk is among the strongest we have.',
                answers: ['Self-sufficiency is centuries away, so settlements don’t insure anything soon', 'Reducing risks on Earth is cheaper and faster', 'Expansion could raise risk through militarization'],
              },
              {
                side: 'aff',
                title: 'Obligations to future generations',
                warrant: 'We have duties not to foreclose the existence and flourishing of those who come after us. Hans Jonas argued that responsibility for humanity’s continued existence is a basic imperative in a technological age. Colonization is one way of discharging that duty.',
                answers: ['Non-identity: merely possible people may not be owed anything', 'The duty to preserve humanity doesn’t specify space as the means'],
              },
              {
                side: 'aff',
                title: 'Astronomical stakes',
                warrant: 'Nick Bostrom’s “Astronomical Waste” argues that the potential future value of a civilisation that expands into space is so vast that delay itself is a moral cost. On aggregative views, even small increases in the chance of reaching that future outweigh large present costs.',
                answers: ['Fanaticism: tiny probabilities of huge payoffs shouldn’t dominate decisions', 'Bostrom’s own work prioritises reducing existential risk over speed of expansion'],
              },
            ],
          },
        ],
      },
      {
        id: 'neg',
        heading: 'Negative ground',
        blocks: [
          {
            args: [
              {
                side: 'neg',
                title: 'Good isn’t required',
                warrant: 'Most aff offense shows benefits. Benefits make an act permissible or praiseworthy, but an imperative requires more: that failing to act is wrong. Many good projects aren’t obligatory.',
                answers: ['Some benefits, like survival, are weighty enough to ground duties', 'Frameworks like consequentialism collapse the good and the required'],
              },
              {
                side: 'neg',
                title: 'Present obligations first',
                warrant: 'Resources spent on colonization are unavailable for people suffering now. Duties to existing people are clearer and more urgent than speculative duties to future settlers.',
                answers: ['Space budgets are small relative to total spending', 'Space technology produces spillover benefits on Earth'],
              },
              {
                side: 'neg',
                title: 'Planetary protection',
                warrant: 'The Outer Space Treaty (1967) commits parties to avoid harmful contamination of other celestial bodies. If Mars or icy moons harbour microbial life, settling them risks destroying it before we know it exists. Caution, not obligation, is the moral default.',
                answers: ['Settle bodies with no plausible biosphere, such as the Moon', 'Human survival outweighs microbial life'],
              },
              {
                side: 'neg',
                title: 'Expansion increases risk',
                warrant: 'Daniel Deudney’s Dark Skies argues that space expansionism is more likely to increase catastrophic and existential risks, through militarization and new great-power conflict, than to reduce them. This turns the aff’s own framework.',
                answers: ['International governance can manage the risks', 'Deudney’s risks exist with or without settlement'],
              },
              {
                side: 'neg',
                title: 'Colonial logics',
                warrant: '“Colonization” is not a neutral word. Critics argue the rhetoric of frontiers and settlement reproduces the logic of past colonial projects: who owns, who profits, and who is left behind on Earth.',
                answers: ['Space has no inhabitants to dispossess', 'The critique is about framing, not the act itself'],
              },
            ],
          },
        ],
      },
      {
        id: 'frameworks',
        heading: 'Frameworks that fit',
        blocks: [
          {
            list: [
              'Consequentialism and longtermism favour the aff on existential risk, but invite fanaticism and non-identity pushback.',
              'Kantian ethics fits the resolution’s language of imperatives. The neg can argue duties run to existing rational agents. The aff can argue that preserving rational agency itself is required.',
              'Rawlsian justice lets the neg ask who benefits, and whether settlement priorities could be justified to the least advantaged.',
              'Critical frameworks (settler-colonial critique, environmental ethics) give the neg a way to contest the resolution’s framing, not just its consequences.',
            ],
          },
        ],
      },
      {
        id: 'reading',
        heading: 'Reading list',
        blocks: [
          { p: 'Real, published works worth reading and cutting. Search any of them in Resolved’s Evidence tab to find the source and cut cards with the citation filled in.' },
          {
            reading: [
              { author: 'Nick Bostrom', title: 'Astronomical Waste: The Opportunity Cost of Delayed Technological Development', detail: 'Utilitas, 2003', why: 'The core aggregative argument for expansion, and for prioritising risk reduction.', search: 'Astronomical Waste Bostrom' },
              { author: 'Toby Ord', title: 'The Precipice: Existential Risk and the Future of Humanity', detail: 'Hachette, 2020', why: 'Existential-risk estimates; useful to both sides on whether space is the answer.', search: 'The Precipice Toby Ord' },
              { author: 'Hans Jonas', title: 'The Imperative of Responsibility', detail: 'University of Chicago Press, 1984 (English edition)', why: 'Duties to ensure humanity’s continued existence.', search: 'Imperative of Responsibility Hans Jonas' },
              { author: 'Derek Parfit', title: 'Reasons and Persons', detail: 'Oxford University Press, 1984', why: 'The non-identity problem, the key challenge to duties owed to future people.', search: 'Reasons and Persons Parfit' },
              { author: 'Daniel Deudney', title: 'Dark Skies: Space Expansionism, Planetary Geopolitics, and the Ends of Humanity', detail: 'Oxford University Press, 2020', why: 'The strongest case that expansion raises catastrophic risk.', search: 'Dark Skies Deudney space expansionism' },
              { author: 'Kelly and Zach Weinersmith', title: 'A City on Mars', detail: 'Penguin Press, 2023', why: 'How far off self-sufficient settlement really is: biology, law and logistics.', search: 'A City on Mars Weinersmith' },
              { author: 'United Nations', title: 'Treaty on Principles Governing the Activities of States in the Exploration and Use of Outer Space', detail: '1967 (the Outer Space Treaty)', why: 'Article IX on harmful contamination, and the non-appropriation principle.', search: 'Outer Space Treaty' },
              { author: 'Carl Sagan', title: 'Pale Blue Dot: A Vision of the Human Future in Space', detail: 'Random House, 1994', why: 'A classic case for human expansion, grounded in survival and perspective.', search: 'Pale Blue Dot Sagan' },
            ],
          },
        ],
      },
      {
        id: 'use',
        heading: 'Put it to work',
        blocks: [
          {
            list: [
              'Open the AC and NC templates in your Contention vault. The structure follows this brief.',
              'Cut evidence into each tag slot from the Evidence tab; citations fill in automatically.',
              'Keep framework cards in the Block vault. They carry over when the topic changes.',
              'Flow practice rounds in Flow & Timer, and mark what gets dropped.',
            ],
          },
        ],
      },
    ],
  },
]

export const briefById = Object.fromEntries(briefs.map((b) => [b.id, b])) as Record<string, Brief>
export const currentBrief = briefs.find((b) => b.status === 'published')!
