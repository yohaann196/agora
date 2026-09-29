import type { FlowFormat } from '../model/types'

export type Side = 'aff' | 'neg' | 'both'

export interface Speech {
  id: string
  label: string
  minutes: number
  side: Side
  cross?: boolean
}

export interface FormatDef {
  id: FlowFormat
  label: string
  short: string
  affLabel: string
  negLabel: string
  prepMinutes: number
  speeches: Speech[]
  /** Speeches that get a column on the flow, in order. */
  flowColumns: { label: string; side: 'aff' | 'neg' }[]
}

/** Common NSDA defaults. Tournaments vary, so every time is editable in the timer. */
export const FORMATS: Record<FlowFormat, FormatDef> = {
  policy: {
    id: 'policy',
    label: 'Policy',
    short: 'CX',
    affLabel: 'Aff',
    negLabel: 'Neg',
    prepMinutes: 8,
    speeches: [
      { id: '1ac', label: '1AC', minutes: 8, side: 'aff' },
      { id: 'cx1', label: 'CX', minutes: 3, side: 'neg', cross: true },
      { id: '1nc', label: '1NC', minutes: 8, side: 'neg' },
      { id: 'cx2', label: 'CX', minutes: 3, side: 'aff', cross: true },
      { id: '2ac', label: '2AC', minutes: 8, side: 'aff' },
      { id: 'cx3', label: 'CX', minutes: 3, side: 'neg', cross: true },
      { id: '2nc', label: '2NC', minutes: 8, side: 'neg' },
      { id: 'cx4', label: 'CX', minutes: 3, side: 'aff', cross: true },
      { id: '1nr', label: '1NR', minutes: 5, side: 'neg' },
      { id: '1ar', label: '1AR', minutes: 5, side: 'aff' },
      { id: '2nr', label: '2NR', minutes: 5, side: 'neg' },
      { id: '2ar', label: '2AR', minutes: 5, side: 'aff' },
    ],
    flowColumns: [
      { label: '1AC', side: 'aff' },
      { label: '1NC', side: 'neg' },
      { label: '2AC', side: 'aff' },
      { label: 'Block', side: 'neg' },
      { label: '1AR', side: 'aff' },
      { label: '2NR', side: 'neg' },
      { label: '2AR', side: 'aff' },
    ],
  },
  ld: {
    id: 'ld',
    label: 'Lincoln–Douglas',
    short: 'LD',
    affLabel: 'Aff',
    negLabel: 'Neg',
    prepMinutes: 4,
    speeches: [
      { id: 'ac', label: 'AC', minutes: 6, side: 'aff' },
      { id: 'cx1', label: 'CX', minutes: 3, side: 'neg', cross: true },
      { id: 'nc', label: 'NC', minutes: 7, side: 'neg' },
      { id: 'cx2', label: 'CX', minutes: 3, side: 'aff', cross: true },
      { id: '1ar', label: '1AR', minutes: 4, side: 'aff' },
      { id: 'nr', label: 'NR', minutes: 6, side: 'neg' },
      { id: '2ar', label: '2AR', minutes: 3, side: 'aff' },
    ],
    flowColumns: [
      { label: 'AC', side: 'aff' },
      { label: 'NC', side: 'neg' },
      { label: '1AR', side: 'aff' },
      { label: 'NR', side: 'neg' },
      { label: '2AR', side: 'aff' },
    ],
  },
  pf: {
    id: 'pf',
    label: 'Public Forum',
    short: 'PF',
    affLabel: 'Pro',
    negLabel: 'Con',
    prepMinutes: 3,
    speeches: [
      { id: 'c1', label: '1st Constructive', minutes: 4, side: 'aff' },
      { id: 'c2', label: '2nd Constructive', minutes: 4, side: 'neg' },
      { id: 'x1', label: 'Crossfire', minutes: 3, side: 'both', cross: true },
      { id: 'r1', label: '1st Rebuttal', minutes: 4, side: 'aff' },
      { id: 'r2', label: '2nd Rebuttal', minutes: 4, side: 'neg' },
      { id: 'x2', label: 'Crossfire', minutes: 3, side: 'both', cross: true },
      { id: 's1', label: '1st Summary', minutes: 3, side: 'aff' },
      { id: 's2', label: '2nd Summary', minutes: 3, side: 'neg' },
      { id: 'gx', label: 'Grand Crossfire', minutes: 3, side: 'both', cross: true },
      { id: 'f1', label: '1st Final Focus', minutes: 2, side: 'aff' },
      { id: 'f2', label: '2nd Final Focus', minutes: 2, side: 'neg' },
    ],
    flowColumns: [
      { label: '1st Con', side: 'aff' },
      { label: '2nd Con', side: 'neg' },
      { label: '1st Reb', side: 'aff' },
      { label: '2nd Reb', side: 'neg' },
      { label: '1st Sum', side: 'aff' },
      { label: '2nd Sum', side: 'neg' },
      { label: '1st FF', side: 'aff' },
      { label: '2nd FF', side: 'neg' },
    ],
  },
}

/** In PF the first-speaking team may be either side. */
export function sideFor(format: FlowFormat, side: 'aff' | 'neg', affFirst: boolean): 'aff' | 'neg' {
  if (format !== 'pf' || affFirst) return side
  return side === 'aff' ? 'neg' : 'aff'
}

export const READ_WPM = 280
