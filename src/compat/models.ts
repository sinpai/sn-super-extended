/**
 * Stand-in for `@standardnotes/models`.
 *
 * Only the symbols used by the vendored Super editor code are provided. Enums/types are re-exported
 * from verbatim upstream copies in src/packages/models; item types (SNNote, FileItem) are reduced to
 * the fields a plugin can actually see.
 */
export * from '../packages/models/src/Domain/Device/Platform'
export * from '../packages/models/src/Domain/Device/Environment'
export * from '../packages/models/src/Domain/Utilities/Icon/IconType'
export * from '../packages/models/src/Domain/Syncable/UserPrefs/EditorFontSize'
export * from '../packages/models/src/Domain/Syncable/UserPrefs/EditorLineHeight'

/** Subset of upstream `PrefKey` (packages/models/src/Domain/Syncable/UserPrefs/PrefKey.ts), same string values. */
export enum PrefKey {
  EditorSpellcheck = 'spellcheck',
  AlwaysShowSuperToolbar = 'alwaysShowSuperToolbar',
  SuperNoteExportFormat = 'superNoteExportFormat',
  SuperNoteExportEmbedBehavior = 'superNoteExportEmbedBehavior',
  SuperNoteExportUseMDFrontmatter = 'superNoteExportUseMDFrontmatter',
  SuperNoteExportPDFPageSize = 'superNoteExportPDFPageSize',
  SuperNoteImageAlignment = 'superNoteImageAlignment',
}

export type PrefValue = {
  [PrefKey.EditorSpellcheck]: boolean
  [PrefKey.AlwaysShowSuperToolbar]: boolean
  [PrefKey.SuperNoteExportFormat]: 'json' | 'md' | 'html' | 'pdf'
  [PrefKey.SuperNoteExportEmbedBehavior]: 'reference' | 'inline' | 'separate'
  [PrefKey.SuperNoteExportUseMDFrontmatter]: boolean
  [PrefKey.SuperNoteExportPDFPageSize]: 'A3' | 'A4' | 'LETTER' | 'LEGAL' | 'TABLOID'
  [PrefKey.SuperNoteImageAlignment]: 'left' | 'center' | 'right'
}

/** Same defaults as upstream PrefDefaults for these keys. */
export const PrefDefaults: PrefValue = {
  [PrefKey.EditorSpellcheck]: true,
  [PrefKey.AlwaysShowSuperToolbar]: true,
  [PrefKey.SuperNoteExportFormat]: 'json',
  [PrefKey.SuperNoteExportEmbedBehavior]: 'reference',
  [PrefKey.SuperNoteExportUseMDFrontmatter]: true,
  [PrefKey.SuperNoteExportPDFPageSize]: 'A4',
  [PrefKey.SuperNoteImageAlignment]: 'left',
}

/** The parts of a note a plugin receives through the component relay. */
export interface SNNote {
  uuid: string
  title: string
  text: string
  preview_plain: string
  locked: boolean
  spellcheck?: boolean
}

/** Encrypted Standard Notes files are not accessible from a plugin; kept for type compatibility. */
export interface FileItem {
  uuid: string
  name: string
  mimeType: string
}
