import { AlertTriangle, BookOpen, ExternalLink, FileQuestion, Globe, Library, Loader2, Newspaper, Scissors, ScrollText } from 'lucide-react'
import { useEffect, useState, type MouseEvent, type ReactNode } from 'react'
import { SourceBadge } from '../../components/ui/primitives'
import { authors } from '../../data/authors'
import { passages, textById } from '../../data/texts'
import { shortCite } from '../../research/cite'
import { cardNodes } from '../../research/docModel'
import {
  ProviderError,
  agoraSearch,
  agoraSource,
  bookSource,
  openAlexSearch,
  openAlexWork,
  openLibrarySearch,
  openLibraryWork,
  paperSource,
  rebuildAbstract,
  sanitizeWikiHtml,
  wikiArticle,
  wikiSearch,
  wikiSource,
  type OLDoc,
  type OLWork,
  type OpenAlexWork,
  type SearchResult,
  type WikiArticle,
} from '../../research/providers'
import { useOS } from '../../store'
import { CutLayer, type SourceDraft } from './CutLayer'

export interface ViewProps {
  uri: string
  go: (uri: string, opts?: { newTab?: boolean }) => void
  setTitle: (t: string) => void
}

/* ------------------------------ helpers ------------------------------ */

type Load<T> = { state: 'loading' } | { state: 'error'; message: string } | { state: 'ready'; data: T }

function useLoad<T>(fn: (signal: AbortSignal) => Promise<T>, deps: unknown[]): [Load<T>, () => void] {
  const [load, setLoad] = useState<Load<T>>({ state: 'loading' })
  const [nonce, setNonce] = useState(0)
  useEffect(() => {
    const ctrl = new AbortController()
    setLoad({ state: 'loading' })
    fn(ctrl.signal)
      .then((data) => !ctrl.signal.aborted && setLoad({ state: 'ready', data }))
      .catch((e: Error) => {
        if (e.name === 'AbortError') return
        setLoad({ state: 'error', message: e instanceof ProviderError ? e.message : 'Something went wrong loading this page.' })
      })
    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])
  return [load, () => setNonce((n) => n + 1)]
}

function Loading({ label }: { label: string }) {
  return (
    <div className="b-loading">
      <Loader2 className="spin" /> {label}
    </div>
  )
}

function Failure({ message, retry, children }: { message: string; retry?: () => void; children?: ReactNode }) {
  return (
    <div className="b-failure caption">
      <AlertTriangle size={16} />
      <div>
        <p>{message}</p>
        {children}
        {retry && (
          <button className="btn sm" onClick={retry} style={{ marginTop: 10 }}>
            Try again
          </button>
        )}
      </div>
    </div>
  )
}

/* ------------------------------ new tab ------------------------------ */

const PICKS = ['Space colonization', 'Existential risk', 'Outer Space Treaty', 'Planetary protection', 'Non-identity problem', 'Longtermism', 'Categorical imperative', 'Harm principle']

