import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { seedDocs, seedFlows, seedSources } from '../data/debateSeeds'
import type { Doc, DocJSON, DocType, Flow, FlowFormat, FlowSheet, Recent, RecentKind, Side, Source } from '../model/types'
import { sourceKey } from '../research/cite'
import { appendNodes, emptyDoc } from '../research/docModel'
import { FORMATS } from '../research/formats'

export const uid = (prefix = 'id') => `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`

export interface Toast {
  id: string
  title: string
  body?: string
  tone?: 'default' | 'success'
}

export interface BrowserTab {
  id: string
  uri: string
  title: string
}

export interface HistoryEntry {
  uri: string
  title: string
  at: number
}

export interface ResearchSettings {
  wikipedia: boolean
  openalex: boolean
  openlibrary: boolean
  agora: boolean
  contactEmail: string
}

export interface Settings {
  name: string
  reduceMotion: boolean
  research: ResearchSettings
}

interface State {
  settings: Settings
  sources: Source[]
  docs: Doc[]
  flows: Flow[]
  tabs: BrowserTab[]
  activeTab: string
  history: HistoryEntry[]
  cutTarget: string
  recents: Recent[]
  /** Debater ids you follow on the rankings. */
  following: string[]

  // ephemeral
  paletteOpen: boolean
  shortcutsOpen: boolean
  mobileNavOpen: boolean
  toasts: Toast[]

