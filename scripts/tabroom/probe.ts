/**
 * One-off probe of Tabroom's public pages, run from GitHub Actions (tabroom.com is not reachable
 * from every dev sandbox). It prints what each candidate source returns so the importer can be
 * written against real responses. Deleted once the importer lands.
 */
const UA = 'Resolved rankings importer (+https://github.com/yohaann196/philOS)'
const BASE = 'https://www.tabroom.com'
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

interface Got { url: string; status: number; type: string; text: string }

async function get(url: string): Promise<Got | null> {
  await sleep(1500)
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'follow' })
    const text = await res.text()
    return { url: res.url, status: res.status, type: res.headers.get('content-type') ?? '', text }
  } catch (e) {
    console.log(`  ! ${url}: ${(e as Error).message}`)
    return null
  }
}

const strip = (html: string) =>
  html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

/** Distinct link shapes (path + parameter names) with one example each. */
function linkShapes(html: string, limit = 40) {
  const shapes = new Map<string, { n: number; ex: string; label: string }>()
  for (const m of html.matchAll(/<a[^>]+href="([^"#]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = m[1].replace(/&amp;/g, '&')
    const [path, q = ''] = href.split('?')
    const key = `${path}?${q.split('&').map((p) => p.split('=')[0]).sort().join('&')}`
    const s = shapes.get(key)
    if (s) s.n++
    else shapes.set(key, { n: 1, ex: href, label: strip(m[2]).slice(0, 60) })
  }
  return [...shapes.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, limit)
}

/** Structure of a JSON value: every path with its type, arrays sampled by their first element. */
function schema(v: unknown, path = '$', depth = 0, out: string[] = []) {
  if (out.length > 400) return out
  if (Array.isArray(v)) {
    out.push(`${path}: array(${v.length})`)
    if (v.length && depth < 8) schema(v[0], `${path}[0]`, depth + 1, out)
  } else if (v && typeof v === 'object') {
    const keys = Object.keys(v)
    out.push(`${path}: object{${keys.length}} ${keys.slice(0, 30).join(',')}`)
    if (depth < 8) for (const k of keys.slice(0, 40)) schema((v as Record<string, unknown>)[k], `${path}.${k}`, depth + 1, out)
  } else out.push(`${path}: ${typeof v} = ${JSON.stringify(v)?.slice(0, 80)}`)
  return out
}

function report(label: string, g: Got | null, opts: { links?: boolean; text?: number } = {}) {
  console.log(`\n==== ${label}`)
  if (!g) return
  console.log(`  ${g.status} ${g.type} ${g.text.length}B -> ${g.url}`)
  const title = g.text.match(/<title>([\s\S]*?)<\/title>/i)?.[1]
  if (title) console.log(`  title: ${strip(title)}`)
  if (g.type.includes('json') || /^\s*[[{]/.test(g.text)) {
    try {
      console.log(schema(JSON.parse(g.text)).map((l) => `  ${l}`).join('\n'))
      return
    } catch {
      // not JSON after all
    }
  }
  if (opts.links !== false) for (const [k, s] of linkShapes(g.text)) console.log(`  link x${s.n} ${k}  e.g. ${s.ex}  "${s.label}"`)
  console.log(`  text: ${strip(g.text).slice(0, opts.text ?? 1500)}`)
}

const ids = (html: string, param: string) => [...new Set([...html.matchAll(new RegExp(`${param}=(\\d+)`, 'g'))].map((m) => m[1]))]

async function main() {
  report('robots.txt', await get(`${BASE}/robots.txt`), { links: false, text: 3000 })
  report('front page', await get(`${BASE}/index/index.mhtml`))
  report('results index', await get(`${BASE}/index/results/index.mhtml`))
  report('results root', await get(`${BASE}/index/results/`))
  report('past tournaments (year)', await get(`${BASE}/index/index.mhtml?year=2026&week=38`))
  report('circuit 6', await get(`${BASE}/index/circuit/index.mhtml?circuit_id=6`))
  report('circuit list', await get(`${BASE}/index/circuits.mhtml`))
  for (const u of [`${BASE}/v1/public/tourns`, `https://api.tabroom.com/v1/public/tourns`, `${BASE}/api/current_tournaments.mhtml`]) report(`api guess ${u}`, await get(u), { text: 600 })

  const search = await get(`${BASE}/index/search.mhtml?search=Stephen+Stewart`)
  report('search Stephen Stewart', search)

  // A dataset round (Grapevine round 1) to learn the round page, its tournament and the CSV export.
  const round = await get(`${BASE}/index/tourn/results/round_results.mhtml?round_id=1565880`)
  report('round_results 1565880 (Grapevine R1)', round, { text: 2500 })
  const tourn = round ? ids(round.text, 'tourn_id')[0] : undefined
  console.log(`\n  grapevine tourn_id: ${tourn}`)

  const tournIds = [tourn, ...(search ? ids(search.text, 'tourn_id').slice(0, 3) : [])].filter(Boolean) as string[]
  for (const id of tournIds) {
    report(`tourn ${id} home`, await get(`${BASE}/index/tourn/index.mhtml?tourn_id=${id}`), { text: 800 })
    const results = await get(`${BASE}/index/tourn/results/index.mhtml?tourn_id=${id}`)
    report(`tourn ${id} results index`, results, { text: 1500 })
    const events = results ? ids(results.text, 'event_id').slice(0, 2) : []
    for (const ev of events) {
      const r = await get(`${BASE}/index/tourn/results/index.mhtml?tourn_id=${id}&event_id=${ev}`)
      report(`tourn ${id} event ${ev} results`, r, { text: 1500 })
    }
    report(`tourn ${id} download_data`, await get(`${BASE}/api/download_data.mhtml?tourn_id=${id}`), { text: 800 })
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
