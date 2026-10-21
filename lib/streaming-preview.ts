import { create } from 'zustand'

/**
 * UI-only channel that shows an AI answer in the editor while it streams.
 * Nothing here touches the workspace store or the database: the chat panel
 * still applies the finished answer once with applyAIContent, so an aborted
 * or failed stream leaves the document exactly as it was.
 */
interface StreamingPreview {
  docId: string | null
  html: string
}

export const useStreamingPreview = create<StreamingPreview>(() => ({ docId: null, html: '' }))

let pending: StreamingPreview | null = null
let frame = 0

/** Coalesces chunk updates to one render per animation frame. */
export function publishStreamingPreview(docId: string, html: string) {
  pending = { docId, html }
  if (frame) return
  frame = requestAnimationFrame(() => {
    frame = 0
    if (pending) useStreamingPreview.setState(pending)
    pending = null
  })
}

export function clearStreamingPreview() {
  if (frame) cancelAnimationFrame(frame)
  frame = 0
  pending = null
  useStreamingPreview.setState({ docId: null, html: '' })
}
