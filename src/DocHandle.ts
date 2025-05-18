import { next as A } from "@automerge/automerge"

export interface DocHandle<T> {
  isReady: () => boolean
  doc(): A.Doc<T>
  change(callback: (doc: A.Doc<T>) => void): void
  on(event: "change", callback: () => void): void
  off(event: "change", callback: () => void): void
}
