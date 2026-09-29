import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { seedArguments } from '../data/arguments'
import { seedDocs, seedFlows, seedSources } from '../data/debateSeeds'
import { seedDebates, seedEssays, seedNotes, seedReading } from '../data/social'
import { sourceKey } from '../research/cite'
import { appendNodes, emptyDoc } from '../research/docModel'
import { FORMATS } from '../research/formats'
import type {
  ArgLink,
  ArgNode,
  Argument,
  Debate,
  DebateMove,
  DebateMoveType,
  Doc,
  DocJSON,
  DocType,
  EntityKind,
  Flow,
  FlowFormat,
  FlowSheet,
  Source,
  EntityRef,
  Essay,
  Note,
  ReadingItem,
} from '../model/types'

export const uid = (prefix = 'id') => `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`

/* ------------------------------------------------------------------ */

export type WindowType = 'note' | 'socratic' | 'entity'
export interface OSWindow {
  id: string
  type: WindowType
  refId?: string
  refKind?: EntityKind
  x: number
  y: number
  z: number
  minimized: boolean
}

export interface OSNotification {
  id: string
  title: string
  body: string
  at: number
  read: boolean
  tone: 'debate' | 'reading' | 'system' | 'ai'
  href?: string
}

export interface Toast {
  id: string
  title: string
  body?: string
  tone?: 'default' | 'success' | 'ai'
}

export interface Recent {
  id: string
  kind: EntityKind
  at: number
}

export type SocraticMode = 'socratic' | 'devil' | 'tutor' | 'philosopher' | 'fallacy' | 'coach'

export interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  mode: SocraticMode
  text: string
  at: number
  philosopher?: string
  meta?: { concepts?: string[]; assumptions?: string[]; fallacies?: string[] }
  pending?: boolean
}

export interface IdeaMapNode {
  id: string
  label: string
  refId?: string
  kind: EntityKind | 'custom'
}
export interface IdeaMapEdge {
  id: string
  from: string
  to: string
  label: string
}

export type Accent = 'blue' | 'violet' | 'cyan' | 'green' | 'orange'
export const HOME_CARDS = ['browser', 'docs', 'flow', 'arguments', 'socratic', 'library', 'explorer', 'compare', 'essay', 'concepts', 'map', 'schools'] as const
export type HomeCard = (typeof HOME_CARDS)[number]

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
  accent: Accent
  density: 'comfortable' | 'compact'
  reduceMotion: boolean
  homeCards: HomeCard[]
  hiddenCards: HomeCard[]
  aiProvider: 'local' | 'anthropic'
  apiKey: string
  showSourceBadges: boolean
  sidebarCollapsed: boolean
  research: ResearchSettings
}

interface OSState {
  // data
  arguments: Argument[]
  debates: Debate[]
  essays: Essay[]
  notes: Note[]
  reading: ReadingItem[]
  saved: EntityRef[]
  recents: Recent[]
  notifications: OSNotification[]
  chat: ChatMessage[]
  socraticMode: SocraticMode
  socraticPhilosopher: string
  ideaNodes: IdeaMapNode[]
  ideaEdges: IdeaMapEdge[]
  ideaExpanded: string[]
  ideaCenter: string
  settings: Settings
  windows: OSWindow[]
  sources: Source[]
  docs: Doc[]
  flows: Flow[]
  tabs: BrowserTab[]
  activeTab: string
  history: HistoryEntry[]
  cutTarget: string

  // ephemeral ui
  paletteOpen: boolean
  quickLaunchOpen: boolean
  shortcutsOpen: boolean
  mobileNavOpen: boolean
  toasts: Toast[]

