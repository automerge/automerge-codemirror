import * as automerge from "@automerge/automerge"
import { EditorView } from "@codemirror/view"
import codeMirrorToAm from "./codeMirrorToAm"
import amToCodemirror from "./amToCodemirror"
import {
  Field,
  isReconcileTx,
  getLastHeads,
  getPath,
  reconcileAnnotationType,
  updateHeads,
} from "./plugin"

type Doc<T> = automerge.Doc<T>
type Heads = automerge.Heads

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChangeFn = (atHeads: Heads, change: (doc: Doc<any>) => void) => Heads

export class PatchSemaphore {
  _field: Field
  _inReconcile = false
  _queue: Array<ChangeFn> = []

  constructor(field: Field) {
    this._field = field
  }

  reconcile = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    doc: automerge.Doc<any>,
    change: ChangeFn,
    view: EditorView
  ) => {
    if (this._inReconcile) {
      return
    } else {
      this._inReconcile = true

      // First run any unreconciled transactions against the automerge document
      const transactions = view.state.field(
        this._field
      ).unreconciledTransactions
      let result = null
      for (const tx of transactions) {
        if (isReconcileTx(tx)) {
          continue
        }
        result = codeMirrorToAm(
          this._field,
          change,
          tx,
          result?.state ?? view.state
        )
      }

      // now get the diff between the updated state of the document and the heads
      // and apply that to the codemirror doc
      if (result != null) {
        view.dispatch(result)
      }
      const lastHeads = getLastHeads(view.state, this._field)
      const newHeads = automerge.getHeads(doc)
      const diff = automerge.diff(doc, lastHeads, newHeads)
      const path = getPath(view.state, this._field)
      const changes = amToCodemirror(path, diff)

      view.dispatch(
        view.state.update({
          changes,
          // Mark this transaction so that the plugin doesn't add it to the list
          // of unreconciled transactions
          annotations: reconcileAnnotationType.of({}),
        })
      )

      // finally update heads to point at the latest state
      view.dispatch(view.state.update({ effects: updateHeads(newHeads) }))

      this._inReconcile = false
    }
  }
}
