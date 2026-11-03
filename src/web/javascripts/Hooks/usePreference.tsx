/**
 * [sn-super-extended] PLUGIN OVERRIDE of packages/web/src/javascripts/Hooks/usePreference.tsx
 *
 * A plugin cannot read the user's Standard Notes preferences, so values come from the plugin's own
 * settings (PluginPreferences, persisted in the plugin's component data). Defaults match upstream.
 */
import { useApplication } from '@/Components/ApplicationProvider'
import { PluginSettingKey, PluginSettings } from '@plugin/PluginPreferences'
import { useCallback, useEffect, useState } from 'react'

/** Read-write access to a plugin setting. */
export function usePluginSetting<Key extends PluginSettingKey>(key: Key) {
  const application = useApplication()
  const [value, setValue] = useState(() => application.preferences.get(key))

  useEffect(() => {
    setValue(application.preferences.get(key))
    return application.preferences.addListener(() => setValue(application.preferences.get(key)))
  }, [application, key])

  const setNewValue = useCallback(
    (newValue: PluginSettings[Key]) => application.preferences.set(key, newValue),
    [application, key],
  )

  return [value, setNewValue] as const
}

/** Same signature as upstream: returns the current value of a preference. */
export default function usePreference<Key extends PluginSettingKey>(preference: Key): PluginSettings[Key] {
  return usePluginSetting(preference)[0]
}
