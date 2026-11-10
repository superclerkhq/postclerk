import { CircleNotch } from "@phosphor-icons/react"
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react"

import { PRESS_MOTION } from "@/components/ui/styles"
import { cn } from "@/lib/utils"

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success"
type Size = "sm" | "md" | "lg" | "icon"

// Raised buttons press with their own shadows; flat ones sink into the shared well.
const variantStyles: Record<Variant, string> = {
  primary: [
    "bg-gradient-to-b from-brand to-brand-deep text-brand-foreground",
    "shadow-[var(--shadow-btn-primary)]",
    "hover:brightness-[1.08]",
    "press:brightness-[0.97] press:shadow-[var(--shadow-btn-primary-active)]",
  ].join(" "),
  secondary: [
    "bg-gradient-to-b from-background to-muted text-foreground",
    "shadow-[var(--shadow-btn-secondary)]",
    "hover:brightness-[0.98]",
    "press:shadow-[var(--shadow-btn-secondary-active)]",
  ].join(" "),
  // A foreground tint shows on every surface a ghost button sits on, the shelf included.
  ghost: "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground press:shadow-[var(--shadow-press)]",
  danger: "bg-destructive/10 text-destructive hover:bg-destructive/15 press:shadow-[var(--shadow-press)]",
  success:
    "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 press:shadow-[var(--shadow-press)] dark:text-emerald-400",
}

const sizeStyles: Record<Size, string> = {
  sm: "h-7 px-2.5 text-xs gap-1.5",
  md: "h-8 px-3 text-xs gap-1.5",
  lg: "h-9 px-4 text-sm gap-2",
  icon: "h-8 w-8 p-0 justify-center",
}

/** A Button's look and press, for a link that has to read as a button. */
export function buttonClass(variant: Variant, size: Size) {
  return cn(
    "inline-flex cursor-pointer items-center rounded-md font-medium",
    PRESS_MOTION,
    // One focus treatment for every variant, drawn inside the button's own footprint so it
    // reads as a crisp edge rather than a detached halo.
    "outline-2 -outline-offset-2 outline-transparent focus-visible:outline-ring",
    "disabled:cursor-not-allowed disabled:opacity-50",
    variantStyles[variant],
    sizeStyles[size],
  )
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  ...props
}: {
  children: ReactNode
  variant?: Variant
  size?: Size
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn(buttonClass(variant, size), className)} {...props}>
      {children}
    </button>
  )
}

/** A button that trades its icon for a spinner while its action is pending. */
export function BusyButton({
  pending,
  icon,
  disabled,
  children,
  ...props
}: { pending: boolean; icon?: ReactNode } & ComponentProps<typeof Button>) {
  return (
    <Button disabled={disabled || pending} {...props}>
      {pending ? <CircleNotch size={13} className="animate-spin" /> : icon}
      {children}
    </Button>
  )
}
