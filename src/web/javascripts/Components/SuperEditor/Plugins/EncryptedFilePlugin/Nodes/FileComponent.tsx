/**
 * [sn-super-extended] PLUGIN OVERRIDE of
 * packages/web/src/javascripts/Components/SuperEditor/Plugins/EncryptedFilePlugin/Nodes/FileComponent.tsx
 *
 * FileNode references an encrypted Standard Notes file by uuid. Plugins cannot read files, so this
 * renders a placeholder. The node itself is kept untouched, so the file shows up again when the
 * note is opened in the built-in Super editor.
 */
import { BlockWithAlignableContents } from '@lexical/react/LexicalBlockWithAlignableContents'
import { ElementFormatType, NodeKey } from 'lexical'
import Icon from '@/Components/Icon/Icon'
import { c } from 'ttag'

export type FileComponentProps = Readonly<{
  className: Readonly<{
    base: string
    focus: string
  }>
  format: ElementFormatType | null
  setFormat: (format: ElementFormatType) => void
  nodeKey: NodeKey
  fileUuid: string
  zoomLevel: number
  setZoomLevel: (zoomLevel: number) => void
}>

function FileComponent({ className, format, nodeKey, fileUuid }: FileComponentProps) {
  return (
    <BlockWithAlignableContents className={className} format={format} nodeKey={nodeKey}>
      <div
        className="flex items-center gap-3 rounded border border-border bg-contrast px-3 py-2 text-sm"
        title={fileUuid}
      >
        <Icon type="attachment-file" className="flex-shrink-0 text-passive-0" />
        <div className="min-w-0">
          <div className="font-semibold text-text">{c('B4.Notes.EditingUI.Info').t`Attached file`}</div>
          <div className="text-xs text-passive-1">
            {c('B4.Notes.EditingUI.Info')
              .t`Stored as an encrypted Standard Notes file. Open this note with the built-in Super editor to view it.`}
          </div>
        </div>
      </div>
    </BlockWithAlignableContents>
  )
}

export default FileComponent
