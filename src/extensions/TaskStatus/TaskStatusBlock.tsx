import { LexicalEditor } from 'lexical'
import { IconType } from '@standardnotes/snjs'
import { BlockPickerOption } from '@/Components/SuperEditor/Plugins/BlockPickerPlugin/BlockPickerOption'
import { INSERT_TASK_STATUS_COMMAND } from './TaskStatusPlugin'

/** Same shape as the upstream blocks in Components/SuperEditor/Plugins/Blocks, for the toolbar and "/" menu. */
export const TaskStatusBlock = {
  name: 'Task Status',
  iconName: 'check-circle' as IconType,
  keywords: ['task status', 'task', 'todo', 'to do', 'in progress', 'done', 'status', 'checkbox'],
  onSelect: (editor: LexicalEditor) => editor.dispatchCommand(INSERT_TASK_STATUS_COMMAND, undefined),
}

export function GetTaskStatusBlockOption(editor: LexicalEditor) {
  return new BlockPickerOption(TaskStatusBlock.name, {
    iconName: TaskStatusBlock.iconName,
    keywords: TaskStatusBlock.keywords,
    onSelect: () => TaskStatusBlock.onSelect(editor),
  })
}
