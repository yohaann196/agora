import { describe, expect, it } from 'vitest'
import { parseCsv, parseTable } from '../rankings/csv'
import { START, conservative, update, winProbability } from '../rankings/glicko2'
import { computeRankings, identityKey, normalizeName, parseRounds, parseWinner, placement, rankList, type RawTournament } from '../rankings/pipeline'

describe('Glicko-2', () => {
  it('reproduces the worked example in Glickman (2012)', () => {
    const next = update({ r: 1500, rd: 200, vol: 0.06 }, [
      { opponent: { r: 1400, rd: 30, vol: 0.06 }, score: 1 },
      { opponent: { r: 1550, rd: 100, vol: 0.06 }, score: 0 },
      { opponent: { r: 1700, rd: 300, vol: 0.06 }, score: 0 },
    ])
    expect(next.r).toBeCloseTo(1464.06, 1)
    expect(next.rd).toBeCloseTo(151.52, 1)
    expect(next.vol).toBeCloseTo(0.05999, 4)
  })

  it('widens deviation for an idle period', () => {
    expect(update({ r: 1500, rd: 50, vol: 0.06 }, []).rd).toBeGreaterThan(50)
  })

  it('gives even odds to equals and favours the higher rating', () => {
    expect(winProbability(START, START)).toBeCloseTo(0.5, 6)
    expect(winProbability({ r: 1800, rd: 60 }, { r: 1500, rd: 60 })).toBeGreaterThan(0.8)
  })

  it('ranks by rating minus two deviations', () => {
    expect(conservative({ r: 1900, rd: 100 })).toBe(1700)
  })
})

describe('Tabroom CSV parsing', () => {
  it('handles quotes, commas and the tabs Tabroom pads cells with', () => {
    const rows = parseCsv('a,"b, c","say ""hi"""\n1,"2\t\t3",4\n')
    expect(rows).toEqual([
      ['a', 'b, c', 'say "hi"'],
      ['1', '2\t\t3', '4'],
    ])
    expect(parseTable('Aff,"Aff\t\t\tPoints"\nX,29.1').headers).toEqual(['Aff', 'Aff Points'])
  })

  it('reads winners and skips splits, byes and advances', () => {
    expect(parseWinner('Aff')).toBe('aff')
    expect(parseWinner('3-0\t\t\tNEG')).toBe('neg')
    expect(parseWinner('2-1 PRO')).toBe('aff')
    expect(parseWinner('1-1\t\tSPLIT')).toBeNull()
    expect(parseWinner('Concord AB advances')).toBeNull()
    expect(parseWinner('')).toBeNull()
  })

  it('normalizes names and merges multi-school debaters', () => {
    expect(normalizeName('jane  de la cruz')).toBe('Jane De La Cruz')
    expect(identityKey('Harker', 'Ann Lee', [])).toBe('Harker|Ann Lee')
    expect(identityKey('Harker', 'Ann Lee', ['Ann Lee'])).toBe('Ann Lee')
  })
})

const tournament = (slug: string, rounds: Record<string, string>): RawTournament => ({
  slug,
  entries: 'Institution,Location,Entry,Code\nAlpha,TX/US,Ann Able,Alpha AA\nBeta,CA/US,Ben Best,Beta BB\nGamma,NY/US,Cam Cole,Gamma CC\nDelta,FL/US,Dee Dunn,Delta DD\n',
  files: Object.entries(rounds).map(([name, text]) => ({ name, text })),
})

describe('rankings pipeline', () => {
  const t = tournament('fixture', {
    'Tabroom-1.csv': 'Aff,Neg,Judge,Win,Aff Points,Neg Points\nAlpha AA,Beta BB,J,Aff,29.0,28.5\nGamma CC,Delta DD,J,Neg,28.0,28.8\n',
    'Tabroom-2.csv': 'Aff,Neg,Judge,Win,Aff Points,Neg Points\nDelta DD,Alpha AA,J,Neg,28.1,29.4\nBeta BB,Gamma CC,J,Aff,28.6,28.2\nBye,Gamma CC,,Bye,,\n',
    'Tabroom-3.csv': 'Aff,Neg,Judges,Votes,Win\nAlpha AA,Beta BB,"X Y Z","Aff Aff Neg","2-1 AFF"\n',
  })
  const config = { tournaments: ['fixture'], majors: [], multi_team_debaters: [] }
  const result = computeRankings(config, new Map([['fixture', t]]))
  const ranked = rankList(result)

  it('labels prelims and elims', () => {
    expect(parseRounds(t).map((r) => [r.label, r.elim])).toEqual([
      ['Round 1', false],
      ['Round 2', false],
      ['Finals', true],
    ])
  })

  it('ranks the undefeated debater first and records every decided round', () => {
    expect(ranked[0].name).toBe('Ann Able')
    expect(ranked[0].wins).toBe(3)
    expect(ranked[0].losses).toBe(0)
    expect(ranked.reduce((n, d) => n + d.wins, 0)).toBe(5)
    expect(result.field.rounds).toBe(5)
  })

  it('keeps speaker points and ballot counts', () => {
    const ann = result.debaters.find((d) => d.name === 'Ann Able')!
    expect(ann.rounds[0].points).toBe(29)
    expect(ann.rounds[2].decision).toBe('2-1')
    expect(placement(ann.rounds)).toBe('Champion')
  })

  it('counts majors twice', () => {
    const major = computeRankings({ ...config, majors: ['fixture'] }, new Map([['fixture', t]]))
    const annMajor = major.debaters.find((d) => d.name === 'Ann Able')!.rating.r
    const ann = result.debaters.find((d) => d.name === 'Ann Able')!.rating.r
    expect(annMajor).toBeGreaterThan(ann)
  })

  it('labels unnamed elims by bracket size even when the final is missing', () => {
    const rows = (n: number) => 'Aff,Neg,Judges,Votes,Win\n' + Array.from({ length: n }, () => 'Alpha AA,Beta BB,"X","Aff","1-0 AFF"').join('\n')
    const labels = parseRounds(tournament('x', { 'Tabroom-1.csv': rows(16), 'Tabroom-2.csv': rows(16), 'Tabroom-3.csv': rows(8), 'Tabroom-4.csv': rows(4), 'Tabroom-5.csv': rows(2) })).map((r) => r.label)
    expect(labels).toEqual(['Triples', 'Doubles', 'Octafinals', 'Quarterfinals', 'Semifinals'])
    const closeouts = parseRounds(tournament('y', { 'Tabroom-1.csv': rows(15), 'Tabroom-2.csv': rows(7), 'Tabroom-3.csv': rows(3), 'Tabroom-4.csv': rows(1), 'Tabroom-5.csv': rows(0) })).map((r) => r.label)
    expect(closeouts).toEqual(['Doubles', 'Octafinals', 'Quarterfinals', 'Semifinals', 'Finals'])
  })
})
