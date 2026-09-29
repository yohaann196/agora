import { concepts } from '../data/concepts'
import { philosophers } from '../data/philosophers'
import { schools } from '../data/schools'

export const STOPWORDS = new Set(
  `a an the and or but if then so therefore thus hence because since of to in on at by for with from as is are was were be been being it its this that these those there their they them we our you your i me my he she his her him not no can could should would may might must will shall do does did doing have has had than which who whom what when where why how all any each every some such only own same other into about over under again further once very just also more most less much many one ones sometimes always never often morally moral`.split(
    /\s+/,
  ),
)

// Words that are grammatical but carry philosophical load — kept out of STOPWORDS
// for gap detection purposes, but not counted as "content" either.
const WEAK = new Set(['person', 'people', 'thing', 'things', 'way', 'someone', 'something', 'action', 'actions', 'act', 'acts'])

export function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .split(/[^a-z']+/)
    .filter(Boolean)
}

export function stem(w: string) {
  return w
    .replace(/'s$/, '')
    .replace(/(ies)$/, 'y')
    .replace(/(ing|ed|es|s|ly|ness|ment|ful|al)$/, '')
    .slice(0, 7)
}

export function contentStems(text: string, includeWeak = false): Set<string> {
  return new Set(
    tokens(text)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w) && (includeWeak || !WEAK.has(w)))
      .map(stem),
  )
}

export function contentWords(text: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const w of tokens(text)) {
    if (w.length <= 2 || STOPWORDS.has(w) || WEAK.has(w)) continue
    const s = stem(w)
    if (seen.has(s)) continue
    seen.add(s)
    out.push(w)
  }
  return out
}

/** Find concepts mentioned in free text via their keyword lists. */
export function detectConcepts(text: string, limit = 8): string[] {
  const t = ' ' + text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ') + ' '
  const scored: [string, number][] = []
  for (const c of concepts) {
    let score = 0
    for (const k of [c.name.toLowerCase(), ...c.keywords]) {
      const kw = k.toLowerCase()
      const exact = t.includes(' ' + kw + ' ') || t.includes(' ' + kw + 's ')
      // Single long keywords also match as word prefixes: "utilitarian" → "utilitarianism".
      const prefix = !exact && !kw.includes(' ') && kw.length >= 6 && t.includes(' ' + kw)
      if (exact || prefix) score += kw.includes(' ') ? 3 : exact ? 1.4 : 1
    }
    if (score > 0) scored.push([c.id, score])
  }
  return scored.sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id]) => id)
}

const PHILOSOPHER_ALIASES: Record<string, string[]> = {
  socrates: ['socrates', 'socratic'],
  plato: ['plato', 'platonic'],
  aristotle: ['aristotle', 'aristotelian'],
  augustine: ['augustine'],
  aquinas: ['aquinas', 'thomist'],
  descartes: ['descartes', 'cartesian'],
  hume: ['hume', 'humean'],
  kant: ['kant', 'kantian'],
  mill: ['mill', 'millian'],
  nietzsche: ['nietzsche', 'nietzschean'],
  marx: ['marx', 'marxist', 'marxism'],
  rawls: ['rawls', 'rawlsian'],
  sartre: ['sartre', 'sartrean'],
  beauvoir: ['beauvoir'],
}

export function detectPhilosophers(text: string): string[] {
  const t = ' ' + text.toLowerCase().replace(/[^a-z]+/g, ' ') + ' '
  return philosophers.filter((p) => (PHILOSOPHER_ALIASES[p.id] ?? []).some((a) => t.includes(' ' + a))).map((p) => p.id)
}

/** Schools whose central concepts overlap with the detected concepts. */
export function traditionsFor(conceptIds: string[]): { school: string; overlap: string[] }[] {
  return schools
    .map((s) => ({ school: s.id, overlap: s.concepts.filter((c) => conceptIds.includes(c)) }))
    .filter((x) => x.overlap.length > 0)
    .sort((a, b) => b.overlap.length - a.overlap.length)
    .slice(0, 4)
}

