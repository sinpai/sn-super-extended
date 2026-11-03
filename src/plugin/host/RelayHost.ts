import ComponentRelay from '@standardnotes/component-relay'
import { EditorHost, HostCallbacks, HostNote, NoteUpdateInfo } from './EditorHost'
import { SettingsStorage } from '../PluginPreferences'

const AppDataDomain = 'org.standardnotes.sn'

/** Shape of the context item Standard Notes streams to editor plugins (see ComponentViewer.jsonForItem). */
type RelayItem = {
  uuid: string
  content_type: string
  isMetadataUpdate?: boolean
  content: {
    title?: string
    text?: string
    preview_plain?: string
    preview_html?: string
    spellcheck?: boolean
    appData?: Record<string, Record<string, unknown> | undefined>
    [key: string]: unknown
  }
  [key: string]: unknown
}

type PendingSave = { uuid: string; text: string; previewPlain: string }

/** The relay's own item type uses a ContentType enum; the item we pass is the one it streamed to us. */
type RelayItemPayload = Parameters<ComponentRelay['saveItemWithPresave']>[0]

function toHostNote(item: RelayItem): HostNote {
  const appData = item.content.appData?.[AppDataDomain]
  return {
    uuid: item.uuid,
    title: item.content.title ?? '',
    text: item.content.text ?? '',
    preview_plain: item.content.preview_plain ?? '',
    locked: Boolean(appData?.locked),
    spellcheck: item.content.spellcheck,
  }
}

/**
 * Talks to Standard Notes through @standardnotes/component-relay (postMessage).
 *
 * Standard Notes sends its one-time "component-registered" handshake on the iframe's load event,
 * so the relay is created in the constructor (call it at module load, before React renders) and
 * everything received before start() is buffered.
 */
export class RelayHost implements EditorHost {
  readonly kind = 'standard-notes' as const
  private relay: ComponentRelay
  private callbacks?: HostCallbacks
  private isReady = false
  private bufferedNote?: { note: HostNote; info: NoteUpdateInfo }
  /** The most recent version of the note Standard Notes sent us. */
  private latestItem?: RelayItem
  /** The text Standard Notes has for the current note, as far as we know. */
  private hostText?: string
  /** Latest text handed to saveNote() that has not been sent yet (saves are debounced by the relay). */
  private pending?: PendingSave

  readonly settings: SettingsStorage = {
    read: (key) => this.relay.getComponentDataValueForKey(key),
    write: (key, value) => this.relay.setComponentDataValueForKey(key, value),
  }

  constructor() {
    this.relay = new ComponentRelay({
      targetWindow: window,
      options: {
        coallesedSaving: true,
        coallesedSavingDelay: 250,
      },
      onReady: () => {
        this.isReady = true
        this.callbacks?.onReady()
      },
    })

    this.relay.streamContextItem((item: RelayItem) => this.receiveItem(item))
  }

  get platform(): string | undefined {
    return this.relay.platform
  }

  get environment(): string | undefined {
    return this.relay.environment
  }

  start(callbacks: HostCallbacks): void {
    this.callbacks = callbacks
    if (this.isReady) {
      callbacks.onReady()
    }
    if (this.bufferedNote) {
      const { note, info } = this.bufferedNote
      this.bufferedNote = undefined
      callbacks.onNote(note, info)
    }
  }

  private receiveItem(item: RelayItem): void {
    const isNewNote = !this.latestItem || this.latestItem.uuid !== item.uuid
    const text = item.content.text ?? ''
    let textChangedElsewhere = false

    if (isNewNote) {
      this.pending = undefined
      this.hostText = text
    } else if (!item.isMetadataUpdate && text !== this.hostText) {
      // Edited somewhere else. That version wins over anything we haven't sent yet.
      textChangedElsewhere = true
      this.hostText = text
      this.pending = undefined
    }

    this.latestItem = item
    const note = toHostNote(item)
    const info = { textChangedElsewhere }

    if (this.callbacks) {
      this.callbacks.onNote(note, info)
    } else if (this.bufferedNote && this.bufferedNote.note.uuid === note.uuid) {
      // Not rendered yet: keep the newest copy, but remember an external change happened.
      this.bufferedNote = {
        note,
        info: { textChangedElsewhere: textChangedElsewhere || this.bufferedNote.info.textChangedElsewhere },
      }
    } else {
      this.bufferedNote = { note, info }
    }
  }

  saveNote(uuid: string, text: string, previewPlain: string): void {
    const item = this.latestItem
    if (!item || item.uuid !== uuid) {
      return
    }

    this.pending = { uuid, text, previewPlain }

    this.relay.saveItemWithPresave(item as RelayItemPayload, () => {
      /**
       * Runs when the debounced save is actually sent. Build the payload from the newest copy of the
       * note so app-side changes made in the meantime (title, pinned, ...) are not reverted, and from
       * the newest pending text (or none, if a newer version arrived from elsewhere).
       */
      const latest = this.latestItem && this.latestItem.uuid === item.uuid ? this.latestItem : item
      const pending = this.pending?.uuid === item.uuid ? this.pending : undefined
      Object.assign(item, latest, {
        content: {
          ...latest.content,
          ...(pending && { text: pending.text, preview_plain: pending.previewPlain, preview_html: undefined }),
        },
      })
      if (pending) {
        this.hostText = pending.text
        this.pending = undefined
      }
    })
  }

  destroy(): void {
    this.callbacks = undefined
    this.relay.deinit()
  }
}