export function NewTabView({ go }: ViewProps) {
  const [q, setQ] = useState('')
  const history = useOS((s) => s.history)
  return (
    <div className="nt">
      <div className="nt-hero">
        <div className="nt-sky">
          <p className="display nt-title">What are you looking for?</p>
        </div>
        <form
          className="nt-search"
          onSubmit={(e) => {
            e.preventDefault()
            if (q.trim()) go(`agora:search?q=${encodeURIComponent(q.trim())}`)
          }}
        >
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search encyclopedias, papers, books and the framework library, or paste a URL or DOI" aria-label="Search" />
          <button className="btn primary lg">Search</button>
        </form>
        <div className="chips nt-picks">
          {PICKS.map((p) => (
            <button key={p} className="tag" onClick={() => go(`agora:search?q=${encodeURIComponent(p)}`)}>
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="nt-grid">
        <section className="panel">
          <div className="panel-head"><h3><Scissors /> Cut from print or PDF</h3></div>
          <ManualCut />
        </section>
        <section className="panel">
          <div className="panel-head"><h3>Recently visited</h3></div>
          <div className="nt-history">
            {history.slice(0, 10).map((h) => (
              <button key={h.uri} className="result-row" onClick={() => go(h.uri)}>
                <Globe size={13} />
                <span className="r-text">
                  <span className="r-label">{h.title}</span>
                  <span className="r-sub">{h.uri}</span>
                </span>
              </button>
            ))}
            {!history.length && <p className="dim" style={{ padding: 12, fontFamily: 'var(--font-letter)' }}>Nothing yet. Every page you open is kept here and in the research trail.</p>}
          </div>
        </section>
      </div>
    </div>
  )
}

/** For sources Debate Utils can’t load: books, PDFs, articles behind paywalls. */
export function ManualCut({ initial }: { initial?: Partial<SourceDraft> }) {
  const [f, setF] = useState({
    authors: initial?.authors?.join(', ') ?? '',
    qualifications: initial?.qualifications ?? '',
    title: initial?.title ?? '',
    container: initial?.container ?? '',
    date: initial?.date ?? '',
    page: initial?.page ?? '',
    url: initial?.url ?? '',
    tag: '',
    text: '',
  })
  const docs = useOS((s) => s.docs)
  const target = useOS((s) => s.cutTarget)
  const { addSource, appendToDoc, toast, setCutTarget } = useOS.getState()
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const ready = f.title.trim() && f.tag.trim() && f.text.trim()
  const targetDoc = docs.find((d) => d.id === target) ?? docs[0]
  return (
    <form
      className="manual-cut"
      onSubmit={(e) => {
        e.preventDefault()
        if (!ready || !targetDoc) return
        const id = addSource({
          provider: initial?.provider ?? 'manual',
          title: f.title.trim(),
          authors: f.authors.split(',').map((a) => a.trim()).filter(Boolean),
          qualifications: f.qualifications.trim() || undefined,
          container: f.container.trim() || undefined,
          date: f.date.trim() || undefined,
          page: f.page.trim() || undefined,
          url: f.url.trim() || undefined,
        })
        const src = useOS.getState().sources.find((s) => s.id === id)!
        appendToDoc(targetDoc.id, cardNodes(f.tag.trim(), src, f.text.trim()))
        toast({ title: `Card cut into “${targetDoc.title}”`, body: shortCite(src), tone: 'success' })
        setF({ ...f, tag: '', text: '' })
      }}
    >
      <div className="mc-grid">
        <div className="field"><label htmlFor="mc-a">Author(s)</label><input id="mc-a" className="input" value={f.authors} onChange={set('authors')} placeholder="Martha Nussbaum, …" /></div>
        <div className="field"><label htmlFor="mc-q">Qualifications</label><input id="mc-q" className="input" value={f.qualifications} onChange={set('qualifications')} placeholder="Professor of Law and Ethics, U Chicago" /></div>
        <div className="field span2"><label htmlFor="mc-t">Title</label><input id="mc-t" className="input" value={f.title} onChange={set('title')} placeholder="Article, chapter or book title" /></div>
        <div className="field"><label htmlFor="mc-c">Publication</label><input id="mc-c" className="input" value={f.container} onChange={set('container')} placeholder="Journal or publisher" /></div>
        <div className="field"><label htmlFor="mc-d">Date</label><input id="mc-d" className="input" value={f.date} onChange={set('date')} placeholder="2019" /></div>
        <div className="field"><label htmlFor="mc-p">Page</label><input id="mc-p" className="input" value={f.page} onChange={set('page')} placeholder="112–114" /></div>
        <div className="field"><label htmlFor="mc-u">URL</label><input id="mc-u" className="input" value={f.url} onChange={set('url')} placeholder="https://…" /></div>
        <div className="field span2"><label htmlFor="mc-tag">Tag</label><input id="mc-tag" className="input" value={f.tag} onChange={set('tag')} placeholder="The claim this card proves" /></div>
        <div className="field span2"><label htmlFor="mc-x">Card text</label><textarea id="mc-x" className="textarea serif" rows={4} value={f.text} onChange={set('text')} placeholder="Paste the passage exactly as written." /></div>
      </div>
      <div className="hstack" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <label className="hstack dim" style={{ fontSize: 'var(--fs-11)' }}>
          Into
          <select className="select" style={{ width: 'auto' }} value={targetDoc?.id ?? ''} onChange={(e) => setCutTarget(e.target.value)} aria-label="Target document">
            {docs.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
          </select>
        </label>
        <button className="btn primary" disabled={!ready}><Scissors /> Cut card</button>
      </div>
    </form>
  )
}

/* ------------------------------ search ------------------------------ */

const GROUPS: { kind: SearchResult['kind']; label: string; icon: typeof Globe; src: string }[] = [
  { kind: 'agora', label: 'Framework library', icon: Library, src: 'agora' },
  { kind: 'wiki', label: 'Encyclopedia', icon: Globe, src: 'wiki' },
  { kind: 'paper', label: 'Scholarly papers', icon: Newspaper, src: 'papers' },
  { kind: 'book', label: 'Books', icon: BookOpen, src: 'books' },
]

function ResultGroup({ group, q, go, run }: { group: (typeof GROUPS)[number]; q: string; go: ViewProps['go']; run: (s: AbortSignal) => Promise<SearchResult[]> }) {
  const [load, retry] = useLoad(run, [q])
  const I = group.icon
  const open = (e: MouseEvent, uri: string) => go(uri, { newTab: e.metaKey || e.ctrlKey || e.button === 1 })
  return (
    <section className="res-group">
      <h3 className="res-head"><I size={15} /> {group.label}</h3>
      {load.state === 'loading' && <Loading label={`Searching ${group.label.toLowerCase()}…`} />}
      {load.state === 'error' && <Failure message={load.message} retry={retry} />}
      {load.state === 'ready' && !load.data.length && <p className="dim res-empty">No results.</p>}
      {load.state === 'ready' &&
        load.data.map((r) => (
          <button key={r.uri} className="res-item" onClick={(e) => open(e, r.uri)} onAuxClick={(e) => open(e, r.uri)}>
            <span className="res-title">{r.title}</span>
            <span className="res-sub">{r.subtitle}</span>
            <span className="res-snip">{r.snippet}</span>
          </button>
        ))}
    </section>
  )
}

export function SearchView({ uri, go, setTitle }: ViewProps) {
  const params = new URLSearchParams(uri.split('?')[1])
  const q = params.get('q') ?? ''
  const src = params.get('src')
  const research = useOS((s) => s.settings.research)
  useEffect(() => setTitle(`“${q}”`), [q, setTitle])
  const enabled = GROUPS.filter((g) => (!src || g.src === src) && (g.kind === 'agora' ? research.agora : g.kind === 'wiki' ? research.wikipedia : g.kind === 'paper' ? research.openalex : research.openlibrary))
  const runners: Record<string, (s: AbortSignal) => Promise<SearchResult[]>> = {
    agora: async () => agoraSearch(q),
    wiki: (s) => wikiSearch(q, s),
    paper: (s) => openAlexSearch(q, research.contactEmail, s),
    book: (s) => openLibrarySearch(q, s),
  }
  return (
    <div className="search-view">
      <div className="sv-head">
        <span className="eyebrow">Results for</span>
        <h2 className="display sv-q">{q}</h2>
        <div className="seg" role="group" aria-label="Filter sources">
          <button aria-pressed={!src} onClick={() => go(`agora:search?q=${encodeURIComponent(q)}`)}>All</button>
          {GROUPS.map((g) => (
            <button key={g.src} aria-pressed={src === g.src} onClick={() => go(`agora:search?q=${encodeURIComponent(q)}&src=${g.src}`)}>{g.label}</button>
          ))}
        </div>
      </div>
      <div className={`res-grid ${src ? 'single' : ''}`}>
        {enabled.map((g) => (
          <ResultGroup key={g.kind} group={g} q={q} go={go} run={runners[g.kind]} />
        ))}
        {!enabled.length && <Failure message="All research sources are turned off. Turn them back on in Settings → Research sources." />}
      </div>
    </div>
  )
}

/* ------------------------------ readers ------------------------------ */

function ReaderHead({ kicker, title, meta, links }: { kicker: ReactNode; title: string; meta?: ReactNode; links?: ReactNode }) {
  return (
    <header className="reader-head">
      <div className="eyebrow">{kicker}</div>
      <h1 className="reader-title">{title}</h1>
      {meta && <div className="reader-meta">{meta}</div>}
      {links && <div className="reader-links">{links}</div>}
      <p className="reader-hint letter"><Scissors size={12} /> Select any passage to cut it as a card.</p>
    </header>
  )
}

export function WikiView({ uri, go, setTitle }: ViewProps) {
  const title = decodeURIComponent(uri.slice(5))
  const [load, retry] = useLoad<WikiArticle & { clean: string }>(async (s) => {
    const a = await wikiArticle(title, s)
    return { ...a, clean: sanitizeWikiHtml(a.html) }
  }, [title])
  useEffect(() => {
    if (load.state === 'ready') setTitle(load.data.title)
  }, [load, setTitle])
  if (load.state === 'loading') return <Loading label={`Opening “${title.replace(/_/g, ' ')}” from Wikipedia…`} />
  if (load.state === 'error')
    return (
      <Failure message={load.message} retry={retry}>
        <p className="dim">You can still search the framework library, which works offline.</p>
      </Failure>
    )
  const a = load.data
  const onClick = (e: MouseEvent) => {
    const link = (e.target as HTMLElement).closest('a[data-wiki]') as HTMLAnchorElement | null
    if (!link) return
    e.preventDefault()
    go(`wiki:${link.dataset.wiki}`, { newTab: e.metaKey || e.ctrlKey })
  }
  return (
    <article className="reader">
      <ReaderHead
        kicker={<>Wikipedia · encyclopedia</>}
        title={a.title}
        meta={<>{a.description && <span>{a.description}</span>}{a.lastEdited && <span className="mono">last edited {a.lastEdited.slice(0, 10)}</span>}</>}
        links={<a className="btn sm" href={a.url} target="_blank" rel="noopener noreferrer"><ExternalLink /> Original</a>}
      />
      <p className="reader-caution letter">Encyclopedias are a place to start. For evidence, follow the citations to the underlying sources.</p>
      <CutLayer sourceFor={() => wikiSource(a)}>
        <div className="wiki-body serif" onClick={onClick} dangerouslySetInnerHTML={{ __html: a.clean }} />
      </CutLayer>
    </article>
  )
}

export function PaperView({ uri, setTitle }: ViewProps) {
  const id = uri.slice(6)
  const email = useOS((s) => s.settings.research.contactEmail)
  const [load, retry] = useLoad<OpenAlexWork>((s) => openAlexWork(id, email, s), [id])
  useEffect(() => {
    if (load.state === 'ready') setTitle(load.data.display_name)
  }, [load, setTitle])
  if (load.state === 'loading') return <Loading label="Opening paper from OpenAlex…" />
  if (load.state === 'error') return <Failure message={load.message} retry={retry} />
  const w = load.data
  const abstract = rebuildAbstract(w.abstract_inverted_index)
  const src = paperSource(w)
  return (
    <article className="reader">
      <ReaderHead
        kicker={<>Scholarly work · {w.type ?? 'article'} · via OpenAlex</>}
        title={w.display_name}
        meta={
          <>
            <span>{src.authors.slice(0, 6).join(', ')}{src.authors.length > 6 ? ' et al.' : ''}</span>
            {src.container && <span><em>{src.container}</em></span>}
            {src.date && <span className="mono">{src.date}</span>}
            <span className="mono">{w.cited_by_count ?? 0} citations</span>
          </>
        }
        links={
          <>
            {w.doi && <a className="btn sm" href={w.doi} target="_blank" rel="noopener noreferrer"><ExternalLink /> DOI</a>}
            {w.open_access?.oa_url && <a className="btn sm spot" href={w.open_access.oa_url} target="_blank" rel="noopener noreferrer"><BookOpen /> Open-access full text</a>}
          </>
        }
      />
      {abstract ? (
        <CutLayer sourceFor={() => ({ ...src, note: 'abstract' })}>
          <h2 className="reader-sub">Abstract</h2>
          <p className="reader-p serif">{abstract}</p>
        </CutLayer>
      ) : (
        <p className="dim letter">OpenAlex has no abstract for this work.</p>
      )}
      <section className="panel" style={{ marginTop: 26 }}>
        <div className="panel-head"><h3><Scissors /> Cut from the full text</h3></div>
        <p className="dim" style={{ padding: '12px 14px 0', fontSize: 'var(--fs-12)' }}>Read the paper at the DOI or open-access link, then paste the passage here. The citation is already filled in.</p>
        <ManualCut initial={src} />
      </section>
    </article>
  )
}

export function BookView({ uri, setTitle }: ViewProps) {
  const id = uri.slice(5)
  const [load, retry] = useLoad<{ work: OLWork; doc?: OLDoc }>((s) => openLibraryWork(id, s), [id])
  useEffect(() => {
    if (load.state === 'ready') setTitle(load.data.work.title)
  }, [load, setTitle])
  if (load.state === 'loading') return <Loading label="Opening book record from Open Library…" />
  if (load.state === 'error') return <Failure message={load.message} retry={retry} />
  const { work, doc } = load.data
  const src = bookSource(id, work, doc)
  const desc = typeof work.description === 'string' ? work.description : work.description?.value
  return (
    <article className="reader">
      <ReaderHead
        kicker={<>Book · via Open Library</>}
        title={work.title}
        meta={<>{src.authors.length > 0 && <span>{src.authors.join(', ')}</span>}{src.date && <span className="mono">{src.date}</span>}{src.container && <span>{src.container}</span>}</>}
        links={
          <>
            <a className="btn sm" href={src.url} target="_blank" rel="noopener noreferrer"><ExternalLink /> Open Library</a>
            {doc?.ia?.[0] && <a className="btn sm spot" href={`https://archive.org/details/${doc.ia[0]}`} target="_blank" rel="noopener noreferrer"><BookOpen /> Read on Internet Archive</a>}
          </>
        }
      />
      {desc && (
        <>
          <h2 className="reader-sub">Description <SourceBadge type="summary" label="Catalog summary" /></h2>
          <p className="reader-p serif">{desc.split(/\n\n|-{4,}/)[0]}</p>
        </>
      )}
      {work.subjects && <div className="chips" style={{ marginTop: 14 }}>{work.subjects.slice(0, 10).map((s) => <span key={s} className="tag">{s}</span>)}</div>}
      <section className="panel" style={{ marginTop: 26 }}>
        <div className="panel-head"><h3><Scissors /> Cut from this book</h3></div>
        <p className="dim" style={{ padding: '12px 14px 0', fontSize: 'var(--fs-12)' }}>Type or paste the passage from your copy. Add the page number — the rest of the citation is ready.</p>
        <ManualCut initial={src} />
      </section>
    </article>
  )
}

export function AgoraTextView({ uri, setTitle }: ViewProps) {
  const id = uri.slice('agora:text/'.length)
  const w = textById[id]
  useEffect(() => {
    if (w) setTitle(w.title)
  }, [w, setTitle])
  if (!w) return <Failure message="That text isn’t in the framework library." />
  const a = authors[w.author]
  const ps = passages.filter((p) => p.textId === id)
  return (
    <article className="reader">
      <ReaderHead kicker={<>Framework library · {w.form}</>} title={w.title} meta={<><span>{a.name}</span><span className="mono">{w.year}</span></>} />
      <p className="reader-p serif" style={{ marginBottom: 20 }}>{w.summary}</p>
      <CutLayer
        sourceFor={(el) => {
          const loc = el?.closest('[data-locator]')?.getAttribute('data-locator') ?? undefined
          return agoraSource(id, loc)
        }}
      >
        <div className="agora-passages">
          {ps.map((p) => (
            <div key={p.id} className={`ap ${p.source}`} data-locator={p.locator}>
              <div className="hstack" style={{ gap: 8 }}>
                <SourceBadge type={p.source} />
                <span className="mono dim" style={{ fontSize: 11 }}>{p.locator}</span>
                {p.translation && <span className="dim" style={{ fontSize: 11 }}>{p.translation}</span>}
              </div>
              <p className={p.source === 'quotation' ? 'ap-q' : 'ap-s'}>{p.body}</p>
            </div>
          ))}
          {!ps.length && <p className="dim">No verified passages from this work yet.</p>}
        </div>
      </CutLayer>
      <p className="reader-caution letter" style={{ marginTop: 18 }}>Only cut from passages marked Direct quotation. Summaries are our words, not the author’s.</p>
    </article>
  )
}

export function ExternalView({ uri }: ViewProps) {
  let host = uri
  try {
    host = new URL(uri).hostname
  } catch {
    /* keep raw */
  }
  return (
    <div className="external">
      <div className="ext-bar caption">
        <FileQuestion size={15} />
        <span>
          Many sites don’t allow being shown inside other apps. If <strong>{host}</strong> stays blank, open it in a new tab and paste the passage below — Debate Utils keeps the citation.
        </span>
        <a className="btn sm" href={uri} target="_blank" rel="noopener noreferrer"><ExternalLink /> Open in new tab</a>
      </div>
      <iframe className="ext-frame" src={uri} title={host} sandbox="allow-scripts allow-same-origin allow-popups allow-forms" referrerPolicy="no-referrer" />
      <section className="panel" style={{ margin: 16 }}>
        <div className="panel-head"><h3><ScrollText /> Clip from {host}</h3></div>
        <ManualCut initial={{ provider: 'web', url: uri, container: host }} />
      </section>
    </div>
  )
}
