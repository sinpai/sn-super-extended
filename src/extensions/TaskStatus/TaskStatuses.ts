export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'cancelled'

export type TaskStatusDefinition = {
  id: TaskStatus
  label: string
  /** Color of the box when this status is selected. */
  color: string
  /** Text used for copy as plain text and Markdown export, e.g. "[x] Buy milk". */
  marker: string
}

/**
 * The statuses, in the order the picker shows them. Change labels or colors here.
 * Lines with a cancelled task are struck through (see TaskStatus.scss).
 */
export const TaskStatuses: readonly TaskStatusDefinition[] = [
  { id: 'todo', label: 'To do', color: '#086dd6', marker: '[ ]' },
  { id: 'in-progress', label: 'In progress', color: '#f97316', marker: '[/]' },
  { id: 'done', label: 'Done', color: '#16a34a', marker: '[x]' },
  { id: 'cancelled', label: 'Cancelled', color: '#dc2626', marker: '[-]' },
]

export const DefaultTaskStatus: TaskStatus = 'todo'

export function isTaskStatus(value: unknown): value is TaskStatus {
  return TaskStatuses.some((status) => status.id === value)
}

export function getTaskStatusDefinition(id: TaskStatus): TaskStatusDefinition {
  return TaskStatuses.find((status) => status.id === id) ?? TaskStatuses[0]
}
