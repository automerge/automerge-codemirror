# Automerge + Codemirror

This plugin adds collaborative editing to codemirror using `automerge-repo`.

## Example

```typescript
import { Repo } from "@automerge/automerge-repo";
import { automergeSyncPlugin } from "@automerge/automerge-codemirror";
import { EditorView } from "@codemirror/view"
import { basicSetup } from "codemirror"

// Setup a repo and create a doc handle. In practice you'll probably get a
// DocHandle by loading it from a document URL
const repo = new Repo(..)
const doc = repo.create({text: ""})

// Setup the codemirror view
const container = document.createElement("div")
const view = new EditorView({
  doc: handle.docSync()!.text,
  extensions: [
    basicSetup,
    automergeSyncPlugin({
      handle,
      path: ["text"],
    }),
  ],
  parent: container,
})
```

