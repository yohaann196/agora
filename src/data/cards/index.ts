/**
 * The prep vault's card library for the current LD topic: five contentions per side, each backed by
 * cards cut from real, published sources. Card text is always the source's own words; only tags,
 * underlining and highlighting are ours. Cards load lazily, one JSON file per contention.
 */
import type { Segment } from '../../research/docModel'
import meta from './meta.json'

export type CardSide = 'aff' | 'neg'

export interface Contention {
  id: string
  side: CardSide
  n: number
  title: string
  claim: string
}

export interface LibraryCard {
  id: string
  contention: string
  tag: string
  /** "Galtung 69" style short cite. */
  short: string
  /** Qualifications, title, publication and date. */
  cite: string
  url: string
  body: Segment[]
}

export const CONTENTIONS: Contention[] = [
  { id: 'A1', side: 'aff', n: 1, title: 'Survival', claim: 'One planet is a single point of failure; a species on many worlds survives what would end it on one.' },
  { id: 'A2', side: 'aff', n: 2, title: 'The future', claim: 'The number and value of lives that depend on expanding into space dwarfs anything at stake on Earth.' },
  { id: 'A3', side: 'aff', n: 3, title: 'Resources', claim: 'Space resources and energy end scarcity and let heavy industry leave Earth’s biosphere.' },
  { id: 'A4', side: 'aff', n: 4, title: 'Knowledge', claim: 'Space settlement drives science, technology and medicine that benefit everyone on Earth.' },
  { id: 'A5', side: 'aff', n: 5, title: 'Flourishing', claim: 'Exploring and settling space expands human freedom, cooperation and meaning.' },
  { id: 'N1', side: 'neg', n: 1, title: 'Priorities', claim: 'Present suffering on Earth has a stronger moral claim than distant colonies.' },
  { id: 'N2', side: 'neg', n: 2, title: 'Justice', claim: 'Colonization repeats colonial injustice and concentrates power in a few hands.' },
  { id: 'N3', side: 'neg', n: 3, title: 'Human cost', claim: 'Space is lethal to human bodies and minds; settlement can’t be done without sacrificing people.' },
  { id: 'N4', side: 'neg', n: 4, title: 'Environment', claim: 'Colonization contaminates other worlds, fills orbit with debris and harms Earth’s environment.' },
  { id: 'N5', side: 'neg', n: 5, title: 'Conflict', claim: 'Expansion into space breeds militarization and raises the risk of catastrophe.' },
]

/** Card counts per contention, written by scripts/cards/build.ts. */
export const CARD_COUNTS: Record<string, number> = meta.counts
export const TOTAL_CARDS = Object.values(CARD_COUNTS).reduce((a, b) => a + b, 0)

const files = import.meta.glob<{ default: LibraryCard[] }>('./contentions/*.json')

/** Every card in the library, in contention order. */
export async function loadCards(): Promise<LibraryCard[]> {
  const loaded = await Promise.all(CONTENTIONS.map((c) => files[`./contentions/${c.id}.json`]?.().then((m) => m.default) ?? Promise.resolve([])))
  return loaded.flat()
}
