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
  doc: handle.doc().text,
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
