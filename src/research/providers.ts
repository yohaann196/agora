/**
 * Research providers. Each one is a public API that allows cross-origin requests
 * from a browser, so the Research Browser works on a static host with no server.
 *
 *  - Wikipedia     https://en.wikipedia.org/w/api.php  and  /api/rest_v1
 *  - OpenAlex      https://api.openalex.org            (scholarly works)
 *  - Open Library  https://openlibrary.org             (books)
 *  - Agora corpus  built in, works offline
 */
import { philosopherById } from '../data/philosophers'
import { passages, textById, texts } from '../data/texts'
import type { Source } from '../model/types'

export type ResultKind = 'wiki' | 'paper' | 'book' | 'agora'

export interface SearchResult {
  kind: ResultKind
  uri: string
  title: string
  subtitle: string
  snippet: string
}

export class ProviderError extends Error {
  constructor(
    public provider: string,
    message: string,
  ) {
    super(message)
  }
}

async function getJSON<T>(url: string, provider: string, signal?: AbortSignal): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    throw new ProviderError(provider, `Couldn’t reach ${provider}. Check your connection and try again.`)
  }
  if (!res.ok) throw new ProviderError(provider, `${provider} answered with an error (${res.status}).`)
  return res.json() as Promise<T>
}

const stripTags = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#039;/g, '’').replace(/&lt;/g, '<').replace(/&gt;/g, '>')

/* ------------------------------ Wikipedia ------------------------------ */

const WIKI = 'https://en.wikipedia.org'
export const wikiTitle = (t: string) => t.replace(/ /g, '_')

export async function wikiSearch(q: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const url = `${WIKI}/w/api.php?action=query&list=search&format=json&origin=*&srlimit=8&srprop=snippet|timestamp&srsearch=${encodeURIComponent(q)}`
  const data = await getJSON<{ query?: { search: { title: string; snippet: string; timestamp: string }[] } }>(url, 'Wikipedia', signal)
  return (data.query?.search ?? []).map((r) => ({
    kind: 'wiki',
    uri: `wiki:${wikiTitle(r.title)}`,
    title: r.title,
    subtitle: `Wikipedia · edited ${r.timestamp.slice(0, 10)}`,
    snippet: stripTags(r.snippet) + '…',
  }))
}

export interface WikiArticle {
  title: string
  description?: string
  html: string
  url: string
  lastEdited?: string
}

export async function wikiArticle(title: string, signal?: AbortSignal): Promise<WikiArticle> {
  const t = encodeURIComponent(wikiTitle(title))
  const [summary, htmlRes] = await Promise.all([
    getJSON<{ title: string; description?: string; timestamp?: string; content_urls?: { desktop?: { page?: string } } }>(`${WIKI}/api/rest_v1/page/summary/${t}`, 'Wikipedia', signal),
    fetch(`${WIKI}/api/rest_v1/page/html/${t}`, { signal }).catch((e) => {
      if ((e as Error).name === 'AbortError') throw e
      throw new ProviderError('Wikipedia', 'Couldn’t reach Wikipedia. Check your connection and try again.')
    }),
  ])
  if (!htmlRes.ok) throw new ProviderError('Wikipedia', `Wikipedia couldn’t find “${title.replace(/_/g, ' ')}”.`)
  return {
    title: summary.title,
    description: summary.description,
    html: await htmlRes.text(),
    url: summary.content_urls?.desktop?.page ?? `${WIKI}/wiki/${t}`,
    lastEdited: summary.timestamp,
  }
}

/** Remove anything executable and everything that isn't reading matter. */
export function sanitizeWikiHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('script, style, link, meta, iframe, object, embed, form, noscript, .mw-editsection, sup.reference, .mw-ref, .reference, .navbox, .navbox-styles, .metadata, .ambox, .hatnote, .mw-empty-elt, .reflist, .mw-references-wrap, .sistersitebox, .noprint, .infobox, .shortdescription').forEach((el) => el.remove())
  doc.querySelectorAll('*').forEach((el) => {
    for (const attr of [...el.attributes]) {
      if (attr.name.startsWith('on') || attr.name === 'style' || attr.name === 'srcset' || attr.name === 'about' || attr.name === 'typeof' || attr.name === 'data-mw') el.removeAttribute(attr.name)
    }
  })
  doc.querySelectorAll('a').forEach((a) => {
    const href = a.getAttribute('href') ?? ''
    if (a.getAttribute('rel') === 'mw:WikiLink' || href.startsWith('./')) {
      const target = decodeURIComponent(href.replace(/^\.\//, '').split('#')[0])
      if (target && !target.includes(':')) a.setAttribute('data-wiki', target)
      a.setAttribute('href', '#')
    } else if (/^https?:/.test(href)) {
      a.setAttribute('target', '_blank')
      a.setAttribute('rel', 'noopener noreferrer')
    } else {
      a.removeAttribute('href')
    }
  })
  doc.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src') ?? ''
    if (src.startsWith('//')) img.setAttribute('src', 'https:' + src)
    else if (!/^https:\/\/upload\.wikimedia\.org\//.test(src)) img.remove()
    img.setAttribute('loading', 'lazy')
    img.removeAttribute('width')
    img.removeAttribute('height')
  })
  // Drop the trailing reference-type sections.
  doc.querySelectorAll('section').forEach((sec) => {
    const h = sec.querySelector('h2')?.textContent?.trim().toLowerCase() ?? ''
    if (['references', 'notes', 'further reading', 'external links', 'bibliography', 'sources', 'citations', 'see also'].includes(h)) sec.remove()
  })
  return doc.body.innerHTML
}

