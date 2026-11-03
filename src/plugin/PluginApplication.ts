import { Environment, Platform, UuidGenerator } from '@standardnotes/snjs'
import { KeyboardService } from '@standardnotes/ui-services'
import { PluginPreferences } from './PluginPreferences'

function generateUuid(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

// The app sets this up when SNJS starts; vendored code (e.g. KeyboardService) relies on it.
UuidGenerator.SetGenerator(generateUuid)

/**
 * The slice of upstream's WebApplication that the vendored Super editor code uses
 * (via `useApplication()`): platform info, keyboard shortcuts, uuids and preferences.
 * Anything that needs the app's item database (encrypted files, linked notes) is not available
 * to a plugin and is handled by the plugin overrides instead.
 */
export class PluginApplication {
  readonly keyboardService: KeyboardService

  /**
   * Encrypted file storage is not reachable from a plugin. The upstream "Save to Files" buttons check
   * this flag ([sn-super-extended] patches); the stubs below only keep that upstream code compiling.
   */
  readonly canUploadFiles = false
  readonly filesController = {
    uploadNewFile: async (_file: File, _options?: { showToast?: boolean }): Promise<{ uuid: string } | undefined> =>
      undefined,
  }
  readonly linkingController = {
    linkItemToSelectedItem: async (_item: { uuid: string }): Promise<void> => undefined,
  }

  constructor(
    readonly platform: Platform,
    readonly environment: Environment,
    readonly preferences: PluginPreferences,
  ) {
    this.keyboardService = new KeyboardService(platform, environment)
  }

  isNativeMobileWeb(): boolean {
    return this.environment === Environment.Mobile
  }

  generateUUID(): string {
    return generateUuid()
  }

  /** Native mobile keyboard events are only delivered to the app's own web view, not to plugins. */
  addNativeMobileEventListener(_listener: (event: unknown) => void): () => void {
    return () => undefined
  }

  deinit(): void {
    this.keyboardService.deinit()
  }
}

/** Platform/environment strings sent by Standard Notes when a plugin registers. */
export function parsePlatform(value: string | undefined): Platform {
  switch (value) {
    case 'mac-web':
      return Platform.MacWeb
    case 'mac-desktop':
      return Platform.MacDesktop
    case 'windows-web':
      return Platform.WindowsWeb
    case 'windows-desktop':
      return Platform.WindowsDesktop
    case 'linux-web':
      return Platform.LinuxWeb
    case 'linux-desktop':
      return Platform.LinuxDesktop
    case 'ios':
    case 'ios-web':
      return Platform.Ios
    case 'android':
    case 'android-web':
      return Platform.Android
    default:
      return detectPlatformFromBrowser()
  }
}

export function parseEnvironment(value: string | undefined): Environment {
  switch (value) {
    case 'desktop':
      return Environment.Desktop
    case 'mobile':
    case 'native-mobile-web':
      return Environment.Mobile
    default:
      return Environment.Web
  }
}

export function detectPlatformFromBrowser(): Platform {
  const userAgent = navigator.userAgent.toLowerCase()
  if (/iphone|ipad|ipod/.test(userAgent)) {
    return Platform.Ios
  }
  if (userAgent.includes('android')) {
    return Platform.Android
  }
  if (userAgent.includes('mac')) {
    return Platform.MacWeb
  }
  if (userAgent.includes('win')) {
    return Platform.WindowsWeb
  }
  return Platform.LinuxWeb
}
