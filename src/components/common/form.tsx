import type { InputHTMLAttributes, ReactNode } from "react"
import { Check, Question } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { Switch } from "./switch"

/**
 * Shared across both field tones.
 *
 * Focus uses a real `outline`, not a ring: outlines follow border-radius, are never clipped by an
 * `overflow-hidden` ancestor, and survive forced-colours mode. The resting outline is transparent
 * rather than absent so Windows High Contrast still paints one. Colour comes from `--ring`, which
 * is tuned to clear WCAG 2.2's 3:1 focus-indicator contrast against both the field and the page.
 *
 * The offset is negative so the indicator is drawn *inside* the field's own footprint: no detached
 * halo, and the field never changes size between rest and focus. A hairline is enough here — a
 * focused text field also shows a caret, which buttons don't get.
 */
const FIELD_BASE = [
  "w-full text-sm text-foreground placeholder:text-muted-foreground",
  "outline-1 -outline-offset-1 outline-transparent focus-visible:outline-ring",
  // Chrome repaints autofilled inputs with its own background, which wrecks a filled field.
  // A 1000px inset shadow is the only reliable way to hold the surface.
  "autofill:[-webkit-text-fill-color:var(--color-foreground)]",
  // Money fields carry their own "/ mo" or "/ minute" suffix; native spinners land on top of it.
  "[&[type=number]]:[appearance:textfield]",
  "[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
  "disabled:cursor-not-allowed disabled:opacity-60",
].join(" ")

/** Outline treatment: a border carries the affordance, so it darkens on hover. */
const FIELD_INPUT = cn(
  FIELD_BASE,
  "rounded-md border border-border/80 bg-background px-3 py-2",
  "transition-[border-color,background-color] hover:border-foreground/20 focus-visible:border-ring",
  "autofill:shadow-[inset_0_0_0_1000px_var(--color-background)]",
)

/**
 * Filled treatment: the fill is the affordance, so no resting border — a fill and a border say the
 * same thing twice. Two states only, rest and focus: the I-beam cursor already answers "can I type
 * here", so a hover tint just adds motion to a form you are scanning, not using.
 */
const FIELD_SOFT = cn(
  FIELD_BASE,
  "rounded-lg bg-surface-strong px-3 py-2",
  "transition-[background-color,outline-color] focus-visible:bg-surface-deep",
  "autofill:shadow-[inset_0_0_0_1000px_var(--color-surface-strong)]",
)

export type Tone = "outline" | "soft"

/** The resting look every field shares, text or choice, so a select sits flush beside an input. */
export function fieldTone(tone: Tone) {
  return tone === "soft" ? FIELD_SOFT : FIELD_INPUT
}

export function Field({
  label,
  hint,
  optional,
  required,
  children,
  className,
}: {
  label: ReactNode
  hint?: ReactNode
  optional?: boolean
  /** Marks a field the form can't be sent without. */
  required?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
        <span>
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
        </span>
        {optional ? <OptionalFlag /> : null}
      </span>
      {children}
      {hint && <span className="block text-xs leading-5 text-muted-foreground">{hint}</span>}
    </label>
  )
}

export function OptionalFlag() {
  return (
    <span className="rounded-full border border-border/70 px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground">
      Optional
    </span>
  )
}

export function Toggle({
  label,
  hint,
  optional,
  checked,
  onCheckedChange,
}: {
  label: string
  hint?: string
  optional?: boolean
  checked: boolean
  onCheckedChange: (next: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md py-1.5">
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="text-sm text-foreground">{label}</span>
        {optional ? <OptionalFlag /> : null}
        {hint && (
          <span
            title={hint}
            aria-label={hint}
            className="inline-flex shrink-0 text-muted-foreground/70 hover:text-foreground"
          >
            <Question weight="bold" className="h-3 w-3" />
          </span>
        )}
      </span>
      <Switch checked={checked} onChange={onCheckedChange} />
    </label>
  )
}

export function TextInput({
  className,
  tone = "outline",
  ...props
}: { tone?: Tone } & InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldTone(tone), className)} {...props} />
}

function CheckRow({
  label,
  hint,
  active,
  onClick,
}: {
  label: string
  hint?: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "group flex w-full min-w-0 cursor-pointer items-start gap-2 rounded-md border px-2 py-1.5 text-left transition-colors",
        active ? "border-foreground/15 bg-muted/60 hover:bg-muted/80" : "border-transparent hover:bg-muted/30",
      )}
    >
      <span
        data-active={active}
        className={cn(
          "mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border",
          "transition-[background-color,border-color] duration-150 ease-out",
          "data-[active=true]:border-foreground data-[active=true]:bg-foreground data-[active=true]:text-background",
          "data-[active=false]:border-muted-foreground/40 data-[active=false]:group-hover:border-muted-foreground/70",
        )}
      >
        <Check
          weight="bold"
          className={cn(
            "h-2.5 w-2.5 transition-[scale,opacity] duration-150 ease-out",
            active ? "scale-100 opacity-100" : "scale-50 opacity-0",
          )}
          strokeWidth={3.5}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-xs transition-colors",
            active ? "font-medium text-foreground" : "text-muted-foreground group-hover:text-foreground",
          )}
        >
          {label}
        </span>
        {hint && <span className="block truncate text-[10px] text-muted-foreground/70">{hint}</span>}
      </span>
    </button>
  )
}
