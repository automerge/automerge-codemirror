import {
  DelPatch,
  InsertPatch,
  Patch,
  Prop,
  SpliceTextPatch,
} from "@automerge/automerge"
import { ChangeSpec } from "@codemirror/state"

export default function (target: Prop[], patches: Patch[]): Array<ChangeSpec> {
  const result = []
  for (const patch of patches) {
    if (patch.action === "insert") {
      result.push(...handleInsert(target, patch))
    } else if (patch.action === "splice") {
      result.push(...handleSplice(target, patch))
    } else if (patch.action === "del") {
      result.push(...handleDel(target, patch))
    }
  }
  return result
}

function handleInsert(target: Prop[], patch: InsertPatch): Array<ChangeSpec> {
  const index = charPath(target, patch.path)
  if (index == null) {
    return []
  }
  const text = patch.values.map(v => (v ? v.toString() : "")).join("")
  return [{ from: index, to: index, insert: text }]
}

function handleSplice(
  target: Prop[],
  patch: SpliceTextPatch
): Array<ChangeSpec> {
  const index = charPath(target, patch.path)
  if (index == null) {
    return []
  }
  return [{ from: index, to: index, insert: patch.value }]
}

function handleDel(target: Prop[], patch: DelPatch): Array<ChangeSpec> {
  const index = charPath(target, patch.path)
  if (index == null) {
    return []
  }
  const length = patch.length || 1
  return [{ from: index - length, to: index }]
}

// If the path of the patch is of the form [path, <index>] then we know this is
// a path to a character within the sequence given by path
function charPath(textPath: Prop[], candidatePath: Prop[]): number | null {
  if (candidatePath.length !== textPath.length + 1) return null
  for (let i = 0; i < textPath.length; i++) {
    if (textPath[i] !== candidatePath[i]) return null
  }
  const index = candidatePath[candidatePath.length - 1]
  if (typeof index === "number") return index
  return null
}
