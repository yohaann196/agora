import { conceptById } from '../data/concepts'
import { philosopherById } from '../data/philosophers'
import { schoolById } from '../data/schools'
import { passages } from '../data/texts'
import type { SocraticMode } from '../store'
import { detectFallacies } from './fallacies'
import { NORMATIVE, VAGUE_TERMS, detectConcepts, detectPhilosophers, hash, pick, quoteShort, sentences, tokens } from './lexicon'

export interface SocraticReply {
  text: string
  concepts: string[]
  assumptions: string[]
  fallacies: string[]
}

export interface HistoryItem {
  role: 'user' | 'ai'
  text: string
}

export const MODE_META: Record<SocraticMode, { label: string; short: string; blurb: string; placeholder: string }> = {
  socratic: {
    label: 'Socratic',
    short: 'Questions, not answers',
    blurb: 'Asks questions that help you discover your own assumptions and weak points.',
    placeholder: 'State a position you hold — e.g. “Lying is wrong because it destroys trust.”',
  },
  devil: {
    label: 'Devil’s Advocate',
    short: 'Strongest objection',
    blurb: 'Constructs the strongest reasonable objection to your position.',
    placeholder: 'Give me a thesis to attack…',
  },
  tutor: {
    label: 'Tutor',
    short: 'Explain on request',
    blurb: 'Explains difficult concepts clearly — then checks your understanding.',
    placeholder: 'Ask about a concept: “What is the veil of ignorance?”',
  },
  philosopher: {
    label: 'Philosopher',
    short: 'How would they respond?',
    blurb: 'Reconstructs how a particular philosopher might respond. Always labelled as interpretation.',
    placeholder: 'Put a claim to the philosopher…',
  },
  fallacy: {
    label: 'Fallacy Detector',
    short: 'Find reasoning problems',
    blurb: 'Flags possible reasoning problems and explains why they might matter.',
    placeholder: 'Paste an argument, speech, or paragraph…',
  },
  coach: {
    label: 'Debate Coach',
    short: 'Claim · warrant · impact',
    blurb: 'Breaks down your contention, framework, or rebuttal and drills its weak points.',
    placeholder: 'Paste a contention, framework, or rebuttal…',
  },
}

const COUNTEREXAMPLES: Record<string, string> = {
  lying: 'a murderer at your door asks where your friend is hiding',
  consequentialism: 'a surgeon could save five dying patients by secretly harvesting the organs of one healthy visitor',
  'greatest-happiness': 'a surgeon could save five dying patients by secretly harvesting the organs of one healthy visitor',
  happiness: 'you are offered an “experience machine” that would give you a perfectly pleasant simulated life (Nozick’s thought experiment)',
  'harm-principle': 'an adult wants to sell themselves into permanent slavery',
  liberty: 'an adult wants to sell themselves into permanent slavery',
  'free-will': 'someone commits a crime while in the grip of a severe addiction',
  determinism: 'a neuroscientist can predict your decision seconds before you are aware of making it',
  'moral-responsibility': 'someone raised in extreme deprivation commits the same act as someone raised with every advantage',
  justice: 'two people work equally hard, but one was born with far greater natural talent and earns ten times more',
  equality: 'equalizing outcomes would require making some people worse off without making anyone better off',
  rights: 'violating one person’s rights is the only way to prevent a catastrophe affecting thousands',
  duty: 'a promise to meet a friend conflicts with stopping to help an injured stranger',
  deontology: 'following the rule will foreseeably lead to many deaths',
  'categorical-imperative': 'the only way to save an innocent life is to deceive the person threatening it',
  virtue: 'someone shows great courage in the service of an unjust cause',
  knowledge: 'a stopped clock happens to show the correct time when you glance at it',
  'natural-law': 'medicine routinely interferes with natural processes',
  fairness: 'one person would rather gamble on being the richest than be guaranteed a decent minimum',
  'veil-of-ignorance': 'one person would rather gamble on being the richest than be guaranteed a decent minimum',
  'existence-precedes-essence': 'someone’s range of real options is severely limited by poverty or oppression',
  'bad-faith': 'someone says “I had no choice” after doing what their employer demanded',
  'harm-principle-2': 'speech that is deeply offensive but causes no measurable injury',
}

