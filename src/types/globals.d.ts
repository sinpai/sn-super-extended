// Globals referenced by vendored upstream code (declared in packages/web/src/javascripts/App.tsx and
// packages/web/src/javascripts/Types/External upstream). They are never set inside a plugin iframe.
declare global {
  interface Window {
    electronAppVersion?: string
    electronRemoteBridge?: unknown
  }
}

declare module '*.svg' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any
  export default content
}

export {}
