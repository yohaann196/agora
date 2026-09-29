import { FileStack, Globe, LayoutDashboard, Newspaper, Settings, Shield, TableProperties, Trophy, type LucideIcon } from 'lucide-react'

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
  { id: 'evidence', label: 'Evidence', path: '/app/evidence', icon: Globe, chord: 'e', description: 'Search sources and cut cards with citations.', group: 'prep' },
  { id: 'contentions', label: 'Contention vault', path: '/app/vaults?type=contention', icon: FileStack, chord: 'c', description: 'Your cases, in Pockets, Hats, Blocks and Tags.', group: 'prep' },
  { id: 'blocks', label: 'Block vault', path: '/app/vaults?type=block', icon: Shield, chord: 'b', description: 'Frontlines and framework blocks.', group: 'prep' },
  { id: 'flow', label: 'Flow & Timer', path: '/app/flow', icon: TableProperties, chord: 'f', description: 'Flow rounds and time speeches and prep.', group: 'prep' },
  { id: 'rankings', label: 'LD rankings', path: '/rankings', icon: Trophy, chord: 'r', description: 'National Glicko-2 rankings and profiles.', group: 'compete', external: true },
  { id: 'briefs', label: 'Monthly briefs', path: '/briefs', icon: Newspaper, chord: 'm', description: 'The current topic, broken down.', group: 'compete', external: true },
  { id: 'settings', label: 'Settings', path: '/app/settings', icon: Settings, chord: ',', description: 'Name, research sources, data.', group: 'you' },
]

export function appForPath(pathname: string, search = ''): AppDef {
  if (pathname.startsWith('/app/vaults')) {
    const type = new URLSearchParams(search).get('type')
    return APPS.find((a) => a.id === (type === 'block' ? 'blocks' : 'contentions'))!
  }
  const matches = APPS.filter((a) => a.path !== '/app' && !a.path.includes('?') && pathname.startsWith(a.path))
  return matches.sort((a, b) => b.path.length - a.path.length)[0] ?? APPS[0]
}
