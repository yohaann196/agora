import { philosopherById } from '../data/philosophers'
import { schoolById } from '../data/schools'
import type { ArgNode, Argument } from '../model/types'
import {
  NORMATIVE,
  QUANTIFIERS,
  VAGUE_TERMS,
  contentStems,
  contentWords,
  detectConcepts,
  detectPhilosophers,
  quoteShort,
  stem,
  tokens,
  traditionsFor,
} from './lexicon'

export interface Finding {
  id: string
  title: string
  detail: string
  question?: string
  nodeIds?: string[]
  refs?: string[]
  sketch?: string[]
}

export interface ArgumentAnalysis {
  form: string
  overview: string
  unsupported: Finding[]
  gaps: Finding[]
  ambiguities: Finding[]
  assumptions: Finding[]
  objections: Finding[]
  counterarguments: Finding[]
  traditions: { school: string; why: string; philosophers: string[] }[]
  concepts: string[]
  questions: string[]
}

const label = (n: ArgNode, core: ArgNode[]) => {
  const idx = core.filter((c) => c.type === n.type).indexOf(n)
  const base = n.type.charAt(0).toUpperCase() + n.type.slice(1)
  return n.type === 'premise' ? `${base} ${idx + 1}` : base
}

interface ObjectionTemplate {
  when: string[]
  title: string
  detail: string
  refs: string[]
  question: string
}

const OBJECTIONS: ObjectionTemplate[] = [
  {
    when: ['greatest-happiness', 'consequentialism', 'happiness'],
    title: 'The separateness of persons',
    detail: 'Summing happiness across people treats society as if it were one person who can trade a loss here for a gain there. But the person who bears the loss does not receive the gain.',
    refs: ['rawls', 'p-tj-separateness'],
    question: 'What would you say to the person being sacrificed — is “others gain more” a reason they could accept?',
  },
  {
    when: ['greatest-happiness', 'consequentialism', 'rights'],
    title: 'Persons as ends, not merely means',
    detail: 'A Kantian objects that using someone merely as an instrument for others’ ends fails to respect them as a rational agent, whatever the outcome.',
    refs: ['kant', 'p-groundwork-humanity'],
    question: 'Is there anything you think it would be wrong to do to one person, no matter how many others would benefit?',
  },
  {
    when: ['greatest-happiness', 'happiness', 'higher-pleasures'],
    title: 'Can happiness be measured and compared?',
    detail: 'To say one act produces “more” happiness than another assumes a common scale on which different people’s experiences can be weighed.',
    refs: ['mill', 'higher-pleasures'],
    question: 'How would you compare one person’s intense suffering to many people’s mild pleasure?',
  },
  {
    when: ['deontology', 'duty', 'categorical-imperative', 'universalizability', 'lying'],
    title: 'Rules that ignore catastrophe',
    detail: 'If a duty holds regardless of consequences, it may require terrible outcomes — the classic case being refusing to lie to a murderer at the door.',
    refs: ['p-lie-murderer', 'mill'],
    question: 'Is there any outcome bad enough that you would break this rule to prevent it? If so, what does that tell you about the rule?',
  },
  {
    when: ['universalizability', 'categorical-imperative'],
    title: 'The problem of relevant descriptions',
    detail: 'Whether a maxim universalizes depends on how narrowly it is described. “Lie to murderers seeking their victims” may universalize perfectly well.',
    refs: ['universalizability'],
    question: 'What fixes the correct description of the maxim you are testing?',
  },
  {
    when: ['duty', 'deontology'],
    title: 'Conflicting duties',
    detail: 'When two duties conflict — as in Sartre’s student torn between his mother and the Resistance — a rule-based ethics may not tell us what to do.',
    refs: ['sartre', 'p-eh-student'],
    question: 'Which duty would win, and on what principle?',
  },
  {
    when: ['liberty', 'harm-principle', 'autonomy'],
    title: 'Is any conduct purely self-regarding?',
    detail: 'Almost every action affects someone else — dependants, communities, shared institutions. The line between self- and other-regarding conduct may not hold.',
    refs: ['mill', 'harm-principle'],
    question: 'Can you name a case of conduct that genuinely affects no one else?',
  },
  {
    when: ['existence-precedes-essence', 'bad-faith', 'free-will', 'moral-responsibility'],
    title: 'Freedom is always situated',
    detail: 'Beauvoir argues that oppression can restrict the possibilities open to people. Holding everyone equally responsible may ignore how situations shape what can be chosen.',
    refs: ['beauvoir', 'situated-freedom'],
    question: 'Is the person with fewer real options exactly as responsible as the person with many?',
  },
  {
    when: ['free-will', 'moral-responsibility', 'determinism'],
    title: 'The challenge from determinism',
    detail: 'If every choice is the product of prior causes, in what sense could the agent have done otherwise — and does responsibility require that they could?',
    refs: ['hume', 'compatibilism'],
    question: 'Does your argument need the ability to do otherwise, or only acting from one’s own will?',
  },
  {
    when: ['justice', 'fairness', 'original-position', 'veil-of-ignorance', 'difference-principle'],
    title: 'Why should a hypothetical agreement bind us?',
    detail: 'No one actually agreed to principles chosen in an imagined situation. Critics ask how a hypothetical contract can create real obligations.',
    refs: ['rawls', 'original-position'],
    question: 'Is the agreement doing the work — or the reasons the parties would have for agreeing?',
  },
  {
    when: ['justice', 'equality', 'rights', 'liberty'],
    title: 'Whose interests does this conception serve?',
    detail: 'Ideology critique asks whether an account of justice presents the interests of a dominant group as neutral or natural.',
    refs: ['marx', 'ideology'],
    question: 'Who benefits if your principle is accepted as obviously correct?',
  },
  {
    when: ['natural-law', 'telos'],
    title: 'From “natural” to “good”',
    detail: 'Hume warns against moving from what is to what ought to be. That a behaviour is natural does not by itself show it is right.',
    refs: ['hume', 'is-ought', 'p-treatise-ought'],
    question: 'What extra premise gets you from the natural to the good?',
  },
  {
    when: ['cogito', 'methodological-doubt'],
    title: 'Does thinking prove a thinker?',
    detail: 'The step from “there is thinking” to “I exist” may assume that thoughts require a subject that owns them.',
    refs: ['descartes', 'cogito'],
    question: 'What exactly is certain: that I exist, or that thinking is happening?',
  },
  {
    when: ['virtue', 'eudaimonia', 'golden-mean'],
    title: 'Does virtue tell us what to do?',
    detail: '“Do what the virtuous person would do” may be unhelpful to someone who is unsure what that is.',
    refs: ['aristotle', 'golden-mean'],
    question: 'How would a person without practical wisdom apply your principle?',
  },
  {
    when: ['will-to-power', 'master-slave-morality', 'perspectivism', 'nihilism'],
    title: 'Does perspectivism undermine itself?',
    detail: 'If all claims are perspectival, then so is the claim that all claims are perspectival. Does that weaken it?',
    refs: ['nietzsche', 'perspectivism'],
    question: 'Is your argument claiming to be true from every perspective?',
  },
]

