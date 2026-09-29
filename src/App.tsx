import { lazy, Suspense, type ComponentType } from 'react'
import { BrowserRouter, HashRouter, Route, Routes } from 'react-router'
import { AppShell } from './components/shell/AppShell'

// Each app is its own chunk, so the shell boots fast and apps load on demand.
const page = <T extends string>(loader: () => Promise<Record<T, ComponentType>>, name: T) =>
  lazy(() => loader().then((m) => ({ default: m[name] })))

const Landing = page(() => import('./landing/Landing'), 'Landing')
const Home = page(() => import('./features/home/Home'), 'Home')
const Library = page(() => import('./features/library/Library'), 'Library')
const PhilosopherProfile = page(() => import('./features/library/PhilosopherProfile'), 'PhilosopherProfile')
const ConceptsIndex = page(() => import('./features/concepts/ConceptsPage'), 'ConceptsIndex')
const ConceptPage = page(() => import('./features/concepts/ConceptsPage'), 'ConceptPage')
const ArgumentsIndex = page(() => import('./features/arguments/ArgumentsIndex'), 'ArgumentsIndex')
const ArgumentBuilder = page(() => import('./features/arguments/ArgumentBuilder'), 'ArgumentBuilder')
const ComparePage = page(() => import('./features/compare/ComparePage'), 'ComparePage')
const EssaysIndex = page(() => import('./features/essay/EssayStudio'), 'EssaysIndex')
const EssayStudio = page(() => import('./features/essay/EssayStudio'), 'EssayStudio')
const SocraticPage = page(() => import('./features/socratic/SocraticPage'), 'SocraticPage')
const IdeaMap = page(() => import('./features/ideamap/IdeaMap'), 'IdeaMap')
const SchoolsIndex = page(() => import('./features/schools/SchoolsPage'), 'SchoolsIndex')
const SchoolPage = page(() => import('./features/schools/SchoolsPage'), 'SchoolPage')
const TextExplorer = page(() => import('./features/texts/TextExplorer'), 'TextExplorer')
const TextPage = page(() => import('./features/texts/TextPage'), 'TextPage')
const DebatesIndex = page(() => import('./features/debates/DebatesPage'), 'DebatesIndex')
const DebateThread = page(() => import('./features/debates/DebatesPage'), 'DebateThread')
const DebateProfile = page(() => import('./features/debates/DebatesPage'), 'DebateProfile')
const NotesPage = page(() => import('./features/workspace/NotesPage'), 'NotesPage')
const ReadingList = page(() => import('./features/workspace/ReadingList'), 'ReadingList')
const SavedPage = page(() => import('./features/workspace/SavedPage'), 'SavedPage')
const SettingsPage = page(() => import('./features/workspace/SettingsPage'), 'SettingsPage')
const NotFound = page(() => import('./features/workspace/NotFound'), 'NotFound')

// Static hosts without an SPA fallback (e.g. a hosted preview) use hash routing.
const Router = import.meta.env.VITE_HASH_ROUTER ? HashRouter : BrowserRouter

export default function App() {
  return (
    <Router>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<AppShell />}>
            <Route index element={<Home />} />
            <Route path="library" element={<Library />} />
            <Route path="library/:id" element={<PhilosopherProfile />} />
            <Route path="concepts" element={<ConceptsIndex />} />
            <Route path="concepts/:id" element={<ConceptPage />} />
            <Route path="arguments" element={<ArgumentsIndex />} />
            <Route path="arguments/:id" element={<ArgumentBuilder />} />
            <Route path="compare" element={<ComparePage />} />
            <Route path="essays" element={<EssaysIndex />} />
            <Route path="essays/:id" element={<EssayStudio />} />
            <Route path="socratic" element={<SocraticPage />} />
            <Route path="map" element={<IdeaMap />} />
            <Route path="schools" element={<SchoolsIndex />} />
            <Route path="schools/:id" element={<SchoolPage />} />
            <Route path="explorer" element={<TextExplorer />} />
            <Route path="texts/:id" element={<TextPage />} />
            <Route path="debates" element={<DebatesIndex />} />
            <Route path="debates/people/:id" element={<DebateProfile />} />
            <Route path="debates/:id" element={<DebateThread />} />
            <Route path="notes" element={<NotesPage />} />
            <Route path="notes/:id" element={<NotesPage />} />
            <Route path="reading" element={<ReadingList />} />
            <Route path="saved" element={<SavedPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route path="*" element={<Landing />} />
        </Routes>
      </Suspense>
    </Router>
  )
}