export function wikiSource(a: WikiArticle): Omit<Source, 'id' | 'kind' | 'accessed'> {
  return {
    provider: 'wikipedia',
    title: a.title,
    authors: [],
    qualifications: 'Wikipedia contributors',
    container: 'Wikipedia, The Free Encyclopedia',
    date: a.lastEdited ? a.lastEdited.slice(0, 10) : undefined,
    url: a.url,
  }
}

/* ------------------------------ OpenAlex ------------------------------ */

const OPENALEX = 'https://api.openalex.org'

export interface OpenAlexWork {
  id: string
  display_name: string
  publication_year?: number
  publication_date?: string
  doi?: string | null
  cited_by_count?: number
  type?: string
  authorships?: { author: { display_name: string }; institutions?: { display_name: string }[] }[]
  primary_location?: { source?: { display_name?: string } | null; landing_page_url?: string | null } | null
  open_access?: { is_oa?: boolean; oa_url?: string | null }
  abstract_inverted_index?: Record<string, number[]> | null
}

const mailto = (email?: string) => (email ? `&mailto=${encodeURIComponent(email)}` : '')

export function openAlexId(id: string) {
  return id.replace(/^https?:\/\/openalex\.org\//, '')
}

/** OpenAlex stores abstracts as an inverted index; rebuild the running text. */
export function rebuildAbstract(index?: Record<string, number[]> | null): string {
  if (!index) return ''
  const words: string[] = []
  for (const [word, positions] of Object.entries(index)) for (const p of positions) words[p] = word
  return words.filter(Boolean).join(' ')
}

export async function openAlexSearch(q: string, email?: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const url = `${OPENALEX}/works?search=${encodeURIComponent(q)}&per_page=8${mailto(email)}`
  const data = await getJSON<{ results: OpenAlexWork[] }>(url, 'OpenAlex', signal)
  return data.results.map((w) => ({
    kind: 'paper',
    uri: `paper:${openAlexId(w.id)}`,
    title: w.display_name,
    subtitle: [w.authorships?.slice(0, 3).map((a) => a.author.display_name).join(', '), w.publication_year, w.primary_location?.source?.display_name].filter(Boolean).join(' · '),
    snippet: rebuildAbstract(w.abstract_inverted_index).slice(0, 220) || `${w.cited_by_count ?? 0} citations`,
  }))
}

export async function openAlexWork(id: string, email?: string, signal?: AbortSignal): Promise<OpenAlexWork> {
  return getJSON<OpenAlexWork>(`${OPENALEX}/works/${encodeURIComponent(id)}?${mailto(email).slice(1)}`, 'OpenAlex', signal)
}

export function paperSource(w: OpenAlexWork): Omit<Source, 'id' | 'kind' | 'accessed'> {
  const inst = w.authorships?.[0]?.institutions?.[0]?.display_name
  return {
    provider: 'openalex',
    title: w.display_name,
    authors: (w.authorships ?? []).map((a) => a.author.display_name),
    qualifications: inst ? inst : undefined,
    container: w.primary_location?.source?.display_name ?? undefined,
    date: w.publication_date ?? (w.publication_year ? String(w.publication_year) : undefined),
    doi: w.doi ? w.doi.replace(/^https?:\/\/doi\.org\//, '') : undefined,
    url: w.doi ?? w.primary_location?.landing_page_url ?? undefined,
  }
}

/* ------------------------------ Open Library ------------------------------ */

const OL = 'https://openlibrary.org'

export interface OLDoc {
  key: string
  title: string
  author_name?: string[]
  first_publish_year?: number
  publisher?: string[]
  ia?: string[]
  has_fulltext?: boolean
  cover_i?: number
}

const bookCache = new Map<string, OLDoc>()

export async function openLibrarySearch(q: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const url = `${OL}/search.json?q=${encodeURIComponent(q)}&limit=8&fields=key,title,author_name,first_publish_year,publisher,ia,has_fulltext,cover_i`
  const data = await getJSON<{ docs: OLDoc[] }>(url, 'Open Library', signal)
  return data.docs.map((d) => {
    const id = d.key.replace('/works/', '')
    bookCache.set(id, d)
    return {
      kind: 'book',
      uri: `book:${id}`,
      title: d.title,
      subtitle: [d.author_name?.slice(0, 2).join(', '), d.first_publish_year].filter(Boolean).join(' · '),
      snippet: d.has_fulltext ? 'Full text on the Internet Archive' : 'Catalog record',
    }
  })
}

export interface OLWork {
  title: string
  description?: string | { value: string }
  subjects?: string[]
  first_publish_date?: string
}

export async function openLibraryWork(id: string, signal?: AbortSignal): Promise<{ work: OLWork; doc?: OLDoc }> {
  const work = await getJSON<OLWork>(`${OL}/works/${encodeURIComponent(id)}.json`, 'Open Library', signal)
  return { work, doc: bookCache.get(id) }
}

export function bookSource(id: string, work: OLWork, doc?: OLDoc): Omit<Source, 'id' | 'kind' | 'accessed'> {
  return {
    provider: 'openlibrary',
    title: work.title,
    authors: doc?.author_name ?? [],
    container: doc?.publisher?.[0],
    date: doc?.first_publish_year ? String(doc.first_publish_year) : work.first_publish_date,
    url: `${OL}/works/${id}`,
  }
}

/* ------------------------------ Agora corpus ------------------------------ */

export function agoraSearch(q: string): SearchResult[] {
  const t = q.trim().toLowerCase()
  if (!t) return []
  const out: SearchResult[] = []
  for (const w of texts) {
    const author = philosopherById[w.author]
    const hay = `${w.title} ${author.name} ${w.summary} ${w.concepts.join(' ')}`.toLowerCase()
    if (!hay.includes(t) && !t.split(/\s+/).every((x) => hay.includes(x))) continue
    const n = passages.filter((p) => p.textId === w.id && p.source === 'quotation').length
    out.push({ kind: 'agora', uri: `agora:text/${w.id}`, title: w.title, subtitle: `${author.name} · ${w.year} · ${n} verified quotation${n === 1 ? '' : 's'}`, snippet: w.summary })
  }
  for (const p of passages) {
    if (p.source !== 'quotation' || !`${p.body} ${p.context}`.toLowerCase().includes(t)) continue
    const w = textById[p.textId]
    if (out.some((r) => r.uri === `agora:text/${w.id}`)) continue
    out.push({ kind: 'agora', uri: `agora:text/${w.id}`, title: w.title, subtitle: `${philosopherById[p.author].name} · ${p.locator}`, snippet: `“${p.body}”` })
  }
  return out.slice(0, 8)
}

export function agoraSource(textId: string, locator?: string): Omit<Source, 'id' | 'kind' | 'accessed'> {
  const w = textById[textId]
  const a = philosopherById[w.author]
  const p = passages.find((x) => x.textId === textId && x.locator === locator)
  return {
    provider: 'agora',
    title: w.title,
    authors: [a.name],
    qualifications: p?.translation ? `trans. ${p.translation.replace(/^tr\.\s*/, '')}` : undefined,
    date: w.year.replace(/^c\.\s*/, ''),
    page: locator,
  }
}

/* ------------------------------ URIs ------------------------------ */

export function parseInput(input: string): string {
  const v = input.trim()
  if (/^(agora:|wiki:|paper:|book:)/.test(v)) return v
  if (/^https?:\/\//i.test(v)) {
    const wiki = v.match(/^https?:\/\/en\.(?:m\.)?wikipedia\.org\/wiki\/([^?#]+)/)
    if (wiki) return `wiki:${decodeURIComponent(wiki[1])}`
    const doi = v.match(/doi\.org\/(10\.[^\s?#]+)/)
    if (doi) return `agora:search?q=${encodeURIComponent(doi[1])}&src=papers`
    return v
  }
  if (/^[a-z0-9-]+\.[a-z]{2,}(\/|$)/i.test(v)) return `https://${v}`
  if (/^10\.\d{4,9}\//.test(v)) return `agora:search?q=${encodeURIComponent(v)}&src=papers`
  return `agora:search?q=${encodeURIComponent(v)}`
}

export function describeUri(uri: string): string {
  if (uri === 'agora:new') return 'New tab'
  if (uri.startsWith('agora:search')) return `Search: ${new URLSearchParams(uri.split('?')[1]).get('q') ?? ''}`
  if (uri.startsWith('wiki:')) return uri.slice(5).replace(/_/g, ' ')
  if (uri.startsWith('agora:text/')) return textById[uri.slice(11)]?.title ?? 'Agora text'
  if (uri.startsWith('paper:')) return 'Paper'
  if (uri.startsWith('book:')) return 'Book'
  try {
    return new URL(uri).hostname
  } catch {
    return uri
  }
}
