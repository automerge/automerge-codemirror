import * as automerge from "@automerge/automerge";
import {EditorState} from "@codemirror/state";
import codeMirrorToAm from "./codeMirrorToAm";
import {Field, isReconcileTx} from "./plugin";

type Doc<T> = automerge.Doc<T>
type Heads = automerge.Heads

type ChangeFn = (atHeads: Heads, change: (doc: Doc<any>) => void) => Heads

export class PatchSemaphore {
  _inLocalTransaction: boolean = false;
  _field: Field

  constructor(field: Field) {
    this._field = field
  }

  reconcile = (
    change: ChangeFn,
    state: EditorState
  ): EditorState => {
    this._inLocalTransaction = true;
    let transactions = state.field(this._field).unreconciledTransactions;
    let result = state
    for (const tx of transactions) {
      console.log("reconciling", tx)
      if (isReconcileTx(tx)) {
        continue
      }
      result = codeMirrorToAm(this._field, change, tx, result)
    }
    this._inLocalTransaction = false;
    return result;
  }
}
