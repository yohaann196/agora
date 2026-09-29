import type { CompareQuestion } from '../model/types'

/**
 * Curated comparisons. Each position separates:
 *  - `quotation`   — a passage from the corpus (see texts.ts)
 *  - `summary`     — a summary of what the text says, not verbatim
 *  - `interpretation` — a reconstruction or scholarly reading that goes beyond the text
 */
export const compareQuestions: CompareQuestion[] = [
  {
    id: 'lying',
    question: 'Is lying ever justified?',
    domain: 'Ethics',
    positions: [
      {
        philosopher: 'kant',
        stance: 'Never',
        headline: 'Lying violates a universal moral duty.',
        reasoning: [
          'Morality is grounded in principles every rational agent could will as universal law, not in the outcomes an action produces.',
          'A maxim of lying when convenient undermines itself: if everyone lied when it suited them, assertions would lose the trust that makes lying possible.',
          'Deception also treats the deceived person merely as a means, bypassing their rational agency.',
        ],
        support: [
          { source: 'quotation', passageId: 'p-groundwork-ful', text: 'Formula of Universal Law', citation: 'Groundwork II, 4:421' },
          { source: 'summary', passageId: 'p-lie-murderer', text: 'Truthfulness is owed even to a murderer at the door.', citation: 'On a Supposed Right to Lie (1797)' },
          { source: 'interpretation', text: 'Some contemporary Kantians (e.g. Christine Korsgaard) argue the Formula of Humanity may permit deceiving someone who is himself using deception for evil ends. This departs from Kant’s own 1797 conclusion.' },
        ],
        concepts: ['categorical-imperative', 'universalizability', 'duty', 'lying'],
      },
      {
        philosopher: 'mill',
        stance: 'Rarely',
        headline: 'The morality of lying depends on consequences.',
        reasoning: [
          'Actions are right in proportion as they tend to promote happiness, so no act is wrong independent of its effects.',
          'But truthfulness has enormous utility: trust in each other’s word underpins social life, so even small lies erode something valuable.',
          'Hence the rule of veracity should be treated as nearly sacred — while admitting exceptions where a lie prevents great evil.',
        ],
        support: [
          { source: 'quotation', passageId: 'p-util-ghp', text: 'The Greatest Happiness Principle', citation: 'Utilitarianism, ch. 2' },
          { source: 'summary', passageId: 'p-util-veracity', text: 'Veracity has great utility, but admits exceptions (a malefactor, a dangerously ill person).', citation: 'Utilitarianism, ch. 2' },
        ],
        concepts: ['greatest-happiness', 'consequentialism', 'lying'],
      },
      {
        philosopher: 'nietzsche',
        stance: 'Reframes the question',
        headline: 'Ask why we value truth at all — and whose values these are.',
        reasoning: [
          'Nietzsche does not offer a rule about lying; he questions the unexamined value placed on truth itself.',
          'Moral prohibitions have histories: they may express the interests or ressentiment of particular types of people rather than timeless obligations.',
          'The better question may be what a given practice of truthfulness or deception expresses about, and does to, the one who practises it.',
        ],
        support: [
          { source: 'summary', passageId: 'p-bge-1', text: 'Why truth rather than untruth?', citation: 'Beyond Good and Evil §1' },
          { source: 'quotation', passageId: 'p-gm-ressentiment', text: 'Values born of ressentiment', citation: 'Genealogy I.10' },
          { source: 'interpretation', text: 'Applying Nietzsche to lying is a reconstruction: he does not systematically discuss the ethics of lying, and readers disagree about how far his critique of morality extends.' },
        ],
        concepts: ['perspectivism', 'master-slave-morality', 'will-to-power'],
      },
      {
        philosopher: 'augustine',
        stance: 'Never',
        headline: 'Every lie is a sin, though some are graver than others.',
        reasoning: [
          'A lie is speaking against what one holds in one’s mind, with intent to deceive.',
          'Augustine denies that one may lie even to save a life, though he distinguishes kinds of lies by gravity.',
          'One may, however, keep silent or conceal the truth without lying.',
        ],
        support: [
          { source: 'interpretation', text: 'Augustine develops this in De Mendacio (On Lying) and Contra Mendacium, texts not yet in the PhilosophyOS corpus — treat this column as a summary of scholarly consensus rather than a sourced quotation.' },
        ],
        concepts: ['lying', 'duty'],
      },
    ],
    keyDifference:
      'Kant and Augustine locate the wrongness of lying in the act itself; Mill locates it in the act’s effects on happiness and trust; Nietzsche steps back to ask why truthfulness has been valued so highly and what that valuation serves. The disagreement is ultimately about the source of moral authority: rational consistency, divine law, consequences, or the history of values.',
    axes: [
      { label: 'Source of wrongness', values: { kant: 'Contradiction in the will', mill: 'Harm to happiness & trust', nietzsche: 'Question rejected', augustine: 'Offence against truth' } },
      { label: 'Exceptions?', values: { kant: 'None', mill: 'Yes, rare', nietzsche: 'Wrong frame', augustine: 'None' } },
      { label: 'Murderer at the door', values: { kant: 'Do not lie', mill: 'Lie is permissible', nietzsche: '—', augustine: 'Stay silent; do not lie' } },
    ],
  },
  {
    id: 'free-will',
    question: 'Is free will compatible with determinism?',
    domain: 'Metaphysics',
    positions: [
      {
        philosopher: 'hume',
        stance: 'Compatible',
        headline: 'Liberty is acting according to one’s will — which necessity doesn’t threaten.',
        reasoning: [
          'The dispute between liberty and necessity is largely verbal.',
          'Human actions show the same regularity as nature; we rely on this constantly in predicting others.',
          'Liberty properly understood — the power to act according to the determinations of the will — is opposed to constraint, not to causation.',
        ],
        support: [
          { source: 'quotation', passageId: 'p-enquiry-liberty', text: 'Hume’s definition of liberty', citation: 'Enquiry §8' },
        ],
        concepts: ['compatibilism', 'causation', 'free-will'],
      },
      {
        philosopher: 'kant',
        stance: 'Two standpoints',
        headline: 'Nature is determined; the rational will must regard itself as free.',
        reasoning: [
          'As appearances in nature, all events — including actions — are subject to causal law.',
          'But in acting on reasons, we must regard ourselves as free: freedom is presupposed by the moral law itself.',
          'Freedom is not lawlessness; it is autonomy, self-given law.',
        ],
        support: [
          { source: 'quotation', passageId: 'p-groundwork-freedom', text: 'Free will and moral law', citation: 'Groundwork III, 4:447' },
          { source: 'interpretation', text: 'Whether Kant’s “two standpoints” describe two worlds or two perspectives on one world is a major interpretive dispute.' },
        ],
        concepts: ['autonomy', 'free-will', 'determinism'],
      },
      {
        philosopher: 'sartre',
        stance: 'Radical freedom',
        headline: 'We are condemned to be free — there is no nature that decides for us.',
        reasoning: [
          'Consciousness is never simply a thing determined by prior causes; it is always projecting itself toward possibilities.',
          'Appeals to character, passion or circumstance as determining causes are forms of bad faith.',
          'Freedom is not an optional property we might lack; it is what human existence is.',
        ],
        support: [
          { source: 'quotation', passageId: 'p-eh-condemned', text: 'Condemned to be free', citation: 'Existentialism Is a Humanism' },
          { source: 'summary', passageId: 'p-bn-waiter', text: 'The waiter in bad faith', citation: 'Being and Nothingness I.2' },
        ],
        concepts: ['free-will', 'bad-faith', 'existence-precedes-essence'],
      },
      {
        philosopher: 'nietzsche',
        stance: 'Rejects both',
        headline: 'Both “free will” and “unfree will” are mythology.',
        reasoning: [
          'The idea of being causa sui — cause of oneself — is incoherent.',
          'But the opposite idea, a mechanically “unfree” will, misuses the concept of cause as well.',
          'What exists in reality are strong and weak wills.',
        ],
        support: [
          { source: 'quotation', passageId: 'p-bge-21', text: 'The causa sui', citation: 'Beyond Good and Evil §21' },
        ],
        concepts: ['free-will', 'will-to-power'],
      },
    ],
    keyDifference:
      'Hume dissolves the problem by redefining liberty; Kant preserves both necessity and freedom by assigning them to different standpoints; Sartre makes freedom the very structure of consciousness; Nietzsche rejects the terms in which the debate is posed.',
    axes: [
      { label: 'Is determinism true?', values: { hume: 'Yes', kant: 'Of appearances', sartre: 'Not of consciousness', nietzsche: 'Question misframed' } },
      { label: 'What is freedom?', values: { hume: 'Acting as one wills', kant: 'Autonomy', sartre: 'Our very being', nietzsche: 'Strength of will' } },
    ],
  },
  {
    id: 'just-society',
    question: 'What makes a society just?',
    domain: 'Political',
    positions: [
      {
        philosopher: 'plato',
        stance: 'Harmony',
        headline: 'Each part doing its own work under the rule of wisdom.',
        reasoning: [
          'A just city, like a just soul, is ordered: each class performs its proper function.',
          'Rulers must have knowledge of the good, which is why philosophers should rule.',
        ],
        support: [
          { source: 'summary', passageId: 'p-republic-justice', text: 'Justice in city and soul', citation: 'Republic IV' },
          { source: 'quotation', passageId: 'p-republic-kings', text: 'Philosopher-kings', citation: 'Republic V, 473c–d' },
        ],
        concepts: ['justice', 'tripartite-soul', 'philosopher-king'],
      },
      {
        philosopher: 'mill',
        stance: 'Utility & liberty',
        headline: 'Justice protects the most vital utilities — above all security and liberty.',
        reasoning: [
          'Justice names a class of moral rules concerning the essentials of human well-being, and is therefore grounded in utility.',
          'Individual liberty must be protected from state and social coercion except to prevent harm to others.',
        ],
        support: [
          { source: 'quotation', passageId: 'p-liberty-harm', text: 'The harm principle', citation: 'On Liberty, ch. 1' },
          { source: 'interpretation', text: 'Whether Mill’s liberalism can be fully derived from utility, or quietly depends on independent rights, is a long-running debate.' },
        ],
        concepts: ['harm-principle', 'greatest-happiness', 'liberty'],
      },
      {
        philosopher: 'marx',
        stance: 'Beyond class',
        headline: 'Justice cannot be realized while society is divided by class exploitation.',
        reasoning: [
          'Ideals of justice are shaped by the economic structure of the society that holds them.',
          'Capitalist relations of production extract surplus value from workers, whatever their formal rights.',
          'A higher phase of society would distribute according to need.',
        ],
        support: [
          { source: 'quotation', passageId: 'p-gotha-needs', text: 'According to needs', citation: 'Critique of the Gotha Programme' },
          { source: 'interpretation', text: 'Scholars disagree whether Marx condemned capitalism as unjust, or rejected the language of justice as itself ideological.' },
        ],
        concepts: ['class-struggle', 'historical-materialism', 'ideology'],
      },
      {
        philosopher: 'rawls',
        stance: 'Fairness',
        headline: 'Principles chosen behind a veil of ignorance.',
        reasoning: [
          'Justice is the first virtue of social institutions.',
          'Fair principles are those chosen by free and equal persons who do not know their place in society.',
          'They would secure equal basic liberties and permit inequalities only to benefit the least advantaged.',
        ],
        support: [
          { source: 'quotation', passageId: 'p-tj-first-virtue', text: 'The first virtue', citation: 'A Theory of Justice §1' },
          { source: 'quotation', passageId: 'p-tj-veil', text: 'The veil of ignorance', citation: 'A Theory of Justice §3' },
          { source: 'summary', passageId: 'p-tj-principles', text: 'The two principles', citation: 'A Theory of Justice §11, §46' },
        ],
        concepts: ['justice', 'original-position', 'difference-principle', 'fairness'],
      },
    ],
    keyDifference:
      'Plato defines justice as a harmonious order grounded in knowledge; Mill grounds it in human well-being and liberty; Rawls grounds it in what could be fairly agreed; Marx argues that the economic structure must change before justice is possible at all.',
    axes: [
      { label: 'Justice is…', values: { plato: 'Order', mill: 'Protected utility', marx: 'Classless society', rawls: 'Fair agreement' } },
      { label: 'Priority', values: { plato: 'Wisdom', mill: 'Liberty', marx: 'Emancipation', rawls: 'Least advantaged' } },
    ],
  },
  {
    id: 'good-life',
    question: 'What is a good life?',
    domain: 'Ethics',
    positions: [
      {
        philosopher: 'aristotle',
        stance: 'Flourishing',
        headline: 'Activity of soul in accordance with virtue, over a complete life.',
        reasoning: ['The human good lies in excellently exercising our distinctive rational capacities.', 'Happiness is judged across a whole life, not a moment.'],
        support: [
          { source: 'quotation', passageId: 'p-ne-activity', text: 'The function argument', citation: 'Nicomachean Ethics I.7' },
          { source: 'quotation', passageId: 'p-ne-swallow', text: 'One swallow', citation: 'Nicomachean Ethics I.7' },
        ],
        concepts: ['eudaimonia', 'virtue', 'telos'],
      },
      {
        philosopher: 'mill',
        stance: 'Higher happiness',
        headline: 'A life rich in the higher pleasures.',
        reasoning: ['Happiness is the ultimate good.', 'But pleasures of intellect, feeling and imagination are qualitatively superior.'],
        support: [{ source: 'quotation', passageId: 'p-util-socrates', text: 'Socrates dissatisfied', citation: 'Utilitarianism ch. 2' }],
        concepts: ['higher-pleasures', 'happiness'],
      },
      {
        philosopher: 'nietzsche',
        stance: 'Affirmation',
        headline: 'A life one could will to live again, eternally.',
        reasoning: ['The test of a life is whether one can affirm it wholly, including its suffering.', 'Growth and self-overcoming matter more than comfort.'],
        support: [
          { source: 'summary', passageId: 'p-gs-341', text: 'The greatest weight', citation: 'Gay Science §341' },
          { source: 'interpretation', text: 'Reading eternal recurrence as a practical test rather than a cosmological theory is the dominant but not the only interpretation.' },
        ],
        concepts: ['eternal-recurrence', 'will-to-power'],
      },
      {
        philosopher: 'socrates',
        stance: 'Examination',
        headline: 'A life of continual questioning about how to live.',
        reasoning: ['Caring for the soul matters more than wealth or reputation.', 'Without examination, we cannot know whether our lives are good.'],
        support: [{ source: 'quotation', passageId: 'p-apology-unexamined', text: 'The unexamined life', citation: 'Apology 38a' }],
        concepts: ['examined-life', 'virtue'],
      },
    ],
    keyDifference:
      'Aristotle and Socrates treat the good life as an achievement of reason and virtue; Mill as the richest possible happiness; Nietzsche as a life strong enough to affirm itself without external justification.',
    axes: [
      { label: 'The good is…', values: { aristotle: 'Virtuous activity', mill: 'Higher pleasure', nietzsche: 'Affirmation', socrates: 'Examined virtue' } },
    ],
  },
]

export const compareById = Object.fromEntries(compareQuestions.map((q) => [q.id, q])) as Record<string, CompareQuestion>
