import { ArrowLeft, ArrowRight, ClipboardCopy, FileText, Globe, History, Home, Library, PanelRightClose, PanelRightOpen, Plus, RotateCw, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import type { Source } from '../../model/types'
import { apa, fullCite, mla, shortCite } from '../../research/cite'
import { cards } from '../../research/docModel'
import { describeUri, parseInput } from '../../research/providers'
import { useOS } from '../../store'
import { AgoraTextView, BookView, ExternalView, NewTabView, PaperView, SearchView, WikiView, type ViewProps } from './views'
import './browser.css'

type RailTab = 'cards' | 'sources' | 'trail'

/** Per-tab back/forward stacks live in memory; the current page of each tab is persisted. */
const stacks = new Map<string, { back: string[]; fwd: string[] }>()
const stackFor = (id: string) => {
  if (!stacks.has(id)) stacks.set(id, { back: [], fwd: [] })
  return stacks.get(id)!
}

function View(props: ViewProps) {
  const { uri } = props
  if (uri === 'agora:new') return <NewTabView {...props} />
  if (uri.startsWith('agora:search')) return <SearchView {...props} />
  if (uri.startsWith('agora:text/')) return <AgoraTextView {...props} />
  if (uri.startsWith('wiki:')) return <WikiView {...props} />
  if (uri.startsWith('paper:')) return <PaperView {...props} />
  if (uri.startsWith('book:')) return <BookView {...props} />
  if (/^https?:\/\//.test(uri)) return <ExternalView {...props} />
  return <NewTabView {...props} />
}

function SourceRow({ s, highlight }: { s: Source; highlight: boolean }) {
  const { removeSource, toast } = useOS.getState()
  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({ title: `${label} copied`, tone: 'success' })
    } catch {
      toast({ title: 'Couldn’t copy', body: 'Select the citation text and copy it manually.' })
    }
  }
  return (
    <div className={`src-row ${highlight ? 'hl' : ''}`} id={`src-${s.id}`}>
      <div className="src-short">{shortCite(s)}</div>
      <p className="src-full">{fullCite(s)}</p>
      <div className="src-actions">
        <button className="btn ghost sm" onClick={() => copy('Card cite', `${shortCite(s)} — ${fullCite(s)}`)}><ClipboardCopy /> Cite</button>
        <button className="btn ghost sm" onClick={() => copy('MLA', mla(s))}>MLA</button>
        <button className="btn ghost sm" onClick={() => copy('APA', apa(s))}>APA</button>
        <span className="spacer" />
        <button className="btn ghost icon sm danger" aria-label="Remove source" onClick={() => removeSource(s.id)}><Trash2 /></button>
      </div>
    </div>
  )
}

