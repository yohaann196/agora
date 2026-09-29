import { LayoutDashboard, Library, Settings, TableProperties, Trophy, type LucideIcon } from 'lucide-react'

export interface AppDef {
  id: string
  label: string
  path: string
  icon: LucideIcon
  chord: string
  description: string
  group: 'prep' | 'compete' | 'you'
  /** Public pages open outside the workspace shell. */
  external?: boolean
}

export const GROUP_LABEL: Record<AppDef['group'], string> = { prep: 'Prep', compete: 'Compete', you: 'You' }

export const APPS: AppDef[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/app', icon: LayoutDashboard, chord: 'h', description: 'Your season at a glance.', group: 'prep' },
  { id: 'vault', label: 'Prep vault', path: '/app/vault', icon: Library, chord: 'v', description: 'Cut cards for every contention, plus your cases, blocks and speech docs.', group: 'prep' },
  { id: 'flow', label: 'Flow & Timer', path: '/app/flow', icon: TableProperties, chord: 'f', description: 'Flow rounds next to your speech docs, and time speeches and prep.', group: 'prep' },
  { id: 'rankings', label: 'LD rankings', path: '/rankings', icon: Trophy, chord: 'r', description: 'National Glicko-2 rankings and profiles.', group: 'compete', external: true },
  { id: 'settings', label: 'Settings', path: '/app/settings', icon: Settings, chord: ',', description: 'Name and data.', group: 'you' },
]

export function appForPath(pathname: string): AppDef {
  if (pathname.startsWith('/app/vaults')) return APPS.find((a) => a.id === 'vault')!
  const matches = APPS.filter((a) => a.path !== '/app' && pathname.startsWith(a.path))
  return matches.sort((a, b) => b.path.length - a.path.length)[0] ?? APPS[0]
}
