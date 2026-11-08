import { createHeadlessEditor } from '@lexical/headless'
import { $createParagraphNode, $getRoot } from 'lexical'
import { HeadlessSuperConverter } from '@/Components/SuperEditor/Tools/HeadlessSuperConverter'
import { BlockEditorNodes } from '@/Components/SuperEditor/Lexical/Nodes/AllNodes'
import { handleEditorChange } from '@/Components/SuperEditor/Utils'
import { NotePreviewCharLimit } from '@plugin/config'

let converter: HeadlessSuperConverter | undefined
const getConverter = () => (converter ??= new HeadlessSuperConverter())

export type PreparedContent =
  | { kind: 'ok'; superString: string; convertedFrom?: 'md' | 'html' }
  /** Super JSON this build can't parse (e.g. node types added in a newer Super). Never overwrite it. */
  | { kind: 'unsupported' }

function looksLikeSuperJSON(text: string): boolean {
  try {
    const parsed = JSON.parse(text)
    return typeof parsed === 'object' && parsed !== null && parsed.root?.type === 'root'
  } catch {
    return false
  }
}

function looksLikeHTML(text: string): boolean {
  return /^\s*<(p|div|span|h[1-6]|ul|ol|li|table|blockquote|pre|br|img|a|b|i|strong|em)\b[^>]*>/i.test(text)
}

/**
 * Turns whatever is stored in the note into Super JSON:
 * - empty -> empty string (the composer starts with an empty document)
 * - Super JSON -> as is
 * - anything else -> imported as Markdown (plain text is valid Markdown), or as HTML if it looks like HTML.
 *   Same approach the app uses for text shared into a Super note (WebApplication.noteTextForSharedContent).
 */
export function prepareNoteContent(text: string): PreparedContent {
  if (text.length === 0) {
    return { kind: 'ok', superString: '' }
  }

  const superConverter = getConverter()
  if (superConverter.isValidSuperString(text)) {
    return { kind: 'ok', superString: text }
  }

  if (looksLikeSuperJSON(text)) {
    return { kind: 'unsupported' }
  }

  const format = looksLikeHTML(text) ? 'html' : 'md'
  return { kind: 'ok', superString: superConverter.convertOtherFormatToSuperString(text, format), convertedFrom: format }
}

/** Like prepareNoteContent, for content arriving while the editor is open. */
export function toSuperString(text: string): string | undefined {
  const prepared = prepareNoteContent(text)
  if (prepared.kind !== 'ok') {
    return undefined
  }
  return prepared.superString.length > 0 ? prepared.superString : getEmptySuperString()
}

let emptySuperString: string | undefined
function getEmptySuperString(): string {
  if (!emptySuperString) {
    const editor = createHeadlessEditor({ nodes: BlockEditorNodes, onError: console.error })
    editor.update(() => $getRoot().clear().append($createParagraphNode()), { discrete: true })
    emptySuperString = JSON.stringify(editor.getEditorState().toJSON())
  }
  return emptySuperString
}

/** The notes list preview for Super JSON, the same one the editor saves with each change (handleEditorChange). */
export function getSuperPreview(superString: string): string {
  const editor = createHeadlessEditor({ nodes: BlockEditorNodes, onError: console.error })
  const editorState = editor.parseEditorState(superString)
  let preview = ''
  editorState.read(() =>
    handleEditorChange(editorState, NotePreviewCharLimit, (_value, previewText) => {
      preview = previewText
    }),
  )
  return preview
}

/**
 * Whether the preview is the start of the note's raw text, which Standard Notes uses when it saves a note's
 * text without a preview, e.g. in its "Convert to Super Extended" dialog. For Super notes that is JSON
 * ({"root":{"children":...), which the notes list then shows.
 */
export function isRawTextPreview(preview: string, text: string): boolean {
  const start = preview.replace(/(\.\.\.|…)$/, '')
  return start.length > 0 && text.startsWith(start)
}
