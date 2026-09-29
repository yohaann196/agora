// Temporary: runs in GitHub Actions. Prints cite metadata (full author names, credentials, dates)
// for the card sources whose first fetch didn't carry it. Removed after use.
import { readFileSync } from 'node:fs'

const UA = 'Mozilla/5.0 (compatible; DebateUtils card research; +https://github.com/yohaann196/debate-utils)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function get(url) {
  await sleep(600)
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'follow' })
    return r.ok ? await r.text() : (console.log(`@@WARN ${r.status} ${url}`), null)
  } catch (e) {
    return console.log(`@@WARN ${e.message} ${url}`), null
  }
}
const strip = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()

for (const src of JSON.parse(readFileSync('scripts/cards/sources.json', 'utf8'))) {
  console.log(`@@DOC ${src.key}`)
  if (src.kind === 'epmc') {
    const t = await get(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=PMCID:${src.id}&resultType=core&format=json`)
    const r = t && JSON.parse(t).resultList?.result?.[0]
    if (!r) continue
    const authors = (r.authorList?.author ?? []).slice(0, 6).map((a) => ({ name: a.fullName, first: a.firstName, last: a.lastName, aff: (a.authorAffiliationDetailsList?.authorAffiliation ?? []).map((x) => x.affiliation).slice(0, 2) }))
    console.log(`@@META ${JSON.stringify({ authors, date: r.firstPublicationDate, title: r.title, venue: r.journalInfo?.journal?.title })}`)
  } else {
    const html = await get(src.url)
    if (!html) continue
    const lds = [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1])
    const date = html.match(/"datePublished"\s*:\s*"([^"]+)"/)?.[1] ?? html.match(/<time[^>]*datetime="([^"]+)"/)?.[1] ?? ''
    const title = strip(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? '')
    const people = [...html.matchAll(/<p class="fn author-name">([\s\S]*?)<\/p>|<span class="fn author-name">([\s\S]*?)<\/span>|class="author-name[^"]*"[^>]*>([\s\S]*?)<\//g)].map((m) => strip(m[1] ?? m[2] ?? m[3] ?? ''))
    const roles = [...html.matchAll(/class="role"[^>]*>([\s\S]*?)<\//g)].map((m) => strip(m[1]))
    console.log(`@@META ${JSON.stringify({ date, title, people: [...new Set(people)].slice(0, 6), roles: [...new Set(roles)].slice(0, 6), ld: lds.join(' ').slice(0, 1500) })}`)
  }
}
