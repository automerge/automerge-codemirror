import React, { useEffect, useRef } from "react"

import { EditorView } from "@codemirror/view"
import { basicSetup } from "codemirror"
import { Prop } from "@automerge/automerge"
import { plugin as amgPlugin, PatchSemaphore } from "../src"
import { type DocHandle } from "./DocHandle"

export type EditorProps = {
  handle: DocHandle
  path: Prop[]
}

export function Editor({ handle, path }: EditorProps) {
  const containerRef = useRef(null)
  const editorRoot = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const source = handle.doc.text
    const plugin = amgPlugin(handle.doc, path)
    const semaphore = new PatchSemaphore(plugin)
    const view = (editorRoot.current = new EditorView({
      doc: source.toString(),
      extensions: [basicSetup, plugin],
      dispatch(transaction) {
        view.update([transaction])
        semaphore.reconcile(handle.doc, handle.changeAt, view)
      },
      parent: containerRef.current,
    }))

    handle.addListener((_doc, _patches) => {
      semaphore.reconcile(handle.doc, handle.changeAt, view)
    })

    return () => {
      handle.removeListeners()
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