const RIVAL_SKETCHES: { when: string[]; tradition: string; premises: string[]; conclusion: (c: string) => string }[] = [
  {
    when: ['greatest-happiness', 'consequentialism', 'happiness'],
    tradition: 'kantianism',
    premises: [
      'Every person has a dignity that cannot be exchanged for any amount of benefit to others.',
      'Using someone merely as a means to others’ happiness fails to respect that dignity.',
    ],
    conclusion: (c) => negate(c),
  },
  {
    when: ['deontology', 'duty', 'categorical-imperative', 'lying', 'universalizability'],
    tradition: 'utilitarianism',
    premises: [
      'What makes an action right or wrong is ultimately its effect on the well-being of those affected.',
      'In some cases, following the rule produces far worse outcomes than breaking it.',
    ],
    conclusion: (c) => negate(c),
  },
  {
    when: ['free-will', 'moral-responsibility', 'existence-precedes-essence', 'bad-faith'],
    tradition: 'feminist-philosophy',
    premises: [
      'Freedom is exercised within situations that can expand or restrict real options.',
      'Responsibility should track the options genuinely available to an agent.',
    ],
    conclusion: (c) => negate(c),
  },
  {
    when: ['justice', 'fairness', 'liberty', 'rights', 'equality'],
    tradition: 'marxism',
    premises: [
      'Principles of justice are shaped by the economic structure of the society that produces them.',
      'Formally equal rights can coexist with deep material inequality and exploitation.',
    ],
    conclusion: (c) => negate(c),
  },
]

