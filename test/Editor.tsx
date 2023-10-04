import React, { useEffect, useRef } from "react"

import { EditorView } from "@codemirror/view"
import { basicSetup } from "codemirror"
import { Prop } from "@automerge/automerge"
import { plugin as amgPlugin, PatchSemaphore } from "../src"
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
    const plugin = amgPlugin(doc, path)
    const semaphore = new PatchSemaphore(plugin)
    const view = (editorRoot.current = new EditorView({
      doc: source,
      extensions: [basicSetup, plugin],
      dispatch(transaction) {
        view.update([transaction])
        semaphore.reconcile(handle, view)
      },
      parent: containerRef.current,
    }))

    handle.addListener("change", ({ doc, patchInfo }) => {
      semaphore.reconcile(handle, view)
    })

    return () => {
      handle.removeAllListeners()
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
