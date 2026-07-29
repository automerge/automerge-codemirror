import { Compartment, EditorState, type Extension } from "@codemirror/state"
import { EditorView, ViewPlugin } from "@codemirror/view"
import { DocHandle, DocHandleChangePayload } from "./DocHandle.js"

type AutomergeReadOnlyConfig = {
  handle: DocHandle<unknown>
}

/**
 * Makes the editor read-only while the handle rejects writes
 * (`handle.isReadOnly()`, e.g. pinned to historical heads). This is a
 * correctness requirement of syncing, not a preference: an editable editor
 * bound to a read-only handle produces edits the write-back must drop.
 *
 * Tracked live: the flag can flip in place when the handle's backing is
 * swapped (a `change` event with `scopeReplaced: true`). Handles without
 * `isReadOnly` are treated as always writable.
 */
export const automergeReadOnly = ({
  handle,
}: AutomergeReadOnlyConfig): Extension => {
  const compartment = new Compartment()
  const isReadOnly = () => !!handle.isReadOnly?.()
  const extensions = () =>
    isReadOnly()
      ? [EditorState.readOnly.of(true), EditorView.editable.of(false)]
      : []
  // What the compartment was seeded with, so views only reconfigure on an
  // actual flip.
  const seededReadOnly = isReadOnly()

  const trackPlugin = ViewPlugin.fromClass(
    class {
      applied = seededReadOnly
      destroyed = false

      constructor(readonly view: EditorView) {
        this.onChange = this.onChange.bind(this)
        handle.on("change", this.onChange)
        // The flag may have flipped between extension creation and mount;
        // deferred because dispatching isn't allowed while the view is
        // still initializing.
        queueMicrotask(() => {
          if (!this.destroyed) this.sync()
        })
      }

      onChange(payload?: DocHandleChangePayload) {
        if (payload?.scopeReplaced) this.sync()
      }

      sync() {
        const current = isReadOnly()
        if (current === this.applied) return
        this.applied = current
        this.view.dispatch({ effects: compartment.reconfigure(extensions()) })
      }

      destroy() {
        this.destroyed = true
        handle.off("change", this.onChange)
      }
    }
  )

  return [compartment.of(extensions()), trackPlugin]
}