const SOCRATIC_OPENERS = [
  'Let me make sure I understand you.',
  'Let’s slow down on one part of that.',
  'Before we go further, one thing puzzles me.',
  'Suppose that’s right. Then consider this.',
  'I want to test that against a case.',
]

interface VoiceProfile {
  commitments: string[]
  move: string
  question: string
}

const VOICES: Record<string, VoiceProfile> = {
  socrates: { commitments: ['No one does wrong knowingly', 'We must first define our terms'], move: 'would profess ignorance and ask you to define the key term you are relying on', question: 'You speak of this as if you know what it is. Tell me, then — what is it?' },
  plato: { commitments: ['The Forms are more real than appearances', 'Justice is the right order of the soul'], move: 'would ask whether you are describing the thing itself, or only its changing appearances', question: 'Would your account still hold for justice itself, not merely for what seems just to most people?' },
  aristotle: { commitments: ['Everything has a telos', 'Virtue is a mean discerned by practical wisdom'], move: 'would ask what the relevant activity is for, and what a person of practical wisdom would do in the particular circumstances', question: 'What is the end at which this aims — and does your view help a person flourish over a whole life?' },
  augustine: { commitments: ['Evil is a privation of good', 'The will is disordered without grace'], move: 'would examine the orientation of the will: what is loved, and in what order', question: 'What do you love most in holding this view — and is it rightly ordered?' },
  aquinas: { commitments: ['Good is to be done and evil avoided', 'Faith and reason cannot contradict'], move: 'would state the strongest objections first, then distinguish senses of your key terms before replying', question: 'Is the harm you describe intended as a means, or foreseen as a side effect?' },
  descartes: { commitments: ['Accept only what is clear and distinct', 'Mind and body are distinct substances'], move: 'would ask whether your premises survive methodical doubt', question: 'Of the things you have asserted, which could you not possibly doubt?' },
  hume: { commitments: ['Reason is the slave of the passions', 'No ought follows from an is alone'], move: 'would trace your claim back to the experience or sentiment it rests on, and look for an unexplained leap from “is” to “ought”', question: 'What impression or feeling is this idea copied from — and where does the “ought” come from?' },
  kant: { commitments: ['Act only on maxims you can will as universal law', 'Treat humanity never merely as a means'], move: 'would ask you to state the maxim of the action and test whether it could be willed universally without contradiction', question: 'What is your maxim here — and could you will that everyone act on it?' },
  mill: { commitments: ['Actions are right as they tend to promote happiness', 'Liberty may be restricted only to prevent harm to others'], move: 'would weigh the consequences for everyone affected, including the long-run effects on trust, liberty and character', question: 'Taking everyone affected into account, including future effects, what would produce the most happiness?' },
  nietzsche: { commitments: ['Values have a history and a function', 'Ask what a valuation expresses about the one who values'], move: 'would ask where your value came from, whose interests it served, and whether it affirms or diminishes life', question: 'Who first needed this value to be true — and what does holding it do to you?' },
  marx: { commitments: ['Social being determines consciousness', 'The point is to change the world'], move: 'would situate your claim in the material and economic conditions that make it seem natural', question: 'Under what material conditions does this view seem obvious — and who benefits from it seeming so?' },
  rawls: { commitments: ['Justice is the first virtue of institutions', 'Choose principles behind a veil of ignorance'], move: 'would ask whether you could endorse your principle without knowing where you will end up in society', question: 'Would you accept this principle if you did not know whether you would be among the least advantaged?' },
  sartre: { commitments: ['Existence precedes essence', 'We are condemned to be free'], move: 'would refuse any appeal to fixed nature or circumstance as an excuse, and remind you that your choice defines an image of humanity', question: 'In choosing this, what are you declaring a human being should be?' },
  beauvoir: { commitments: ['Freedom is always situated', 'To will oneself free is to will others free'], move: 'would ask whose situation your argument assumes, and whether it treats some people as the Other', question: 'Whose freedom does your view expand — and whose does it quietly limit?' },
}