export function Browser() {
  const tabs = useOS((s) => s.tabs)
  const activeId = useOS((s) => s.activeTab)
  const docs = useOS((s) => s.docs)
  const target = useOS((s) => s.cutTarget)
  const sources = useOS((s) => s.sources)
  const history = useOS((s) => s.history)
  const { openTab, navigateTab, setTabTitle, closeTab, setActiveTab, setCutTarget } = useOS.getState()
  const [params, setParams] = useSearchParams()
  const [rail, setRail] = useState<RailTab>(params.get('source') ? 'sources' : 'cards')
  const [railOpen, setRailOpen] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0]
  const [address, setAddress] = useState(active?.uri ?? '')
  const addressRef = useRef<HTMLInputElement>(null)
  const highlightSource = params.get('source')

  // Deep links: /app/browser?q=… or ?open=wiki:Title open in a fresh tab.
  useEffect(() => {
    const q = params.get('q')
    const open = params.get('open')
    if (q || open) {
      openTab(open ?? parseInput(q!))
      setParams({}, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (highlightSource) document.getElementById(`src-${highlightSource}`)?.scrollIntoView({ block: 'center' })
  }, [highlightSource])

  useEffect(() => setAddress(active?.uri === 'agora:new' ? '' : active?.uri ?? ''), [active?.uri])

  const go = useCallback(
    (uri: string, opts?: { newTab?: boolean }) => {
      if (opts?.newTab) {
        openTab(uri, describeUri(uri), true)
        useOS.getState().toast({ title: 'Opened in a background tab' })
        return
      }
      const cur = useOS.getState().tabs.find((t) => t.id === useOS.getState().activeTab)
      if (!cur) return
      const st = stackFor(cur.id)
      if (cur.uri !== uri) {
        st.back.push(cur.uri)
        st.fwd = []
      }
      navigateTab(cur.id, uri, describeUri(uri))
    },
    [navigateTab, openTab],
  )

  const setTitle = useCallback((t: string) => active && setTabTitle(active.id, t), [active, setTabTitle])

  const back = () => {
    if (!active) return
    const st = stackFor(active.id)
    const prev = st.back.pop()
    if (!prev) return
    st.fwd.push(active.uri)
    navigateTab(active.id, prev, describeUri(prev))
  }
  const fwd = () => {
    if (!active) return
    const st = stackFor(active.id)
    const next = st.fwd.pop()
    if (!next) return
    st.back.push(active.uri)
    navigateTab(active.id, next, describeUri(next))
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 't') {
        e.preventDefault()
        openTab('agora:new', 'New tab')
        setTimeout(() => addressRef.current?.focus(), 30)
      } else if (mod && e.key.toLowerCase() === 'l') {
        e.preventDefault()
        addressRef.current?.select()
      } else if (mod && e.key.toLowerCase() === 'w' && e.shiftKey) {
        e.preventDefault()
        if (active) closeTab(active.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, closeTab, openTab])

  const targetDoc = docs.find((d) => d.id === target) ?? docs[0]
  const targetCards = useMemo(() => (targetDoc ? cards(targetDoc.content).reverse() : []), [targetDoc])
  const st = active ? stackFor(active.id) : { back: [], fwd: [] }

  return (
    <div className={`page browser-page ${railOpen ? '' : 'rail-closed'}`}>
      <div className="b-chrome">
        <div className="b-tabs" role="tablist" aria-label="Browser tabs">
          {tabs.map((t) => (
            <div key={t.id} className={`b-tab ${t.id === active?.id ? 'on' : ''}`} role="tab" aria-selected={t.id === active?.id}>
              <button className="b-tab-main" onClick={() => setActiveTab(t.id)} title={t.title}>
                <Globe size={12} />
                <span className="truncate">{t.title}</span>
              </button>
              <button className="b-tab-x" aria-label={`Close ${t.title}`} onClick={() => closeTab(t.id)}>
                <X size={11} />
              </button>
            </div>
          ))}
          <button className="b-newtab" aria-label="New tab" title="New tab (⌘T)" onClick={() => openTab('agora:new', 'New tab')}>
            <Plus size={14} />
          </button>
        </div>
        <div className="b-nav">
          <button className="btn icon sm" aria-label="Back" onClick={back} disabled={!st.back.length}><ArrowLeft /></button>
          <button className="btn icon sm" aria-label="Forward" onClick={fwd} disabled={!st.fwd.length}><ArrowRight /></button>
          <button className="btn icon sm" aria-label="Reload" onClick={() => setReloadKey((k) => k + 1)}><RotateCw /></button>
          <button className="btn icon sm" aria-label="New tab page" onClick={() => go('agora:new')}><Home /></button>
          <form
            className="b-address"
            onSubmit={(e) => {
              e.preventDefault()
              if (address.trim()) go(parseInput(address))
            }}
          >
            <Globe size={14} />
            <input ref={addressRef} value={address} onChange={(e) => setAddress(e.target.value)} onFocus={(e) => e.target.select()} placeholder="Search or enter a URL, DOI, or wiki:Title" aria-label="Address" spellCheck={false} />
          </form>
          <label className="b-target" title="Cards you cut go into this document">
            <FileText size={14} />
            <select value={targetDoc?.id ?? ''} onChange={(e) => setCutTarget(e.target.value)} aria-label="Cut cards into">
              {docs.map((d) => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
          </label>
          <button className="btn icon sm" aria-label={railOpen ? 'Hide research rail' : 'Show research rail'} onClick={() => setRailOpen((o) => !o)}>
            {railOpen ? <PanelRightClose /> : <PanelRightOpen />}
          </button>
        </div>
      </div>

      <div className="b-body">
        <main className="b-view" key={`${active?.id}-${reloadKey}`}>
          {active && <View uri={active.uri} go={go} setTitle={setTitle} />}
        </main>
        {railOpen && (
          <aside className="b-rail" aria-label="Research rail">
            <div className="seg rail-tabs" role="tablist">
              <button role="tab" aria-selected={rail === 'cards'} onClick={() => setRail('cards')}>Cards</button>
              <button role="tab" aria-selected={rail === 'sources'} onClick={() => setRail('sources')}>Sources <span className="mono">{sources.length}</span></button>
              <button role="tab" aria-selected={rail === 'trail'} onClick={() => setRail('trail')}><History size={11} style={{ display: 'inline', verticalAlign: -1 }} /> Trail</button>
            </div>
            <div className="rail-scroll">
              {rail === 'cards' && targetDoc && (
                <>
                  <div className="rail-doc">
                    <span className="eyebrow">Cutting into</span>
                    <Link to={`/app/docs/${targetDoc.id}`} className="rail-doc-title">{targetDoc.title}</Link>
                    <span className="dim mono" style={{ fontSize: 10.5 }}>{targetCards.length} cards</span>
                  </div>
                  {targetCards.map((c) => (
                    <div key={c.index} className="rail-card">
                      <div className="rc-tag">{c.tag || <span className="dim">[no tag]</span>}</div>
                      <div className="rc-cite mono">{c.cite.split(' — ')[0]}</div>
                      <p className="rc-body clamp-3 serif">{c.body}</p>
                    </div>
                  ))}
                  {!targetCards.length && <p className="dim letter rail-empty">Select text on any page to cut your first card.</p>}
                </>
              )}
              {rail === 'sources' && (
                <>
                  {sources.map((s) => (
                    <SourceRow key={s.id} s={s} highlight={s.id === highlightSource} />
                  ))}
                  {!sources.length && <p className="dim letter rail-empty">Sources appear here as you cut cards.</p>}
                </>
              )}
              {rail === 'trail' && (
                <ol className="trail">
                  {history.slice(0, 40).map((h) => (
                    <li key={h.uri + h.at}>
                      <button className="result-row" onClick={() => go(h.uri)}>
                        {h.uri.startsWith('agora:text') ? <Library size={13} /> : <Globe size={13} />}
                        <span className="r-text">
                          <span className="r-label">{h.title}</span>
                          <span className="r-sub mono">{new Date(h.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {h.uri}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                  {!history.length && <p className="dim letter rail-empty">Your research trail is empty.</p>}
                </ol>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
