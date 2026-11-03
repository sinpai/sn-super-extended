/**
 * Stand-in for `@standardnotes/utils`. Upstream's full package pulls in lodash, dompurify and
 * reflect-metadata, so only the helpers used by the editor are exposed here.
 */
export { debounce } from '../packages/utils/src/Domain/Utils/Debounce'
export * from '../packages/utils/src/Domain/FileName/FileNameUtils'
export { UuidGenerator } from '../packages/utils/src/Domain/Uuid/UuidGenerator'

// Ported from packages/utils/src/Domain/Utils/Utils.ts
export function isNotUndefined<T>(val: T | undefined | null): val is T {
  return val != undefined
}

// Ported from packages/utils/src/Domain/Utils/ClassNames.ts
export const classNames = (...values: (string | null | undefined | boolean)[]): string => {
  return values
    .map((value) => (typeof value === 'string' ? value : null))
    .filter((value) => isNotUndefined(value))
    .join(' ')
}

// Ported from packages/utils/src/Domain/Utils/Utils.ts
const itemDateFormatOptions: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  weekday: 'long',
  hour: '2-digit',
  minute: '2-digit',
}

let sharedItemDateFormattingLocale: string | undefined

export function setSharedItemDateFormattingLocale(locale: string | undefined): void {
  sharedItemDateFormattingLocale = locale
}

function resolveItemDateFormattingLocale(locale?: string): string {
  if (locale) {
    return locale
  }
  if (sharedItemDateFormattingLocale) {
    return sharedItemDateFormattingLocale
  }
  if (typeof navigator === 'undefined') {
    return 'en-US'
  }
  return navigator.languages?.[0] || navigator.language || 'en-US'
}

const itemDateFormatters = new Map<string, Intl.DateTimeFormat>()

export function dateToLocalizedString(date: Date, locale?: string): string {
  const resolved = resolveItemDateFormattingLocale(locale)
  let formatter = itemDateFormatters.get(resolved)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(resolved, itemDateFormatOptions)
    itemDateFormatters.set(resolved, formatter)
  }
  return formatter.format(date)
}