function mainClaim(text: string) {
  return sentences(text)[0] ?? text
}

function loadedTerm(text: string): string | undefined {
  const ts = tokens(text)
  return ts.find((t) => VAGUE_TERMS[t])
}

function assumptionsIn(text: string): string[] {
  const out: string[] = []
  if (/maximi[sz]|greatest|more people|the many|overall/i.test(text)) out.push('Well-being can be added up across people')
  if (/\bshould|ought|must\b/i.test(text) && !/\bbecause\b/i.test(text)) out.push('A normative principle is being taken for granted')
  if (/\bnatur(e|al)\b/i.test(text)) out.push('What is natural is good')
  if (/\bfree|choice|choose\b/i.test(text)) out.push('The agent could have chosen otherwise')
  if (/\balways|never|everyone|no one\b/i.test(text)) out.push('The principle holds without exception')
  if (/\btrust|society|social\b/i.test(text)) out.push('Social effects determine moral status')
  if (/\bright(s)?\b/i.test(text)) out.push('Rights constrain what may be done for good outcomes')
  if (/\bgod|divine\b/i.test(text)) out.push('Theistic premises are shared')
  return out.slice(0, 3)
}

function relevantPassage(conceptIds: string[], philosopher?: string) {
  const pool = passages.filter((p) => p.source === 'quotation' && (!philosopher || p.author === philosopher))
  return pool.find((p) => p.concepts.some((c) => conceptIds.includes(c))) ?? (philosopher ? pool[0] : undefined)
}

function cite(p: ReturnType<typeof relevantPassage>) {
  if (!p) return ''
  const ph = philosopherById[p.author]
  return `> “${p.body}”\n> — ${ph?.name}, [[${p.textId}]] ${p.locator}${p.translation ? ` (${p.translation})` : ''} · *direct quotation*`
}

/* ------------------------------------------------------------------ */

function socratic(input: string, history: HistoryItem[]): string {
  const turn = history.filter((h) => h.role === 'user').length
  const words = tokens(input)
  const seed = hash(input)
  if (words.length < 4) {
    return 'Say a little more. What exactly do you believe about this — and, just as importantly, *why*? State it as a claim someone could disagree with.'
  }
  if (/^(what|who|explain|define|tell me)\b/i.test(input.trim()) || input.trim().endsWith('?')) {
    const c = detectConcepts(input, 1)[0]
    return `In this mode I’ll mostly ask rather than tell — you can switch to **Tutor** for an explanation.\n\nBut first: what do *you* currently think${c ? ` [[${c}]] means` : ' the answer is'}? Even a rough guess gives us something to examine.`
  }

  const claim = mainClaim(input)
  const concepts = detectConcepts(input)
  const term = loadedTerm(input)
  const counter = concepts.map((c) => COUNTEREXAMPLES[c]).find(Boolean)
  const opener = pick(SOCRATIC_OPENERS, seed)
  const hasBecause = /\bbecause|since|as\b/i.test(input)
  const strategy = turn % 5

  if (strategy === 0) {
    if (term) {
      return `${opener} You claim: *“${quoteShort(claim, 110)}”*\n\nYour argument leans on the word **“${term}”**. Does it mean ${VAGUE_TERMS[term]}\n\nWhich sense do you intend — and would your claim still be true under the other senses?`
    }
    if (!hasBecause) {
      return `${opener} You’ve stated a conclusion: *“${quoteShort(claim, 110)}”*\n\nWhat is your **reason** for it? Try completing the sentence: “…because ______.”`
    }
  }
  if (strategy <= 1 && counter) {
    return `Let’s test your view against a case. Suppose **${counter}**.\n\nDoes your position give the right answer here? If it does, explain why the case doesn’t trouble you. If it doesn’t, what would you need to revise — the principle, or its scope?`
  }
  if (strategy <= 2) {
    const assumed = assumptionsIn(input)
    if (assumed.length) {
      return `I notice your reasoning seems to rely on something you haven’t said: **${assumed[0].toLowerCase()}**.\n\nIs that something you actually believe? If someone denied it, what would you say to them?`
    }
    return `What would have to be true for your claim to be **false**? Describe the situation as concretely as you can.\n\nIf you can’t imagine one, is that because the claim is well-supported — or because it’s so general it doesn’t risk anything?`
  }
  if (strategy === 3) {
    const conc = concepts[0] ? conceptById[concepts[0]] : undefined
    return `Let’s follow your view to its implications. If you accept that *“${quoteShort(claim, 90)}”*, what else are you committed to?\n\n${
      conc ? `For instance, how does your view handle [[${conc.id}]] — ${conc.note.charAt(0).toLowerCase() + conc.note.slice(1)}` : 'Name one consequence of your view that you would find hard to accept.'
    }\n\nDo you still hold the view once that commitment is on the table?`
  }
  const phs = concepts.flatMap((c) => Object.values(philosopherById).filter((p) => p.concepts.includes(c)))
  const ph = phs[seed % Math.max(1, phs.length)] ?? philosopherById['socrates']
  return `Let’s take stock. So far you’ve held: *“${quoteShort(claim, 100)}”*.\n\n[[${ph.id}]] ${VOICES[ph.id]?.move ?? 'would press you on your premises'}. How would you answer: **${VOICES[ph.id]?.question ?? 'why?'}**\n\nAnd has anything in our conversation changed how confident you are? Say by how much.`
}

