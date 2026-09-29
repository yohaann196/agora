import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/archivo/wdth.css'
import '@fontsource-variable/shantell-sans'
import '@fontsource/im-fell-english/400.css'
import '@fontsource/im-fell-english/400-italic.css'
import '@fontsource-variable/newsreader/opsz.css'
import '@fontsource-variable/newsreader/opsz-italic.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import './styles/global.css'
import './styles/shell.css'
import './styles/pages.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
