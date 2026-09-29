import { describe, expect, it } from 'vitest'
import { analyzeArgument, negate } from '../ai/analyzeArgument'
import { analyzeEssay } from '../ai/essay'
import { detectFallacies } from '../ai/fallacies'
import { detectConcepts } from '../ai/lexicon'
import { respond } from '../ai/socratic'
import { seedArguments } from '../data/arguments'
import { seedEssays } from '../data/social'

const sacrifice = seedArguments.find((a) => a.id === 'arg-sacrifice')!

describe('argument analysis', () => {
  const a = analyzeArgument(sacrifice)

  it('flags the unsupported normative premise', () => {
    expect(a.unsupported.some((f) => f.nodeIds?.includes('s2'))).toBe(true)
  })

  it('notices terms the conclusion introduces', () => {
    const gap = a.gaps.find((g) => g.title.includes('new terms'))
    expect(gap?.detail).toMatch(/justified/)
  })

  it('flags ambiguity in “happiness” and the “sometimes” quantifier', () => {
    expect(a.ambiguities.some((x) => x.title.includes('happiness'))).toBe(true)
    expect(a.ambiguities.some((x) => x.title.includes('sometimes'))).toBe(true)
  })

  it('surfaces aggregation as a hidden assumption and cites rival traditions', () => {
    expect(a.assumptions.some((x) => /summed|outweighed/.test(x.title))).toBe(true)
    expect(a.objections.some((o) => o.title.includes('separateness'))).toBe(true)
    expect(a.traditions.map((t) => t.school)).toContain('utilitarianism')
  })

  it('reports an unanswered objection without judging the argument', () => {
    expect(a.objections.some((o) => o.id.startsWith('ou-'))).toBe(true)
    expect(JSON.stringify(a)).not.toMatch(/\b(valid argument!|is correct|is incorrect)\b/i)
  })

  it('negates conclusions sensibly', () => {
    expect(negate('Therefore, sacrificing one person can sometimes be morally justified.')).toBe('Therefore, sacrificing one person can never be morally justified.')
  })
})

describe('socratic engine', () => {
  it('asks rather than tells in Socratic mode', () => {
    const r = respond('Lying is always wrong because it destroys trust.', 'socratic', [])
    expect(r.text).toMatch(/\?/)
    expect(r.concepts).toContain('lying')
  })

  it('builds an objection in devil’s advocate mode', () => {
    expect(respond('Utilitarianism is the most rational moral theory.', 'devil', []).text).toMatch(/Objection/)
  })

  it('labels philosopher mode as interpretation', () => {
    expect(respond('It is fine to lie to protect a friend.', 'philosopher', [], 'kant').text).toMatch(/AI interpretation/)
  })

  it('detects common fallacies', () => {
    const names = detectFallacies('Everyone knows this is true. If we allow it, it will eventually lead to disaster.').map((f) => f.name)
    expect(names).toContain('Slippery slope')
    expect(names).toContain('Appeal to popularity')
  })

  it('detects concepts from word stems', () => {
    expect(detectConcepts('Utilitarianism maximizes welfare')).toContain('consequentialism')
  })
})

describe('essay analysis', () => {
  it('reads the seeded draft for reasoning signals', () => {
    const a = analyzeEssay(seedEssays[0])
    const byId = Object.fromEntries(a.dimensions.map((d) => [d.id, d]))
    expect(byId.thesis.signal).not.toBe('missing')
    expect(byId.counter.signal).toBe('missing')
    expect(a.philosophers).toContain('kant')
  })
})
