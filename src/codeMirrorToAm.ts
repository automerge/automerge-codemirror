import { unstable as am } from "@automerge/automerge"
import { Heads } from "@automerge/automerge"
import { EditorState, Text, Transaction } from "@codemirror/state"
import { type Field, updateHeads } from "./plugin"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Update = (atHeads: Heads, change: (doc: any) => void) => Heads

export default function (
  field: Field,
  update: Update,
  tr: Transaction,
  state: EditorState
): Transaction {
  const { lastHeads, path } = state.field(field)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const newHeads = update(lastHeads, (doc: any) => {
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
  })
  return state.update({ effects: updateHeads(newHeads) })
}
