## 0.0.12

* Update to @automerge/automerge@2.2.3 and @automerge/automerge-repo@1.2.0

## 0.0.11

* Setting up the plugin now just requires that you create an
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

