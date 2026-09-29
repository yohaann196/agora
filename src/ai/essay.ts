import { philosopherById } from '../data/philosophers'
import type { Essay } from '../model/types'
import { detectFallacies } from './fallacies'
import { VAGUE_TERMS, contentStems, detectConcepts, detectPhilosophers, sentences, tokens, traditionsFor } from './lexicon'

export type Signal = 'missing' | 'developing' | 'solid'

export interface EssayDimension {
  id: string
  label: string
  signal: Signal
  summary: string
  prompts: string[]
}

export interface EssayAnalysis {
  words: number
  dimensions: EssayDimension[]
  concepts: string[]
  philosophers: string[]
  traditions: string[]
}

const DEFINE_RE = /\b(by [a-z\s"'“”]{1,30} i mean|i define|is defined as|refers to|in the sense of|i will use|i take [a-z\s]+ to mean|means that)\b/i
const EVIDENCE_RE = /(“[^”]{8,}”|"[^"]{8,}"|\(\s*[A-Z][^)]{2,40}\d[^)]*\)|\bargues that\b|\bwrites that\b|\baccording to\b|\bin the [A-Z]\w+)/
const INFER_RE = /\b(because|since|therefore|thus|hence|it follows|so that|consequently|given that)\b/i
const HEDGE_RE = /\b(maybe|perhaps|kind of|sort of|i feel|i think that maybe|somewhat|might possibly)\b/i

export function analyzeEssay(e: Essay): EssayAnalysis {
  const by = Object.fromEntries(e.sections.map((s) => [s.id, s.body.trim()]))
  const all = e.sections.map((s) => s.body).join('\n\n')
  const words = tokens(all).length
  const concepts = detectConcepts(all, 8)
  const philosophers = detectPhilosophers(all)
  const traditions = traditionsFor(concepts).map((t) => t.school)
  const dims: EssayDimension[] = []

  // Thesis clarity
  const thesis = by.thesis ?? ''
  const thesisSentences = sentences(thesis)
  {
    const prompts: string[] = []
    let signal: Signal = 'missing'
    let summary = 'No thesis yet. Everything else in the essay depends on it.'
    if (thesis) {
      signal = 'solid'
      summary = 'A clear, contestable thesis.'
      if (thesisSentences.length > 2) {
        signal = 'developing'
        prompts.push('Your thesis runs to several sentences. Can you state it in one?')
      }
      if (HEDGE_RE.test(thesis)) {
        signal = 'developing'
        prompts.push('Hedged language (“maybe”, “I feel”) weakens the claim. What exactly are you willing to defend?')
      }
      if (!INFER_RE.test(thesis)) prompts.push('Consider signalling your main reason in the thesis itself: “X, because Y.”')
      if (!/\b(not|never|only|always|sometimes|should|ought|is|are|cannot|can)\b/i.test(thesis)) {
        signal = 'developing'
        prompts.push('Is this a claim someone could reasonably deny? A thesis should be contestable.')
      }
      if (signal !== 'solid') summary = 'A thesis is present but could be sharper.'
    } else prompts.push('Write one sentence a thoughtful reader could disagree with.')
    dims.push({ id: 'thesis', label: 'Thesis clarity', signal, summary, prompts })
  }

  // Premise support
  {
    const args = [by.arg1, by.arg2].filter(Boolean) as string[]
    const withInference = args.filter((a) => INFER_RE.test(a))
    const prompts: string[] = []
    let signal: Signal = args.length === 0 ? 'missing' : withInference.length === args.length && args.length === 2 ? 'solid' : 'developing'
    if (!args.length) prompts.push('Your argument sections are empty. What is the strongest reason for your thesis?')
    args.forEach((a, i) => {
      if (!INFER_RE.test(a)) prompts.push(`Argument ${i + 1} asserts but doesn’t show its reasoning. Where is the “because”?`)
      if (sentences(a).length < 3) prompts.push(`Argument ${i + 1} is brief. What premise would a sceptic ask you to defend?`)
    })
    const thesisStems = contentStems(thesis)
    const disconnected = args.filter((a) => thesisStems.size && ![...contentStems(a)].some((s) => thesisStems.has(s)))
    if (disconnected.length) {
      signal = 'developing'
      prompts.push('At least one argument shares no key terms with your thesis. Make the connection explicit.')
    }
    dims.push({
      id: 'premises',
      label: 'Premise support',
      signal,
      summary: signal === 'solid' ? 'Both arguments give reasons, not just assertions.' : signal === 'missing' ? 'No supporting arguments yet.' : 'Arguments present; some reasoning is implicit.',
      prompts,
    })
  }

  // Counterarguments
  {
    const counter = by.counter ?? ''
    const rebuttal = by.rebuttal ?? ''
    const prompts: string[] = []
    let signal: Signal = 'missing'
    if (counter) {
      signal = rebuttal ? 'solid' : 'developing'
      if (!rebuttal) prompts.push('You’ve raised an objection but not answered it yet.')
      if (/\b(some people|some might|critics)\b/i.test(counter) && !detectPhilosophers(counter).length)
        prompts.push('Who, specifically, holds this objection? Attributing it to a thinker forces you to state it at full strength.')
      if (rebuttal) {
        const overlap = [...contentStems(rebuttal)].filter((s) => contentStems(counter).has(s)).length
        if (overlap < 2) {
          signal = 'developing'
          prompts.push('Your rebuttal barely engages the objection’s terms. Does it answer the objection, or change the subject?')
        }
      }
    } else prompts.push('What is the strongest objection to your thesis? An essay that ignores it will seem to be hiding from it.')
    dims.push({
      id: 'counter',
      label: 'Counterarguments',
      signal,
      summary: signal === 'solid' ? 'Objection raised and engaged.' : signal === 'missing' ? 'No objection considered yet.' : 'Objection present; engagement could be deeper.',
      prompts,
    })
  }

  // Definitions
  {
    const vague = [...new Set(tokens(all).filter((t) => VAGUE_TERMS[t]))]
    const defined = DEFINE_RE.test(all)
    const prompts: string[] = []
    const signal: Signal = !vague.length ? 'solid' : defined ? (vague.length > 3 ? 'developing' : 'solid') : 'developing'
    if (vague.length && !defined) prompts.push(`Key terms go undefined: ${vague.slice(0, 4).map((v) => `“${v}”`).join(', ')}. Which one could a critic exploit?`)
    for (const v of vague.slice(0, 2)) prompts.push(`“${v}” — do you mean ${VAGUE_TERMS[v]}`)
    dims.push({
      id: 'definitions',
      label: 'Definitions',
      signal: all.trim() ? signal : 'missing',
      summary: defined ? 'You define at least one term explicitly.' : vague.length ? 'Loaded terms used without definition.' : 'No obviously ambiguous terms.',
      prompts,
    })
  }

  // Logical consistency
  {
    const prompts: string[] = []
    let signal: Signal = all.trim() ? 'solid' : 'missing'
    const lower = all.toLowerCase()
    for (const t of ['justified', 'wrong', 'permissible', 'right']) {
      if (new RegExp(`\\balways ${t}\\b`).test(lower) && new RegExp(`\\b(sometimes|not always) ${t}\\b`).test(lower)) {
        signal = 'developing'
        prompts.push(`You claim something is both “always” and “sometimes” ${t}. Is that a deliberate qualification?`)
      }
    }
    const conclusion = by.conclusion ?? ''
    if (thesis && conclusion) {
      const ts = contentStems(thesis)
      const shared = [...contentStems(conclusion)].filter((s) => ts.has(s)).length
      if (shared < 2) {
        signal = 'developing'
        prompts.push('Your conclusion and thesis share few key terms. Does the essay end where it said it would?')
      }
    } else if (thesis && !conclusion) prompts.push('No conclusion yet — it should return to the thesis in light of the objection.')
    const fallacies = detectFallacies(all)
    if (fallacies.length) {
      signal = 'developing'
      for (const f of fallacies.slice(0, 2)) prompts.push(`Possible ${f.name.toLowerCase()}: “${f.excerpt.slice(0, 70)}…”`)
    }
    dims.push({ id: 'consistency', label: 'Logical consistency', signal, summary: signal === 'solid' ? 'No tensions detected.' : signal === 'missing' ? 'Nothing to check yet.' : 'Some tensions to review.', prompts })
  }

  // Evidence
  {
    const evidence = all.match(new RegExp(EVIDENCE_RE.source, 'g')) ?? []
    const prompts: string[] = []
    const signal: Signal = evidence.length >= 2 || (evidence.length >= 1 && philosophers.length) ? 'solid' : philosophers.length || evidence.length ? 'developing' : 'missing'
    if (!evidence.length) prompts.push('No quotations or citations yet. Where does your reading of the text come from?')
    if (philosophers.length && !evidence.length) prompts.push(`You mention ${philosophers.map((p) => philosopherById[p].name).join(', ')} — anchor your reading with a cited passage.`)
    prompts.push('Distinguish what a text says from your interpretation of it.')
    dims.push({
      id: 'evidence',
      label: 'Evidence',
      signal,
      summary: signal === 'solid' ? 'Claims are anchored in texts.' : signal === 'missing' ? 'No textual evidence yet.' : 'Some anchoring; more would help.',
      prompts,
    })
  }

  // Philosophical context
  {
    const prompts: string[] = []
    const signal: Signal = traditions.length >= 2 && philosophers.length >= 2 ? 'solid' : concepts.length ? 'developing' : all.trim() ? 'developing' : 'missing'
    if (traditions.length === 1) prompts.push('Only one tradition is in view. How would a rival framework read your thesis?')
    if (!philosophers.length) prompts.push('No philosophers named. Which thinker is closest to your position — and which is furthest?')
    dims.push({
      id: 'context',
      label: 'Philosophical context',
      signal,
      summary: concepts.length ? `Engages ${concepts.length} concept${concepts.length > 1 ? 's' : ''} across ${traditions.length || 0} tradition${traditions.length === 1 ? '' : 's'}.` : 'Not yet situated in a tradition.',
      prompts,
    })
  }

  return { words, dimensions: dims, concepts, philosophers, traditions }
}
