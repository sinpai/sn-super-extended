/**
 * Minimal stand-in for the Standard Notes side of the component protocol
 * (packages/snjs/lib/Services/ComponentManager/ComponentViewer.ts upstream), for local development:
 *   npm run dev  ->  http://localhost:5173/dev/host.html
 *
 * The plugin is loaded with the same iframe sandbox Standard Notes uses for third-party plugins
 * (no allow-same-origin), so storage/clipboard/worker restrictions match the real thing.
 */
type Note = {
  uuid: string
  content_type: 'Note'
  content: {
    title: string
    text: string
    preview_plain: string
    preview_html?: string
    references: unknown[]
    appData: { 'org.standardnotes.sn': { locked?: boolean } }
    [key: string]: unknown
  }
}

type Message = {
  action: string
  data: Record<string, unknown>
  messageId?: string
  sessionKey?: string
  api?: string
}

const StorageKey = 'sn-super-extended:dev-host'
const iframe = document.getElementById('plugin') as HTMLIFrameElement
const $ = (id: string) => document.getElementById(id) as HTMLElement

const sessionKey = crypto.randomUUID()
const pluginUuid = 'dev-plugin-uuid'
let streamContextMessage: Message | undefined
let componentData: Record<string, unknown> = {}
let darkTheme = false
let saveCount = 0

const MarkdownSample = `# Imported from Markdown

Plain text and **Markdown** notes are converted to Super when opened.

1. Numbered
2. List

\`\`\`js
console.log('code block')
\`\`\`
`

function newNote(uuid: string, title: string, text = ''): Note {
  return {
    uuid,
    content_type: 'Note',
    content: { title, text, preview_plain: '', references: [], appData: { 'org.standardnotes.sn': {} } },
  }
}

type State = { notes: Note[]; current: number; componentData: Record<string, unknown> }

function loadState(): State {
  try {
    const raw = localStorage.getItem(StorageKey)
    if (raw) return JSON.parse(raw) as State
  } catch {
    // ignore
  }
  return { notes: [newNote('note-a', 'First note'), newNote('note-b', 'Second note')], current: 0, componentData: {} }
}

let state = loadState()
componentData = state.componentData ?? {}

function persist() {
  state.componentData = componentData
  localStorage.setItem(StorageKey, JSON.stringify(state))
}

const currentNote = () => state.notes[state.current]

function log(direction: '→' | '←', message: Message) {
  const el = $('log')
  const summary = `${direction} ${message.action}${message.action === 'save-items' ? ` #${saveCount}` : ''}`
  el.textContent = `${summary}\n${el.textContent}`.split('\n').slice(0, 60).join('\n')
}

function render() {
  const note = currentNote()
  const text = note.content.text
  let pretty = text
  try {
    pretty = text ? JSON.stringify(JSON.parse(text), null, 1) : '(empty)'
  } catch {
    // not JSON (e.g. markdown before the first edit)
  }
  $('saved-text').textContent = pretty
  $('saved-preview').textContent = note.content.preview_plain || '(empty)'
  const locked = note.content.appData['org.standardnotes.sn'].locked
  $('note-meta').textContent = `— ${note.content.title}${locked ? ' (editing disabled)' : ''} · saves: ${saveCount}`
}

function post(message: Record<string, unknown>) {
  const outgoing = { ...message, api: 'component' }
  log('→', outgoing as Message)
  // The sandboxed iframe has an opaque ("null") origin, so '*' is the only usable target origin.
  iframe.contentWindow?.postMessage(outgoing, '*')
}

function reply(original: Message, data: Record<string, unknown>) {
  post({ action: 'reply', original, data })
}

function sendContextItem(isMetadataUpdate = false) {
  if (!streamContextMessage) return
  reply(streamContextMessage, { item: { ...structuredClone(currentNote()), isMetadataUpdate } })
}

function themeUrls(): string[] {
  return darkTheme ? [new URL('./themes/dark.css', import.meta.url).href] : []
}

