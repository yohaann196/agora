// Temporary: runs in GitHub Actions (the dev sandbox has no open web access). Lists candidate
// open-access sources for each contention so real passages can be cut from them. Removed after use.
const UA = 'DebateUtils card research (+https://github.com/yohaann196/debate-utils)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function get(url, type = 'text') {
  await sleep(700)
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

const TOPICS = {
  A1: ['space colonization extinction risk', 'multiplanetary species survival', 'asteroid impact planetary defense', 'existential risk space settlement'],
  A2: ['astronomical waste future generations', 'longtermism space expansion value', 'moral value future lives cosmic', 'space settlement ethics future generations'],
  A3: ['asteroid mining resources economy', 'space-based solar power', 'space resources sustainability earth industry', 'lunar resources in situ utilization'],
  A4: ['space exploration technology spinoffs benefits', 'space program innovation economic benefits', 'space research medical benefits earth', 'space exploration science discovery value'],
  A5: ['space exploration human flourishing meaning', 'overview effect astronauts', 'space settlement political freedom', 'international cooperation space station'],
  N1: ['space exploration spending opportunity cost poverty', 'billionaire space race criticism', 'earth first climate change space colonization', 'space funding priorities public opinion'],
  N2: ['space colonialism settler colonial', 'outer space commons justice', 'space settlement inequality ethics', 'indigenous perspectives space exploration'],
  N3: ['mars mission radiation health risks', 'long duration spaceflight bone loss muscle', 'spaceflight psychological isolation crew', 'reproduction in space microgravity', 'mars habitat feasibility self sufficiency'],
  N4: ['planetary protection contamination mars', 'space debris kessler syndrome', 'rocket launch emissions atmosphere', 'environmental ethics mars terraforming intrinsic value'],
  N5: ['space militarization arms race', 'space expansion existential risk war', 'space governance conflict outer space treaty', 'anti-satellite weapons debris'],
}

for (const [key, queries] of Object.entries(TOPICS)) {
  console.log(`\n######## ${key}`)
  for (const q of queries) {
    console.log(`\n=== ${key} :: ${q}`)
    // arXiv
    const ax = await get(`https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(`"${q.split(' ').slice(0, 3).join(' ')}"`)}+OR+abs:${encodeURIComponent(q)}&max_results=8`)
    for (const e of (ax ?? '').split('<entry>').slice(1)) {
      const t = (tag) => clean(e.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1])
      const authors = [...e.matchAll(/<name>([\s\S]*?)<\/name>/g)].map((m) => m[1]).slice(0, 3).join('; ')
      console.log(`ARXIV|${t('id').replace('http://arxiv.org/abs/', '')}|${t('published').slice(0, 4)}|${authors}|${t('title')}|${t('summary').slice(0, 220)}`)
    }
    // Europe PMC (open access full text)
    const ep = await get(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(`${q} AND OPEN_ACCESS:y AND HAS_FT:y`)}&format=json&pageSize=8&resultType=core`, 'json')
    for (const r of ep?.resultList?.result ?? []) {
      console.log(`EPMC|${r.pmcid}|${r.pubYear}|${clean(r.authorString).slice(0, 80)}|${clean(r.title)}|${clean(r.journalInfo?.journal?.title)}|${r.license ?? ''}|${clean(r.abstractText).slice(0, 200)}`)
    }
    // OpenAlex (open-access versions of journal articles)
    const oa = await get(`https://api.openalex.org/works?search=${encodeURIComponent(q)}&filter=is_oa:true&per-page=8&mailto=noreply@example.com`, 'json')
    for (const w of oa?.results ?? []) {
      const url = w.best_oa_location?.pdf_url ?? w.best_oa_location?.landing_page_url ?? ''
      console.log(`OPENALEX|${w.id?.split('/').pop()}|${w.publication_year}|${(w.authorships ?? []).slice(0, 3).map((a) => a.author?.display_name).join('; ')}|${clean(w.title)}|${clean(w.primary_location?.source?.display_name)}|${w.best_oa_location?.license ?? ''}|${url}|cites=${w.cited_by_count}`)
    }
  }
  // The Conversation (CC BY-ND explainers by academics)
  const conv = await get(`https://theconversation.com/us/search?q=${encodeURIComponent(TOPICS[key][0])}`)
  for (const m of (conv ?? '').matchAll(/<a[^>]+href="(\/[a-z0-9-]+-\d+)"[^>]*>([^<]{15,160})<\/a>/g)) console.log(`CONV|https://theconversation.com${m[1]}|${clean(m[2])}`)
}

// Known public-domain / open documents: check they're reachable.
const KNOWN = [
  'https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/outerspacetreaty.html',
  'https://nickbostrom.com/papers/astronomical-waste/',
  'https://nickbostrom.com/existential/risks',
  'https://www.nasa.gov/wp-content/uploads/2015/01/benefits-stemming-from-space-exploration-2013-tagged.pdf',
  'https://www.whitehouse.gov/wp-content/uploads/2023/04/2023-NSTC-National-Preparedness-Strategy-and-Action-Plan-for-Near-Earth-Object-Hazards-and-Planetary-Defense.pdf',
  'https://www.gao.gov/products/gao-24-106959',
  'https://crsreports.congress.gov/product/pdf/R/R47570',
  'https://nap.nationalacademies.org/read/18801/chapter/1',
  'https://www.nasa.gov/humans-in-space/the-human-body-in-space/',
  'https://www.nasa.gov/general/what-is-planetary-protection/',
  'https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&format=json&titles=Space_colonization',
]
console.log('\n######## KNOWN')
for (const u of KNOWN) {
  await sleep(700)
  try {
    const r = await fetch(u, { headers: { 'user-agent': UA } })
    console.log(`KNOWN|${r.status}|${r.headers.get('content-type')}|${u}`)
  } catch (e) {
    console.log(`KNOWN|ERR ${e.message}|${u}`)
  }
}
