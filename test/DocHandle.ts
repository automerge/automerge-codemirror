import { unstable as automerge, getHeads, Heads } from "@automerge/automerge"

export type PatchListener = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: automerge.Doc<any>,
  patches: Array<automerge.Patch>,
  source: string
) => void
type Listener = {
  heads: automerge.Heads
  callback: PatchListener
}

export class DocHandle {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: automerge.Doc<any>
  listeners: Array<Listener>

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(doc: automerge.Doc<any>) {
    this.doc = doc
    this.listeners = []
  }

  changeAt = (
    atHeads: automerge.Heads,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fn: (doc: automerge.Doc<any>) => void
  ): Heads => {
    this.doc = automerge.changeAt(this.doc, atHeads, fn)
    this._notifyListeners("changeAt")
    return getHeads(this.doc)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  change = (fn: (doc: automerge.Doc<any>) => void): Heads => {
    this.doc = automerge.change(this.doc, fn)
    this._notifyListeners("change")
    return getHeads(this.doc)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  merge = (other: automerge.Doc<any>) => {
    this.doc = automerge.merge(this.doc, other)
    this._notifyListeners("merge")
  }

  addListener = (listener: PatchListener) => {
    const heads = automerge.getHeads(this.doc)
    this.listeners.push({ heads, callback: listener })
  }

  removeListeners = () => {
    this.listeners = []
  }

  _notifyListeners = (source: string) => {
    const newHeads = automerge.getHeads(this.doc)
    for (const listener of this.listeners) {
      if (listener.heads !== newHeads) {
        const diff = automerge.diff(this.doc, listener.heads, newHeads)
        if (diff.length > 0) {
          listener.callback(this.doc, diff, source)
        }
        listener.heads = newHeads
      }
    }
  }
}
