/**
 * Stand-in for `@standardnotes/snjs`, the Standard Notes application SDK.
 *
 * A plugin runs in a sandboxed iframe and talks to the app only through the component relay, so
 * the SDK itself is not bundled. This module re-exports the handful of enums, helpers and types the
 * vendored editor code imports from it.
 */
import { Platform } from './models'

export * from './models'
export { classNames, dateToLocalizedString, UuidGenerator } from './utils'
export * from '../packages/snjs/lib/Application/Platforms'
export * from '../packages/snjs/lib/Client/ReactNativeToWebEvent'
export type {
  SuperConverterServiceInterface,
  SuperConverterHTMLOptions,
} from '../packages/files/src/Domain/Service/SuperConverterServiceInterface'

/** Only referenced as a type by src/web/javascripts/Utils/Utils.ts (getPlatform). */
export interface DeviceInterface {
  platform: Platform
}

export type MobileDeviceInterface = DeviceInterface
