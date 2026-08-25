import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Served from a project GitHub Pages site, so assets resolve under the repo
 * name rather than the domain root. Overridable for a custom domain later.
 */
export default defineConfig({
  plugins: [react()],
  base: process.env.SITE_BASE ?? '/systems-map/',
})
