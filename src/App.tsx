import { BrowserRouter, Route, Routes } from 'react-router'
import { AppShell } from './components/shell/AppShell'
import { ArgumentBuilder } from './features/arguments/ArgumentBuilder'
import { ArgumentsIndex } from './features/arguments/ArgumentsIndex'
import { ComparePage } from './features/compare/ComparePage'
import { ConceptPage, ConceptsIndex } from './features/concepts/ConceptsPage'
import { DebateProfile, DebateThread, DebatesIndex } from './features/debates/DebatesPage'
import { EssayStudio, EssaysIndex } from './features/essay/EssayStudio'
import { Home } from './features/home/Home'
import { IdeaMap } from './features/ideamap/IdeaMap'
import { Library } from './features/library/Library'
import { PhilosopherProfile } from './features/library/PhilosopherProfile'
import { SchoolPage, SchoolsIndex } from './features/schools/SchoolsPage'
import { SocraticPage } from './features/socratic/SocraticPage'
import { TextExplorer } from './features/texts/TextExplorer'
import { TextPage } from './features/texts/TextPage'
import { NotesPage } from './features/workspace/NotesPage'
import { ReadingList } from './features/workspace/ReadingList'
import { SavedPage } from './features/workspace/SavedPage'
import { SettingsPage } from './features/workspace/SettingsPage'
import { NotFound } from './features/workspace/NotFound'
import { Landing } from './landing/Landing'

export default function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  )
}
