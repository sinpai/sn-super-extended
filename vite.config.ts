import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import fs from 'node:fs'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { fileURLToPath } from 'node:url'
import { PluginConfig } from './src/plugin/config'

const root = path.dirname(fileURLToPath(import.meta.url))
const r = (p: string) => path.resolve(root, p)

const pkg = JSON.parse(fs.readFileSync(r('package.json'), 'utf8')) as { version: string; description: string }

/**
 * The JSON you paste into Standard Notes > Preferences > Plugins > "Install Custom Plugin".
 * Fields follow ThirdPartyFeatureDescription/EditorFeatureDescription in @standardnotes/features.
 * - note_type must NOT be "super": Standard Notes always opens "super" notes in its built-in editor.
 * - file_type "json": switching a built-in Super note to this editor keeps its JSON unchanged.
 */
function pluginManifest(baseUrl: string) {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return {
    identifier: PluginConfig.identifier,
    name: PluginConfig.name,
    content_type: 'SN|Component',
    area: 'editor-editor',
    version: pkg.version,
    description: pkg.description,
    url: `${base}index.html`,
    latest_url: `${base}ext.json`,
    file_type: 'json',
    note_type: 'unknown',
    interchangeable: false,
    spellcheckControl: true,
  }
}

/**
 * Serves /ext.json from the dev and preview servers (pointing at that server), and writes
 * dist/ext.json at build time when PLUGIN_URL is set, e.g.
 *   PLUGIN_URL=https://you.github.io/sn-super-extended/ npm run build
 */
function pluginManifestFile(): Plugin {
  const serve = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (req.url?.split('?')[0] !== '/ext.json') {
      return next()
    }
    const base = `http://${req.headers.host ?? 'localhost:5173'}/`
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.end(JSON.stringify(pluginManifest(base), null, 2))
  }

  return {
    name: 'sn-plugin-manifest',
    configureServer(server) {
      server.middlewares.use(serve)
    },
    configurePreviewServer(server) {
      server.middlewares.use(serve)
    },
    generateBundle() {
      const url = process.env.PLUGIN_URL
      if (!url) {
        this.warn('PLUGIN_URL is not set, so dist/ext.json was not written. See README "Hosting".')
        return
      }
      this.emitFile({ type: 'asset', fileName: 'ext.json', source: JSON.stringify(pluginManifest(url), null, 2) })
    },
  }
}

/**
 * Upstream (webpack + worker-loader) imports workers as `import Worker from './X.worker'`.
 * Rewrite those imports to Vite's inline-worker syntax so the upstream files stay untouched.
 * Inline (blob) workers are required because third-party plugin iframes are sandboxed
 * without `allow-same-origin`, so a worker loaded from a separate URL would be blocked.
 */
function upstreamWorkerImports(): Plugin {
  return {
    name: 'sn-upstream-worker-imports',
    enforce: 'pre',
    async resolveId(source, importer) {
      if (!importer || !/\.worker$/.test(source)) {
        return null
      }
      const resolved = await this.resolve(`${source}.tsx`, importer, { skipSelf: true })
      return resolved ? `${resolved.id}?worker&inline` : null
    },
  }
}

export default defineConfig({
  // Relative asset URLs so the build works from any sub-path (GitHub Pages, a folder on your server, etc.)
  base: './',
  plugins: [
    pluginManifestFile(),
    upstreamWorkerImports(),
    // Upstream imports SVG files as React components (svgr). `?url` imports keep working as plain URLs.
    svgr({ include: '**/*.svg', svgrOptions: { exportType: 'default' } }),
    react(),
  ],
  define: {
    __WEB_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: [
      { find: /^@\//, replacement: r('src/web/javascripts') + '/' },
      { find: /^@plugin\//, replacement: r('src/plugin') + '/' },
      { find: /^@extensions\//, replacement: r('src/extensions') + '/' },
      // Vendored subsets of Standard Notes monorepo packages (see src/compat/README.md)
      { find: /^@standardnotes\/snjs$/, replacement: r('src/compat/snjs.ts') },
      { find: /^@standardnotes\/models$/, replacement: r('src/compat/models.ts') },
      {
        find: /^@standardnotes\/ui-services\/src\/(.*)$/,
        replacement: r('src/packages/ui-services/src') + '/$1',
      },
      { find: /^@standardnotes\/ui-services$/, replacement: r('src/compat/ui-services.ts') },
      { find: /^@standardnotes\/utils$/, replacement: r('src/compat/utils.ts') },
      { find: /^@standardnotes\/features$/, replacement: r('src/compat/features.ts') },
      { find: /^@standardnotes\/i18n$/, replacement: r('src/compat/i18n.ts') },
      { find: /^@standardnotes\/icons$/, replacement: r('src/packages/icons/src/index.ts') },
    ],
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Upstream SCSS still uses @import; keep the build output quiet.
        silenceDeprecations: ['import', 'global-builtin', 'color-functions'],
      },
    },
  },
  worker: {
    format: 'es',
    plugins: () => [upstreamWorkerImports()],
  },
  server: {
    port: 5173,
    strictPort: true,
    // Standard Notes (web/desktop) loads the plugin in an iframe from another origin.
    cors: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
    cors: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 4000,
  },
})