  setPalette: (open: boolean) => void
  setShortcuts: (open: boolean) => void
  setMobileNav: (open: boolean) => void
  toast: (t: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void
  updateSettings: (patch: Partial<Settings>) => void
  resetWorkspace: () => void
  pushRecent: (r: { kind: RecentKind; id: string; label?: string }) => void
  toggleFollow: (id: string, name?: string) => void

  addSource: (s: Omit<Source, 'id' | 'kind' | 'accessed'> & { accessed?: number }) => string
  updateSource: (id: string, patch: Partial<Source>) => void
  removeSource: (id: string) => void
  openTab: (uri: string, title?: string, background?: boolean) => string
  navigateTab: (id: string, uri: string, title?: string) => void
  setTabTitle: (id: string, title: string) => void
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void

  createDoc: (type?: DocType, title?: string, extra?: { side?: Side; topic?: string }) => string
  updateDoc: (id: string, patch: Partial<Doc>) => void
  deleteDoc: (id: string) => void
  appendToDoc: (id: string, nodes: DocJSON[]) => void
  setCutTarget: (id: string) => void

  createFlow: (format?: FlowFormat, title?: string) => string
  updateFlow: (id: string, patch: Partial<Flow>) => void
  updateSheet: (flowId: string, sheetId: string, patch: Partial<FlowSheet>) => void
  addSheet: (flowId: string, title: string) => void
  removeSheet: (flowId: string, sheetId: string) => void
  deleteFlow: (id: string) => void
}

const defaultSettings: Settings = {
  name: '',
  reduceMotion: false,
  research: { wikipedia: true, openalex: true, openlibrary: true, agora: true, contactEmail: '' },
}

export function emptySheet(format: FlowFormat, title: string): FlowSheet {
  return { id: uid('sh'), title, marks: {}, columns: FORMATS[format].flowColumns.map(() => ['', '', '']) }
}

const now = () => Date.now()

const DOC_TITLE: Record<DocType, string> = {
  contention: 'Untitled contention',
  block: 'Untitled block',
  speech: 'Untitled speech doc',
  file: 'Untitled research file',
  research: 'Research notes',
}

const initialData = () => ({
  sources: seedSources,
  docs: seedDocs,
  flows: seedFlows,
  tabs: [{ id: 'tab-1', uri: 'agora:new', title: 'New tab' }] as BrowserTab[],
  activeTab: 'tab-1',
  history: [] as HistoryEntry[],
  cutTarget: 'doc-space-ac',
  recents: [] as Recent[],
  following: [] as string[],
})

const STORAGE_KEY = 'debate-utils:v1'
// Work saved under the site's earlier name moves across once, so nothing is lost in the rename.
try {
  const legacy = localStorage.getItem('resolved:v1')
  if (legacy && !localStorage.getItem(STORAGE_KEY)) localStorage.setItem(STORAGE_KEY, legacy)
} catch {
  // Storage can be unavailable (private mode); the store falls back to defaults.
}

export const useOS = create<State>()(
  persist(
    (set, get) => ({
      ...initialData(),
      settings: defaultSettings,
      paletteOpen: false,
      shortcutsOpen: false,
      mobileNavOpen: false,
      toasts: [],

      setPalette: (open) => set({ paletteOpen: open, shortcutsOpen: false }),
      setShortcuts: (open) => set({ shortcutsOpen: open, paletteOpen: false }),
      setMobileNav: (open) => set({ mobileNavOpen: open }),
      toast: (t) => {
        const id = uid('t')
        set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id }] }))
        setTimeout(() => get().dismissToast(id), 3800)
      },
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      resetWorkspace: () => set({ ...initialData(), settings: defaultSettings }),
      pushRecent: (r) => set((s) => ({ recents: [{ ...r, at: now() }, ...s.recents.filter((x) => !(x.id === r.id && x.kind === r.kind))].slice(0, 20) })),
      toggleFollow: (id, name) => {
        const on = get().following.includes(id)
        set((s) => ({ following: on ? s.following.filter((x) => x !== id) : [id, ...s.following] }))
        get().toast({ title: on ? `Unfollowed ${name ?? 'debater'}` : `Following ${name ?? 'debater'}`, body: on ? undefined : 'They’ll appear on your dashboard.', tone: on ? 'default' : 'success' })
      },

      addSource: (src) => {
        const existing = get().sources.find((x) => sourceKey(x) === sourceKey(src))
        if (existing) return existing.id
        const id = uid('src')
        set((s) => ({ sources: [{ ...src, id, kind: 'source', accessed: src.accessed ?? now() }, ...s.sources] }))
        return id
      },
      updateSource: (id, patch) => set((s) => ({ sources: s.sources.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      removeSource: (id) => set((s) => ({ sources: s.sources.filter((x) => x.id !== id) })),
      openTab: (uri, title = 'Loading…', background = false) => {
        const id = uid('tab')
        set((s) => ({
          tabs: [...s.tabs, { id, uri, title }].slice(-12),
          activeTab: background ? s.activeTab : id,
          history: uri === 'agora:new' ? s.history : [{ uri, title, at: now() }, ...s.history.filter((h) => h.uri !== uri)].slice(0, 80),
        }))
        return id
      },
      navigateTab: (id, uri, title) =>
        set((s) => ({
          tabs: s.tabs.map((t) => (t.id === id ? { ...t, uri, title: title ?? t.title } : t)),
          history: uri === 'agora:new' ? s.history : [{ uri, title: title ?? uri, at: now() }, ...s.history.filter((h) => h.uri !== uri)].slice(0, 80),
        })),
      setTabTitle: (id, title) =>
        set((s) => {
          const uri = s.tabs.find((t) => t.id === id)?.uri
          return {
            tabs: s.tabs.map((t) => (t.id === id ? { ...t, title } : t)),
            history: s.history.map((h) => (h.uri === uri ? { ...h, title } : h)),
          }
        }),
      closeTab: (id) =>
        set((s) => {
          const idx = s.tabs.findIndex((t) => t.id === id)
          const tabs = s.tabs.filter((t) => t.id !== id)
          if (!tabs.length) {
            const fresh = uid('tab')
            return { tabs: [{ id: fresh, uri: 'agora:new', title: 'New tab' }], activeTab: fresh }
          }
          return { tabs, activeTab: s.activeTab === id ? tabs[Math.max(0, idx - 1)].id : s.activeTab }
        }),
      setActiveTab: (id) => set({ activeTab: id }),

      createDoc: (type = 'contention', title, extra) => {
        const id = uid('doc')
        set((s) => ({ docs: [{ id, kind: 'doc', title: title ?? DOC_TITLE[type], type, content: emptyDoc(type), updatedAt: now(), ...extra }, ...s.docs] }))
        return id
      },
      updateDoc: (id, patch) => set((s) => ({ docs: s.docs.map((d) => (d.id === id ? { ...d, ...patch, updatedAt: now() } : d)) })),
      deleteDoc: (id) =>
        set((s) => ({
          docs: s.docs.filter((d) => d.id !== id),
          cutTarget: s.cutTarget === id ? (s.docs.find((d) => d.id !== id)?.id ?? '') : s.cutTarget,
        })),
      appendToDoc: (id, nodes) =>
        set((s) => ({ docs: s.docs.map((d) => (d.id === id ? { ...d, content: appendNodes(d.content, nodes), updatedAt: now() } : d)) })),
      setCutTarget: (id) => set({ cutTarget: id }),

      createFlow: (format = 'ld', title) => {
        const id = uid('flow')
        const [a, b] = format === 'pf' ? ['Pro case', 'Con case'] : format === 'ld' ? ['AC', 'NC'] : ['Case', 'Off-case']
        const f: Flow = { id, kind: 'flow', title: title ?? `Round — ${FORMATS[format].short}`, format, affFirst: true, updatedAt: now(), sheets: [emptySheet(format, a), emptySheet(format, b)] }
        set((s) => ({ flows: [f, ...s.flows] }))
        return id
      },
      updateFlow: (id, patch) => set((s) => ({ flows: s.flows.map((f) => (f.id === id ? { ...f, ...patch, updatedAt: now() } : f)) })),
      updateSheet: (flowId, sheetId, patch) =>
        set((s) => ({
          flows: s.flows.map((f) => (f.id === flowId ? { ...f, updatedAt: now(), sheets: f.sheets.map((sh) => (sh.id === sheetId ? { ...sh, ...patch } : sh)) } : f)),
        })),
      addSheet: (flowId, title) =>
        set((s) => ({ flows: s.flows.map((f) => (f.id === flowId ? { ...f, updatedAt: now(), sheets: [...f.sheets, emptySheet(f.format, title)] } : f)) })),
      removeSheet: (flowId, sheetId) =>
        set((s) => ({
          flows: s.flows.map((f) => (f.id === flowId && f.sheets.length > 1 ? { ...f, updatedAt: now(), sheets: f.sheets.filter((sh) => sh.id !== sheetId) } : f)),
        })),
      deleteFlow: (id) => set((s) => ({ flows: s.flows.filter((f) => f.id !== id) })),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        settings: s.settings,
        sources: s.sources,
        docs: s.docs,
        flows: s.flows,
        tabs: s.tabs,
        activeTab: s.activeTab,
        history: s.history,
        cutTarget: s.cutTarget,
        recents: s.recents,
        following: s.following,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>
        const settings = { ...current.settings, ...(p.settings ?? {}) }
        settings.research = { ...current.settings.research, ...(p.settings?.research ?? {}) }
        return { ...current, ...p, settings }
      },
    },
  ),
)
