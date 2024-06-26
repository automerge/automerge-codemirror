import React, { useEffect, useState } from "react"
import { EditorView } from "@codemirror/view"
import { basicSetup } from "codemirror"
import { automergeSyncPlugin } from "../src"
import { undo, redo } from "@codemirror/commands"
import { type DocHandle } from "@automerge/automerge-repo"

export type EditorProps = {
  handle: DocHandle<{ text: string }>
}

export function Editor({ handle }: EditorProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>()
  const [editorView, setEditorView] = useState<EditorView>()

  useEffect(() => {
    if (!container) {
      return
    }

    const doc = handle.docSync()
    const source = doc!.text
    const view = new EditorView({
      doc: source,
      extensions: [
        basicSetup,
        automergeSyncPlugin({
          handle,
          path: ["text"],
        }),
      ],
      parent: container,
    })

    setEditorView(view)

    return () => {
      view.destroy()
    }
  }, [container])

  const onClickUndoButton = () => {
    if (editorView) {
      undo(editorView)
    }
  }

  const onClickRedoButton = () => {
    if (editorView) {
      redo(editorView)
    }
  }

  return (
    <div>
      <button id="undo" onClick={onClickUndoButton}>
        undo
      </button>
      <button id="redo" onClick={onClickRedoButton}>
        redo
      </button>

      <div
        className="codemirror-editor"
        ref={setContainer}
        onKeyDown={evt => evt.stopPropagation()}
      />
    </div>
  )
}
