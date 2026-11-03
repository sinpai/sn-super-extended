/**
 * [sn-super-extended] PLUGIN OVERRIDE of packages/web/src/javascripts/NativeMobileWeb/useAndroidBackHandler.tsx
 *
 * The Android back button is handled by the Standard Notes app, never by a plugin iframe, so
 * registering a listener is a no-op. Same hook signature as upstream.
 */
import { useCallback } from 'react'

type AddAndroidBackHandler = (listener: () => boolean) => (() => void) | undefined

export const useAndroidBackHandler = (): AddAndroidBackHandler => {
  return useCallback((_listener: () => boolean) => () => undefined, [])
}