function devil(input: string): string {
  const concepts = detectConcepts(input)
  const t = input.toLowerCase()
  const permissive = /\b(sometimes|can be|justified|permissible|acceptable|okay|ok|fine)\b/.test(t)
  const restrictive = /\b(never|always wrong|wrong|impermissible|must not|should not|shouldn't)\b/.test(t)

  let objection = ''
  let refs = ''
  if (concepts.includes('lying')) {
    if (permissive && !restrictive) {
      objection = 'If lying is permissible whenever the stakes seem high enough, then *you* become the judge of when others deserve the truth. Kant’s point is that a maxim of lying when it seems justified undermines the practice of trust it relies on — and it treats the deceived person as an object to be managed, not a rational agent to be reasoned with.'
      refs = cite(relevantPassage(['universalizability'], 'kant'))
    } else {
      objection = 'An exceptionless ban on lying implies you must tell a murderer where your friend is hiding. If a moral rule yields that verdict, perhaps the rule is serving itself rather than the people it is meant to protect. Even Mill, who thought truthfulness nearly sacred, allowed exceptions to prevent great evil.'
      refs = '*Summary:* Mill, [[utilitarianism-1863]] ch. 2, allows exceptions to veracity such as withholding information from a malefactor.'
    }
  } else if (concepts.some((c) => ['consequentialism', 'greatest-happiness', 'happiness'].includes(c))) {
    objection = 'If only total happiness matters, then it would be right for a surgeon to kill one healthy patient to save five — and right to punish an innocent person if it calmed a riot. A theory that permits this has not taken seriously that each person has one life to live. Summing welfare across people treats them as containers for utility.'
    refs = cite(relevantPassage(['greatest-happiness'], 'rawls'))
  } else if (concepts.some((c) => ['deontology', 'duty', 'categorical-imperative', 'rights'].includes(c))) {
    objection = 'Rules that hold “whatever the consequences” risk moral self-indulgence: keeping your own hands clean while others suffer preventable harm. Why should the purity of your will matter more than the lives at stake?'
    refs = cite(relevantPassage(['greatest-happiness'], 'mill'))
  } else if (concepts.some((c) => ['free-will', 'moral-responsibility', 'existence-precedes-essence', 'bad-faith'].includes(c))) {
    objection = permissive
      ? 'If our choices are the product of genes, upbringing and circumstance we did not choose, then “responsibility” may be a social fiction. Blame would be less like a verdict and more like a tool for shaping behaviour.'
      : 'Insisting on total responsibility ignores that situations are unequal. Beauvoir argued that oppression can shut down the possibilities through which freedom is exercised. Blaming the oppressed for “choosing” their situation may become a way of excusing the oppressor.'
    refs = permissive ? '' : cite(relevantPassage(['situated-freedom'], 'beauvoir'))
  } else if (concepts.some((c) => ['justice', 'fairness', 'equality', 'difference-principle', 'veil-of-ignorance'].includes(c))) {
    objection = 'Principles chosen behind an imaginary veil bind no one who actually exists. Worse, the choice depends on assuming extreme caution: a party willing to gamble might pick a society with higher average welfare. The conclusion may be built into the setup.'
    refs = '*Interpretation:* This combines the “hypothetical consent” objection with Harsanyi’s average-utility critique of Rawls.'
  } else if (concepts.some((c) => ['liberty', 'harm-principle', 'autonomy'].includes(c))) {
    objection = 'Almost nothing we do affects only ourselves. If “harm to others” includes costs to families, public health systems and shared norms, the harm principle permits much more interference than its defenders admit; if it excludes them, it permits much less protection than most of us want.'
  } else {
    const rival = pick(['kantianism', 'utilitarianism', 'existentialism', 'marxism', 'aristotelianism'], hash(input))
    const s = schoolById[rival]
    objection = `From the standpoint of [[${rival}]]: ${s.summary} Read from there, your claim assumes exactly what is in dispute. The pressure point is its central tension: ${s.tension.charAt(0).toLowerCase() + s.tension.slice(1)}`
  }

  return `Here is the strongest *reasonable* objection I can build. It is not necessarily what I believe — it is what a well-prepared opponent would say.\n\n**Objection.** ${objection}${refs ? `\n\n${refs}` : ''}\n\n**Your move:** which premise of this objection do you reject — and can you do so without simply restating your original view?`
}

function tutor(input: string): string {
  const cs = detectConcepts(input, 3)
  const phs = detectPhilosophers(input)
  if (!cs.length && phs.length) {
    const p = philosopherById[phs[0]]
    const q = relevantPassage(p.concepts, p.id)
    return `**[[${p.id}]]** (${p.dates}) — ${p.signature}\n\n${p.bio[1]}\n\nKey ideas: ${p.concepts.slice(0, 5).map((c) => `[[${c}]]`).join(' · ')}\n\n${cite(q)}\n\n**Check your understanding:** in one sentence, how would you summarise ${p.name.split(' ').slice(-1)[0]}’s central project?`
  }
  if (!cs.length) {
    return 'Which concept would you like to work through? For example: [[categorical-imperative]], [[veil-of-ignorance]], [[bad-faith]], [[is-ought]], or [[eudaimonia]].\n\nTell me also what you already understand about it — I’ll build from there.'
  }
  const c = conceptById[cs[0]]
  const thinkers = Object.values(philosopherById).filter((p) => p.concepts.includes(c.id))
  const q = relevantPassage([c.id])
  const confusion = CONFUSIONS[c.id]
  return `**[[${c.id}]]** · *${c.domain}*\n\n${c.definition}\n\n${c.note}${
    thinkers.length ? `\n\n**Key thinkers:** ${thinkers.map((t) => `[[${t.id}]]`).join(', ')}` : ''
  }${q ? `\n\n${cite(q)}` : ''}${confusion ? `\n\n**Common confusion.** ${confusion}` : ''}\n\n**Related:** ${c.related.slice(0, 4).map((r) => `[[${r}]]`).join(' · ')}\n\n**Check your understanding:** can you put ${c.name.toLowerCase().startsWith('the ') ? c.name.toLowerCase() : `“${c.name}”`} in your own words, and give an example the explanation above did not mention?`
}

const CONFUSIONS: Record<string, string> = {
  'categorical-imperative': 'It is not the Golden Rule. The test is not “would I like this done to me?” but “can this maxim be willed as a universal law without contradiction?”',
  'veil-of-ignorance': 'The parties are not selfless — they are rational and self-interested. Fairness comes from what they cannot know, not from their altruism.',
  'is-ought': 'Hume does not say facts are irrelevant to ethics; he says a factual premise alone cannot entail a moral conclusion without a normative premise.',
  eudaimonia: '“Happiness” misleads: eudaimonia is not a feeling but an activity — living and acting well over a whole life.',
  'bad-faith': 'Bad faith is not lying to others; it is a lie to oneself about one’s own freedom.',
  'greatest-happiness': 'It is not “the happiness of the majority.” Everyone’s happiness counts, including the minority’s — it is the total that matters.',
  'harm-principle': 'It does not say we must never harm; it limits when coercion may be used against someone.',
  'death-of-god': 'It is not a metaphysical proof that God does not exist, but a cultural diagnosis of what modern Europe could still believe.',
  'existence-precedes-essence': 'It does not mean anything goes. Sartre argues we are responsible for everyone in choosing, because each choice affirms an image of humanity.',
  forms: 'Forms are not ideas in anyone’s mind; for Plato they exist independently and are the most real things there are.',
  cogito: 'The cogito is not a syllogism with a hidden premise (“everything that thinks exists”) — or so Descartes insisted in his replies to objections.',
  compatibilism: 'Compatibilists do not deny that actions are caused; they deny that being caused makes them unfree.',
  'difference-principle': 'It does not require equality. Inequalities are permitted — if they make the least advantaged better off.',
}

function philosopherMode(input: string, philosopher: string): string {
  const p = philosopherById[philosopher] ?? philosopherById['kant']
  const v = VOICES[p.id]
  const cs = detectConcepts(input)
  const shared = p.concepts.filter((c) => cs.includes(c))
  const q = relevantPassage(shared.length ? shared : p.concepts, p.id)
  const claim = mainClaim(input)
  return `*AI interpretation — a reconstruction of how [[${p.id}]] might respond, not something ${p.name.split(' ').slice(-1)[0]} wrote.*\n\nFaced with *“${quoteShort(claim, 110)}”*, ${p.name.split(' ').slice(-1)[0]} ${v.move}.\n\n**Core commitments at stake**\n${v.commitments.map((c) => `- ${c}`).join('\n')}${
    shared.length ? `\n- Your claim touches ${shared.map((s) => `[[${s}]]`).join(', ')}, which is central to this thinker.` : ''
  }\n\n**Textual anchor**\n${cite(q) || `*Summary:* ${p.signature}`}\n\n**The question they would put to you:** ${v.question}`
}

function fallacyMode(input: string): string {
  const hits = detectFallacies(input)
  const normConclusion = sentences(input).some((s) => NORMATIVE.test(s) && /\b(therefore|so|thus|hence)\b/i.test(s))
  if (!hits.length) {
    return `I didn’t find any common fallacy patterns. That doesn’t mean the reasoning is sound — most weak arguments fail through **unsupported premises** or **unclear terms**, not textbook fallacies.${
      normConclusion ? '\n\nOne thing to check: you draw a normative conclusion (“should/ought”). Is there a premise that states the value doing the work?' : ''
    }\n\n**Try this:** rewrite the argument as numbered premises and a conclusion. Which premise is the one a critic would attack first?`
  }
  return `I found ${hits.length} *possible* reasoning problem${hits.length > 1 ? 's' : ''}. These are pattern-based flags, not verdicts — check each one in context.\n\n${hits
    .map((h, i) => `**${i + 1}. ${h.name}**\n> ${h.excerpt}\n\n${h.explanation}\n\n*Ask yourself:* ${h.question}`)
    .join('\n\n')}`
}

function coach(input: string): string {
  const ss = sentences(input)
  const claim = ss[0] ?? input
  const warrant = ss.find((s) => /\b(because|since|given that|as a result of)\b/i.test(s))
  const impact = ss.find((s) => /\b(leads? to|results? in|harm|benefit|matters|deaths?|lives|welfare|rights|outweigh|impact)\b/i.test(s))
  const util = /\b(consequence|outcome|welfare|lives|maximi|net benefit|utility|harm)\b/i.test(input)
  const deont = /\b(rights?|duty|dignity|consent|autonomy|categorical|obligation)\b/i.test(input)
  const framework = util && deont ? 'mixed (consequences *and* rights)' : util ? 'consequentialist' : deont ? 'deontological' : 'not stated'
  const hits = detectFallacies(input)
  const concepts = detectConcepts(input)
  const term = loadedTerm(input)
  const lines = [
    `**Structure check**`,
    `- **Claim** ✓ *“${quoteShort(claim, 90)}”*`,
    `- **Warrant** ${warrant ? `✓ *“${quoteShort(warrant, 90)}”*` : '✗ missing — *why* is the claim true?'}`,
    `- **Impact** ${impact ? `✓ *“${quoteShort(impact, 90)}”*` : '✗ missing — why does it *matter*, and how much?'}`,
    `- **Framework** ${framework}${framework === 'not stated' ? ' — tell the judge how to weigh the round.' : ''}`,
    '',
    `**Where a good opponent attacks**`,
    !warrant ? '- The link between your claim and its justification: without a warrant it is an assertion.' : `- The warrant: can they show the “because” doesn’t actually establish the claim?`,
    term ? `- The term **“${term}”** — if they define it differently, does your case still stand?` : '',
    framework === 'consequentialist' ? '- Rights-based turn: even if the outcomes are good, does your case license violating someone’s rights?' : '',
    framework === 'deontological' ? '- Consequences turn: what happens to real people if your principle is followed in the hardest case?' : '',
    hits[0] ? `- A possible **${hits[0].name.toLowerCase()}**: *“${quoteShort(hits[0].excerpt, 80)}”*` : '',
    '',
    `**Weighing**`,
    `Compare impacts on *magnitude*, *probability*, *timeframe* and *reversibility* — and explain why your framework picks the winner.`,
    concepts.length ? `\nRelevant background: ${concepts.slice(0, 3).map((c) => `[[${c}]]`).join(' · ')}` : '',
    '',
    `**Drill:** write a two-sentence rebuttal to the strongest attack above. I won’t write it for you — paste it back and I’ll pressure-test it.`,
  ]
  return lines.filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n')
}

export function respond(input: string, mode: SocraticMode, history: HistoryItem[], philosopher = 'kant'): SocraticReply {
  let text: string
  switch (mode) {
    case 'socratic':
      text = socratic(input, history)
      break
    case 'devil':
      text = devil(input)
      break
    case 'tutor':
      text = tutor(input)
      break
    case 'philosopher':
      text = philosopherMode(input, philosopher)
      break
    case 'fallacy':
      text = fallacyMode(input)
      break
    case 'coach':
      text = coach(input)
      break
  }
  return {
    text,
    concepts: detectConcepts(input + ' ' + text, 6),
    assumptions: assumptionsIn(input),
    fallacies: detectFallacies(input).map((f) => f.name),
  }
}

export const SYSTEM_PROMPTS: Record<SocraticMode, string> = {
  socratic: 'You are a Socratic tutor in PhilosophyOS. Never give the answer. Reply in at most 120 words with one or two probing questions that expose an assumption, ambiguity, or counterexample in the student’s position.',
  devil: 'You are a devil’s advocate in PhilosophyOS. Construct the single strongest reasonable objection to the student’s position, grounded in a named philosophical tradition. Do not declare who is right. End by asking which premise of the objection they reject.',
  tutor: 'You are a philosophy tutor in PhilosophyOS. Explain the requested concept clearly and accurately, distinguish direct quotation from interpretation, never fabricate quotations, and end with a question that checks understanding.',
  philosopher: 'You reconstruct how a named philosopher might respond to a claim. Always label the response as interpretation, ground it in their actual commitments, never invent quotations, and end with the question that philosopher would put to the student.',
  fallacy: 'You identify possible reasoning problems in the student’s text. Name each possible fallacy, quote the relevant excerpt, explain why it may be a problem, and ask a question. Present flags as possibilities, not verdicts.',
  coach: 'You are a debate coach. Break the student’s text into claim, warrant, impact and framework; identify where an opponent would attack; suggest weighing; end with a drill for the student to write. Do not write their rebuttal for them.',
}
