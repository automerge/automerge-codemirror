import { next as A } from "@automerge/automerge"
import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view"
import { Transaction, Annotation } from "@codemirror/state"
import { DocHandle } from "@automerge/automerge-repo"
import { applyCmTransactionsToAmHandle } from "./codeMirrorToAm"
import { applyAmPatchesToCm } from "./amToCodemirror"

export const reconcileAnnotationType = Annotation.define<unknown>()

export const isReconcileTx = (tr: Transaction): boolean =>
  !!tr.annotation(reconcileAnnotationType)

type AutomergeSyncPluginConfig = {
  handle: DocHandle<any>
  path: A.Prop[]
}

export const automergeSyncPlugin = ({
  handle,
  path,
}: AutomergeSyncPluginConfig) => {
  let view: EditorView
  let isProcessingCmTransaction = false
  let reconciledHeads = A.getHeads(handle.docSync())

  const onChange = () => {
    // ignore changes that where triggered during a
    if (isProcessingCmTransaction) {
      return
    }

    const currentHeads = A.getHeads(handle.docSync())

    if (A.equals(currentHeads, reconciledHeads)) {
      return
    }

    // get the diff between the reconciled heads and the new heads
    // and apply that to the codemirror doc
    const patches = A.diff(handle.docSync(), reconciledHeads, currentHeads)
    applyAmPatchesToCm(view, path, patches)
    reconciledHeads = currentHeads
  }

  return ViewPlugin.fromClass(
    class {
      constructor(v: EditorView) {
        view = v
        handle.on("change", onChange)
      }

      update(update: ViewUpdate) {
        // start pr
        isProcessingCmTransaction = true

        const newHeads = applyCmTransactionsToAmHandle(
          handle,
          path,
          update.transactions as Transaction[]
        )

        if (newHeads) {
          reconciledHeads = newHeads
        }

        isProcessingCmTransaction = false
      }

      destroy() {
        handle.off("change", onChange)
      }
    }
  )
}
