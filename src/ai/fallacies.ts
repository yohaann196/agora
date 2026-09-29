export interface FallacyHit {
  id: string
  name: string
  excerpt: string
  explanation: string
  question: string
}

interface Rule {
  id: string
  name: string
  re: RegExp
  explanation: string
  question: string
}

const RULES: Rule[] = [
  {
    id: 'ad-hominem',
    name: 'Ad hominem',
    re: /\b(idiot|stupid|moron|clueless|ignorant|hypocrite|biased|just a|obviously doesn'?t know|who cares what|of course (he|she|they) would)\b/i,
    explanation: 'Attacking the person making an argument rather than the argument itself. A bad person can still give a good argument.',
    question: 'If someone you admired made exactly the same argument, what would you say against it?',
  },
  {
    id: 'slippery-slope',
    name: 'Slippery slope',
    re: /\b(lead to|leads to|next thing|before you know it|slippery slope|where does it end|eventually)\b/i,
    explanation: 'Claiming a first step will inevitably lead to an extreme outcome, without showing why each step follows.',
    question: 'What mechanism makes each step lead to the next — and where could the chain be stopped?',
  },
  {
    id: 'false-dilemma',
    name: 'False dilemma',
    re: /\beither\b[^.?!]{3,80}\bor\b|\bonly two (options|choices)\b|\byou'?re either\b/i,
    explanation: 'Presenting two options as the only possibilities when others exist.',
    question: 'Is there a third option — or a combination of the two?',
  },
  {
    id: 'hasty-generalization',
    name: 'Hasty generalization',
    re: /\b(everyone|everybody|nobody|no one|all (people|humans|men|women)|always|never)\b/i,
    explanation: 'Drawing a universal conclusion from limited cases. Universal claims can be defeated by a single counterexample.',
    question: 'Can you think of one counterexample? If so, how would you restate the claim?',
  },
  {
    id: 'bandwagon',
    name: 'Appeal to popularity',
    re: /\b(most people (think|believe|agree)|everyone knows|everybody knows|common sense says|it'?s obvious that|the majority)\b/i,
    explanation: 'Treating widespread belief as evidence that a claim is true. Many widely held beliefs have turned out false.',
    question: 'Setting aside how many people believe it, what is the reason to believe it?',
  },
  {
    id: 'authority',
    name: 'Appeal to authority',
    re: /\b(experts (say|agree)|scientists (say|agree)|according to [A-Z]\w+,? (it|this) (is|must)|because [A-Z]\w+ said|as [A-Z]\w+ proved)\b/,
    explanation: 'Citing an authority is fine as evidence, but not as a substitute for the reasoning — especially when the authority is outside their expertise or experts disagree.',
    question: 'What is the argument the authority gives, and would it persuade you without their name attached?',
  },
  {
    id: 'appeal-to-nature',
    name: 'Appeal to nature',
    re: /\b(natural|unnatural|against nature|nature intended)\b/i,
    explanation: 'Assuming that what is natural is good, or unnatural is bad. Disease is natural; medicine is not.',
    question: 'What premise gets you from “natural” to “good”?',
  },
  {
    id: 'tu-quoque',
    name: 'Tu quoque',
    re: /\b(you (also|too) do|you do it too|hypocritical|look who'?s talking|what about when you)\b/i,
    explanation: 'Dismissing a criticism because the critic is guilty of the same thing. Hypocrisy does not make a claim false.',
    question: 'Suppose the critic were perfectly consistent — would the criticism be right?',
  },
  {
    id: 'straw-man',
    name: 'Straw man',
    re: /\b(so you'?re saying|so basically you think|you just want|they think that we should just)\b/i,
    explanation: 'Restating an opponent’s view in a weaker or distorted form, then attacking that version.',
    question: 'Would your opponent accept your restatement of their view as fair?',
  },
  {
    id: 'post-hoc',
    name: 'Post hoc',
    re: /\b(ever since|after [^.]{2,40}(therefore|so|which is why)|right after)\b/i,
    explanation: 'Assuming that because one event followed another, the first caused the second.',
    question: 'What else could explain the sequence? What evidence would show causation, not just sequence?',
  },
  {
    id: 'is-ought',
    name: 'Is–ought leap',
    re: /\b(is|are|has always been|have always)\b[^.?!]{3,60}\b(so|therefore|thus|hence)\b[^.?!]{0,40}\b(should|ought|must)\b/i,
    explanation: 'Moving from a claim about how things are to a claim about how they ought to be, without a normative premise (Hume).',
    question: 'Which premise tells us the fact matters morally?',
  },
  {
    id: 'begging',
    name: 'Begging the question',
    re: /\b(because it is (wrong|right|true)|it'?s wrong because it'?s immoral|it'?s true because|by definition)\b/i,
    explanation: 'Assuming the conclusion in one of the premises. The argument then gives no independent reason to accept it.',
    question: 'What reason would convince someone who does not already accept your conclusion?',
  },
  {
    id: 'emotion',
    name: 'Appeal to emotion',
    re: /\b(imagine how (you|they) would feel|think of the children|heartless|disgusting|outrageous)\b/i,
    explanation: 'Emotions can track morally relevant features — but an emotional reaction alone is not an argument.',
    question: 'What feature of the situation is the emotion responding to, and does that feature justify the conclusion?',
  },
]

export function detectFallacies(text: string): FallacyHit[] {
  const hits: FallacyHit[] = []
  for (const r of RULES) {
    const m = text.match(r.re)
    if (!m) continue
    const idx = m.index ?? 0
    const start = Math.max(0, text.lastIndexOf('.', idx) + 1)
    const endDot = text.indexOf('.', idx + m[0].length)
    const excerpt = text.slice(start, endDot === -1 ? undefined : endDot + 1).trim()
    hits.push({ id: r.id, name: r.name, excerpt: excerpt.length > 160 ? excerpt.slice(0, 157) + '…' : excerpt, explanation: r.explanation, question: r.question })
  }
  return hits
}
