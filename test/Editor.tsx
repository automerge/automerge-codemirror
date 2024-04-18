import React, { useEffect, useRef } from "react"

import { EditorView } from "@codemirror/view"
import { basicSetup } from "codemirror"
import { automergeSyncPlugin } from "../src"
import { type DocHandle } from "@automerge/automerge-repo"

export type EditorProps = {
  handle: DocHandle<{ text: string }>
}

export function Editor({ handle }: EditorProps) {
  const containerRef = useRef(null)
  const editorRoot = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const doc = handle.docSync()
    const source = doc!.text
    const view = (editorRoot.current = new EditorView({
      doc: source,
      extensions: [
        basicSetup,
        automergeSyncPlugin({
          handle,
          path: ["text"],
        }),
      ],
      parent: containerRef.current,
    }))

    return () => {
      view.destroy()
    }
  }, [])

  return (
    <div
      className="codemirror-editor"
      ref={containerRef}
      onKeyDown={evt => evt.stopPropagation()}
    />
  )
}
