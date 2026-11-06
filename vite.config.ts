import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'

const BUILD_ID = `${Date.now().toString(36)}-${(process.env.GITHUB_SHA ?? 'local').slice(0, 7)}`

// Writes dist/version.json so open pages can detect a new deploy and reload themselves.
const versionFile = (): Plugin => ({
  name: 'ag-version-file',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD_ID }) })
  },
})

export default defineConfig({
  // GitHub Pages serves the site from /<repo-name>/
  base: '/algorithm-graffiti/',
  plugins: [react(), tailwindcss(), versionFile()],
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  server: { host: true },
})
