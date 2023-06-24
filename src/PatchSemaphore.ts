import * as automerge from "@automerge/automerge"
import { EditorView } from "@codemirror/view"
import codeMirrorToAm from "./codeMirrorToAm"
import amToCodemirror from "./amToCodemirror"
import {
  Field,
  isReconcileTx,
  getPath,
  reconcileAnnotationType,
  updateHeads,
  getLastHeads,
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

      const path = getPath(view.state, this._field)
      const remoteHeads = automerge.getHeads(doc)
      const oldHeads = getLastHeads(view.state, this._field)
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      let selection = view.state.selection

      const transactions = view.state
        .field(this._field)
        .unreconciledTransactions.filter(tx => !isReconcileTx(tx))

      // First undo all the unreconciled transactions
      const toInvert = transactions.slice().reverse()
      for (const tx of toInvert) {
        const inverted = tx.changes.invert(tx.startState.doc)
        selection = selection.map(inverted)
        view.dispatch({
          changes: inverted,
          annotations: reconcileAnnotationType.of(true),
        })
      }

      // now apply the unreconciled transactions to the document
      let newHeads = codeMirrorToAm(
        this._field,
        change,
        transactions,
        view.state
      )
      if (headsEqual(oldHeads, newHeads)) {
        // No changes were made, so we're just applying remote changes
        newHeads = remoteHeads
      }

      // now get the diff between the updated state of the document and the heads
      // and apply that to the codemirror doc
      const diff = automerge.diff(doc, oldHeads, newHeads)
      amToCodemirror(view, selection, path, diff)

      view.dispatch({
        effects: updateHeads(newHeads),
        annotations: reconcileAnnotationType.of({}),
      })

      this._inReconcile = false
    }
  }
}

function headsEqual(a: Heads, b: Heads): boolean {
  return (
    a.length == b.length && a.every(head => b.some(other => head === other))
  )
}
