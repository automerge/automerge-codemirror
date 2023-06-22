import { Annotation, EditorState, StateEffect, StateEffectType, StateField, Transaction, TransactionSpec } from "@codemirror/state";
import * as automerge  from "@automerge/automerge";
import {Doc, Heads, Prop} from "@automerge/automerge";

export type Value = {
    lastHeads: Heads,
    path: Prop[],
    unreconciledTransactions: Transaction[],
}

type UpdateHeads = {
    newHeads: Heads,
}

export const effectType = StateEffect.define<UpdateHeads>({})

export function updateHeads(newHeads: Heads): StateEffect<UpdateHeads> {
    return effectType.of({newHeads})
}

export type Field = StateField<Value>

export function plugin<T>(doc: Doc<T>, path: Prop[]): StateField<Value> {
    return StateField.define({
        create() {
            return {
                lastHeads: automerge.getHeads(doc),
                unreconciledTransactions: [],
                path,
            }
        },
        update(value: Value, tr: Transaction) {
            let result = Object.assign({}, value)
            result.unreconciledTransactions = value.unreconciledTransactions.slice()
            for (const effect of tr.effects) {
                if (effect.is(effectType)) {
                    result.lastHeads = effect.value.newHeads
                    result.unreconciledTransactions = []
                    return result
                }
            }
            result.unreconciledTransactions.push(tr)
            return result
        }
    })
}

const reconcileAnnotationType = Annotation.define<{}>()

export function isReconcileTx(tr: Transaction): boolean {
    return !!tr.annotation(reconcileAnnotationType)
}

export function makeReconcile(tr: TransactionSpec): TransactionSpec {
    return {
        ...tr,
        annotations: reconcileAnnotationType.of({})
    }
}
