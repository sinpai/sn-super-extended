import { ElementTransformer } from '@lexical/markdown'
import { $createParagraphNode, $isTextNode } from 'lexical'
import { $createTaskStatusNode, TaskStatusNode } from './TaskStatusNode'

/**
 * Markdown shortcut: "][" followed by a space at the start of a line turns it into a task line,
 * the same way "[]" + space makes a checklist item. Lines starting with "][ " are also converted
 * when Markdown is imported.
 */
export const TASK_STATUS_SHORTCUT: ElementTransformer = {
  dependencies: [TaskStatusNode],
  // Exported text comes from TaskStatusNode.getTextContent(): "[ ] ", "[/] " or "[x] ".
  export: () => null,
  regExp: /^\]\[\s/,
  replace: (parentNode, children, _match, isImport) => {
    const status = $createTaskStatusNode()

    if (isImport) {
      // A new paragraph, so the importer doesn't merge this line into the one above.
      const line = $createParagraphNode()
      line.append(status, ...children)
      parentNode.replace(line)
      return true
    }

    // While typing, Lexical removes the "][ " text after this returns.
    const firstChild = parentNode.getFirstChild()
    if (firstChild) {
      firstChild.insertBefore(status)
    } else {
      parentNode.append(status)
    }
    const next = children[0]
    if ($isTextNode(next)) {
      next.select(0, 0)
    } else {
      parentNode.select(1, 1)
    }
    return true
  },
  type: 'element',
}
