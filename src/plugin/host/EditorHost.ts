import { SettingsStorage } from '../PluginPreferences'

/** The note as the editor sees it, independent of how it was delivered. */
export type HostNote = {
  uuid: string
  title: string
  text: string
  preview_plain: string
  locked: boolean
  spellcheck?: boolean
}

export type NoteUpdateInfo = {
  /**
   * True when the note text differs from what this editor last loaded or saved, i.e. it was changed
   * elsewhere (another device, note history restore...). False for echoes of our own saves, sync
   * metadata updates, and changes to other fields such as the title or the locked flag.
   */
  textChangedElsewhere: boolean
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
  start(callbacks: HostCallbacks): void
  saveNote(uuid: string, text: string, previewPlain: string): void
  destroy(): void
}
