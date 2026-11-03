import { EditorFontSize, EditorLineHeight, PrefDefaults, PrefValue } from '@standardnotes/snjs'

/**
 * Plugin-level settings. In the Standard Notes app these come from the user's preferences, which a
 * plugin cannot read, so the plugin keeps its own copy. Values are persisted in the plugin's
 * "component data", which Standard Notes stores (encrypted, synced) on the plugin item itself.
 */
export type PluginSettings = PrefValue & {
  editorFontSize: EditorFontSize
  editorLineHeight: EditorLineHeight
}

export type PluginSettingKey = keyof PluginSettings

export const PluginSettingDefaults: PluginSettings = {
  ...PrefDefaults,
  editorFontSize: EditorFontSize.Normal,
  editorLineHeight: EditorLineHeight.Normal,
}

const ComponentDataKey = 'settings'

export interface SettingsStorage {
  read(key: string): unknown
  write(key: string, value: unknown): void
}

export class PluginPreferences {
  private values: Partial<PluginSettings>
  private listeners = new Set<() => void>()

  constructor(private storage: SettingsStorage) {
    const stored = storage.read(ComponentDataKey)
    this.values = stored && typeof stored === 'object' ? (stored as Partial<PluginSettings>) : {}
  }

  get<K extends PluginSettingKey>(key: K): PluginSettings[K] {
    return (this.values[key] ?? PluginSettingDefaults[key]) as PluginSettings[K]
  }

  set<K extends PluginSettingKey>(key: K, value: PluginSettings[K]): void {
    this.values = { ...this.values, [key]: value }
    try {
      this.storage.write(ComponentDataKey, this.values)
    } catch (error) {
      console.error('Could not persist plugin settings', error)
    }
    this.listeners.forEach((listener) => listener())
  }

  addListener(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}
