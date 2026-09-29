import { describe, expect, it } from 'vitest'
import { parseCsv, parseTable } from '../rankings/csv'
import { START, conservative, update, winProbability } from '../rankings/glicko2'
import { computeRankings, fromDataset, identityKey, mainPool, normalizeName, parseRounds, parseWinner, periodOfDate, placement, rankList, type RawTournament, type Tournament } from '../rankings/pipeline'
import type { Level } from '../rankings/types'

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
    expect(identityKey('Harker', 'Ann Lee', [])).toBe('harker|Ann Lee')
    expect(identityKey('Cupertino Independent', 'Ann Lee', [])).toBe(identityKey('Cupertino', 'Ann Lee', []))
    expect(identityKey('Danville Area', 'Ann Lee', [])).toBe(identityKey('Danville', 'Ann Lee', []))
    expect(identityKey('Colorado Academy', 'Ann Lee', [])).not.toBe(identityKey('Colorado', 'Ann Lee', []))
    expect(identityKey('Harker', 'Ann Lee', ['Ann Lee'])).toBe('Ann Lee')
  })
})

const tournament = (slug: string, rounds: Record<string, string>): RawTournament => ({
  slug,
  entries: 'Institution,Location,Entry,Code\nAlpha,TX/US,Ann Able,Alpha AA\nBeta,CA/US,Ben Best,Beta BB\nGamma,NY/US,Cam Cole,Gamma CC\nDelta,FL/US,Dee Dunn,Delta DD\n',
  files: Object.entries(rounds).map(([name, text]) => ({ name, text })),
})

const meta = (level: Level = 'circuit', start = '2026-09-01'): Omit<Tournament, 'slug' | 'entries' | 'rounds'> => ({ name: 'Fixture', level, start, end: start, city: '', state: '', tabroomId: null })

