# Automerge + Codemirror

This plugin adds collaborative editing to codemirror using `automerge-repo`.

## Example

```typescript
import { Repo } from "@automerge/automerge-repo";
import { automergePlugin } from "@automerge/automerge-codemirror";
import { EditorView } from "@codemirror/view"

// Setup a repo and create a doc handle. In practice you'll probably get a
// DocHandle by loading it from a document URL
const repo = new Repo(..)
const handle = repo.create({text: ""})

// Setup the codemirror view
const container = document.createElement("div")
const view = new EditorView({
  doc: handle.doc().text,
  extensions: [
    automergePlugin({
      handle,
      path: ["text"],
    }),
  ],
  parent: container,
})
```

`automergePlugin` bundles three pieces:

- two-way sync between the automerge document and the editor
- local-only undo/redo history, as in @codemirror/collab: remote changes
  never land on the undo stack, and the stack is reset whenever the handle's
  backing document is swapped in place (as automerge-repo's subduction
  pre-releases do when a handle is pinned to historical heads or re-pointed
  at a clone), so undo can never write a peer's or another timeline's text
  into the document
- read-only tracking: the editor rejects edits while the handle's optional
  `isReadOnly()` method reports true

> [!WARNING]
> Don't add another `history()` extension to the editor — note that both
> `basicSetup` and `minimalSetup` from the `codemirror` package include one.
> A second copy keeps the undo state alive across the bundled reset and
> defeats it; the plugin logs a warning when it detects this.

If you want to compose things yourself, the pieces are also exported
individually as `automergeSyncPlugin`, `automergeHistory`, and
`automergeReadOnly`.

### Automerge Repo 1.0 Compatibility

This codemirror plugin is intended for use with `automerge-repo` 2.0. That
means that the interface it expects to be passed as the `handle` argument
matches the signature of the `DocHandle` interface in `automerge-repo` 2.0.
The main difference with `automerge-repo` 1.0 is that the automerge 1.0 
`DocHandle.doc` method is asynchronous. If you can't upgrade to
`automerge-repo` 2.0 then you can get around this by wrapping the 1.0 handle
in an object which uses the 1.0 `DocHandle.docSync` method to implement the 
`DocHandle.doc` method. Like so:

```typescript
import { type DocHandle } from "@automerge/automerge-codemirror"
import { type DocHandle as RepoHandle } from "@automerge/automerge-repo"

// Convert an automerge-repo 1.0 DocHandle to the interface this plugin expects
function makeHandle<T>(h: RepoHandle<T>): DocHandle<T> {
    return Object.assign({}, h, {
        doc: () => h.docSync(),
    })
}
```