export function negate(sentence: string): string {
  const s = sentence.trim().replace(/^therefore,?\s*/i, '').replace(/\.$/, '')
  const rules: [RegExp, string][] = [
    [/\bcan sometimes be\b/i, 'can never be'],
    [/\bcan be\b/i, 'cannot be'],
    [/\bis never\b/i, 'is sometimes'],
    [/\bis always\b/i, 'is not always'],
    [/\bshould not\b/i, 'may'],
    [/\bshould\b/i, 'should not'],
    [/\bmust\b/i, 'need not'],
    [/\bare\b/i, 'are not'],
    [/\bis\b/i, 'is not'],
    [/\bwould\b/i, 'would not'],
    [/\bcan\b/i, 'cannot'],
  ]
  for (const [re, rep] of rules) if (re.test(s)) return 'Therefore, ' + lowerFirst(s.replace(re, rep)) + '.'
  return `Therefore, it is not the case that ${lowerFirst(s)}.`
}

function lowerFirst(s: string) {
  return /^[A-Z][a-z]/.test(s) && !/^(I|Kant|Mill|Rawls|God)\b/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s
}

interface AssumptionRule {
  re: RegExp
  title: string
  detail: string
  refs?: string[]
}

const ASSUMPTION_RULES: AssumptionRule[] = [
  { re: /maximi[sz]|greatest|total|more happiness|overall|aggregate/i, title: 'Value can be summed across persons', detail: 'Talk of maximizing assumes one person’s gain can offset another’s loss on a common scale.', refs: ['greatest-happiness'] },
  { re: /sacrific|kill|let die|one person|the few|trade.?off/i, title: 'No moral difference between doing and allowing', detail: 'The argument may assume that actively sacrificing someone is equivalent to allowing an equal harm to occur.', refs: ['double-effect'] },
  { re: /sacrific|one person|the few/i, title: 'Individuals can be outweighed', detail: 'It assumes that the claims of one person can be overridden by the aggregate claims of others — exactly what rights theorists deny.', refs: ['rights', 'p-tj-inviolability'] },
  { re: /\bnatur(e|al)\b/i, title: 'What is natural is good', detail: 'An appeal to nature may be doing normative work without being defended.', refs: ['natural-law', 'is-ought'] },
  { re: /if everyone|universal|everybody did/i, title: 'Universalization is the right test', detail: 'The argument assumes that what could not be done by everyone may not be done by anyone.', refs: ['universalizability'] },
  { re: /\bfree|choice|choose|chose/i, title: 'The agent could have done otherwise', detail: 'Claims about choice and responsibility may presuppose a contested view of free will.', refs: ['free-will'] },
  { re: /agree|consent|contract|would choose|would accept/i, title: 'Hypothetical agreement has authority', detail: 'The argument assumes that what people would agree to under idealized conditions binds actual people.', refs: ['original-position'] },
  { re: /\bgod\b|divine/i, title: 'Theistic premises', detail: 'Some steps may depend on the existence or will of God, which a secular reader will not grant.', refs: ['five-ways'] },
  { re: /\bstate\b|government|\blaw\b|legal/i, title: 'Legitimate authority', detail: 'It may assume that the state has legitimate authority to act — which political philosophers dispute.', refs: ['liberalism'] },
  { re: /\bi exist|i think|thinking/i, title: 'Thoughts require a thinker', detail: 'The move from thinking to a self who thinks is itself an assumption.', refs: ['cogito'] },
  { re: /happiness is|pleasure is|only thing/i, title: 'Monism about value', detail: 'It may assume there is only one ultimate value (e.g. happiness), rather than several that can conflict.', refs: ['happiness'] },
  { re: /\blie|lying|deceiv|truth/i, title: 'Lying and misleading are morally equivalent', detail: 'Many theorists distinguish outright lies from misleading truths or silence — the argument may run them together.', refs: ['lying'] },
]

