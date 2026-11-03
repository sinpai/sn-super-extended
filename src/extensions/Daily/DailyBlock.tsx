import { $insertNodeToNearestRoot } from '@lexical/utils'
import { $createParagraphNode, $createTextNode, LexicalEditor, ParagraphNode } from 'lexical'
import { IconType } from '@standardnotes/snjs'
import { BlockPickerOption } from '@/Components/SuperEditor/Plugins/BlockPickerPlugin/BlockPickerOption'
import { $createCollapsibleContainerNode } from '@/Components/SuperEditor/Plugins/CollapsiblePlugin/CollapsibleContainerNode'
import { $createCollapsibleContentNode } from '@/Components/SuperEditor/Plugins/CollapsiblePlugin/CollapsibleContentNode'
import { $createCollapsibleTitleNode } from '@/Components/SuperEditor/Plugins/CollapsiblePlugin/CollapsibleTitleNode'

/** Title and lines of the block. Empty strings are empty lines. */
export const DailyTemplate = {
  title: 'Daily',
  lines: ['yesterday:', '', '', 'today:', '', ''],
  /** The line the caret goes to after inserting: the first empty line under "yesterday:". */
  caretLine: 1,
}

function $createLine(text: string): ParagraphNode {
  const paragraph = $createParagraphNode()
  if (text) {
    paragraph.append($createTextNode(text))
  }
  return paragraph
}

/**
 * Inserts an open collapsible section named "Daily" with the template lines inside.
 * Built from Super's own collapsible nodes, so the built-in Super editor can open these notes too.
 */
export function $insertDailyBlock(): void {
  const lines = DailyTemplate.lines.map($createLine)
  const title = $createCollapsibleTitleNode().append($createLine(DailyTemplate.title))
  const content = $createCollapsibleContentNode().append(...lines)
  $insertNodeToNearestRoot($createCollapsibleContainerNode(true).append(title, content))
  lines[DailyTemplate.caretLine].select()
}

/** Same shape as the upstream blocks in Components/SuperEditor/Plugins/Blocks. */
export const DailyBlock = {
  name: 'Daily',
  iconName: 'clock' as IconType,
  keywords: ['daily', 'standup', 'stand-up', 'yesterday', 'today'],
  onSelect: (editor: LexicalEditor) => editor.update(() => $insertDailyBlock()),
}

export function GetDailyBlockOption(editor: LexicalEditor) {
  return new BlockPickerOption(DailyBlock.name, {
    iconName: DailyBlock.iconName,
    keywords: DailyBlock.keywords,
    onSelect: () => DailyBlock.onSelect(editor),
  })
}
