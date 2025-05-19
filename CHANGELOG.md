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
