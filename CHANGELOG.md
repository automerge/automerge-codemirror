## 0.3.0

- Undo is now local-only, as in @codemirror/collab: changes arriving from
  automerge are dispatched with `addToHistory: false` / `remote: true`, so
  undo and redo revert only the user's own edits while existing history
  entries are still mapped through remote changes.
- Support handles whose backing document can be swapped in place, as
  automerge-repo's subduction pre-releases do when a handle is pinned to
  historical heads or re-pointed at a clone. `A.diff` ignores heads that
  aren't part of the doc's history, so when the backings share history the
  editor gets minimal patches, and when they share nothing the diff
  degenerates into full-document patches that rebuild the editor content.
  Handles whose backing never changes are unaffected.
- New `automergePlugin({ handle, path })` entry point, bundling sync with an
  undo history that is reset on backing swaps and with read-only tracking
  driven by the handle's optional `isReadOnly()` method. The pieces are also
  exported individually as `automergeHistory` and `automergeReadOnly`. Don't
  combine with another `history()` extension (`basicSetup` includes one): the
  bundled history must own the only copy for its reset to work, and it warns
  when it doesn't.
- The sync write path ignores editor changes while `handle.isReadOnly()`
  reports true, so a mis-composed editor can never write into a pinned
  handle.

## 0.2.0

- Update the automerge dependency to 3.0.0

## 0.1.0

- Update API to match @automerge/automerge-repo 2.0. This is a breaking change
  because the `handle` argument to the plugin must now have a synchronous `doc`
  method, rather than the `docSync` method. If you can't update to
  `automerge-repo` or you are using some other handle implementation then you
  can adapt your existing handle with this code:

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

## 0.0.12

- Update to @automerge/automerge@2.2.3 and @automerge/automerge-repo@1.2.0

## 0.0.11

- Setting up the plugin now just requires that you create an
  `automergeSyncPlugin` and pass it the `handle` and `path`. I.e. you go from
  this:

  ```typescript
  const doc = handle.docSync()
  const source = doc.text // this should use path
  const plugin = amgPlugin(doc, path)
  const semaphore = new PatchSemaphore(plugin)
  const view = (editorRoot.current = new EditorView({
    doc: source,
    extensions: [basicSetup, plugin],
    dispatch(transaction) {
      view.update([transaction])
      semaphore.reconcile(handle, view)
    },
    parent: containerRef.current,
  }))

  const handleChange = ({ doc, patchInfo }) => {
    semaphore.reconcile(handle, view)
  }
  ```

  To this

  ```typescript
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
