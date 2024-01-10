import React, { useEffect, useRef } from "react"

import { EditorView } from "@codemirror/view"
import { basicSetup } from "codemirror"
import { Prop } from "@automerge/automerge"
import { automergePlugin } from "../src"
import { type DocHandle } from "@automerge/automerge-repo"

export type EditorProps = {
  handle: DocHandle<{ text: string }>
  path: Prop[]
}

export function Editor({ handle, path }: EditorProps) {
  const containerRef = useRef(null)
  const editorRoot = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const doc = handle.docSync()
    const source = doc.text // this should use path
    const view = (editorRoot.current = new EditorView({
      doc: source,
      extensions: [basicSetup, automergePlugin(handle, path)],
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
