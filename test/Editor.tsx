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
    ;(async () => {
      const doc = await handle.doc()
      const source = doc.text
      const plugin = amgPlugin(doc, path)
      const semaphore = new PatchSemaphore(plugin)
      const view = (editorRoot.current = new EditorView({
        doc: source.toString(),
        extensions: [basicSetup, plugin],
        dispatch(transaction) {
          view.update([transaction])
          semaphore.reconcile(doc, handle.changeAt.bind(handle), view)
        },
        parent: containerRef.current,
      }))

      handle.addListener("change", ({ doc, patchInfo }) => {
        semaphore.reconcile(doc, handle.changeAt.bind(handle), view)
      })

      return () => {
        handle.removeAllListeners()
        view.destroy()
      }
    })()
  }, [])

  return (
    <div
      className="codemirror-editor"
      ref={containerRef}
      onKeyDown={evt => evt.stopPropagation()}
    />
  )
}
