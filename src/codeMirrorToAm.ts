import {unstable as am} from "@automerge/automerge"
import {Heads} from "@automerge/automerge"
import {EditorState, Text, Transaction} from "@codemirror/state"
import {type Field, updateHeads} from "./plugin"

type Update = (atHeads: Heads, change: (doc: any) => void) => Heads

export default function (field: Field, update: Update, tr: Transaction, state: EditorState): EditorState {
  let {lastHeads, path} = state.field(field)
  let newHeads = update(lastHeads, (doc: any) => {
    tr.changes.iterChanges((fromA: number, toA: number, _fromB: number, _toB: number, inserted: Text) => {
      am.splice(doc, path, fromA, toA - fromA, inserted.toString())
    })
  })
  return state.update({effects: updateHeads(newHeads)}).state
}
