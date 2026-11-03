/**
 * [sn-super-extended] PLUGIN OVERRIDE of packages/web/src/javascripts/Components/ApplicationProvider.tsx
 *
 * Upstream provides the full WebApplication. Inside a plugin iframe the editor only uses a few of
 * its members, implemented by PluginApplication. The exported API (useApplication, default
 * provider with an `application` prop) is unchanged.
 */
import { ReactNode, createContext, useContext, memo } from 'react'
import { PluginApplication } from '@plugin/PluginApplication'

const ApplicationContext = createContext<PluginApplication | undefined>(undefined)

export const useApplication = () => {
  const value = useContext(ApplicationContext)

  if (!value) {
    throw new Error('Component must be a child of <ApplicationProvider />')
  }

  return value
}

type ChildrenProps = {
  children: ReactNode
}

type ProviderProps = {
  application: PluginApplication
} & ChildrenProps

const MemoizedChildren = memo(({ children }: ChildrenProps) => <>{children}</>)

const ApplicationProvider = ({ application, children }: ProviderProps) => {
  return (
    <ApplicationContext.Provider value={application}>
      <MemoizedChildren children={children} />
    </ApplicationContext.Provider>
  )
}

export default ApplicationProvider