  // ui actions
  setPalette: (open: boolean) => void
  setQuickLaunch: (open: boolean) => void
  setShortcuts: (open: boolean) => void
  setMobileNav: (open: boolean) => void
  toast: (t: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void
  notify: (n: Omit<OSNotification, 'id' | 'at' | 'read'>) => void
  markAllRead: () => void
  pushRecent: (ref: EntityRef) => void
  toggleSaved: (ref: EntityRef) => void
  updateSettings: (patch: Partial<Settings>) => void
  resetWorkspace: () => void

  // windows
  openWindow: (type: WindowType, ref?: EntityRef) => void
  closeWindow: (id: string) => void
  focusWindow: (id: string) => void
  moveWindow: (id: string, x: number, y: number) => void
  toggleMinimize: (id: string) => void

  // arguments
  createArgument: (title?: string) => string
  updateArgument: (id: string, patch: Partial<Argument>) => void
  deleteArgument: (id: string) => void
  addArgNode: (argId: string, node: Omit<ArgNode, 'id'>, link?: Omit<ArgLink, 'id' | 'from'> & { from?: string }) => string
  updateArgNode: (argId: string, nodeId: string, patch: Partial<ArgNode>) => void
  removeArgNode: (argId: string, nodeId: string) => void
  addArgLink: (argId: string, link: Omit<ArgLink, 'id'>) => void
  removeArgLink: (argId: string, linkId: string) => void

  // essays
  createEssay: () => string
  updateEssay: (id: string, patch: Partial<Essay>) => void
  updateSection: (essayId: string, sectionId: string, body: string) => void
  deleteEssay: (id: string) => void

  // notes
  createNote: (init?: Partial<Note>) => string
  updateNote: (id: string, patch: Partial<Note>) => void
  deleteNote: (id: string) => void

  // debates
  createDebate: (d: Pick<Debate, 'thesis' | 'framing' | 'concepts' | 'philosophers'>) => string
  addMove: (debateId: string, parentId: string | null, type: DebateMoveType, body: string) => void
  toggleSupport: (debateId: string) => void

  // reading
  addReading: (textId: string) => void
  updateReading: (textId: string, patch: Partial<ReadingItem>) => void
  removeReading: (textId: string) => void

  // socratic
  setSocraticMode: (m: SocraticMode) => void
  setSocraticPhilosopher: (id: string) => void
  pushChat: (m: Omit<ChatMessage, 'id' | 'at'>) => string
  patchChat: (id: string, patch: Partial<ChatMessage>) => void
  clearChat: () => void

  // idea map
  expandIdea: (id: string) => void
  collapseIdea: (id: string) => void
  setIdeaCenter: (id: string) => void
  addIdeaNode: (label: string, refId?: string, kind?: IdeaMapNode['kind']) => string
  removeIdeaNode: (id: string) => void
  addIdeaEdge: (from: string, to: string, label: string) => void
  removeIdeaEdge: (id: string) => void
  resetIdeaMap: () => void

  // research
  addSource: (s: Omit<Source, 'id' | 'kind' | 'accessed'> & { accessed?: number }) => string
  updateSource: (id: string, patch: Partial<Source>) => void
  removeSource: (id: string) => void
  openTab: (uri: string, title?: string, background?: boolean) => string
  navigateTab: (id: string, uri: string, title?: string) => void
  setTabTitle: (id: string, title: string) => void
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void

  // docs
  createDoc: (type?: DocType, title?: string) => string
  updateDoc: (id: string, patch: Partial<Doc>) => void
  deleteDoc: (id: string) => void
  appendToDoc: (id: string, nodes: DocJSON[]) => void
  setCutTarget: (id: string) => void

  // flows
  createFlow: (format?: FlowFormat, title?: string) => string
  updateFlow: (id: string, patch: Partial<Flow>) => void
  updateSheet: (flowId: string, sheetId: string, patch: Partial<FlowSheet>) => void
  addSheet: (flowId: string, title: string) => void
  removeSheet: (flowId: string, sheetId: string) => void
  deleteFlow: (id: string) => void
}

const LINK_RE = /\[\[([a-z0-9-]+)\]\]/g
export function extractLinks(body: string) {
  return [...new Set([...body.matchAll(LINK_RE)].map((m) => m[1]))]
}

function insertMove(moves: DebateMove[], parentId: string | null, move: DebateMove): DebateMove[] {
  if (parentId === null) return [...moves, move]
  return moves.map((m) =>
    m.id === parentId ? { ...m, children: [...m.children, move] } : { ...m, children: insertMove(m.children, parentId, move) },
  )
}

const defaultSettings: Settings = {
  name: 'Yohaan',
  accent: 'blue',
  density: 'comfortable',
  reduceMotion: false,
  homeCards: [...HOME_CARDS],
  hiddenCards: [],
  aiProvider: 'local',
  apiKey: '',
  showSourceBadges: true,
  sidebarCollapsed: false,
  research: { wikipedia: true, openalex: true, openlibrary: true, agora: true, contactEmail: '' },
}

export function emptySheet(format: FlowFormat, title: string): FlowSheet {
  return { id: uid('sh'), title, marks: {}, columns: FORMATS[format].flowColumns.map(() => ['', '', '']) }
}

const now = () => Date.now()

const seedNotifications = (): OSNotification[] => [
  { id: 'n0', title: 'Your AC is ready to read', body: 'AC — Civil disobedience: 5 cards, about 1:20 of highlighted text. Open it in Speech Docs.', at: now() - 1000 * 60 * 6, read: false, tone: 'system', href: '/app/docs/doc-ac' },
  { id: 'n1', title: 'Amara challenged your objection', body: '“Rawls needs more than maximin…” on the veil of ignorance debate.', at: now() - 1000 * 60 * 18, read: false, tone: 'debate', href: '/app/debates/deb-veil' },
  { id: 'n2', title: 'Reading streak: Groundwork', body: 'You are 46% through. Section II introduces the formulas of the categorical imperative.', at: now() - 1000 * 60 * 60 * 3, read: false, tone: 'reading', href: '/app/texts/groundwork' },
  { id: 'n3', title: 'Leo published a new thesis', body: 'Existentialism provides a stronger account of moral responsibility…', at: now() - 1000 * 60 * 60 * 26, read: true, tone: 'debate', href: '/app/debates/deb-responsibility' },
]

const initialData = () => ({
  arguments: seedArguments,
  debates: seedDebates,
  essays: seedEssays,
  notes: seedNotes,
  reading: seedReading,
  saved: [
    { kind: 'concept', id: 'categorical-imperative' },
    { kind: 'passage', id: 'p-tj-veil' },
    { kind: 'philosopher', id: 'beauvoir' },
    { kind: 'argument', id: 'arg-veil' },
  ] as EntityRef[],
  recents: [
    { id: 'kant', kind: 'philosopher', at: now() - 1000 * 60 * 40 },
    { id: 'groundwork', kind: 'text', at: now() - 1000 * 60 * 55 },
    { id: 'arg-sacrifice', kind: 'argument', at: now() - 1000 * 60 * 90 },
    { id: 'justice', kind: 'concept', at: now() - 1000 * 60 * 60 * 5 },
    { id: 'second-sex', kind: 'text', at: now() - 1000 * 60 * 60 * 20 },
    { id: 'bad-faith', kind: 'concept', at: now() - 1000 * 60 * 60 * 30 },
  ] as Recent[],
  notifications: seedNotifications(),
  chat: [] as ChatMessage[],
  socraticMode: 'socratic' as SocraticMode,
  socraticPhilosopher: 'kant',
  ideaNodes: [] as IdeaMapNode[],
  ideaEdges: [] as IdeaMapEdge[],
  ideaExpanded: ['justice'],
  ideaCenter: 'justice',
  windows: [] as OSWindow[],
  sources: seedSources,
  docs: seedDocs,
  flows: seedFlows,
  tabs: [{ id: 'tab-1', uri: 'agora:new', title: 'New tab' }] as BrowserTab[],
  activeTab: 'tab-1',
  history: [] as HistoryEntry[],
  cutTarget: 'doc-ac',
})

export const useOS = create<OSState>()(
  persist(
    (set, get) => ({
      ...initialData(),
      settings: defaultSettings,
      paletteOpen: false,
      quickLaunchOpen: false,
      shortcutsOpen: false,
      mobileNavOpen: false,
      toasts: [],

      setPalette: (open) => set({ paletteOpen: open, quickLaunchOpen: false, shortcutsOpen: false }),
      setQuickLaunch: (open) => set({ quickLaunchOpen: open, paletteOpen: false, shortcutsOpen: false }),
      setShortcuts: (open) => set({ shortcutsOpen: open, paletteOpen: false, quickLaunchOpen: false }),
      setMobileNav: (open) => set({ mobileNavOpen: open }),
      toast: (t) => {
        const id = uid('t')
        set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id }] }))
        setTimeout(() => get().dismissToast(id), 3800)
      },
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      notify: (n) => set((s) => ({ notifications: [{ ...n, id: uid('n'), at: now(), read: false }, ...s.notifications].slice(0, 40) })),
      markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      pushRecent: (ref) =>
        set((s) => ({ recents: [{ id: ref.id, kind: ref.kind, at: now() }, ...s.recents.filter((r) => r.id !== ref.id)].slice(0, 24) })),
      toggleSaved: (ref) => {
        const has = get().saved.some((r) => r.id === ref.id)
        set((s) => ({ saved: has ? s.saved.filter((r) => r.id !== ref.id) : [ref, ...s.saved] }))
        get().toast({ title: has ? 'Removed from Saved' : 'Saved to workspace', tone: has ? 'default' : 'success' })
      },
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      resetWorkspace: () => set({ ...initialData(), settings: defaultSettings }),

      openWindow: (type, ref) => {
        const existing = get().windows.find((w) => w.type === type && w.refId === ref?.id)
        const z = Math.max(10, ...get().windows.map((w) => w.z)) + 1
        if (existing) {
          set((s) => ({ windows: s.windows.map((w) => (w.id === existing.id ? { ...w, z, minimized: false } : w)) }))
          return
        }
        const offset = (get().windows.length % 5) * 28
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1400
        const vh = typeof window !== 'undefined' ? window.innerHeight : 900
        // Open low on the right, clear of page headers and primary actions.
        const y = Math.max(96, vh - 560) + offset
        set((s) => ({
          windows: [
            ...s.windows,
            { id: uid('w'), type, refId: ref?.id, refKind: ref?.kind, x: Math.max(16, vw - 460 - offset - 24), y, z, minimized: false },
          ],
        }))
      },
      closeWindow: (id) => set((s) => ({ windows: s.windows.filter((w) => w.id !== id) })),
      focusWindow: (id) => {
        const z = Math.max(10, ...get().windows.map((w) => w.z)) + 1
        set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, z } : w)) }))
      },
      moveWindow: (id, x, y) => set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, x, y } : w)) })),
      toggleMinimize: (id) => set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, minimized: !w.minimized } : w)) })),

      createArgument: (title = 'Untitled argument') => {
        const id = uid('arg')
        const a: Argument = {
          id,
          kind: 'argument',
          title,
          author: 'you',
          summary: '',
          concepts: [],
          philosophers: [],
          updatedAt: now(),
          nodes: [
            { id: 'n1', type: 'claim', text: '', x: 80, y: 40 },
            { id: 'n2', type: 'premise', text: '', x: 80, y: 200 },
            { id: 'n3', type: 'conclusion', text: '', x: 80, y: 360 },
          ],
          links: [
            { id: 'l1', from: 'n1', to: 'n2', kind: 'supports' },
            { id: 'l2', from: 'n2', to: 'n3', kind: 'infers' },
          ],
        }
        set((s) => ({ arguments: [a, ...s.arguments] }))
        return id
      },
      updateArgument: (id, patch) =>
        set((s) => ({ arguments: s.arguments.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: now() } : a)) })),
      deleteArgument: (id) => set((s) => ({ arguments: s.arguments.filter((a) => a.id !== id) })),
      addArgNode: (argId, node, link) => {
        const id = uid('n')
        set((s) => ({
          arguments: s.arguments.map((a) => {
            if (a.id !== argId) return a
            const links = [...a.links]
            if (link?.from) links.push({ id: uid('l'), from: link.from, to: id, kind: link.kind })
            else if (link?.to) links.push({ id: uid('l'), from: id, to: link.to, kind: link.kind })
            return { ...a, nodes: [...a.nodes, { ...node, id }], links, updatedAt: now() }
          }),
        }))
        return id
      },
      updateArgNode: (argId, nodeId, patch) =>
        set((s) => ({
          arguments: s.arguments.map((a) =>
            a.id === argId ? { ...a, nodes: a.nodes.map((n) => (n.id === nodeId ? { ...n, ...patch } : n)), updatedAt: now() } : a,
          ),
        })),
      removeArgNode: (argId, nodeId) =>
        set((s) => ({
          arguments: s.arguments.map((a) => {
            if (a.id !== argId) return a
            // Re-stitch the core chain around a removed core node.
            const incoming = a.links.filter((l) => l.to === nodeId)
            const outgoing = a.links.filter((l) => l.from === nodeId)
            const node = a.nodes.find((n) => n.id === nodeId)
            const stitched: ArgLink[] = []
            if (node && !node.target) {
              for (const i of incoming) {
                const src = a.nodes.find((n) => n.id === i.from)
                if (src?.target) continue
                for (const o of outgoing) {
                  const dst = a.nodes.find((n) => n.id === o.to)
                  if (dst && !dst.target) stitched.push({ id: uid('l'), from: i.from, to: o.to, kind: o.kind })
                }
              }
            }
            return {
              ...a,
              nodes: a.nodes.filter((n) => n.id !== nodeId && n.target !== nodeId),
              links: [...a.links.filter((l) => l.from !== nodeId && l.to !== nodeId), ...stitched],
              updatedAt: now(),
            }
          }),
        })),
      addArgLink: (argId, link) =>
        set((s) => ({
          arguments: s.arguments.map((a) =>
            a.id === argId && !a.links.some((l) => l.from === link.from && l.to === link.to)
              ? { ...a, links: [...a.links, { ...link, id: uid('l') }] }
              : a,
          ),
        })),
      removeArgLink: (argId, linkId) =>
        set((s) => ({ arguments: s.arguments.map((a) => (a.id === argId ? { ...a, links: a.links.filter((l) => l.id !== linkId) } : a)) })),

      createEssay: () => {
        const id = uid('essay')
        const template = seedEssays[0].sections.map((sec) => ({ ...sec, body: '' }))
        set((s) => ({
          essays: [{ id, kind: 'essay', title: 'Untitled essay', prompt: 'Write your prompt or question here.', sections: template, references: [], updatedAt: now() }, ...s.essays],
        }))
        return id
      },
      updateEssay: (id, patch) => set((s) => ({ essays: s.essays.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: now() } : e)) })),
      updateSection: (essayId, sectionId, body) =>
        set((s) => ({
          essays: s.essays.map((e) =>
            e.id === essayId ? { ...e, sections: e.sections.map((sec) => (sec.id === sectionId ? { ...sec, body } : sec)), updatedAt: now() } : e,
          ),
        })),
      deleteEssay: (id) => set((s) => ({ essays: s.essays.filter((e) => e.id !== id) })),

      createNote: (init) => {
        const id = uid('note')
        const body = init?.body ?? ''
        set((s) => ({ notes: [{ id, kind: 'note', title: init?.title ?? 'Untitled note', body, links: extractLinks(body), updatedAt: now() }, ...s.notes] }))
        return id
      },
      updateNote: (id, patch) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id ? { ...n, ...patch, links: patch.body !== undefined ? extractLinks(patch.body) : n.links, updatedAt: now() } : n,
          ),
        })),
      deleteNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id), windows: s.windows.filter((w) => w.refId !== id) })),

      createDebate: (d) => {
        const id = uid('deb')
        set((s) => ({ debates: [{ ...d, id, kind: 'debate', author: 'you', createdAt: now(), moves: [], supporters: [] }, ...s.debates] }))
        return id
      },
      addMove: (debateId, parentId, type, body) => {
        const move: DebateMove = { id: uid('mv'), type, author: 'you', body, createdAt: now(), children: [] }
        set((s) => ({ debates: s.debates.map((d) => (d.id === debateId ? { ...d, moves: insertMove(d.moves, parentId, move) } : d)) }))
      },
      toggleSupport: (debateId) =>
        set((s) => ({
          debates: s.debates.map((d) =>
            d.id === debateId
              ? { ...d, supporters: d.supporters.includes('you') ? d.supporters.filter((x) => x !== 'you') : [...d.supporters, 'you'] }
              : d,
          ),
        })),

      addReading: (textId) => {
        if (get().reading.some((r) => r.textId === textId)) return
        set((s) => ({ reading: [{ textId, status: 'queued', progress: 0, addedAt: now() }, ...s.reading] }))
        get().toast({ title: 'Added to Reading List', tone: 'success' })
      },
      updateReading: (textId, patch) => set((s) => ({ reading: s.reading.map((r) => (r.textId === textId ? { ...r, ...patch } : r)) })),
      removeReading: (textId) => set((s) => ({ reading: s.reading.filter((r) => r.textId !== textId) })),

      setSocraticMode: (m) => set({ socraticMode: m }),
      setSocraticPhilosopher: (id) => set({ socraticPhilosopher: id }),
      pushChat: (m) => {
        const id = uid('msg')
        set((s) => ({ chat: [...s.chat, { ...m, id, at: now() }] }))
        return id
      },
      patchChat: (id, patch) => set((s) => ({ chat: s.chat.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
      clearChat: () => set({ chat: [] }),

      expandIdea: (id) => set((s) => ({ ideaExpanded: s.ideaExpanded.includes(id) ? s.ideaExpanded : [...s.ideaExpanded, id] })),
      collapseIdea: (id) => set((s) => ({ ideaExpanded: s.ideaExpanded.filter((x) => x !== id) })),
      setIdeaCenter: (id) => set({ ideaCenter: id, ideaExpanded: [id] }),
      addIdeaNode: (label, refId, kind = 'custom') => {
        const id = refId ?? uid('idea')
        set((s) => ({ ideaNodes: s.ideaNodes.some((n) => n.id === id) ? s.ideaNodes : [...s.ideaNodes, { id, label, refId, kind }] }))
        return id
      },
      removeIdeaNode: (id) =>
        set((s) => ({
          ideaNodes: s.ideaNodes.filter((n) => n.id !== id),
          ideaEdges: s.ideaEdges.filter((e) => e.from !== id && e.to !== id),
          ideaExpanded: s.ideaExpanded.filter((x) => x !== id),
        })),
      addIdeaEdge: (from, to, label) => set((s) => ({ ideaEdges: [...s.ideaEdges, { id: uid('e'), from, to, label }] })),
      removeIdeaEdge: (id) => set((s) => ({ ideaEdges: s.ideaEdges.filter((e) => e.id !== id) })),
      resetIdeaMap: () => set({ ideaNodes: [], ideaEdges: [], ideaExpanded: ['justice'], ideaCenter: 'justice' }),

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

      createDoc: (type = 'speech', title) => {
        const id = uid('doc')
        const name = title ?? (type === 'speech' ? 'Untitled speech doc' : type === 'file' ? 'Untitled file' : 'Research notes')
        set((s) => ({ docs: [{ id, kind: 'doc', title: name, type, content: emptyDoc(type), updatedAt: now() }, ...s.docs] }))
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
      name: 'agora:v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        arguments: s.arguments,
        debates: s.debates,
        essays: s.essays,
        notes: s.notes,
        reading: s.reading,
        saved: s.saved,
        recents: s.recents,
        notifications: s.notifications,
        chat: s.chat.filter((m) => !m.pending),
        socraticMode: s.socraticMode,
        socraticPhilosopher: s.socraticPhilosopher,
        ideaNodes: s.ideaNodes,
        ideaEdges: s.ideaEdges,
        ideaExpanded: s.ideaExpanded,
        ideaCenter: s.ideaCenter,
        settings: s.settings,
        windows: s.windows,
        sources: s.sources,
        docs: s.docs,
        flows: s.flows,
        tabs: s.tabs,
        activeTab: s.activeTab,
        history: s.history,
        cutTarget: s.cutTarget,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<OSState>
        const settings = { ...current.settings, ...(p.settings ?? {}) }
        settings.research = { ...current.settings.research, ...(p.settings?.research ?? {}) }
        // Cards added in newer versions appear on the Desk automatically.
        const known = HOME_CARDS as readonly string[]
        settings.homeCards = [...settings.homeCards.filter((c) => known.includes(c)), ...HOME_CARDS.filter((c) => !settings.homeCards.includes(c))]
        return { ...current, ...p, settings }
      },
    },
  ),
)
