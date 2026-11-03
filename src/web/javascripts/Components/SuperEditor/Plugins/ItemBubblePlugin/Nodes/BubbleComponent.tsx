/**
 * [sn-super-extended] PLUGIN OVERRIDE of
 * packages/web/src/javascripts/Components/SuperEditor/Plugins/ItemBubblePlugin/Nodes/BubbleComponent.tsx
 *
 * BubbleNode is an inline link to another note/tag/file by uuid. Plugins cannot look items up, so
 * this renders a neutral chip. The node is kept as-is and works again in the built-in Super editor.
 */
import { LexicalNode } from 'lexical'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import Icon from '@/Components/Icon/Icon'
import { c } from 'ttag'

export type BubbleComponentProps = Readonly<{
  itemUuid: string
  node: LexicalNode
}>

export function BubbleComponent({ itemUuid, node }: BubbleComponentProps) {
  const [editor] = useLexicalComposerContext()

  return (
    <span
      className="mx-0.5 inline-flex items-center gap-1 rounded bg-passive-4-opacity-variant px-1.5 py-0.5 align-middle text-sm text-text"
      title={c('B4.Notes.EditingUI.Info').t`Linked item ${itemUuid}`}
    >
      <Icon type="link" size="small" className="text-passive-1" />
      <span>{c('B4.Notes.EditingUI.Info').t`Linked item`}</span>
      {editor.isEditable() && (
        <button
          type="button"
          className="ml-0.5 rounded text-passive-1 hover:text-danger"
          aria-label={c('B4.Notes.EditingUI.Action').t`Remove link`}
          onClick={() => editor.update(() => node.remove())}
        >
          <Icon type="close" size="small" />
        </button>
      )}
    </span>
  )
}
