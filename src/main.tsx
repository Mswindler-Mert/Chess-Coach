import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { getLanguage } from './i18n'
import App from './ui/App'
import { applyTheme } from './ui/theme'

document.documentElement.lang = getLanguage()
applyTheme()

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
