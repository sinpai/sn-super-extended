import { CSSProperties, MouseEvent, useEffect, useRef, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useLexicalEditable } from '@lexical/react/useLexicalEditable'
import { $getNodeByKey, NodeKey } from 'lexical'
import { classNames } from '@standardnotes/utils'
import { $isTaskStatusNode } from './TaskStatusNode'
import { TaskStatus, TaskStatusDefinition, TaskStatuses, getTaskStatusDefinition } from './TaskStatuses'
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
    case 'cancelled':
      return (
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <path d="M3.6 3.6 8.4 8.4M8.4 3.6 3.6 8.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )
  }
}

const colorStyle = (definition: TaskStatusDefinition) =>
  ({ '--task-status-color': definition.color }) as CSSProperties

// Keep the caret where it is; clicks only change the status.
const keepEditorFocus = (event: MouseEvent) => event.preventDefault()

/**
 * Shows the current status. Hovering it (or tapping it on touch screens, which have no hover)
 * shows all three statuses on top of the line to pick from.
 */
export default function TaskStatusComponent({ nodeKey, status }: { nodeKey: NodeKey; status: TaskStatus }) {
  const [editor] = useLexicalComposerContext()
  const isEditable = useLexicalEditable()
  const rootRef = useRef<HTMLSpanElement>(null)
  /** Opened by a tap. Hover opening is pure CSS (see TaskStatus.scss). */
  const [isOpen, setIsOpen] = useState(false)
  /** Set after picking, so the picker closes even though the mouse is still over it. */
  const [justPicked, setJustPicked] = useState(false)
  const current = getTaskStatusDefinition(status)

  useEffect(() => {
    if (!isOpen) {
      return
    }
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer, true)
    document.addEventListener('keydown', closeOnEscape, true)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer, true)
      document.removeEventListener('keydown', closeOnEscape, true)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isEditable) {
      setIsOpen(false)
    }
  }, [isEditable])

  const togglePicker = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setIsOpen((open) => !open)
  }

  const selectStatus = (event: MouseEvent, next: TaskStatus) => {
    event.preventDefault()
    event.stopPropagation()
    setIsOpen(false)
    setJustPicked(true)
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
    <span
      ref={rootRef}
      className={classNames(
        'task-status',
        isOpen && 'task-status--open',
        justPicked && 'task-status--picked',
        !isEditable && 'task-status--readonly',
      )}
      onMouseLeave={() => setJustPicked(false)}
    >
      <button
        type="button"
        className="task-status__box is-selected"
        aria-label={`Task status: ${current.label}`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        title={current.label}
        disabled={!isEditable}
        style={colorStyle(current)}
        onMouseDown={keepEditorFocus}
        onClick={togglePicker}
      >
        <StatusIcon status={status} />
      </button>
      {isEditable && (
        <span className="task-status__picker" role="radiogroup" aria-label="Task status">
          {TaskStatuses.map((definition) => (
            <button
              key={definition.id}
              type="button"
              role="radio"
              aria-checked={definition.id === status}
              aria-label={definition.label}
              title={definition.label}
              className={classNames('task-status__box', definition.id === status && 'is-selected')}
              style={colorStyle(definition)}
              onMouseDown={keepEditorFocus}
              onClick={(event) => selectStatus(event, definition.id)}
            >
              <StatusIcon status={definition.id} />
            </button>
          ))}
        </span>
      )}
    </span>
  )
}