export function analyzeArgument(arg: Argument): ArgumentAnalysis {
  const nodes = arg.nodes
  const core = nodes.filter((n) => !n.target)
  const attachments = nodes.filter((n) => n.target)
  const premises = core.filter((n) => n.type === 'premise' || n.type === 'claim')
  const conclusions = core.filter((n) => n.type === 'conclusion')
  const inferences = core.filter((n) => n.type === 'inference')
  const allText = nodes.map((n) => n.text).join(' ')
  const detected = [...new Set([...arg.concepts, ...detectConcepts(allText, 10)])]
  const mentioned = detectPhilosophers(allText)

  const unsupported: Finding[] = []
  const gaps: Finding[] = []
  const ambiguities: Finding[] = []
  const assumptions: Finding[] = []
  const objections: Finding[] = []
  const counterarguments: Finding[] = []

  // ---------- empty nodes
  const empty = nodes.filter((n) => !n.text.trim())
  if (empty.length) {
    gaps.push({
      id: 'empty',
      title: `${empty.length} empty ${empty.length === 1 ? 'node' : 'nodes'}`,
      detail: 'Some cards have no content yet. Analysis works best once every step is written out in a full sentence.',
      nodeIds: empty.map((n) => n.id),
    })
  }

  // ---------- unsupported premises
  for (const p of premises) {
    if (!p.text.trim()) continue
    const grounded = attachments.some((a) => a.target === p.id && ['evidence', 'definition', 'rebuttal'].includes(a.type))
    const supportedBy = arg.links.some((l) => l.to === p.id && nodes.find((n) => n.id === l.from)?.type === 'premise')
    const challenged = attachments.filter((a) => a.target === p.id && (a.type === 'objection' || a.type === 'counter'))
    if (grounded || supportedBy) continue
    const normative = NORMATIVE.test(p.text)
    unsupported.push({
      id: `u-${p.id}`,
      title: `${label(p, core)} stands without support`,
      detail: normative
        ? `“${quoteShort(p.text)}” is a normative claim, and nothing in the map supports it. That can be legitimate — every argument starts somewhere — but anyone who rejects it can reject the whole argument.`
        : `“${quoteShort(p.text)}” has no evidence, definition, or sub-argument attached.${challenged.length ? ' It is also being challenged, which makes support more urgent.' : ''}`,
      question: normative ? 'Why should someone who does not already agree accept this? What would you point to?' : 'What evidence or source would make this premise hard to deny?',
      nodeIds: [p.id],
    })
  }

  // ---------- logical gaps
  const premiseStems = new Set<string>()
  for (const n of [...premises, ...inferences]) for (const s of contentStems(n.text)) premiseStems.add(s)
  for (const c of conclusions) {
    if (!c.text.trim()) continue
    const words = contentWords(c.text.replace(/^therefore,?/i, ''))
    const newTerms = words.filter((w) => !premiseStems.has(stem(w)) && w !== 'therefore')
    if (newTerms.length) {
      gaps.push({
        id: `g-new-${c.id}`,
        title: 'The conclusion introduces new terms',
        detail: `The conclusion mentions ${newTerms
          .slice(0, 4)
          .map((w) => `“${w}”`)
          .join(', ')}, which ${newTerms.length === 1 ? 'does' : 'do'} not appear in any premise. In a valid argument, everything in the conclusion should be connected to something the premises establish.`,
        question: `What premise links ${newTerms.slice(0, 2).map((w) => `“${w}”`).join(' and ')} to the rest of the argument?`,
        nodeIds: [c.id],
      })
    }
    const conclusionNormative = NORMATIVE.test(c.text)
    const anyNormativePremise = premises.some((p) => NORMATIVE.test(p.text))
    if (conclusionNormative && !anyNormativePremise && premises.length) {
      gaps.push({
        id: `g-isought-${c.id}`,
        title: 'From “is” to “ought”',
        detail: 'The conclusion is normative, but every premise appears purely descriptive. Hume argued that no set of factual premises alone entails an ought.',
        question: 'Which premise states the value or principle that gets you to the conclusion?',
        nodeIds: [c.id],
        refs: ['is-ought', 'hume'],
      })
    }
    for (const p of premises) {
      const a = contentStems(p.text)
      const b = contentStems(c.text)
      if (a.size < 3 || b.size < 3) continue
      const inter = [...a].filter((x) => b.has(x)).length
      const jac = inter / new Set([...a, ...b]).size
      if (jac > 0.6) {
        gaps.push({
          id: `g-circ-${p.id}`,
          title: 'Possible circularity',
          detail: `${label(p, core)} and the conclusion say nearly the same thing. If the premise simply restates the conclusion, the argument may beg the question.`,
          question: 'Would someone who doubts the conclusion have any independent reason to accept this premise?',
          nodeIds: [p.id, c.id],
        })
      }
    }
    if (/\bsometimes\b/i.test(c.text) && premises.every((p) => !/\bif\b|\bwhen\b|\bsome\b|\bcan\b/i.test(p.text))) {
      gaps.push({
        id: `g-scope-${c.id}`,
        title: 'Scope shift',
        detail: 'The conclusion is limited (“sometimes”), but the premises are stated generally. What picks out the cases where the conclusion holds?',
        nodeIds: [c.id],
      })
    }
  }
  if (premises.length >= 2 && !inferences.length) {
    gaps.push({
      id: 'g-inference',
      title: 'Implicit inference',
      detail: 'Several premises lead to the conclusion, but no inference step says how they combine. Making it explicit often reveals a missing premise.',
      question: 'Can you write the step that connects your premises: “If … and …, then …”?',
    })
  }
  const orphans = core.filter((n) => !arg.links.some((l) => l.from === n.id || l.to === n.id))
  if (orphans.length && core.length > 1) {
    gaps.push({
      id: 'g-orphan',
      title: 'Disconnected steps',
      detail: `${orphans.map((o) => label(o, core)).join(', ')} ${orphans.length === 1 ? 'is' : 'are'} not connected to the rest of the argument.`,
      nodeIds: orphans.map((o) => o.id),
    })
  }
  if (!conclusions.length) {
    gaps.push({ id: 'g-noconc', title: 'No conclusion yet', detail: 'Add a conclusion node so the argument has somewhere to arrive.' })
  }

  // ---------- ambiguities
  const termNodes = new Map<string, string[]>()
  for (const n of nodes) {
    for (const w of new Set(tokens(n.text))) {
      if (VAGUE_TERMS[w]) termNodes.set(w, [...(termNodes.get(w) ?? []), n.id])
    }
  }
  const sortedTerms = [...termNodes.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 5)
  for (const [term, ids] of sortedTerms) {
    const defined = attachments.some((a) => a.type === 'definition' && a.text.toLowerCase().includes(term))
    ambiguities.push({
      id: `a-${term}`,
      title: `“${term}”${defined ? ' (defined)' : ''}`,
      detail: defined
        ? `You have attached a definition for “${term}”. Check that every node uses it in exactly that sense.`
        : `Does “${term}” mean ${VAGUE_TERMS[term]}${ids.length > 1 ? ` It appears in ${ids.length} places — if its meaning shifts between them, the argument equivocates.` : ''}`,
      nodeIds: ids,
    })
  }
  for (const c of [...conclusions, ...core.filter((n) => n.type === 'claim')]) {
    for (const w of new Set(tokens(c.text))) {
      if (QUANTIFIERS[w] && ['sometimes', 'always', 'never', 'all', 'every', 'everyone', 'most'].includes(w)) {
        ambiguities.push({ id: `q-${c.id}-${w}`, title: `Quantifier: “${w}”`, detail: QUANTIFIERS[w], nodeIds: [c.id] })
      }
    }
  }

  // ---------- hidden assumptions
  const madeExplicit = attachments.filter((a) => a.type === 'assumption')
  for (const a of madeExplicit) {
    assumptions.push({ id: `ax-${a.id}`, title: 'Already explicit', detail: `You have surfaced: “${quoteShort(a.text, 110)}”. Is it defended anywhere, or simply granted?`, nodeIds: [a.id] })
  }
  const seenRules = new Set<string>()
  for (const rule of ASSUMPTION_RULES) {
    const hits = core.filter((n) => rule.re.test(n.text))
    if (!hits.length || seenRules.has(rule.title)) continue
    seenRules.add(rule.title)
    assumptions.push({ id: `as-${assumptions.length}`, title: rule.title, detail: rule.detail, nodeIds: hits.map((h) => h.id), refs: rule.refs })
  }
  if (!assumptions.length) {
    assumptions.push({
      id: 'as-generic',
      title: 'What must be true that you have not said?',
      detail: 'No common hidden assumptions were detected. Try the “denial test”: for each step, imagine a thoughtful person who denies it, and ask what they believe that you don’t.',
    })
  }

  // ---------- objections
  const unanswered = attachments.filter((a) => (a.type === 'objection' || a.type === 'counter') && !attachments.some((r) => r.type === 'rebuttal' && r.target === a.id))
  for (const u of unanswered) {
    objections.push({
      id: `ou-${u.id}`,
      title: 'Unanswered objection in your map',
      detail: `“${quoteShort(u.text, 120)}” has no rebuttal yet. An argument is only as strong as its answer to its best objection.`,
      question: 'Can you respond without simply restating your premise?',
      nodeIds: [u.id],
    })
  }
  const existing = attachments.map((a) => a.text.toLowerCase()).join(' ')
  const used = new Set<string>()
  for (const tpl of OBJECTIONS) {
    if (!tpl.when.some((w) => detected.includes(w))) continue
    if (used.has(tpl.title)) continue
    // Skip if the user already raised this objection themselves.
    const key = tpl.title.toLowerCase().split(' ').filter((w) => w.length > 5)
    if (key.some((k) => existing.includes(k))) continue
    used.add(tpl.title)
    objections.push({ id: `o-${objections.length}`, title: tpl.title, detail: tpl.detail, question: tpl.question, refs: tpl.refs })
    if (objections.length >= 5) break
  }
  if (objections.length === unanswered.length) {
    objections.push({
      id: 'o-generic',
      title: 'Attack the weakest premise',
      detail: 'A skilled opponent will not attack your conclusion directly; they will target whichever premise is least supported.',
      question: unsupported[0] ? `Could they deny “${quoteShort(core.find((n) => n.id === unsupported[0].nodeIds?.[0])?.text ?? '', 70)}”?` : 'Which premise would you attack if you were arguing the other side?',
    })
  }

  // ---------- counterarguments
  const mainConclusion = conclusions[conclusions.length - 1]?.text ?? core[0]?.text ?? ''
  for (const r of RIVAL_SKETCHES) {
    if (!r.when.some((w) => detected.includes(w)) || !mainConclusion.trim()) continue
    const school = schoolById[r.tradition]
    counterarguments.push({
      id: `c-${r.tradition}`,
      title: `A ${school?.name ?? r.tradition} counterargument`,
      detail: 'A sketch of the opposing case, built from a rival tradition. It is deliberately rough: strengthening it yourself is the exercise.',
      sketch: [...r.premises, r.conclusion(mainConclusion)],
      refs: [r.tradition],
    })
    if (counterarguments.length >= 2) break
  }
  if (!counterarguments.length && mainConclusion.trim()) {
    counterarguments.push({
      id: 'c-generic',
      title: 'The mirror argument',
      detail: 'Try building the strongest case for the opposite conclusion using premises your opponent would find obvious.',
      sketch: ['[A principle your opponent finds obvious]', '[A fact about this case that the principle applies to]', negate(mainConclusion)],
    })
  }

  // ---------- traditions
  const traditions = traditionsFor(detected).map(({ school, overlap }) => {
    const s = schoolById[school]
    return {
      school,
      why: `Engages ${overlap.map((o) => o.replace(/-/g, ' ')).join(', ')} — ${s.summary.charAt(0).toLowerCase()}${s.summary.slice(1)}`,
      philosophers: s.members,
    }
  })
  for (const p of mentioned) {
    const ph = philosopherById[p]
    if (!ph) continue
    for (const sc of ph.schools) if (!traditions.some((t) => t.school === sc) && traditions.length < 5) {
      traditions.push({ school: sc, why: `You reference ${ph.name}.`, philosophers: schoolById[sc].members })
    }
  }

  // ---------- overview
  const hasConditional = core.some((n) => /\bif\b.*\bthen\b|\bif\b/i.test(n.text))
  const hasStat = core.some((n) => /\bmost\b|\busually\b|\blikely\b|\bprobabl/i.test(n.text))
  const form = hasStat ? 'Inductive (probabilistic)' : hasConditional ? 'Deductive (conditional)' : 'Deductive (categorical)'
  const overview = `${core.length} steps, ${attachments.length} attached ${attachments.length === 1 ? 'note' : 'notes'}. Reads as ${form.toLowerCase()}. ${
    unsupported.length ? `${unsupported.length} premise${unsupported.length > 1 ? 's' : ''} rest${unsupported.length > 1 ? '' : 's'} on nothing else in the map.` : 'Every premise has some support in the map.'
  } ${unanswered.length ? `${unanswered.length} objection${unanswered.length > 1 ? 's are' : ' is'} still unanswered.` : ''}`.trim()

  const questions = [
    ...unsupported.slice(0, 1).map((u) => u.question!),
    ...gaps.filter((g) => g.question).slice(0, 1).map((g) => g.question!),
    ...objections.filter((o) => o.question).slice(0, 1).map((o) => o.question!),
    'If this argument succeeded, what else would you be committed to believing?',
  ].slice(0, 4)

  return { form, overview, unsupported, gaps, ambiguities, assumptions, objections, counterarguments, traditions, concepts: detected, questions }
}
