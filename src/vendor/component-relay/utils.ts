import { Environment } from './snjsTypes'

// [sn-super-extended] Upstream uses the uuid package; crypto.getRandomValues works in every browser and
// also in non-secure contexts, unlike crypto.randomUUID.
export const generateUuid = () : string => {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export const isValidJsonString = (str: unknown) : boolean => {
  if (typeof str !== 'string') {
    return false
  }
  try {
    const result = JSON.parse(str)
    const type = Object.prototype.toString.call(result)
    return type === '[object Object]' || type === '[object Array]'
  } catch (e) {
    return false
  }
}

export const environmentToString = (environment: Environment) : string => {
  const map = {
    [Environment.Web]: 'web',
    [Environment.Desktop]: 'desktop',
    [Environment.Mobile]: 'mobile',
  }
  return map[environment] ?? map[Environment.Web]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isNotUndefinedOrNull = (value: any) : boolean => {
  return value !== null && value !== undefined
}
