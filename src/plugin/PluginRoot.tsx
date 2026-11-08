import { useEffect, useState } from 'react'
import { PrefKey, SNNote } from '@standardnotes/snjs'
import ApplicationProvider from '@/Components/ApplicationProvider'
import { SuperEditor } from '@/Components/SuperEditor/SuperEditor'
import { EditorHost, HostNote } from './host/EditorHost'
import { PluginApplication, parseEnvironment, parsePlatform } from './PluginApplication'
import { PluginNoteController } from './PluginNoteController'
import { PluginPreferences } from './PluginPreferences'
import { PreparedContent, getSuperPreview, isRawTextPreview, prepareNoteContent } from './editor/SuperContent'
import { ConnectionProblem } from './ConnectionProblem'

type LoadedNote = {
  controller: PluginNoteController
  note: SNNote
  content: PreparedContent
}

const FormatNames = { md: 'Markdown / plain text', html: 'HTML' } as const

function ConversionNotice({ format, onDismiss }: { format: keyof typeof FormatNames; onDismiss: () => void }) {
  return (
    <div className="flex items-center gap-2 border-b border-border bg-info-backdrop px-4 py-2 text-sm text-text">
      <span className="flex-grow">
        This note was imported from {FormatNames[format]}. It will be saved in Super format when you edit it.
      </span>
      <button type="button" className="rounded px-2 py-0.5 font-semibold text-info hover:bg-contrast" onClick={onDismiss}>
        OK
      </button>
    </div>
  )
}

function UnsupportedContent() {
  return (
    <div className="flex h-full items-center justify-center p-6 text-center text-sm text-passive-0">
      <div className="max-w-md">
        <div className="mb-2 text-base font-semibold text-text">This note can't be displayed by this editor version</div>
        It is stored in Super format but contains content this build doesn't know about (for example blocks added in a
        newer Super version). Editing is disabled so nothing gets lost. Open the note with the built-in Super editor, or
        update this plugin.
      </div>
    </div>
  )
}

/** How long to wait for the note before showing ConnectionProblem instead of a blank editor. */
const NoteWaitTimeoutMs = 6000

/**
 * Standard Notes' "Convert to Super Extended" dialog saves the note with the start of its JSON as the
 * preview, so the notes list shows {"root":{"children":... The editor only saves a preview when the note
 * changes, so put the text preview back as soon as the note opens. Only for synced notes: the read-only
 * copies in the conversion dialog and note history never are, and saving them shows an error message.
 */
function replaceRawPreview(controller: PluginNoteController, note: HostNote, content: PreparedContent): void {
  if (content.kind !== 'ok' || content.convertedFrom || !note.synced || note.locked) {
    return
  }
  if (!isRawTextPreview(note.preview_plain, note.text)) {
    return
  }
  try {
    const preview = getSuperPreview(note.text)
    if (preview !== note.preview_plain) {
      void controller.saveAndAwaitLocalPropagation({
        text: note.text,
        isUserModified: false,
        previews: { previewPlain: preview },
      })
    }
  } catch (error) {
    console.error('Could not replace the note preview', error)
  }
}

export function PluginRoot({ host }: { host: EditorHost }) {
  const [application, setApplication] = useState<PluginApplication>()
  const [loaded, setLoaded] = useState<LoadedNote>()
  const [dismissedNotice, setDismissedNotice] = useState<string>()
  const [waitedTooLong, setWaitedTooLong] = useState(false)

  useEffect(() => {
    if (host.kind !== 'standard-notes') {
      return
    }
    const timer = setTimeout(() => setWaitedTooLong(true), NoteWaitTimeoutMs)
    return () => clearTimeout(timer)
  }, [host])

  useEffect(() => {
    let app: PluginApplication | undefined
    let controller: PluginNoteController | undefined

    host.start({
      onReady: () => {
        if (host.platform) {
          document.body.classList.add(host.platform)
        }
      },
      onNote: (note, { textChangedElsewhere }) => {
        if (!app) {
          app = new PluginApplication(
            parsePlatform(host.platform),
            parseEnvironment(host.environment),
            new PluginPreferences(host.settings),
          )
          setApplication(app)
        }

        if (!controller || controller.item.uuid !== note.uuid) {
          controller = new PluginNoteController(host, note)
          const content = prepareNoteContent(note.text)
          setLoaded({ controller, note: controller.item, content })
          replaceRawPreview(controller, note, content)
          return
        }

        const current = controller
        current.receiveNote(note, textChangedElsewhere)
        const unsupported = textChangedElsewhere && prepareNoteContent(note.text).kind === 'unsupported'
        setLoaded((previous) =>
          previous && previous.controller === current
            ? { ...previous, note: current.item, content: unsupported ? { kind: 'unsupported' } : previous.content }
            : previous,
        )
      },
    })

    return () => {
      host.destroy()
      app?.deinit()
    }
  }, [host])

  if (!application || !loaded) {
    return waitedTooLong ? <ConnectionProblem host={host} /> : null
  }

  const { controller, note, content } = loaded

  if (content.kind === 'unsupported') {
    return <UnsupportedContent />
  }

  return (
    <ApplicationProvider application={application}>
      <div className="flex h-full flex-col">
        {content.convertedFrom && dismissedNotice !== note.uuid && (
          <ConversionNotice format={content.convertedFrom} onDismiss={() => setDismissedNotice(note.uuid)} />
        )}
        <div className="relative min-h-0 flex-grow">
          <SuperEditor
            key={note.uuid}
            application={application}
            controller={controller}
            initialValue={content.superString}
            spellcheck={note.spellcheck ?? application.preferences.get(PrefKey.EditorSpellcheck)}
            readonly={note.locked}
          />
        </div>
      </div>
    </ApplicationProvider>
  )
}
