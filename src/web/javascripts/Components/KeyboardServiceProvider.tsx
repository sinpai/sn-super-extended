/**
 * [sn-super-extended] PLUGIN OVERRIDE of packages/web/src/javascripts/Components/KeyboardServiceProvider.tsx
 *
 * The plugin has a single KeyboardService owned by PluginApplication (it listens to key events
 * inside the plugin iframe), so this hook just reads it from the application context.
 */
import { ReactNode } from 'react'
import { useApplication } from './ApplicationProvider'

export const useKeyboardService = () => {
  return useApplication().keyboardService
}

const KeyboardServiceProvider = ({ children }: { children: ReactNode }) => <>{children}</>

export default KeyboardServiceProvider
