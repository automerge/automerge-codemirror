import { next as am } from "@automerge/automerge"
import { Heads } from "@automerge/automerge"
import { EditorState, Text, Transaction } from "@codemirror/state"
import { type Field } from "./plugin"

type Update = (atHeads: Heads, change: (doc: am.Doc<unknown>) => void) => Heads

export default function (
  field: Field,
  update: Update,
  transactions: Transaction[],
  state: EditorState
): Heads {
  const { lastHeads, path } = state.field(field)

  const newHeads = update(lastHeads, (doc: am.Doc<unknown>) => {
    for (const tr of transactions) {
      tr.changes.iterChanges(
        (
          fromA: number,
          toA: number,
          _fromB: number,
          _toB: number,
          inserted: Text
        ) => {
          am.splice(doc, path, fromA, toA - fromA, inserted.toString())
        }
      )
    }
  })
  return newHeads
}
