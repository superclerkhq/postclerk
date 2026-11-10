import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * A key drawn as a small keycap, tinted from the text colour of whatever it sits in. Decorative: the
 * control it labels carries `aria-keyshortcuts`, and touch screens have no keys to show.
 */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      aria-hidden
      className={cn(
        "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[5px] px-1 font-sans text-[10.5px] font-medium leading-none",
        "bg-current/10 shadow-[inset_0_-1px_0_rgb(0_0_0/0.14)] pointer-coarse:hidden",
        className,
      )}
    >
      {children}
    </kbd>
  )
}
