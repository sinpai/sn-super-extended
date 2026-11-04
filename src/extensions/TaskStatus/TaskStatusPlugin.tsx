import { useEffect } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $createListItemNode, $isListItemNode } from '@lexical/list'
import { $isHeadingNode, $isQuoteNode } from '@lexical/rich-text'
import { $findMatchingParent, mergeRegister } from '@lexical/utils'
import {
  $createParagraphNode,
  $getNearestNodeFromDOMNode,
  $getSelection,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  CLICK_COMMAND,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_LOW,
  createCommand,
  ElementNode,
  INSERT_PARAGRAPH_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  LexicalCommand,
  LexicalNode,
  PointType,
  SELECTION_CHANGE_COMMAND,
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

/** A task line with nothing typed after the status boxes. */
function $isEmptyTaskLine(line: ElementNode): boolean {
  return line
    .getChildren()
    .every((child) => $isTaskStatusNode(child) || ($isTextNode(child) && child.getTextContent().trim() === ''))
}

/** Whether a point sits right where the task's text starts, i.e. directly after the status boxes. */
function $isAtTextStart(point: PointType, line: ElementNode): boolean {
  if (point.type === 'element' && point.key === line.getKey()) {
    return point.offset <= 1
  }
  if (point.offset !== 0) {
    return false
  }
  let node: LexicalNode | null = point.getNode()
  while (node && !node.is(line)) {
    const previous: LexicalNode | null = node.getPreviousSibling()
    if (previous && !$isTaskStatusNode(previous)) {
      return false
    }
    node = node.getParent()
  }
  return node !== null
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
 * Makes task lines behave like checklist items:
 * - the boxes stay at the start of the line: the caret can't go in front of them, and a status
 *   that ends up in the middle of a line (lines merged, pasted into text) is dropped
 * - Enter starts a new task line (To do); Enter at the start of a task adds an empty task above;
 *   Enter on an empty task line ends the list
 * - Backspace right after the boxes turns the line back into normal text (Lexical's default)
 * - INSERT_TASK_STATUS_COMMAND (block menu, toolbar) turns the selected lines into task lines
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

          if ($isAtTextStart(selection.anchor, line)) {
            const above = $isListItemNode(line) ? $createListItemNode() : $createParagraphNode()
            above.append($createTaskStatusNode())
            line.insertBefore(above)
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

      // Keep the caret (and single-line selections) after the boxes, like a checkbox.
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          const selection = $getSelection()
          if (!$isRangeSelection(selection)) {
            return false
          }
          const line = $getLine(selection.anchor.getNode())
          if (!line || !$isTaskLine(line)) {
            return false
          }
          const focusLine = $getLine(selection.focus.getNode())
          if (!focusLine || !focusLine.is(line)) {
            return false
          }
          for (const point of [selection.anchor, selection.focus]) {
            if (point.type === 'element' && point.key === line.getKey() && point.offset === 0) {
              point.set(line.getKey(), 1, 'element')
            }
          }
          return false
        },
        COMMAND_PRIORITY_LOW,
      ),

      // Left arrow at the start of a task's text goes to the previous line instead of in front of the boxes.
      editor.registerCommand(
        KEY_ARROW_LEFT_COMMAND,
        (event) => {
          const selection = $getSelection()
          if (!$isRangeSelection(selection) || !selection.isCollapsed() || event.shiftKey) {
            return false
          }
          const line = $getLine(selection.anchor.getNode())
          if (!line || !$isTaskLine(line) || !$isAtTextStart(selection.anchor, line)) {
            return false
          }
          event.preventDefault()
          if (line.getPreviousSibling()) {
            line.selectPrevious()
          }
          return true
        },
        COMMAND_PRIORITY_LOW,
      ),

      // The gap between the status box and the text is part of the (non-editable) status element, so the
      // browser doesn't place the caret when it's clicked. Put it at the start of the task's text.
      editor.registerCommand(
        CLICK_COMMAND,
        (event) => {
          const target = event.target
          if (!(target instanceof HTMLElement) || !target.classList.contains('task-status-node')) {
            return false
          }
          const node = $getNearestNodeFromDOMNode(target)
          if (!$isTaskStatusNode(node)) {
            return false
          }
          node.selectNext(0, 0)
          return true
        },
        COMMAND_PRIORITY_LOW,
      ),

      // A status only makes sense at the start of a line.
      editor.registerNodeTransform(TaskStatusNode, (node) => {
        let previous = node.getPreviousSibling()
        while ($isTextNode(previous) && previous.getTextContent() === '') {
          previous = previous.getPreviousSibling()
        }
        if (previous) {
          node.remove()
        }
      }),
    )
  }, [editor])

  return null
}
