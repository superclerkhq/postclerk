import { useRef, useState } from "react"

type CopyState = "idle" | "copied" | "failed"

/**
 * Copies text and reports how it went. "copied" falls back to idle after a moment; "failed" stays
 * until the next attempt, so a refused clipboard never passes for a copy.
 */
export function useCopy() {
  const [state, setState] = useState<CopyState>("idle")
  const reset = useRef<number>(undefined)

  function copy(value: string) {
    window.clearTimeout(reset.current)
    // A page served over plain HTTP to another computer's address has no clipboard API at all.
    if (!window.isSecureContext) return setState("failed")
    navigator.clipboard.writeText(value).then(
      () => {
        setState("copied")
        reset.current = window.setTimeout(() => setState("idle"), 1500)
      },
      () => setState("failed"),
    )
  }

  return { state, copy }
}
