/**
 * [sn-super-extended] PLUGIN OVERRIDE of packages/web/src/javascripts/Components/SuperEditor/SuperEditor.tsx
 *
 * Same structure as upstream, adapted to run inside a plugin iframe:
 * - WebApplication / NoteViewController -> PluginApplication / PluginNoteController (component relay)
 * - no feature-entitlement banner (plugins are not entitlement-gated)
 * - no linking/files controllers: the @-mention link picker (ItemSelectionPlugin) and
 *   "create note from selection" need the app's item database and are left out
 * - read-only state follows the note's "Prevent editing" flag via EditableStatePlugin
 * - font size / line height come from plugin settings instead of the app's local preferences
 */
import { c } from 'ttag'
import { EditorLineHeightValues } from '@standardnotes/snjs'
import { CSSProperties, FocusEvent, FunctionComponent, useCallback, useEffect, useRef, useState } from 'react'
import { BlocksEditor } from './BlocksEditor'
import { BlocksEditorComposer } from './BlocksEditorComposer'
import FilePlugin from './Plugins/EncryptedFilePlugin/FilePlugin'
import { ErrorBoundary } from '@/Utils/ErrorBoundary'
import ItemBubblePlugin from './Plugins/ItemBubblePlugin/ItemBubblePlugin'
import {
  ChangeContentCallbackPlugin,
  ChangeEditorFunction,
} from './Plugins/ChangeContentCallback/ChangeContentCallback'
import { SUPER_SHOW_MARKDOWN_PREVIEW, getPrimaryModifier } from '@standardnotes/ui-services'
import { SuperNoteMarkdownPreview } from './SuperNoteMarkdownPreview'
import GetMarkdownPlugin, { GetMarkdownPluginInterface } from './Plugins/GetMarkdownPlugin/GetMarkdownPlugin'
import { useResponsiveEditorFontSize } from '@/Utils/getPlaintextFontSize'
import ModalOverlay from '@/Components/Modal/ModalOverlay'
import AutoFocusPlugin from './Plugins/AutoFocusPlugin'
import { usePluginSetting } from '@/Hooks/usePreference'
import BlockPickerMenuPlugin from './Plugins/BlockPickerPlugin/BlockPickerPlugin'
import { ElementIds } from '@/Constants/ElementIDs'
import { PluginApplication } from '@plugin/PluginApplication'
import { PluginNoteController, isPayloadSourceRetrieved } from '@plugin/PluginNoteController'
import { NotePreviewCharLimit } from '@plugin/config'
import EditableStatePlugin from '@plugin/editor/EditableStatePlugin'
import { toSuperString } from '@plugin/editor/SuperContent'
import { TaskStatusPlugin } from '@extensions/TaskStatus'

export const SuperNotePreviewCharLimit = NotePreviewCharLimit

type Props = {
  application: PluginApplication
  controller: PluginNoteController
  /** Super JSON to start with. Defaults to the note text. */
  initialValue?: string
  spellcheck: boolean
  readonly?: boolean
  onFocus?: (event: FocusEvent) => void
  onBlur?: (event: FocusEvent) => void
}

