import { SettingsStorage } from '../PluginPreferences'

/** The note as the editor sees it, independent of how it was delivered. */
export type HostNote = {
  uuid: string
  title: string
  text: string
  preview_plain: string
  locked: boolean
  spellcheck?: boolean
  /**
   * Whether Standard Notes has synced the note with its server. False for the read-only copies it shows in
   * its conversion dialog and note history, where a plugin that saves gets an error message, and for notes
   * in accounts without sync.
   */
  synced: boolean
}

export type NoteUpdateInfo = {
  /**
   * True when the note text differs from what this editor last loaded or saved, i.e. it was changed
   * elsewhere (another device, note history restore...). False for echoes of our own saves, sync
   * metadata updates, and changes to other fields such as the title or the locked flag.
   */
  textChangedElsewhere: boolean
}

/** What is known about the connection to Standard Notes, for troubleshooting. */
export type ConnectionInfo = {
  /** Whether Standard Notes sent its "component-registered" handshake. */
  registered: boolean
  /** Origin of the first message from the app ("null" on Android, where the app runs from file://). */
  appOrigin: string | undefined
}

export type HostCallbacks = {
  onReady: () => void
  onNote: (note: HostNote, info: NoteUpdateInfo) => void
}

/**
 * Where the note comes from and goes to. Inside Standard Notes this is the component relay;
 * when index.html is opened directly in a browser tab it is a localStorage-backed dev host.
 */
export interface EditorHost {
  readonly kind: 'standard-notes' | 'standalone'
  /** Platform string as reported by the host, e.g. "mac-web", "windows-desktop", "ios". */
  readonly platform: string | undefined
  /** Environment string as reported by the host, e.g. "web", "desktop", "native-mobile-web". */
  readonly environment: string | undefined
  readonly settings: SettingsStorage
  getConnectionInfo?(): ConnectionInfo
  start(callbacks: HostCallbacks): void
  saveNote(uuid: string, text: string, previewPlain: string): void
  destroy(): void
}
