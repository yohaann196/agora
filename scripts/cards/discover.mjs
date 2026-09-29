// Temporary: runs in GitHub Actions (the dev sandbox has no open web access). Lists candidate
// open-access sources for each contention so real passages can be cut from them. Removed after use.
const UA = 'DebateUtils card research (+https://github.com/yohaann196/debate-utils)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function get(url, type = 'text') {
  await sleep(500)
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA, accept: type === 'json' ? 'application/json' : '*/*' } })
    if (!r.ok) return console.log(`  ! ${r.status} ${url}`), null
    return type === 'json' ? await r.json() : await r.text()
  } catch (e) {
    console.log(`  ! ${e.message} ${url}`)
    return null
  }
}
const clean = (s = '') => String(s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()

// Exact phrases, searched in titles and abstracts.
const TOPICS = {
  A1: ['space colonization', 'space settlement', 'multiplanetary', 'existential risk', 'planetary defense', 'asteroid impact hazard', 'human extinction'],
  A2: ['longtermism', 'astronomical waste', 'future generations', 'value of the future', 'space expansion'],
  A3: ['asteroid mining', 'space mining', 'space resources', 'space-based solar power', 'space solar power', 'in-situ resource utilization', 'lunar resources'],
  A4: ['space exploration benefits', 'NASA spinoff', 'space technology transfer', 'space economy', 'space industry innovation'],
  A5: ['overview effect', 'space exploration ethics', 'meaning of space exploration', 'international space station cooperation', 'human spaceflight value'],
  N1: ['space exploration spending', 'space tourism', 'billionaire space', 'space race public', 'earth first'],
  N2: ['space colonialism', 'settler colonialism space', 'outer space commons', 'space law', 'space governance', 'moon treaty'],
  N3: ['space radiation', 'spaceflight health', 'microgravity bone', 'mars mission', 'long-duration spaceflight', 'isolated confined environment', 'human reproduction space'],
  N4: ['planetary protection', 'forward contamination', 'space debris', 'kessler syndrome', 'rocket emissions', 'terraforming ethics', 'mars environmental ethics'],
  N5: ['space militarization', 'space weapons', 'anti-satellite', 'space security', 'space war', 'space arms race'],
}

for (const [key, phrases] of Object.entries(TOPICS)) {
  console.log(`\n######## ${key}`)
  for (const p of phrases) {
    console.log(`\n=== ${key} :: ${p}`)
    const oa = await get(`https://api.openalex.org/works?filter=title_and_abstract.search:${encodeURIComponent(`"${p}"`)},is_oa:true&sort=cited_by_count:desc&per-page=25&mailto=noreply@example.com`, 'json')
    for (const w of oa?.results ?? []) {
      const loc = w.best_oa_location ?? {}
      console.log(`OPENALEX|${w.id?.split('/').pop()}|${w.publication_year}|${(w.authorships ?? []).slice(0, 3).map((a) => a.author?.display_name).join('; ')}|${clean(w.title)}|${clean(w.primary_location?.source?.display_name)}|${loc.license ?? ''}|${loc.pdf_url ?? loc.landing_page_url ?? ''}|cites=${w.cited_by_count}|type=${w.type}`)
    }
    const ax = await get(`https://export.arxiv.org/api/query?search_query=abs:${encodeURIComponent(`"${p}"`)}&max_results=12&sortBy=relevance`)
    for (const e of (ax ?? '').split('<entry>').slice(1)) {
      const t = (tag) => clean(e.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1])
      const authors = [...e.matchAll(/<name>([\s\S]*?)<\/name>/g)].map((m) => m[1]).slice(0, 3).join('; ')
      console.log(`ARXIV|${t('id').replace('http://arxiv.org/abs/', '')}|${t('published').slice(0, 4)}|${authors}|${t('title')}|${t('summary').slice(0, 160)}`)
    }
    const ep = await get(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(`(TITLE_ABS:"${p}") AND OPEN_ACCESS:y AND HAS_FT:y`)}&format=json&pageSize=12&sort=CITED%20desc&resultType=core`, 'json')
    for (const r of ep?.resultList?.result ?? []) {
      console.log(`EPMC|${r.pmcid}|${r.pubYear}|${clean(r.authorString).slice(0, 80)}|${clean(r.title)}|${clean(r.journalInfo?.journal?.title)}|${r.license ?? ''}|cites=${r.citedByCount}`)
    }
    const nt = await get(`https://ntrs.nasa.gov/api/citations/search?q=${encodeURIComponent(`"${p}"`)}&page.size=10`, 'json')
    for (const r of nt?.results ?? []) {
      const pdf = (r.downloads ?? []).find((d) => d.mimetype === 'application/pdf')?.links?.pdf ?? ''
      console.log(`NTRS|${r.id}|${String(r.publications?.[0]?.publicationDate ?? r.submittedDate ?? '').slice(0, 4)}|${(r.authorAffiliations ?? []).slice(0, 3).map((a) => a.meta?.author?.name).join('; ')}|${clean(r.title)}|${r.stiType ?? ''}|${pdf ? `https://ntrs.nasa.gov${pdf}` : ''}`)
    }
  }
  for (const p of phrases.slice(0, 3)) {
    const conv = await get(`https://theconversation.com/us/search?q=${encodeURIComponent(p)}`)
    for (const m of (conv ?? '').matchAll(/<a[^>]+href="(\/[a-z0-9-]+-\d+)"[^>]*>([^<]{15,160})<\/a>/g)) console.log(`CONV|https://theconversation.com${m[1]}|${clean(m[2])}`)
  }
}
