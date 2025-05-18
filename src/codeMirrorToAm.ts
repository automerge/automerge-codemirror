import { next as A } from "@automerge/automerge"
import { Text, Transaction } from "@codemirror/state"
import { isReconcileTx } from "./plugin"
import { type DocHandle } from "./DocHandle"

export const applyCmTransactionsToAmHandle = (
  handle: DocHandle<unknown>,
  path: A.Prop[],
  transactions: Transaction[]
): A.Heads | undefined => {
  const transactionsWithChanges = transactions.filter(
    tr => !isReconcileTx(tr) && !tr.changes.empty
  )

  if (transactionsWithChanges.length === 0) {
    return
  }

  handle.change((doc: A.Doc<unknown>) => {
    transactionsWithChanges.forEach(tr => {
      tr.changes.iterChanges(
        (
          fromA: number,
          toA: number,
          fromB: number,
          _toB: number,
          inserted: Text
        ) => {
          // We are cloning the path as `am.splice` calls `.unshift` on it, modifying it in place,
          // causing the path to be broken on subsequent changes
          A.splice(doc, path.slice(), fromB, toA - fromA, inserted.toString())
        }
      )
    })
  })

  return A.getHeads(handle.doc())
}
