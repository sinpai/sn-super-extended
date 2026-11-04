/**
 * Keeps the first few uncaught errors, so the "can't reach Standard Notes" message can show them.
 * Plugins run inside the app on phones, where there is no developer console to look at.
 */
const MaxErrors = 5
const errors: string[] = []

function record(message: string): void {
  if (errors.length < MaxErrors) {
    errors.push(message.slice(0, 300))
  }
}

window.addEventListener('error', (event) => record(String(event.message || event.error)))
window.addEventListener('unhandledrejection', (event) => record(`Unhandled rejection: ${String(event.reason)}`))

export function getRecordedErrors(): readonly string[] {
  return errors
}
