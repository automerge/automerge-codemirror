import { next as A } from "@automerge/automerge"
import { DocHandle } from "@automerge/automerge-repo"
import { Transaction } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { applyAmPatchesToCm } from "./amToCodemirror"
import { applyCmTransactionToAmHandle } from "./codeMirrorToAm"

type Doc<T> = automerge.Doc<T>
type Heads = automerge.Heads

type ChangeFn = (
  atHeads: Heads,
  change: (doc: Doc<unknown>) => void
) => Heads | undefined

interface PatchSemaphoreConfig {
  handle: DocHandle<any>
  view: EditorView
  path: A.Prop[]
}

export class PatchSemaphore {
  _inReconcile = false
  _queue: Array<ChangeFn> = []

  private reconciledHeads: A.Heads
  private handle: DocHandle<any>
  private view: EditorView
  private path: A.Prop[]

  constructor({ handle, view, path }: PatchSemaphoreConfig) {
    this.handle = handle
    this.view = view
    this.path = path
    this.reconciledHeads = A.getHeads(handle.docSync())
  }

  intercept = (transaction: Transaction) => {
    const newHeads = applyCmTransactionToAmHandle(
      this.handle,
      this.path,
      transaction
    )

    if (newHeads) {
      this.reconciledHeads = newHeads
    }
  }

  reconcile = (handle: DocHandle<unknown>, view: EditorView) => {
    setTimeout(() => {
      const currentHeads = A.getHeads(handle.docSync())

      if (A.equals(currentHeads, this.reconciledHeads)) {
        return
      }

      // get the diff between the updated state of the document and the heads
      // and apply that to the codemirror doc
      const patches = A.diff(
        handle.docSync(),
        this.reconciledHeads,
        currentHeads
      )

      applyAmPatchesToCm(view, this.path, patches)

      this.reconciledHeads = currentHeads
    })
  }
}
