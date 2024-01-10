import {
  type EditorState,
  type Text,
  type Transaction,
} from "@codemirror/state"

import { next as am, type Heads } from "@automerge/automerge"

import { type IDocHandle } from "./handle"
import { type Field } from "./plugin"

export default (
  field: Field,
  handle: IDocHandle,
  transactions: Transaction[],
  state: EditorState
): Heads | undefined => {
  const { lastHeads, path } = state.field(field)

  // We don't want to call `automerge.updateAt` if there are no changes.
  // Otherwise later on `automerge.diff` will return empty patches that result in a no-op but still mess up the selection.
  let hasChanges = false
  for (const tr of transactions) {
    if (!tr.changes.empty) {
      tr.changes.iterChanges(() => {
        hasChanges = true
      })
    }
  }

  if (!hasChanges) {
    return undefined
  }

  const newHeads = handle.changeAt(lastHeads, (doc: am.Doc<unknown>) => {
    for (const tr of transactions) {
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
          am.splice(doc, path.slice(), fromB, toA - fromA, inserted.toString())
        }
      )
    }
  })
  return newHeads ?? undefined
}
