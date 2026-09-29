import { lazy, Suspense, type ComponentType } from 'react'
import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router'
import { AppShell } from './components/shell/AppShell'
import { SiteShell } from './site/SiteShell'

// Each page is its own chunk, so the landing page boots fast.
const page = <T extends string>(loader: () => Promise<Record<T, ComponentType>>, name: T) =>
  lazy(() => loader().then((m) => ({ default: m[name] })))

const Landing = page(() => import('./site/Landing'), 'Landing')
const RankingsPage = page(() => import('./site/RankingsPage'), 'RankingsPage')
const MethodPage = page(() => import('./site/MethodPage'), 'MethodPage')
const DebaterPage = page(() => import('./site/DebaterPage'), 'DebaterPage')
const SchoolPage = page(() => import('./site/SchoolPage'), 'SchoolPage')
const BriefsPage = page(() => import('./site/BriefsPage'), 'BriefsPage')
const BriefPage = page(() => import('./site/BriefPage'), 'BriefPage')
const Dashboard = page(() => import('./app/Dashboard'), 'Dashboard')
const Browser = page(() => import('./features/browser/Browser'), 'Browser')
const DocsIndex = page(() => import('./features/docs/DocsPage'), 'DocsIndex')
const DocPage = page(() => import('./features/docs/DocsPage'), 'DocPage')
const FlowIndex = page(() => import('./features/flow/FlowPage'), 'FlowIndex')
const FlowPage = page(() => import('./features/flow/FlowPage'), 'FlowPage')
const SettingsPage = page(() => import('./features/workspace/SettingsPage'), 'SettingsPage')
const NotFound = page(() => import('./features/workspace/NotFound'), 'NotFound')

// Static hosts without an SPA fallback (GitHub Pages) use hash routing.
const Router = import.meta.env.VITE_HASH_ROUTER ? HashRouter : BrowserRouter

export default function App() {
  return (
    <Router>
      <Suspense fallback={null}>
        <Routes>
          <Route element={<SiteShell />}>
            <Route path="/" element={<Landing />} />
            <Route path="/prep" element={<Landing />} />
            <Route path="/rankings" element={<RankingsPage />} />
            <Route path="/rankings/method" element={<MethodPage />} />
            <Route path="/debaters/:id" element={<DebaterPage />} />
            <Route path="/schools/:slug" element={<SchoolPage />} />
            <Route path="/briefs" element={<BriefsPage />} />
            <Route path="/briefs/:id" element={<BriefPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route path="/app" element={<AppShell />}>
            <Route index element={<Dashboard />} />
            <Route path="evidence" element={<Browser />} />
            <Route path="vaults" element={<DocsIndex />} />
            <Route path="vaults/:id" element={<DocPage />} />
            <Route path="flow" element={<FlowIndex />} />
            <Route path="flow/:id" element={<FlowPage />} />
            <Route path="settings" element={<SettingsPage />} />
            {/* Links from earlier versions of the app */}
            <Route path="browser" element={<Navigate to="/app/evidence" replace />} />
            <Route path="docs" element={<Navigate to="/app/vaults" replace />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  )
}