export const SuperEditor: FunctionComponent<Props> = ({
  application,
  spellcheck,
  controller,
  initialValue,
  readonly,
  onFocus,
  onBlur,
}) => {
  const note = useRef(controller.item)
  const changeEditorFunction = useRef<ChangeEditorFunction>()
  const ignoreNextChange = useRef(false)
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false)
  const getMarkdownPlugin = useRef<GetMarkdownPluginInterface | null>(null)

  const keyboardService = application.keyboardService
  const isEditorReadonly = Boolean(readonly)

  useEffect(() => {
    return keyboardService.addCommandHandler({
      command: SUPER_SHOW_MARKDOWN_PREVIEW,
      category: 'Super notes',
      description: c('B3.Notes.EditorToolbar.Action').t`Show markdown preview for current note`,
      onKeyDown: () => {
        setShowMarkdownPreview((s) => !s)
        return true
      },
    })
  }, [keyboardService])

  useEffect(() => {
    const platform = application.platform
    const primaryModifier = getPrimaryModifier(application.platform)

    return keyboardService.registerExternalKeyboardShortcutHelpItems([
      {
        key: 'b',
        modifiers: [primaryModifier],
        description: c('B3.Notes.EditorToolbar.Action').t`Bold`,
        category: 'Formatting',
        platform: platform,
      },
      {
        key: 'i',
        modifiers: [primaryModifier],
        description: c('B3.Notes.EditorToolbar.Action').t`Italic`,
        category: 'Formatting',
        platform: platform,
      },
      {
        key: 'u',
        modifiers: [primaryModifier],
        description: c('B3.Notes.EditorToolbar.Action').t`Underline`,
        category: 'Formatting',
        platform: platform,
      },
      {
        key: 'k',
        modifiers: [primaryModifier],
        description: c('B3.Notes.EditorToolbar.Action').t`Link`,
        category: 'Formatting',
        platform: platform,
      },
    ])
  }, [application.platform, keyboardService])

  const closeMarkdownPreview = useCallback(() => {
    setShowMarkdownPreview(false)
  }, [])

  const handleChange = useCallback(
    async (value: string, preview: string) => {
      if (ignoreNextChange.current === true) {
        ignoreNextChange.current = false
        return
      }
      if (isEditorReadonly) {
        return
      }

      void controller.saveAndAwaitLocalPropagation({
        text: value,
        isUserModified: true,
        previews: {
          previewPlain: preview,
          previewHtml: undefined,
        },
      })
    },
    [controller, isEditorReadonly],
  )

  useEffect(() => {
    const disposer = controller.addNoteInnerValueChangeObserver((updatedNote, source) => {
      if (updatedNote.uuid !== note.current.uuid) {
        throw Error('Editor received changes for non-current note')
      }

      if (isPayloadSourceRetrieved(source)) {
        const superString = toSuperString(updatedNote.text)
        if (superString !== undefined) {
          ignoreNextChange.current = true
          changeEditorFunction.current?.(superString)
        }
      }

      note.current = updatedNote
    })

    return disposer
  }, [controller, controller.item.uuid])

  const [lineHeight] = usePluginSetting('editorLineHeight')
  const [fontSize] = usePluginSetting('editorFontSize')
  const responsiveFontSize = useResponsiveEditorFontSize(fontSize, false)

  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const invalidURLClickFix = (event: MouseEvent) => {
      if ((event.target as HTMLElement).tagName !== 'A') {
        return
      }
      const isAbsoluteLink = (event.target as HTMLAnchorElement).getAttribute('href')?.startsWith('http')
      if (!isAbsoluteLink) {
        event.preventDefault()
      }
    }

    const element = ref.current

    if (element) {
      element.addEventListener('click', invalidURLClickFix)
    }

    return () => {
      if (element) {
        element.removeEventListener('click', invalidURLClickFix)
      }
    }
  }, [])

  return (
    <div
      id={ElementIds.SuperEditor}
      className="font-editor relative flex h-full w-full flex-col"
      style={
        {
          '--line-height': EditorLineHeightValues[lineHeight],
          '--font-size': responsiveFontSize,
        } as CSSProperties
      }
      ref={ref}
    >
      <ErrorBoundary>
        <BlocksEditorComposer readonly={isEditorReadonly} initialValue={initialValue ?? note.current.text}>
          <BlocksEditor
            onChange={handleChange}
            className="blocks-editor h-full resize-none"
            previewLength={SuperNotePreviewCharLimit}
            spellcheck={spellcheck}
            readonly={isEditorReadonly}
            onFocus={onFocus}
            onBlur={onBlur}
          >
            <FilePlugin currentNote={note.current} />
            <ItemBubblePlugin />
            <GetMarkdownPlugin ref={getMarkdownPlugin} />
            <ChangeContentCallbackPlugin
              providerCallback={(callback) => (changeEditorFunction.current = callback)}
            />
            <EditableStatePlugin readonly={isEditorReadonly} />
            <AutoFocusPlugin isEnabled={controller.isTemplateNote} />
            <BlockPickerMenuPlugin />
            <TaskStatusPlugin />
          </BlocksEditor>
        </BlocksEditorComposer>
        <ModalOverlay isOpen={showMarkdownPreview} close={closeMarkdownPreview}>
          <SuperNoteMarkdownPreview note={note.current} closeDialog={closeMarkdownPreview} />
        </ModalOverlay>
      </ErrorBoundary>
    </div>
  )
}
