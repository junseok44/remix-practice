import { createAssetServer } from 'remix/assets'

import { routes } from './routes.ts'

const rootDir = process.cwd()
const nodeEnv = process.env.NODE_ENV ?? 'development'
const isDevelopment = nodeEnv === 'development'

export const assetServer = createAssetServer({
  basePath: '/assets',
  rootDir,
  fileMap: {
    'app/*path': 'app/*path',
    'node_modules/*path': 'node_modules/*path',
  },
  // allow/deny decide what the public can fetch, not just what gets compiled.
  allow: ['app/assets/**', 'node_modules/**'],
  deny: ['app/**/*.test.*'],
  files: { extensions: ['.svg'] },
  sourceMaps: isDevelopment ? 'external' : undefined,
  minify: !isDevelopment,
  watch: false,
})

// Document head asset URLs are resolved here once instead of being rebuilt
// inside components.
export const entryHref = routes.assets.href({ path: 'app/assets/entry.ts' })
export const stylesheetHref = '/app.css'
export const coverPlaceholderHref = await assetServer.getHref('app/assets/cover-placeholder.svg')
