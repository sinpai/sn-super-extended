import {
  $applyNodeReplacement,
  DecoratorNode,
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical'
import TaskStatusComponent from './TaskStatusComponent'
import { DefaultTaskStatus, TaskStatus, getTaskStatusDefinition, isTaskStatus } from './TaskStatuses'

export type SerializedTaskStatusNode = Spread<{ status: TaskStatus }, SerializedLexicalNode>

/**
 * Inline "To do / In progress / Done" control placed at the start of a line.
 * Stored in the note as { "type": "task-status", "status": "todo" | "in-progress" | "done" }.
 */
export class TaskStatusNode extends DecoratorNode<JSX.Element> {
  __status: TaskStatus

  static getType(): string {
    return 'task-status'
  }

  static clone(node: TaskStatusNode): TaskStatusNode {
    return new TaskStatusNode(node.__status, node.__key)
  }

  static importJSON(serializedNode: SerializedTaskStatusNode): TaskStatusNode {
    const status = isTaskStatus(serializedNode.status) ? serializedNode.status : DefaultTaskStatus
    return $createTaskStatusNode(status).updateFromJSON(serializedNode)
  }

  override exportJSON(): SerializedTaskStatusNode {
    return {
      ...super.exportJSON(),
      status: this.getStatus(),
    }
  }

  static importDOM(): DOMConversionMap<HTMLElement> | null {
    return {
      span: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute('data-lexical-task-status')) {
          return null
        }
        return {
          conversion: convertTaskStatusElement,
          priority: 2,
        }
      },
    }
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('span')
    element.setAttribute('data-lexical-task-status', this.__status)
    element.textContent = this.getTextContent()
    return { element }
  }

  constructor(status: TaskStatus = DefaultTaskStatus, key?: NodeKey) {
    super(key)
    this.__status = status
  }

  createDOM(): HTMLElement {
    const element = document.createElement('span')
    element.className = 'task-status-node'
    // Lets CSS style the whole line by status, e.g. strike through cancelled tasks.
    element.dataset.status = this.__status
    return element
  }

  updateDOM(prevNode: TaskStatusNode, dom: HTMLElement): false {
    if (prevNode.__status !== this.__status) {
      dom.dataset.status = this.__status
    }
    return false
  }

  isInline(): true {
    return true
  }

  /** Arrow keys move the caret past the control instead of selecting it. */
  isKeyboardSelectable(): boolean {
    return false
  }

  getTextContent(): string {
    return `${getTaskStatusDefinition(this.getStatus()).marker} `
  }

  getStatus(): TaskStatus {
    return this.getLatest().__status
  }

  setStatus(status: TaskStatus): this {
    const writable = this.getWritable()
    writable.__status = status
    return writable
  }

  decorate(): JSX.Element {
    return <TaskStatusComponent nodeKey={this.getKey()} status={this.__status} />
  }
}

function convertTaskStatusElement(domNode: HTMLElement): DOMConversionOutput | null {
  const status = domNode.getAttribute('data-lexical-task-status')
  return { node: $createTaskStatusNode(isTaskStatus(status) ? status : DefaultTaskStatus) }
}

export function $createTaskStatusNode(status: TaskStatus = DefaultTaskStatus): TaskStatusNode {
  return $applyNodeReplacement(new TaskStatusNode(status))
}

export function $isTaskStatusNode(node: LexicalNode | null | undefined): node is TaskStatusNode {
  return node instanceof TaskStatusNode
}
