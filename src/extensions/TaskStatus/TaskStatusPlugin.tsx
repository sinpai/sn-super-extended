import { useEffect } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $isListItemNode } from '@lexical/list'
import { $isHeadingNode, $isQuoteNode } from '@lexical/rich-text'
import { $findMatchingParent, mergeRegister } from '@lexical/utils'
import {
  $getSelection,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_LOW,
  createCommand,
  ElementNode,
  INSERT_PARAGRAPH_COMMAND,
  LexicalCommand,
  LexicalNode,
} from 'lexical'
import { $createTaskStatusNode, $isTaskStatusNode, TaskStatusNode } from './TaskStatusNode'

/** Turns the selected line(s) into task lines. */
export const INSERT_TASK_STATUS_COMMAND: LexicalCommand<void> = createCommand('INSERT_TASK_STATUS_COMMAND')

/** The line a node belongs to, if it is a kind of line that can hold a task status. */
function $getLine(node: LexicalNode): ElementNode | null {
  return $findMatchingParent(
    node,
    (candidate): candidate is ElementNode =>
      $isParagraphNode(candidate) ||
      $isListItemNode(candidate) ||
      $isHeadingNode(candidate) ||
      $isQuoteNode(candidate),
  ) as ElementNode | null
}

function $isTaskLine(line: ElementNode): boolean {
  return $isTaskStatusNode(line.getFirstChild())
}

/** A task line with nothing typed after the status control. */
function $isEmptyTaskLine(line: ElementNode): boolean {
  return line
    .getChildren()
    .every((child) => $isTaskStatusNode(child) || ($isTextNode(child) && child.getTextContent().trim() === ''))
}

function $prependTaskStatus(line: ElementNode): TaskStatusNode {
  const status = $createTaskStatusNode()
  const firstChild = line.getFirstChild()
  if (firstChild) {
    firstChild.insertBefore(status)
  } else {
    line.append(status)
  }
  return status
}

/**
 * - INSERT_TASK_STATUS_COMMAND adds a "To do" status to the start of each selected line.
 * - Enter at the end of a task line starts a new task line (like a checklist).
 * - Enter on an empty task line removes the status, ending the task list.
 * - Backspace right after the status removes it (Lexical's default for inline decorators).
 */
export default function TaskStatusPlugin(): null {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    if (!editor.hasNodes([TaskStatusNode])) {
      throw new Error('TaskStatusPlugin: TaskStatusNode is not registered on the editor')
    }

    return mergeRegister(
      editor.registerCommand(
        INSERT_TASK_STATUS_COMMAND,
        () => {
          const selection = $getSelection()
          if (!$isRangeSelection(selection)) {
            return false
          }

          const lines = new Map<string, ElementNode>()
          for (const node of selection.getNodes()) {
            const line = $getLine(node)
            if (line) {
              lines.set(line.getKey(), line)
            }
          }

          for (const line of lines.values()) {
            if ($isTaskLine(line)) {
              continue
            }
            const wasEmpty = line.isEmpty()
            $prependTaskStatus(line)
            if (wasEmpty && selection.isCollapsed()) {
              line.select(1, 1)
            }
          }
          return true
        },
        COMMAND_PRIORITY_EDITOR,
      ),

      editor.registerCommand(
        INSERT_PARAGRAPH_COMMAND,
        () => {
          const selection = $getSelection()
          if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
            return false
          }

          const line = $getLine(selection.anchor.getNode())
          if (!line || !$isTaskLine(line)) {
            return false
          }

          if ($isEmptyTaskLine(line)) {
            line.getChildren().forEach((child) => child.remove())
            line.select(0, 0)
            return true
          }

          const newLine = selection.insertParagraph()
          if (newLine && $isElementNode(newLine) && !$isTaskLine(newLine)) {
            const wasEmpty = newLine.isEmpty()
            $prependTaskStatus(newLine)
            if (wasEmpty) {
              newLine.select(1, 1)
            }
          }
          return true
        },
        COMMAND_PRIORITY_LOW,
      ),
    )
  }, [editor])

  return null
}
