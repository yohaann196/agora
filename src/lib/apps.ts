import {
  BookMarked,
  Bookmark,
  BrainCircuit,
  Columns3,
  House,
  Landmark,
  Library,
  NotebookPen,
  Orbit,
  PenLine,
  Settings,
  Swords,
  TextSearch,
  Waypoints,
  type LucideIcon,
} from 'lucide-react'
import type { HomeCard } from '../store'

export interface AppDef {
  id: string
  label: string
  path: string
  icon: LucideIcon
  chord: string
  accent: string
  description: string
  card?: HomeCard
  group: 'system' | 'workspace'
}

export const APPS: AppDef[] = [
  { id: 'home', label: 'Home', path: '/app', icon: House, chord: 'h', accent: 'var(--blue)', description: 'Your philosophical command center.', group: 'system' },
  { id: 'library', label: 'Library', path: '/app/library', icon: Library, chord: 'l', accent: 'var(--violet)', description: 'Read and explore philosophical texts.', card: 'library', group: 'system' },
  { id: 'concepts', label: 'Concepts', path: '/app/concepts', icon: Orbit, chord: 'c', accent: 'var(--cyan)', description: 'Build a knowledge graph of philosophical concepts.', card: 'concepts', group: 'system' },
  { id: 'arguments', label: 'Arguments', path: '/app/arguments', icon: Waypoints, chord: 'a', accent: 'var(--blue)', description: 'Construct, analyze, and challenge arguments.', card: 'arguments', group: 'system' },
  { id: 'compare', label: 'Philosopher Compare', path: '/app/compare', icon: Columns3, chord: 'p', accent: 'var(--violet)', description: 'Compare how different philosophers approach the same question.', card: 'compare', group: 'system' },
  { id: 'essay', label: 'Essay Studio', path: '/app/essays', icon: PenLine, chord: 'e', accent: 'var(--amber)', description: 'Write philosophy essays with argument-aware tools.', card: 'essay', group: 'system' },
  { id: 'socratic', label: 'Socratic AI', path: '/app/socratic', icon: BrainCircuit, chord: 's', accent: 'var(--green)', description: 'An AI tutor that asks questions rather than simply giving answers.', card: 'socratic', group: 'system' },
  { id: 'map', label: 'Idea Map', path: '/app/map', icon: Orbit, chord: 'm', accent: 'var(--cyan)', description: 'Visually explore relationships between ideas.', card: 'map', group: 'system' },
  { id: 'schools', label: 'Schools', path: '/app/schools', icon: Landmark, chord: 'o', accent: 'var(--green)', description: 'Explore philosophical schools and traditions.', card: 'schools', group: 'system' },
  { id: 'explorer', label: 'Text Explorer', path: '/app/explorer', icon: TextSearch, chord: 't', accent: 'var(--orange)', description: 'Search philosophical texts by concept, philosopher, or phrase.', card: 'explorer', group: 'system' },
  { id: 'debates', label: 'Debate Network', path: '/app/debates', icon: Swords, chord: 'd', accent: 'var(--rose)', description: 'Publish arguments. Object, respond, rebut.', group: 'system' },
  { id: 'notes', label: 'Notes', path: '/app/notes', icon: NotebookPen, chord: 'n', accent: 'var(--k-note)', description: 'Linked notes for your ideas.', group: 'workspace' },
  { id: 'reading', label: 'Reading List', path: '/app/reading', icon: BookMarked, chord: 'r', accent: 'var(--orange)', description: 'What you are reading next.', group: 'workspace' },
  { id: 'saved', label: 'Saved', path: '/app/saved', icon: Bookmark, chord: 'v', accent: 'var(--amber)', description: 'Everything you have bookmarked.', group: 'workspace' },
  { id: 'settings', label: 'Settings', path: '/app/settings', icon: Settings, chord: ',', accent: 'var(--text-2)', description: 'Profile, AI, appearance, workspace.', group: 'workspace' },
]

export const appById = Object.fromEntries(APPS.map((a) => [a.id, a])) as Record<string, AppDef>
export const appForCard = (card: HomeCard) => APPS.find((a) => a.card === card)!

export function appForPath(pathname: string): AppDef {
  const matches = APPS.filter((a) => a.path !== '/app' && pathname.startsWith(a.path))
  if (pathname.startsWith('/app/texts')) return appById.explorer
  if (pathname.startsWith('/app/philosophers')) return appById.library
  return matches.sort((a, b) => b.path.length - a.path.length)[0] ?? appById.home
}
