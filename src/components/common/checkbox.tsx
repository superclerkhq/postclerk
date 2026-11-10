import { Check, Minus } from "@phosphor-icons/react"
import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

const MARK = "pointer-events-none absolute inset-0 m-auto size-3 scale-75 text-white opacity-0 transition duration-100"

type CheckboxProps = Omit<ComponentProps<"input">, "type"> & {
  /** Some of what it stands for is ticked: a Select all over a list with only some rows ticked. */
  indeterminate?: boolean
}

/**
 * The house checkbox, drawn as the switches are: brand when on, with a white mark. It's still a real input, so a `<label>`
 * around it, forms and the keyboard work as ever. The resting edge is drawn at 3:1 against the page, as an off switch is.
 */
export function Checkbox({ indeterminate = false, className, ...input }: CheckboxProps) {
  return (
    <span className={cn("relative inline-flex size-4 shrink-0", className)}>
      <input
        type="checkbox"
        {...input}
        ref={(element) => {
          if (element) element.indeterminate = indeterminate
        }}
        className={cn(
          "peer m-0 size-full cursor-pointer appearance-none rounded-[5px] bg-background outline-none transition-colors duration-100",
          "shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_45%,transparent)]",
          "not-checked:not-indeterminate:hover:bg-foreground/[0.06]",
          "checked:bg-brand checked:shadow-none indeterminate:bg-brand indeterminate:shadow-none",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      />
      <Check
        aria-hidden
        weight="bold"
        className={cn(MARK, "peer-checked:scale-100 peer-checked:opacity-100 peer-indeterminate:opacity-0")}
      />
      <Minus
        aria-hidden
        weight="bold"
        className={cn(MARK, "peer-indeterminate:scale-100 peer-indeterminate:opacity-100")}
      />
    </span>
  )
}
