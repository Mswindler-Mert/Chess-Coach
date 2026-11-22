import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { getLanguage } from './i18n'
import App from './ui/App'
import { applyTheme } from './ui/theme'

document.documentElement.lang = getLanguage()
applyTheme()

// When a new PWA service worker takes over an already-controlled page, reload once so
// browsers like Brave immediately show the latest deployed UI instead of a stale cache.
if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
  let reloaded = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return
    reloaded = true
    window.location.reload()
  })
}

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
