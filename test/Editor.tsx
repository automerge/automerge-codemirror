import React, {useEffect, useRef, useState} from "react"

import { EditorView, keymap } from "@codemirror/view"
import { basicSetup } from "codemirror"
import {unstable as automerge, Prop} from "@automerge/automerge"
import { plugin as amgPlugin, PatchSemaphore } from "../src"
import { type DocHandle } from "./DocHandle"

export type EditorProps = {
  handle: DocHandle
  path: Prop[]
}

export function Editor({handle, path}: EditorProps) {
  const containerRef = useRef(null)
  const editorRoot = useRef<HTMLDivElement>(null!)

  useEffect(() => {
    const source = handle.doc.text
    const plugin = amgPlugin(handle.doc, path)
    const semaphore = new PatchSemaphore(plugin)
    const view = (editorRoot.current = new EditorView({
      doc: source.toString(),
      extensions: [basicSetup,plugin],
      dispatch(transaction) {
        view.update([transaction])
        semaphore.reconcile(handle.change, view.state)
      },
      parent: containerRef.current,
    }))

    return () => {
      view.destroy()
    }
  }, [])

  return (
    <div className="codemirror-editor" ref={containerRef} onKeyDown={(evt) => evt.stopPropagation()} />
  )

}
