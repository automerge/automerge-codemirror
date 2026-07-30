import React, { useEffect, useRef, useState } from "react"
import {
  EditorView,
  crosshairCursor,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from "@codemirror/view"
import { EditorState } from "@codemirror/state"
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
} from "@codemirror/language"
import { defaultKeymap, redo, undo } from "@codemirror/commands"
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search"
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from "@codemirror/autocomplete"
import { lintKeymap } from "@codemirror/lint"
import { automergePlugin } from "../src/index.js"
import { type DocHandle } from "@automerge/automerge-repo"

export type EditorProps = {
  handle: DocHandle<{ text: string }>
}

export function Editor({ handle }: EditorProps) {
  const container = useRef<HTMLDivElement>(null)
  const [editorView, setEditorView] = useState<EditorView>()

  useEffect(() => {
    if (!container.current) {
      return
    }

    const doc = handle.doc()
    const source = doc.text
    const view = new EditorView({
      doc: source,
      extensions: [
        setupWithoutHistory,
        automergePlugin({
          handle,
          path: ["text"],
        }),
      ],
      parent: container.current,
    })

    setEditorView(view)

    return () => {
      view.destroy()
    }
  }, [container])

  const onClickUndoButton = () => {
    if (editorView) {
      undo(editorView)
    }
  }

  const onClickRedoButton = () => {
    if (editorView) {
      redo(editorView)
    }
  }

  return (
    <div>
      <button id="undo" onClick={onClickUndoButton}>
        undo
      </button>
      <button id="redo" onClick={onClickRedoButton}>
        redo
      </button>

      <div
        className="codemirror-editor"
        ref={container}
        onKeyDown={evt => evt.stopPropagation()}
      />
    </div>
  )
}

// basicSetup minus history()/historyKeymap: automergePlugin bundles its own
// history, which must be the only copy in the configuration for its
// reset-on-swap to work (it warns when it isn't).
const setupWithoutHistory = [
  lineNumbers(),
  highlightActiveLineGutter(),
  highlightSpecialChars(),
  foldGutter(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  bracketMatching(),
  closeBrackets(),
  autocompletion(),
  rectangularSelection(),
  crosshairCursor(),
  highlightActiveLine(),
  highlightSelectionMatches(),
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...foldKeymap,
    ...completionKeymap,
    ...lintKeymap,
  ]),
]
