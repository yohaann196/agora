// Temporary: runs in GitHub Actions. Fetches the full text of the sources picked in sources.json and
// prints it paragraph by paragraph, so cards can be cut from the exact words. Removed after use.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const UA = 'Mozilla/5.0 (compatible; DebateUtils card research; +https://github.com/yohaann196/debate-utils)'
const CHUNKS = Number(process.env.CHUNKS ?? 1)
const CHUNK = Number(process.env.CHUNK ?? 0)
const MAX = 160000
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const decode = (s) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;|&rsquo;|&lsquo;/g, (m) => (m === '&lsquo;' ? '‘' : '’'))
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '…')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
const text = (html) => decode(html.replace(/<(script|style|sup|figure|table)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()

/** Paragraphs from HTML: <p> and headings, in order. */
function htmlParagraphs(html, scope) {
  let body = html
  if (scope) {
    const i = html.search(scope)
    if (i > -1) body = html.slice(i)
  }
  return [...body.matchAll(/<(p|h2|h3|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((m) => (m[1].toLowerCase().startsWith('h') ? `## ${text(m[2])}` : text(m[2]))).filter((p) => p.length > 1)
}

/** Paragraphs from a PDF via pdftotext: join hard-wrapped lines, undo end-of-line hyphenation. */
function pdfParagraphs(buf) {
  writeFileSync('/tmp/doc.pdf', buf)
  const raw = execFileSync('pdftotext', ['-enc', 'UTF-8', '/tmp/doc.pdf', '-'], { maxBuffer: 64 * 1024 * 1024 }).toString()
  return raw
    .replace(/\f/g, '\n\n')
    .split(/\n\s*\n/)
    .map((p) => p.replace(/-\n(?=[a-z])/g, '').replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 1)
}

async function get(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await sleep(800)
    try {
      const r = await fetch(url, { headers: { 'user-agent': UA, accept: '*/*' }, redirect: 'follow' })
      if (r.ok) return { type: r.headers.get('content-type') ?? '', buf: Buffer.from(await r.arrayBuffer()), url: r.url }
      console.log(`@@WARN ${r.status} ${url}`)
      if (r.status < 500) return null
    } catch (e) {
      console.log(`@@WARN ${e.message} ${url}`)
    }
  }
  return null
}

/** Byline and date from a page's meta tags (for cite lines). */
function pageMeta(html) {
  const metas = [...html.matchAll(/<meta\s+[^>]*(?:name|property)="([^"]+)"[^>]*content="([^"]*)"/gi)].map((m) => [m[1].toLowerCase(), decode(m[2])])
  const pick = (...names) => metas.filter(([k]) => names.includes(k)).map(([, v]) => v)
  const bios = [...html.matchAll(/class="[^"]*(?:author-bio|role|job-title|author-role)[^"]*"[^>]*>([\s\S]{0,400}?)<\//gi)].map((m) => text(m[1])).filter(Boolean)
  const names = [...html.matchAll(/class="[^"]*author-name[^"]*"[^>]*>([\s\S]{0,200}?)<\//gi)].map((m) => text(m[1])).filter(Boolean)
  return { authors: [...new Set([...pick('citation_author', 'author', 'article:author', 'dc.creator'), ...names])].slice(0, 6), date: pick('citation_publication_date', 'article:published_time', 'dc.date', 'citation_date')[0] ?? '', bios: [...new Set(bios)].slice(0, 6) }
}

async function epmcByDoi(doi) {
  const r = await get(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(`DOI:"${doi}"`)}&format=json&resultType=lite`)
  const hit = r && JSON.parse(r.buf.toString()).resultList?.result?.find((x) => x.pmcid)
  return hit?.pmcid ?? null
}

async function epmcText(pmcid) {
  const r = await get(`https://www.ebi.ac.uk/europepmc/webservices/rest/${pmcid}/fullTextXML`)
  if (!r) return null
  const xml = r.buf.toString()
  const front = xml.slice(0, Math.max(0, xml.indexOf('<body')))
  const affs = [...front.matchAll(/<aff\b[^>]*>([\s\S]*?)<\/aff>/g)].map((m) => text(m[1])).slice(0, 6)
  if (affs.length) console.log(`@@META ${JSON.stringify({ affiliations: affs })}`)
  const body = xml.slice(Math.max(0, xml.indexOf('<body')))
  const paras = [...body.matchAll(/<(p|title)\b[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => (m[1] === 'title' ? `## ${text(m[2])}` : text(m[2]))).filter((p) => p.length > 1)
  return paras.length > 5 ? paras : null
}

const usable = (paras) => paras && paras.reduce((n, p) => n + p.length, 0) > 3000

/** Try every open copy of an OpenAlex work: PMC full text, then each OA location. */
async function viaOpenAlex(src) {
  const r = await get(`https://api.openalex.org/works/${src.oa}?mailto=noreply@example.com`)
  if (!r) return null
  const w = JSON.parse(r.buf.toString())
  const doi = (w.doi ?? '').replace('https://doi.org/', '')
  console.log(`@@META ${JSON.stringify({ doi, authors: (w.authorships ?? []).slice(0, 6).map((a) => ({ name: a.author?.display_name, inst: (a.institutions ?? []).map((i) => i.display_name).slice(0, 2) })), date: w.publication_date, venue: w.primary_location?.source?.display_name })}`)
  const pmcid = w.ids?.pmcid?.split('/').pop() || (doi && (await epmcByDoi(doi)))
  if (pmcid) {
    const t = await epmcText(pmcid.startsWith('PMC') ? pmcid : `PMC${pmcid}`)
    if (usable(t)) return t
  }
  const urls = [...new Set((w.locations ?? []).flatMap((l) => [l.pdf_url, l.landing_page_url]).filter(Boolean))].filter((u) => u !== src.url)
  for (const u of urls) {
    const arxiv = u.match(/arxiv\.org\/(?:abs|pdf)\/([\d.]+)/)
    const t = await fromUrl(arxiv ? `https://arxiv.org/pdf/${arxiv[1]}` : u.replace('philpapers.org/archive', 'philarchive.org/archive'), src)
    if (usable(t)) {
      console.log(`@@META ${JSON.stringify({ via: u })}`)
      return t
    }
  }
  return null
}

async function fromUrl(url, src) {
  const r = await get(url)
  if (!r) return null
  if (r.type.includes('pdf') || r.buf.subarray(0, 5).toString() === '%PDF-') return pdfParagraphs(r.buf)
  const html = r.buf.toString()
  const scope = src.kind === 'conv' ? /itemprop="articleBody"|class="[^"]*content-body/ : src.scope ? new RegExp(src.scope) : null
  return htmlParagraphs(html, scope)
}

async function paragraphs(src) {
  if (src.metaOnly) {
    const r = await get(src.url)
    if (r) console.log(`@@META ${JSON.stringify(pageMeta(r.buf.toString()))}`)
    return []
  }
  if (src.oa) {
    const t = await viaOpenAlex(src)
    if (t) return t
  }
  if (src.url && /philpapers\.org\/archive/.test(src.url)) {
    const t = await fromUrl(src.url.replace('philpapers.org', 'philarchive.org'), src)
    if (usable(t)) return t
  }
  if (src.kind === 'epmc') {
    const r = await get(`https://www.ebi.ac.uk/europepmc/webservices/rest/${src.id}/fullTextXML`)
    if (!r) return null
    const xml = r.buf.toString()
    const body = xml.slice(Math.max(0, xml.indexOf('<body')))
    return [...body.matchAll(/<(p|title)\b[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => (m[1] === 'title' ? `## ${text(m[2])}` : text(m[2]))).filter((p) => p.length > 1)
  }
  if (src.kind === 'wiki') {
    const r = await get(`https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&format=json&redirects=1&titles=${encodeURIComponent(src.id)}`)
    if (!r) return null
    const page = Object.values(JSON.parse(r.buf.toString()).query.pages)[0]
    return String(page.extract ?? '').split(/\n+/).map((p) => p.replace(/^=+\s*(.*?)\s*=+$/, '## $1').trim()).filter(Boolean)
  }
  const url = src.kind === 'arxiv' ? `https://arxiv.org/pdf/${src.id}` : src.url
  const r = await get(url)
  if (!r) return null
  if (r.type.includes('pdf') || r.buf.subarray(0, 5).toString() === '%PDF-') return pdfParagraphs(r.buf)
  const html = r.buf.toString()
  if (src.kind === 'conv' || src.kind === 'html') console.log(`@@META ${JSON.stringify(pageMeta(html))}`)
  const scope = src.kind === 'conv' ? /itemprop="articleBody"|class="[^"]*content-body/ : src.scope ? new RegExp(src.scope) : null
  return htmlParagraphs(html, scope)
}

const sources = JSON.parse(readFileSync('scripts/cards/sources.json', 'utf8'))
for (const [i, src] of sources.entries()) {
  if (i % CHUNKS !== CHUNK) continue
  console.log(`@@DOC ${src.key}`)
  try {
    const paras = await paragraphs(src)
    if (!paras) {
      console.log('@@FAIL')
      continue
    }
    let size = 0
    for (const p of paras) {
      size += p.length
      if (size > MAX) break
      console.log(`@@P ${p}`)
    }
    console.log(`@@END ${paras.length} paragraphs`)
  } catch (e) {
    console.log(`@@FAIL ${e.message}`)
  }
}