describe('rankings pipeline', () => {
  const raw = tournament('fixture', {
    'Tabroom-1.csv': 'Aff,Neg,Judge,Win,Aff Points,Neg Points\nAlpha AA,Beta BB,J,Aff,29.0,28.5\nGamma CC,Delta DD,J,Neg,28.0,28.8\n',
    'Tabroom-2.csv': 'Aff,Neg,Judge,Win,Aff Points,Neg Points\nDelta DD,Alpha AA,J,Neg,28.1,29.4\nBeta BB,Gamma CC,J,Aff,28.6,28.2\nBye,Gamma CC,,Bye,,\n',
    'Tabroom-3.csv': 'Aff,Neg,Judges,Votes,Win\nAlpha AA,Beta BB,"X Y Z","Aff Aff Neg","2-1 AFF"\n',
  })
  const t = fromDataset(raw, meta())
  const result = computeRankings([t])
  const ranked = rankList(result)

  it('labels prelims and elims', () => {
    expect(parseRounds(raw).map((r) => [r.label, r.elim])).toEqual([
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

  it('counts a circuit round double a local round', () => {
    const local = computeRankings([fromDataset(raw, meta('local'))]).debaters.find((d) => d.name === 'Ann Able')!.rating
    const circuit = result.debaters.find((d) => d.name === 'Ann Able')!.rating
    expect(circuit.r).toBeGreaterThan(local.r)
    expect(circuit.rd).toBeLessThan(local.rd)
    // Weight 1 against weight 0.5: the circuit game carries the information of two local games.
    const one = update(START, [{ opponent: START, score: 1, weight: 1 }])
    const halves = update(START, [
      { opponent: START, score: 1, weight: 0.5 },
      { opponent: START, score: 1, weight: 0.5 },
    ])
    expect(halves.r).toBeCloseTo(one.r, 6)
    expect(halves.rd).toBeCloseTo(one.rd, 6)
  })

  it('reads Prelims/ and Elims/ folders, Result columns and School headers', () => {
    const split: RawTournament = {
      slug: 'split',
      entries: 'School,Location,Entry,Code\nAlpha,TX/US,Ann Able,Alpha AA\nBeta,CA/US,Ben Best,Beta BB\n',
      files: [{ name: 'Tabroom-10.csv', text: 'Aff,Neg,Judge,Result,"AffPoints & Ranks","NegPoints & Ranks"\nAlpha AA,Beta BB,J,Neg,"28.5 2","29 1"\n' }],
      elimFiles: [{ name: 'Tabroom-11.csv', text: 'Aff,Neg,Judges,Votes,Result\nBeta BB,Alpha AA,"X Y Z","Aff Aff Aff","3-0 AFF"\n' }],
    }
    const s = fromDataset(split, meta())
    expect(s.rounds.map((r) => [r.label, r.elim])).toEqual([
      ['Round 1', false],
      ['Finals', true],
    ])
    expect(s.entries[0].school).toBe('Alpha')
    expect(s.rounds[0].matches[0]).toMatchObject({ winner: 'neg', affPoints: 28.5, negPoints: 29 })
  })

  it('rates tournaments in date order and follows debaters across them', () => {
    const later = fromDataset({ ...raw, slug: 'later' }, meta('circuit', '2026-10-01'))
    const both = computeRankings([t, later])
    const ann = both.debaters.find((d) => d.name === 'Ann Able')!
    expect(ann.tournaments.size).toBe(2)
    expect(ann.rounds.map((r) => r.t)).toEqual(['fixture', 'fixture', 'fixture', 'later', 'later', 'later'])
  })

  it('matches debaters by Tabroom student id before school and name', () => {
    const a = fromDataset(raw, meta())
    a.entries[0].ids = ['s1']
    const b = fromDataset({ ...raw, slug: 'b' }, meta('circuit', '2026-10-01'))
    b.entries[0] = { ...b.entries[0], school: 'Alpha Prep', ids: ['s1'] }
    const res = computeRankings([a, b])
    expect(res.debaters.filter((d) => d.name === 'Ann Able')).toHaveLength(1)
    expect(res.debaters.find((d) => d.name === 'Ann Able')!.school).toBe('Alpha Prep')
  })

  it('keeps pools that never met out of the national pool', () => {
    const island = fromDataset(
      {
        slug: 'island',
        entries: 'Institution,Location,Entry,Code\nEcho,OR/US,Eve Echo,Echo EE\nFox,OR/US,Fay Fox,Fox FF\n',
        files: [{ name: 'Tabroom-1.csv', text: 'Aff,Neg,Judge,Win\nEcho EE,Fox FF,J,Aff\n' }],
      },
      meta('local', '2026-10-01'),
    )
    const res = computeRankings([t, island])
    const pool = mainPool(res.debaters)
    expect(pool.size).toBe(4)
    const list = rankList(res, { pool, rankable: (d) => pool.has(d.id) })
    expect(list.find((d) => d.name === 'Eve Echo')).toMatchObject({ rank: null, pool: 'local', circuit: false })
    expect(list.find((d) => d.name === 'Ann Able')).toMatchObject({ rank: 1, pool: 'main', circuit: true })
  })

  it('labels unnamed elims by bracket size even when the final is missing', () => {
    const rows = (n: number) => 'Aff,Neg,Judges,Votes,Win\n' + Array.from({ length: n }, () => 'Alpha AA,Beta BB,"X","Aff","1-0 AFF"').join('\n')
    const labels = parseRounds(tournament('x', { 'Tabroom-1.csv': rows(16), 'Tabroom-2.csv': rows(16), 'Tabroom-3.csv': rows(8), 'Tabroom-4.csv': rows(4), 'Tabroom-5.csv': rows(2) })).map((r) => r.label)
    expect(labels).toEqual(['Triples', 'Doubles', 'Octafinals', 'Quarterfinals', 'Semifinals'])
    const closeouts = parseRounds(tournament('y', { 'Tabroom-1.csv': rows(15), 'Tabroom-2.csv': rows(7), 'Tabroom-3.csv': rows(3), 'Tabroom-4.csv': rows(1), 'Tabroom-5.csv': rows(0) })).map((r) => r.label)
    expect(closeouts).toEqual(['Doubles', 'Octafinals', 'Quarterfinals', 'Semifinals', 'Finals'])
  })

  it('assigns topic periods from dates', () => {
    expect(['2026-09-12', '2026-11-01', '2027-01-09', '2027-03-20', '2027-05-01'].map(periodOfDate)).toEqual(['sepoct', 'novdec', 'janfeb', 'marapr', 'mayjun'])
  })
})
