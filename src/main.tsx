import './plugin/diagnostics'
import { createRoot } from 'react-dom/client'
import './plugin/styles/index.scss'
import { ErrorBoundary } from '@/Utils/ErrorBoundary'
import { PluginRoot } from './plugin/PluginRoot'
import { RelayHost } from './plugin/host/RelayHost'
import { StandaloneHost } from './plugin/host/StandaloneHost'

// Inside Standard Notes the plugin is loaded in an iframe; opened directly it runs in standalone dev mode.
const isEmbedded = window.parent !== window
const host = isEmbedded ? new RelayHost() : new StandaloneHost()

document.documentElement.classList.add(isEmbedded ? 'sn-plugin-embedded' : 'sn-plugin-standalone')

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Missing #root element')
}

createRoot(rootElement).render(
  <ErrorBoundary>
    <PluginRoot host={host} />
  </ErrorBoundary>,
)
