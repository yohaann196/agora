import {
  BookMarked,
  Bookmark,
  BrainCircuit,
  Columns3,
  Compass,
  FileText,
  Globe,
  Landmark,
  Library,
  NotebookPen,
  Orbit,
  PenLine,
  Settings,
  Share2,
  Swords,
  TableProperties,
  TextSearch,
  Waypoints,
  type LucideIcon,
} from 'lucide-react'
import type { HomeCard } from '../store'

export type AppGroup = 'desk' | 'research' | 'debate' | 'write' | 'workspace'

export interface AppDef {
  id: string
  label: string
  path: string
  icon: LucideIcon
  chord: string
  accent: string
  description: string
  card?: HomeCard
  group: AppGroup
}

export const GROUP_LABEL: Record<AppGroup, string> = {
  desk: 'Desk',
  research: 'Research',
  debate: 'Debate',
  write: 'Write',
  workspace: 'Workspace',
}

export const APPS: AppDef[] = [
  { id: 'home', label: 'Desk', path: '/app', icon: Compass, chord: 'h', accent: 'var(--oxblood)', description: 'Where every round starts.', group: 'desk' },

  { id: 'browser', label: 'Research Browser', path: '/app/browser', icon: Globe, chord: 'b', accent: 'var(--k-source)', description: 'Search encyclopedias, papers and books. Cut cards with the citation attached.', card: 'browser', group: 'research' },
  { id: 'library', label: 'Library', path: '/app/library', icon: Library, chord: 'l', accent: 'var(--plum)', description: 'Fourteen thinkers and their primary texts.', card: 'library', group: 'research' },
  { id: 'explorer', label: 'Text Explorer', path: '/app/explorer', icon: TextSearch, chord: 't', accent: 'var(--ochre-ink)', description: 'Search verified passages by phrase, concept or thinker.', card: 'explorer', group: 'research' },
  { id: 'concepts', label: 'Concepts', path: '/app/concepts', icon: Orbit, chord: 'c', accent: 'var(--slate)', description: 'A glossary wired into the knowledge graph.', card: 'concepts', group: 'research' },
  { id: 'map', label: 'Idea Map', path: '/app/map', icon: Share2, chord: 'm', accent: 'var(--verdigris)', description: 'See how ideas connect, then connect your own.', card: 'map', group: 'research' },
  { id: 'schools', label: 'Schools', path: '/app/schools', icon: Landmark, chord: 'o', accent: 'var(--verdigris)', description: 'Traditions and the questions they can’t settle.', card: 'schools', group: 'research' },

  { id: 'docs', label: 'Speech Docs', path: '/app/docs', icon: FileText, chord: 'd', accent: 'var(--ink)', description: 'Pockets, hats, blocks and tags. Cut, underline, highlight, send.', card: 'docs', group: 'debate' },
  { id: 'flow', label: 'Flow & Timer', path: '/app/flow', icon: TableProperties, chord: 'f', accent: 'var(--slate)', description: 'Flow the round in aff and neg ink. Time speeches and prep.', card: 'flow', group: 'debate' },
  { id: 'arguments', label: 'Argument Builder', path: '/app/arguments', icon: Waypoints, chord: 'a', accent: 'var(--slate)', description: 'Map an argument. Find the gaps before your opponent does.', card: 'arguments', group: 'debate' },
  { id: 'socratic', label: 'Socratic Coach', path: '/app/socratic', icon: BrainCircuit, chord: 's', accent: 'var(--oxblood)', description: 'A coach that asks before it tells.', card: 'socratic', group: 'debate' },
  { id: 'compare', label: 'Compare', path: '/app/compare', icon: Columns3, chord: 'p', accent: 'var(--plum)', description: 'One question, several thinkers, side by side.', card: 'compare', group: 'debate' },
  { id: 'debates', label: 'Debate Network', path: '/app/debates', icon: Swords, chord: 'w', accent: 'var(--oxblood)', description: 'Publish a thesis. Take objections. Rebut.', group: 'debate' },

  { id: 'essay', label: 'Essay Studio', path: '/app/essays', icon: PenLine, chord: 'e', accent: 'var(--olive)', description: 'Write philosophy with argument-aware feedback.', card: 'essay', group: 'write' },
  { id: 'notes', label: 'Notes', path: '/app/notes', icon: NotebookPen, chord: 'n', accent: 'var(--ink-soft)', description: 'Linked notes for your ideas.', group: 'write' },

  { id: 'reading', label: 'Reading List', path: '/app/reading', icon: BookMarked, chord: 'r', accent: 'var(--ochre-ink)', description: 'What you are reading next.', group: 'workspace' },
  { id: 'saved', label: 'Saved', path: '/app/saved', icon: Bookmark, chord: 'v', accent: 'var(--amber)', description: 'Everything you have bookmarked.', group: 'workspace' },
  { id: 'settings', label: 'Settings', path: '/app/settings', icon: Settings, chord: ',', accent: 'var(--ink-soft)', description: 'Profile, research sources, appearance.', group: 'workspace' },
]

/** Settings keep the original accent keys; each now names a spot ink. */
export const ACCENT_NAME: Record<import('../store').Accent, string> = {
  blue: 'Oxblood',
  violet: 'Plum',
  cyan: 'Verdigris',
  green: 'Olive',
  orange: 'Ochre',
}
export const ACCENT_INK: Record<import('../store').Accent, string> = {
  blue: 'var(--oxblood)',
  violet: 'var(--plum)',
  cyan: 'var(--verdigris)',
  green: 'var(--olive)',
  orange: 'var(--ochre)',
}

export const appById = Object.fromEntries(APPS.map((a) => [a.id, a])) as Record<string, AppDef>
export const appForCard = (card: HomeCard) => APPS.find((a) => a.card === card)!

export function appForPath(pathname: string): AppDef {
  if (pathname.startsWith('/app/texts')) return appById.explorer
  const matches = APPS.filter((a) => a.path !== '/app' && pathname.startsWith(a.path))
  return matches.sort((a, b) => b.path.length - a.path.length)[0] ?? appById.home
}
