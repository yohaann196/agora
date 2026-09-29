import { describe, expect, it } from 'vitest'
import { seedDocs, seedFlows, seedSources } from '../data/debateSeeds'
import { passages } from '../data/texts'
import { useTimer } from '../features/flow/timerStore'
import type { Source } from '../model/types'
import { apa, dateLabel, fullCite, mla, shortCite, sourceKey } from '../research/cite'
import { appendNodes, cardNodes, cards, docStats, emptyDoc, outline, plainText } from '../research/docModel'
import { FORMATS, sideFor } from '../research/formats'
import { describeUri, parseInput, rebuildAbstract } from '../research/providers'
import { emptySheet } from '../store'

const src = (patch: Partial<Source>): Source => ({ id: 's', kind: 'source', provider: 'manual', title: 'A Title', authors: [], accessed: Date.UTC(2026, 8, 29, 12), ...patch })

describe('citations', () => {
  it('builds debate short cites', () => {
    expect(shortCite(src({ authors: ['John Rawls'], date: '1971' }))).toBe('Rawls 71')
    expect(shortCite(src({ authors: ['Ann Smith', 'Bo Lee'], date: '2019-04-02' }))).toBe('Smith and Lee 19')
    expect(shortCite(src({ authors: ['A One', 'B Two', 'C Three'], date: '2024' }))).toBe('One et al. 24')
    expect(shortCite(src({ container: 'Wikipedia, The Free Encyclopedia', date: '2026-05-01' }))).toBe('Wikipedia 26')
    expect(shortCite(src({ authors: ['Immanuel Kant'], date: '1785' }))).toBe('Kant 1785')
    expect(shortCite(src({ authors: ['Nobody'] }))).toBe('Nobody n.d.')
  })

  it('writes the full cite line with qualifications and access date', () => {
    const line = fullCite(src({ authors: ['John Rawls'], qualifications: 'Professor at Harvard', title: 'A Theory of Justice', container: 'Harvard University Press', date: '1971', page: '§1' }))
    expect(line).toBe('John Rawls, Professor at Harvard, “A Theory of Justice”, Harvard University Press, 1971, p. §1, accessed 29 Sept. 2026')
  })

  it('formats ISO dates for people, and leaves free text alone', () => {
    expect(dateLabel('2026-05-01')).toBe('1 May 2026')
    expect(dateLabel('2019-11')).toBe('Nov. 2019')
    expect(dateLabel('Spring 1971')).toBe('Spring 1971')
  })

  it('produces MLA and APA', () => {
    const s = src({ authors: ['Ann Smith'], title: 'Dissent', container: 'Ethics', date: '2019', doi: '10.1/x' })
    expect(mla(s)).toBe('Smith, Ann. “Dissent.” Ethics, 2019, https://doi.org/10.1/x.')
    expect(apa(s)).toBe('Smith, A. (2019). Dissent. Ethics. https://doi.org/10.1/x')
  })

  it('dedupes sources by DOI, then URL, then title and authors', () => {
    expect(sourceKey({ doi: '10.1/X', url: 'a', title: 't', authors: [] })).toBe('10.1/x')
    expect(sourceKey({ url: 'https://A', title: 't', authors: [] })).toBe('https://a')
    expect(sourceKey({ title: 'T', authors: ['A'] })).toBe('t|a')
  })
})

describe('speech doc model', () => {
  const rawls = seedSources[0]
  const doc = appendNodes(emptyDoc('speech'), [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '1AC' }] },
    { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Value' }] },
    ...cardNodes('Justice first', rawls, [['Justice is the ', ['u']], ['first virtue', ['u', 'h']], [' of social institutions.']]),
  ])

  it('outlines pockets, hats, blocks and tags', () => {
    expect(outline(doc).map((o) => [o.level, o.title])).toEqual([
      [1, 'Speech'],
      [1, '1AC'],
      [3, 'Value'],
      [4, 'Justice first'],
    ])
  })

  it('reads cards back with tag, cite and highlighted text', () => {
    const [c] = cards(doc)
    expect(c.tag).toBe('Justice first')
    expect(c.cite.startsWith('Rawls 71 — John Rawls')).toBe(true)
    expect(c.body).toBe('Justice is the first virtue of social institutions.')
    expect(c.highlighted).toBe('first virtue')
  })

  it('counts read time from highlighted words only', () => {
    const st = docStats(doc)
    expect(st.cards).toBe(1)
    expect(st.highlightedWords).toBe(2)
  })

  it('appends without leaving the empty starter paragraph behind', () => {
    expect((doc.content ?? []).filter((n) => n.type === 'paragraph' && !plainText(n).trim()).length).toBe(0)
  })
})

describe('seeded evidence is real', () => {
  const corpus = passages.filter((p) => p.source === 'quotation').map((p) => p.body.replace(/[“”]/g, '"'))
  const norm = (s: string) => s.replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim()
  for (const d of seedDocs) {
    for (const c of cards(d.content)) {
      it(`“${c.tag}” is verbatim from the verified corpus`, () => {
        const body = norm(c.body)
        expect(corpus.some((p) => norm(p).includes(body.replace(/^…|…$/g, '')))).toBe(true)
      })
    }
  }
})

describe('research browser input', () => {
  it('routes URLs, wiki links, DOIs and searches', () => {
    expect(parseInput('https://example.org/a')).toBe('https://example.org/a')
    expect(parseInput('example.org')).toBe('https://example.org')
    expect(parseInput('https://en.wikipedia.org/wiki/Civil_disobedience')).toBe('wiki:Civil_disobedience')
    expect(parseInput('wiki:Harm principle')).toMatch(/^wiki:Harm/)
    expect(parseInput('civil disobedience')).toBe('agora:search?q=civil%20disobedience')
    expect(parseInput('10.1086/291014')).toMatch(/^agora:search\?q=10\.1086/)
  })

  it('names pages for tabs', () => {
    expect(describeUri('wiki:Civil_disobedience')).toBe('Civil disobedience')
    expect(describeUri('agora:new')).toBe('New tab')
  })

  it('rebuilds OpenAlex abstracts from the inverted index', () => {
    expect(rebuildAbstract({ world: [1], Hello: [0], again: [3], 'the': [2] })).toBe('Hello world the again')
    expect(rebuildAbstract(null)).toBe('')
  })
})

describe('flows and the round timer', () => {
  it('gives each format its speech columns', () => {
    expect(emptySheet('ld', 'AC').columns).toHaveLength(5)
    expect(emptySheet('policy', 'Case').columns).toHaveLength(7)
    expect(emptySheet('pf', 'Pro').columns).toHaveLength(8)
    for (const f of seedFlows) for (const sh of f.sheets) expect(sh.columns).toHaveLength(FORMATS[f.format].flowColumns.length)
  })

  it('swaps sides in PF when Con speaks first', () => {
    expect(sideFor('pf', 'aff', false)).toBe('neg')
    expect(sideFor('ld', 'aff', false)).toBe('aff')
  })

  it('runs one clock at a time', () => {
    const t = useTimer.getState()
    t.setFormat('policy')
    useTimer.getState().start()
    expect(useTimer.getState().running).toBe(true)
    useTimer.getState().togglePrep('neg')
    expect(useTimer.getState().running).toBe(false)
    expect(useTimer.getState().prepRunning).toBe('neg')
    useTimer.getState().start()
    expect(useTimer.getState().prepRunning).toBe(null)
    useTimer.getState().pause()
    useTimer.getState().setMinutes('1ac', 6)
    useTimer.getState().reset()
    expect(useTimer.getState().left).toBe(6 * 60000)
  })
})
