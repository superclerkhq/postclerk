import { Check, Copy, X } from "lucide-react"

import { useCopy } from "@/hooks/use-copy"

/** Copies a value and says so; a refused clipboard shows on the button instead of passing silently. */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const { state, copy } = useCopy()
  const text = state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : label
  return (
    <button
      type="button"
      aria-label={text}
      title={text}
      onClick={() => copy(value)}
      className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
    >
      {state === "copied" ? (
        <Check className="size-3.5 text-success" />
      ) : state === "failed" ? (
        <X className="size-3.5 text-destructive" />
      ) : (
        <Copy className="size-3.5" />
      )}
      <span aria-live="polite" className="sr-only">
        {state === "idle" ? "" : text}
      </span>
    </button>
  )
}
