import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './theme.css'
import './architecture/components/keyframes.css'
import App from './App'

const root = document.getElementById('root')
if (root === null) throw new Error('The page is missing its root element.')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
