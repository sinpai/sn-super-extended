import { CSSProperties, MouseEvent } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useLexicalEditable } from '@lexical/react/useLexicalEditable'
import { $getNodeByKey, NodeKey } from 'lexical'
import { $isTaskStatusNode } from './TaskStatusNode'
import { TaskStatus, TaskStatuses } from './TaskStatuses'
import './TaskStatus.scss'

function StatusIcon({ status }: { status: TaskStatus }) {
  switch (status) {
    case 'todo':
      return (
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <circle cx="6" cy="6" r="3.25" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      )
    case 'in-progress':
      return (
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <circle cx="6" cy="6" r="3.25" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M6 2.75a3.25 3.25 0 0 1 0 6.5z" fill="currentColor" />
        </svg>
      )
    case 'done':
      return (
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <path
            d="M2.6 6.3 4.9 8.6 9.4 3.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
  }
}

export default function TaskStatusComponent({ nodeKey, status }: { nodeKey: NodeKey; status: TaskStatus }) {
  const [editor] = useLexicalComposerContext()
  const isEditable = useLexicalEditable()

  const selectStatus = (event: MouseEvent, next: TaskStatus) => {
    event.preventDefault()
    event.stopPropagation()
    if (!isEditable || next === status) {
      return
    }
    editor.update(() => {
      const node = $getNodeByKey(nodeKey)
      if ($isTaskStatusNode(node)) {
        node.setStatus(next)
      }
    })
  }

  return (
    <span className="task-status" role="radiogroup" aria-label="Task status">
      {TaskStatuses.map((definition) => {
        const isSelected = definition.id === status
        return (
          <button
            key={definition.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={definition.label}
            title={definition.label}
            disabled={!isEditable}
            className="task-status__box"
            style={{ '--task-status-color': definition.color } as CSSProperties}
            // Keep the caret where it is; the click only changes the status.
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => selectStatus(event, definition.id)}
          >
            <StatusIcon status={definition.id} />
          </button>
        )
      })}
    </span>
  )
}
