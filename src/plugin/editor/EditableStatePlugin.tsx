import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useEffect } from 'react'

/**
 * Keeps the editor's editable state in sync with the note's "Prevent editing" flag.
 * Plugin replacement for upstream's ReadonlyPlugin, which watches the app's item store.
 */
export default function EditableStatePlugin({ readonly }: { readonly: boolean }): null {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    editor.setEditable(!readonly)
  }, [editor, readonly])

  return null
}
