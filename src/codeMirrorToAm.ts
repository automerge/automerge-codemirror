import { unstable as am } from "@automerge/automerge"
import { Heads } from "@automerge/automerge"
import { EditorState, Text, Transaction } from "@codemirror/state"
import { type Field } from "./plugin"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Update = (atHeads: Heads, change: (doc: any) => void) => Heads

export default function (
  field: Field,
  update: Update,
  transactions: Transaction[],
  state: EditorState
): Heads {
  const { lastHeads, path } = state.field(field)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const newHeads = update(lastHeads, (doc: any) => {
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
