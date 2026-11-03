import { SNNote } from '@standardnotes/snjs'
import { EditorHost, HostNote } from './host/EditorHost'

/** Mirrors upstream PayloadEmitSource semantics closely enough for SuperEditor. */
export type NoteChangeSource = 'local' | 'retrieved'

type InnerValueObserver = (note: SNNote, source: NoteChangeSource) => void

/**
 * Plugin counterpart of upstream's NoteViewController
 * (packages/web/src/javascripts/Components/NoteView/Controller/NoteViewController.ts),
 * exposing the same member names SuperEditor uses.
 */
export class PluginNoteController {
  private note: SNNote
  private observers = new Set<InnerValueObserver>()

  constructor(
    private host: EditorHost,
    initialNote: HostNote,
  ) {
    this.note = { ...initialNote }
  }

  get item(): SNNote {
    return this.note
  }

  /** Upstream autofocuses brand-new notes. A plugin can't see that flag, so treat empty notes as new. */
  get isTemplateNote(): boolean {
    return this.note.text.length === 0 && this.note.title.length === 0
  }

  addNoteInnerValueChangeObserver(observer: InnerValueObserver): () => void {
    this.observers.add(observer)
    return () => this.observers.delete(observer)
  }

  /** Called by PluginRoot for every update of the current note coming from Standard Notes. */
  receiveNote(note: HostNote, textChangedElsewhere: boolean): void {
    // Keep our own (possibly not yet saved) text unless the note was edited elsewhere.
    this.note = { ...note, text: textChangedElsewhere ? note.text : this.note.text }
    this.observers.forEach((observer) => observer(this.note, textChangedElsewhere ? 'retrieved' : 'local'))
  }

  async saveAndAwaitLocalPropagation(params: {
    text: string
    isUserModified: boolean
    previews: { previewPlain: string; previewHtml?: string }
  }): Promise<void> {
    if (this.note.locked) {
      return
    }
    this.note = { ...this.note, text: params.text, preview_plain: params.previews.previewPlain }
    this.host.saveNote(this.note.uuid, params.text, params.previews.previewPlain)
    // Upstream observers also hear about local saves (source "local"), e.g. so the Markdown preview sees new text.
    this.observers.forEach((observer) => observer(this.note, 'local'))
  }
}

export function isPayloadSourceRetrieved(source: NoteChangeSource): boolean {
  return source === 'retrieved'
}
