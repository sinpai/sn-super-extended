/**
 * [sn-super-extended] PLUGIN OVERRIDE of
 * packages/web/src/javascripts/Components/SuperEditor/Plugins/EncryptedFilePlugin/FilePlugin.tsx
 *
 * Upstream uploads files as encrypted Standard Notes files and inserts a FileNode that references
 * them. A plugin has no access to the files API, so uploaded, pasted and dropped files are embedded
 * in the note as an InlineFileNode (data URL) instead. Native Super renders that node too, and
 * offers to convert it into a regular encrypted file.
 *
 * Same exports and commands as upstream.
 */
import { INSERT_FILE_COMMAND, UPLOAD_AND_INSERT_FILE_COMMAND } from '../Commands'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'

import { useEffect, useState } from 'react'
import { c } from 'ttag'
import { FileNode } from './Nodes/FileNode'
import {
  $createParagraphNode,
  $insertNodes,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_NORMAL,
  DROP_COMMAND,
  LexicalNode,
  PASTE_COMMAND,
  $isRootOrShadowRoot,
  createCommand,
} from 'lexical'
import { $createFileNode } from './Nodes/FileUtils'
import { mergeRegister, $wrapNodeInElement } from '@lexical/utils'
import { SNNote } from '@standardnotes/snjs'
import Modal from '../../Lexical/UI/Modal'
import Button from '@/Components/Button/Button'
import { isMobileScreen } from '../../../../Utils'
import { $createInlineFileNode } from '../InlineFilePlugin/InlineFileNode'
import { InlineFileSizeWarningThreshold } from '@plugin/config'

export const OPEN_FILE_UPLOAD_MODAL_COMMAND = createCommand('OPEN_FILE_UPLOAD_MODAL_COMMAND')

function UploadFileDialog({ onClose }: { onClose: () => void }) {
  const [editor] = useLexicalComposerContext()

  const [file, setFile] = useState<File>()

  const onClick = () => {
    if (!file) {
      return
    }

    editor.dispatchCommand(UPLOAD_AND_INSERT_FILE_COMMAND, file)
    onClose()
  }

  return (
    <>
      <input
        type="file"
        onChange={(event) => {
          const filesList = event.target.files
          if (filesList && filesList.length === 1) {
            setFile(filesList[0])
          }
        }}
      />
      <div className="mt-1.5 text-xs text-passive-1">
        {c('B4.Notes.EditingUI.Info').t`The file will be embedded in this note.`}
      </div>
      <div className="mt-1.5 flex justify-end">
        <Button onClick={onClick} disabled={!file} small={isMobileScreen()}>
          {c('B4.Notes.EditingUI.Action').t`Upload`}
        </Button>
      </div>
    </>
  )
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function confirmLargeFile(file: File): boolean {
  if (file.size <= InlineFileSizeWarningThreshold) {
    return true
  }
  const sizeInMB = (file.size / (1024 * 1024)).toFixed(1)
  return window.confirm(
    `"${file.name}" is ${sizeInMB} MB. It will be stored inside the note, which makes the note slower to load and sync. Embed it anyway?`,
  )
}

export default function FilePlugin(_props: { currentNote?: SNNote }): JSX.Element | null {
  const [editor] = useLexicalComposerContext()

  const [showFileUploadModal, setShowFileUploadModal] = useState(false)

  useEffect(() => {
    if (!editor.hasNodes([FileNode])) {
      throw new Error('FilePlugin: FileNode not registered on editor')
    }

    const $insertBlockNode = (node: LexicalNode) => {
      $insertNodes([node])
      if ($isRootOrShadowRoot(node.getParentOrThrow())) {
        $wrapNodeInElement(node, $createParagraphNode).selectEnd()
      }
      const newLineNode = $createParagraphNode()
      node.getParentOrThrow().insertAfter(newLineNode)
      newLineNode.selectEnd()
    }

    const embedFile = (file: File) => {
      if (!confirmLargeFile(file)) {
        return
      }
      readFileAsDataURL(file)
        .then((dataUrl) => {
          editor.update(() => {
            $insertBlockNode($createInlineFileNode(dataUrl, file.type || 'application/octet-stream', file.name))
          })
          editor.focus()
        })
        .catch(console.error)
    }

    const embedFiles = (files: FileList | null | undefined): boolean => {
      if (!files || files.length === 0) {
        return false
      }
      Array.from(files).forEach((file) => editor.dispatchCommand(UPLOAD_AND_INSERT_FILE_COMMAND, file))
      return true
    }

    return mergeRegister(
      editor.registerCommand<string>(
        INSERT_FILE_COMMAND,
        (uuid) => {
          editor.update(() => $insertBlockNode($createFileNode(uuid)))
          editor.focus()
          return true
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerCommand(
        UPLOAD_AND_INSERT_FILE_COMMAND,
        (file) => {
          embedFile(file)
          return true
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerCommand(
        OPEN_FILE_UPLOAD_MODAL_COMMAND,
        () => {
          setShowFileUploadModal(true)
          return true
        },
        COMMAND_PRIORITY_NORMAL,
      ),
      editor.registerCommand(
        PASTE_COMMAND,
        (payload) => {
          const files = payload instanceof ClipboardEvent ? payload.clipboardData?.files : null
          return embedFiles(files)
        },
        COMMAND_PRIORITY_NORMAL,
      ),
      editor.registerCommand(
        DROP_COMMAND,
        (event) => {
          if (!event.dataTransfer?.files.length) {
            return false
          }
          event.preventDefault()
          return embedFiles(event.dataTransfer.files)
        },
        COMMAND_PRIORITY_NORMAL,
      ),
    )
  }, [editor])

  if (showFileUploadModal) {
    return (
      <Modal onClose={() => setShowFileUploadModal(false)} title={c('B4.Notes.EditingUI.Title').t`Upload File`}>
        <UploadFileDialog onClose={() => setShowFileUploadModal(false)} />
      </Modal>
    )
  }

  return null
}
