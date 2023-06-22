import * as automerge from "@automerge/automerge";
import {EditorState, Transaction} from "@codemirror/state";
import {EditorView} from "@codemirror/view";
import codeMirrorToAm from "./codeMirrorToAm";
import amToCodemirror from "./amToCodemirror";
import {Field, isReconcileTx, getLastHeads, getPath, reconcileAnnotationType, updateHeads} from "./plugin";

type Doc<T> = automerge.Doc<T>
type Heads = automerge.Heads

type ChangeFn = (atHeads: Heads, change: (doc: Doc<any>) => void) => Heads

export class PatchSemaphore {
  _field: Field
  _inReconcile: boolean = false
  _queue: Array<ChangeFn> = []

  constructor(field: Field) {
    this._field = field
  }

  reconcile = (
    doc: automerge.Doc<any>,
    change: ChangeFn,
    view: EditorView,
  )  => {
    if (this._inReconcile) {
      return
    } else {
      this._inReconcile = true

      // First run any unreconciled transactions against the automerge document
      let transactions = view.state.field(this._field).unreconciledTransactions;
      let result = null
      for (const tx of transactions) {
        if (isReconcileTx(tx)) {
          continue
        }
        result = codeMirrorToAm(this._field, change, tx, result?.state ?? view.state)
      }

      // now get the diff between the updated state of the document and the heads
      // and apply that to the codemirror doc
      if (result != null) {
        view.dispatch(result)
      }
      let lastHeads = getLastHeads(view.state, this._field)
      let newHeads = automerge.getHeads(doc)
      let diff = automerge.diff(doc, lastHeads, newHeads)
      let path = getPath(view.state, this._field)
      let changes = amToCodemirror(path, diff)

      view.dispatch(view.state.update({
        changes,
        // Mark this transaction so that the plugin doesn't add it to the list
        // of unreconciled transactions
        annotations: reconcileAnnotationType.of({})
      }))

      // finally update heads to point at the latest state
      view.dispatch(view.state.update({effects: updateHeads(newHeads)}))

      this._inReconcile = false
    }
  }
}
