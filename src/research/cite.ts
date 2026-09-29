import type { Source } from '../model/types'

const MONTHS = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.']

export function yearOf(s: Pick<Source, 'date'>): string | undefined {
  const m = s.date?.match(/(\d{3,4})/)
  return m?.[1]
}

function lastName(full: string) {
  const parts = full.replace(/,.*$/, '').trim().split(/\s+/)
  return parts[parts.length - 1]
}

/** Debate-style short cite: "Rawls 71", "Smith and Lee 19", "Wikipedia 24". */
export function shortCite(s: Source): string {
  const y = yearOf(s)
  const yy = y ? (y.length === 4 && Number(y) >= 1900 ? y.slice(2) : y) : 'n.d.'
  const who =
    s.authors.length === 0
      ? s.container ?? s.title.split(/\s+/).slice(0, 3).join(' ')
      : s.authors.length === 1
        ? lastName(s.authors[0])
        : s.authors.length === 2
          ? `${lastName(s.authors[0])} and ${lastName(s.authors[1])}`
          : `${lastName(s.authors[0])} et al.`
  return `${who} ${yy}`
}

function accessedLabel(ts: number) {
  const d = new Date(ts)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** The full cite line that follows the short cite on a debate card. */
export function fullCite(s: Source): string {
  const parts: string[] = []
  if (s.authors.length) parts.push(s.authors.join(', ') + (s.qualifications ? `, ${s.qualifications}` : ''))
  else if (s.qualifications) parts.push(s.qualifications)
  parts.push(`“${s.title}”`)
  if (s.container) parts.push(s.container)
  if (s.date) parts.push(s.date)
  if (s.page) parts.push(`p. ${s.page}`)
  if (s.doi) parts.push(`doi:${s.doi.replace(/^https?:\/\/doi\.org\//, '')}`)
  if (s.url) parts.push(s.url)
  parts.push(`accessed ${accessedLabel(s.accessed)}`)
  return parts.join(', ')
}

export function mla(s: Source): string {
  const a = s.authors
  const authors =
    a.length === 0 ? '' : a.length === 1 ? invert(a[0]) + '. ' : a.length === 2 ? `${invert(a[0])}, and ${a[1]}. ` : `${invert(a[0])}, et al. `
  const container = s.container ? ` ${s.container},` : ''
  const date = s.date ? ` ${s.date},` : ''
  const loc = s.doi ? ` https://doi.org/${s.doi.replace(/^https?:\/\/doi\.org\//, '')}.` : s.url ? ` ${s.url}.` : ''
  const accessed = s.url ? ` Accessed ${accessedLabel(s.accessed)}.` : ''
  return `${authors}“${s.title}.”${container}${date}${loc}${accessed}`.replace(/,\./g, '.').replace(/\s+/g, ' ').trim()
}

export function apa(s: Source): string {
  const a = s.authors.map((n) => {
    const parts = n.trim().split(/\s+/)
    const last = parts.pop()!
    return `${last}, ${parts.map((p) => p[0] + '.').join(' ')}`.trim()
  })
  const authors = a.length ? (a.length > 1 ? a.slice(0, -1).join(', ') + ', & ' + a[a.length - 1] : a[0]) + ' ' : ''
  const y = yearOf(s) ?? 'n.d.'
  const container = s.container ? ` ${s.container}.` : ''
  const loc = s.doi ? ` https://doi.org/${s.doi.replace(/^https?:\/\/doi\.org\//, '')}` : s.url ? ` ${s.url}` : ''
  return `${authors}(${y}). ${s.title}.${container}${loc}`.replace(/\s+/g, ' ').trim()
}

function invert(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length < 2) return name
  const last = parts.pop()!
  return `${last}, ${parts.join(' ')}`
}

export function sourceKey(s: Pick<Source, 'url' | 'doi' | 'title' | 'authors'>) {
  return (s.doi || s.url || `${s.title}|${s.authors.join(',')}`).toLowerCase()
}
