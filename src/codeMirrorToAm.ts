import { next as A } from "@automerge/automerge"
import { DocHandle } from "@automerge/automerge-repo"
import { next as am } from "@automerge/automerge"
import { Heads } from "@automerge/automerge"
import { EditorState, Text, Transaction } from "@codemirror/state"
import { isReconcileTx, type Field } from "./plugin"

export const applyCmTransactionToAmHandle = (
  handle: DocHandle<unknown>,
  path: am.Prop[],
  transaction: Transaction
) => {
  if (isReconcileTx(transaction)) {
    return
  }

  // We don't want to call `automerge.updateAt` if there are no changes.
  // Otherwise later on `automerge.diff` will return empty patches that result in a no-op but still mess up the selection.
  let hasChanges = false
  if (!transaction.changes.empty) {
    transaction.changes.iterChanges(() => {
      hasChanges = true
    })
  }

  if (!hasChanges) {
    return undefined
  }

  handle.change((doc: am.Doc<unknown>) => {
    transaction.changes.iterChanges(
      (
        fromA: number,
        toA: number,
        fromB: number,
        _toB: number,
        inserted: Text
      ) => {
        // We are cloning the path as `am.splice` calls `.unshift` on it, modifying it in place,
        // causing the path to be broken on subsequent changes
        am.splice(doc, path.slice(), fromB, toA - fromA, inserted.toString())
      }
    )
  })

  return am.getHeads(handle.docSync())
}
