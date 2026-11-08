/**
 * Plugin identity. `identifier` is stored on every note that uses this editor
 * (note.editorIdentifier), so pick it once and keep it stable. Changing it later makes
 * existing notes fall back to the plain text editor.
 *
 * The same values are used to generate dist/ext.json and the desktop zip (see vite.config.ts).
 */
export const PluginConfig = {
  identifier: 'com.sn-super-extended.editor',
  name: 'Super Extended',
} as const

/** Upstream Super notes use the same preview length (SuperNotePreviewCharLimit). */
export const NotePreviewCharLimit = 160

/** Ask before embedding files larger than this inline (they are stored base64-encoded in the note). */
export const InlineFileSizeWarningThreshold = 2 * 1024 * 1024
