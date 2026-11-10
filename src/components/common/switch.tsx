import { cn } from "@/lib/utils"

/**
 * The visual half of a switch, brand-coloured when on. `Switch` pairs it with its input; a row
 * that is itself the control (a button with role="switch") renders it directly.
 */
export function SwitchTrack({ on, muted, className }: { on: boolean; muted?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors duration-150 ease-out",
        "peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
        on ? (muted ? "bg-brand/45" : "bg-brand") : "bg-foreground/50",
        className,
      )}
    >
      <span
        className={cn(
          "size-4 rounded-full bg-white shadow-sm transition-transform duration-150 ease-out",
          on && "translate-x-4",
        )}
      />
    </span>
  )
}

/**
 * A switch named by the `<label>` around it. The label also owns the disabled look, so the switch
 * and its text dim together. The wrapper's `relative` contains the sr-only input, which would
 * otherwise resolve its containing block to the page root and stretch the document.
 */
export function Switch({
  checked,
  disabled,
  muted,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  /** On, but something else holds back what it controls. */
  muted?: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <span className="relative inline-flex shrink-0">
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        // Enter flips the switch, as the WAI-ARIA switch pattern allows, instead of submitting the form around it.
        onKeyDown={(event) => {
          if (event.key !== "Enter") return
          event.preventDefault()
          onChange(!checked)
        }}
        className="peer sr-only"
      />
      <SwitchTrack on={checked} muted={muted} />
    </span>
  )
}
