import { EditorHost } from './host/EditorHost'
import { getRecordedErrors } from './diagnostics'

declare const __WEB_VERSION__: string

const IssuesUrl = 'https://github.com/sinpai/sn-super-extended/issues'

/** Shown instead of a blank editor when the note doesn't arrive from Standard Notes. */
export function ConnectionProblem({ host }: { host: EditorHost }) {
  const connection = host.getConnectionInfo?.()
  const errors = getRecordedErrors()
  const details = [
    `version: ${__WEB_VERSION__}`,
    `handshake received: ${connection?.registered ? 'yes' : 'no'}`,
    `app origin: ${connection?.appOrigin ?? 'unknown'}`,
    `platform: ${host.platform ?? 'unknown'}, environment: ${host.environment ?? 'unknown'}`,
    ...errors.map((error) => `error: ${error}`),
    `user agent: ${navigator.userAgent}`,
  ]

  return (
    <div className="flex h-full items-center justify-center p-6 text-sm text-passive-0">
      <div className="max-w-md">
        <div className="mb-2 text-base font-semibold text-text">Super Extended can't reach Standard Notes</div>
        <p className="mb-3">
          The note didn't arrive. Close the note and open it again. If this keeps happening, report it at{' '}
          <a href={IssuesUrl} target="_blank" rel="noreferrer" className="text-info">
            {IssuesUrl.replace('https://', '')}
          </a>{' '}
          with a screenshot of this message.
        </p>
        <pre className="whitespace-pre-wrap break-all rounded bg-contrast p-2 text-xs">{details.join('\n')}</pre>
      </div>
    </div>
  )
}