/** Loaded terms that frequently carry more than one meaning in arguments. */
export const VAGUE_TERMS: Record<string, string> = {
  happiness: 'pleasure and absence of pain (hedonism), preference satisfaction, or objective flourishing (eudaimonia)?',
  happy: 'momentary pleasure, life satisfaction, or flourishing across a whole life?',
  good: 'morally good, good for someone (prudential), or good of its kind (functional)?',
  justified: 'morally permissible, morally required, rationally defensible, or merely excusable?',
  justify: 'show to be permissible, required, or merely understandable?',
  valuable: 'intrinsically valuable (good in itself) or instrumentally valuable (good as a means)?',
  free: 'free from external constraint, able to have done otherwise, or self-governing?',
  freedom: 'negative liberty (non-interference), positive liberty (self-mastery), or metaphysical free will?',
  liberty: 'freedom from interference, or the real capacity to act on one’s choices?',
  right: '“correct” (the right act) or “an entitlement” (a right)?',
  rights: 'legal rights, moral rights, natural rights — and are they absolute or defeasible?',
  natural: 'statistically common, biologically given, or morally proper?',
  harm: 'physical injury, setback to interests, offense, or violation of rights?',
  fair: 'equal treatment, proportional to desert, or agreed under fair conditions?',
  equal: 'equal moral worth, equal treatment, equal opportunity, or equal outcomes?',
  equality: 'equality of welfare, resources, opportunity, or status?',
  moral: 'what a society believes is right (descriptive), or what really is right (normative)?',
  morally: 'according to which moral standard?',
  better: 'better for whom, and by what measure?',
  maximize: 'maximize the total, the average, or the minimum?',
  maximise: 'maximize the total, the average, or the minimum?',
  duty: 'a legal duty, a role obligation, or a moral duty binding on every rational agent?',
  responsible: 'causally responsible, or morally accountable (blameworthy / praiseworthy)?',
  responsibility: 'causal, role, or moral responsibility?',
  nature: 'biological nature, human essence, or “the way things are”?',
  truth: 'correspondence to facts, coherence, or sincerity (truthfulness)?',
  lie: 'asserting a known falsehood, or any intentional deception (including misleading truths)?',
  lying: 'asserting a known falsehood, or any intentional deception (including misleading truths)?',
  sacrifice: 'actively killing, allowing to die, or imposing a cost?',
  society: 'the state, the community, or the sum of all individuals?',
  wrong: 'impermissible, blameworthy, or merely suboptimal?',
  person: 'any human being, a rational agent, or a being with interests?',
  knowledge: 'certainty, justified true belief, or reliable true belief?',
  exist: 'exist as a substance, as a process, or as a concept?',
  power: 'domination over others, capacity to act, or Nietzschean self-overcoming?',
}

export const QUANTIFIERS: Record<string, string> = {
  sometimes: 'The claim is existential (“there is at least one case”). That is easier to defend — but it only needs one example, so what is the example, concretely?',
  always: 'A universal claim can be refuted by a single counterexample. Can you think of one?',
  never: 'A universal negative: one clear exception would defeat it. Is there really none?',
  all: 'Universal quantifier — does it really hold without exception?',
  every: 'Universal quantifier — does it really hold without exception?',
  everyone: 'Universal claim about persons — is there no one who is an exception?',
  nobody: 'Universal negative about persons — one counterexample defeats it.',
  most: 'A statistical claim. What is the evidence, and does “most” support the conclusion you need?',
  can: 'Is this a claim about possibility, permission, or ability?',
  should: 'A normative claim: which premise supplies the “should”?',
  must: 'Is this logical necessity, practical necessity, or moral obligation?',
}

export const NORMATIVE = /\b(should|ought|must|morally|moral|right|wrong|justified|permissible|obligat\w*|duty|good|bad|valuable|better|worse)\b/i

export function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1)
}

export function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length]
}

export function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}

export function quoteShort(s: string, max = 80) {
  const t = s.trim().replace(/\s+/g, ' ')
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t
}