function register() {
  streamContextMessage = undefined
  post({
    action: 'component-registered',
    sessionKey,
    componentData,
    data: { uuid: pluginUuid, environment: 'web', platform: 'mac-web', activeThemeUrls: themeUrls() },
  })
}

window.addEventListener('message', (event: MessageEvent) => {
  if (event.source !== iframe.contentWindow) return
  const message = (typeof event.data === 'string' ? JSON.parse(event.data) : event.data) as Message
  log('←', message)

  switch (message.action) {
    case 'stream-context-item':
      streamContextMessage = message
      sendContextItem()
      break
    case 'save-items': {
      const items = message.data.items as Note[]
      for (const item of items) {
        const index = state.notes.findIndex((note) => note.uuid === item.uuid)
        if (index === -1) continue
        if (state.notes[index].content.appData['org.standardnotes.sn'].locked) {
          alert('The note you are attempting to save has editing disabled')
          continue
        }
        state.notes[index] = { ...state.notes[index], content: { ...item.content } as Note['content'] }
      }
      saveCount++
      persist()
      render()
      reply(message, {})
      // Like the real app after sync: echo the item back flagged as a metadata update.
      setTimeout(() => sendContextItem(true), 300)
      break
    }
    case 'set-component-data':
      componentData = (message.data.componentData as Record<string, unknown>) ?? {}
      persist()
      break
    default:
      break
  }
})

$('toggle-lock').onclick = () => {
  const appData = currentNote().content.appData['org.standardnotes.sn']
  appData.locked = !appData.locked
  persist()
  render()
  sendContextItem()
}

$('remote-edit').onclick = () => {
  const note = currentNote()
  const paragraph = {
    children: [{ detail: 0, format: 0, mode: 'normal', style: '', text: `Edited on another device at ${new Date().toLocaleTimeString()}`, type: 'text', version: 1 }],
    direction: 'ltr', format: '', indent: 0, type: 'paragraph', version: 1,
  }
  let json: { root: { children: unknown[] } }
  try {
    json = JSON.parse(note.content.text)
  } catch {
    json = { root: { children: [], direction: null, format: '', indent: 0, type: 'root', version: 1 } as never }
  }
  json.root.children.push(paragraph)
  note.content.text = JSON.stringify(json)
  persist()
  render()
  sendContextItem()
}

$('rename').onclick = () => {
  currentNote().content.title = `Renamed at ${new Date().toLocaleTimeString()}`
  persist()
  render()
  sendContextItem()
}

$('switch-note').onclick = () => {
  state.current = (state.current + 1) % state.notes.length
  persist()
  render()
  sendContextItem()
}

$('load-markdown').onclick = () => {
  const index = state.notes.findIndex((note) => note.uuid === 'note-md')
  if (index === -1) {
    state.notes.push(newNote('note-md', 'Markdown note', MarkdownSample))
    state.current = state.notes.length - 1
  } else {
    state.notes[index].content.text = MarkdownSample
    state.current = index
  }
  persist()
  // Like Standard Notes, opening another note recreates the editor iframe.
  iframe.src = iframe.src
  render()
}

$('toggle-theme').onclick = () => {
  darkTheme = !darkTheme
  document.body.style.background = darkTheme ? '#1b1d22' : '#eef0f3'
  post({ action: 'themes', data: { themes: themeUrls() } })
}

$('reset').onclick = () => {
  localStorage.removeItem(StorageKey)
  location.reload()
}

iframe.addEventListener('load', register)
const params = new URLSearchParams(location.search)
// ?sameOrigin=1 adds allow-same-origin so tests can reach into the iframe. Standard Notes never does this.
if (params.has('sameOrigin')) {
  iframe.sandbox.add('allow-same-origin')
}
// ?plugin=<url> loads another build, e.g. `npm run preview` (http://localhost:4173/) or your hosted copy.
iframe.src = params.get('plugin') ?? new URL('../index.html', import.meta.url).href
render()
