import { EditorHost, HostCallbacks, HostNote } from './EditorHost'
import { SettingsStorage } from '../PluginPreferences'

const NoteKey = 'sn-super-extended:standalone-note'
const SettingsKeyPrefix = 'sn-super-extended:standalone-setting:'

const WelcomeMarkdown = `# Super Extended (standalone mode)

This page is not running inside Standard Notes, so the note is kept in this browser's localStorage.
Use it to develop the editor: run \`npm run dev\` and edit files under \`src/\`.

- Type **/** for the block menu, or use the toolbar above
- Open **dev/host.html** to see the editor embedded the way Standard Notes embeds it
- [ ] Checklists, tables, code blocks, collapsible sections and more
`

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Storage unavailable (e.g. sandboxed iframe): keep working in memory.
  }
}

/** Dev host used when index.html is opened directly instead of inside Standard Notes. */
export class StandaloneHost implements EditorHost {
  readonly kind = 'standalone' as const
  readonly platform = undefined
  readonly environment = 'web'
  private memorySettings = new Map<string, unknown>()

  readonly settings: SettingsStorage = {
    read: (key) => {
      const raw = safeGet(SettingsKeyPrefix + key)
      if (raw !== null) {
        try {
          return JSON.parse(raw)
        } catch {
          return undefined
        }
      }
      return this.memorySettings.get(key)
    },
    write: (key, value) => {
      this.memorySettings.set(key, value)
      safeSet(SettingsKeyPrefix + key, JSON.stringify(value))
    },
  }

  private note: HostNote = {
    uuid: 'standalone-note',
    title: 'Standalone note',
    text: WelcomeMarkdown,
    preview_plain: '',
    locked: false,
  }

  start({ onReady, onNote }: HostCallbacks): void {
    const stored = safeGet(NoteKey)
    if (stored !== null) {
      this.note = { ...this.note, text: stored }
    }
    onReady()
    onNote(this.note, { textChangedElsewhere: false })
  }

  saveNote(_uuid: string, text: string, previewPlain: string): void {
    this.note = { ...this.note, text, preview_plain: previewPlain }
    safeSet(NoteKey, text)
  }

  destroy(): void {
    // Nothing to clean up.
  }
}
