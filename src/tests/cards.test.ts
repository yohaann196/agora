import { describe, expect, it } from 'vitest'
import { CARD_COUNTS, CONTENTIONS, TOTAL_CARDS, loadCards } from '../data/cards'
import { cardPlain } from '../features/vault/cards'

describe('card library', () => {
  it('has 50 cards for each of the five contentions per side', async () => {
    const cards = await loadCards()
    expect(TOTAL_CARDS).toBe(500)
    expect(cards).toHaveLength(500)
    for (const c of CONTENTIONS) {
      expect(CARD_COUNTS[c.id]).toBe(50)
      expect(cards.filter((k) => k.contention === c.id)).toHaveLength(50)
    }
    expect(new Set(cards.map((k) => k.id)).size).toBe(500)
  })

  it('cites every card and only highlights read text', async () => {
    for (const card of await loadCards()) {
      expect(card.tag.length).toBeGreaterThan(10)
      expect(card.short).toMatch(/\S+ \d\d$/)
      expect(card.cite.length).toBeGreaterThan(card.short.length)
      expect(card.url).toMatch(/^https:\/\//)
      expect(card.body.some(([, marks]) => marks?.includes('h'))).toBe(true)
      for (const [text, marks] of card.body) {
        expect(text.length).toBeGreaterThan(0)
        if (marks?.includes('h')) expect(marks).toContain('u')
      }
      expect(cardPlain(card)).toContain(card.tag)
    }
  })
})
