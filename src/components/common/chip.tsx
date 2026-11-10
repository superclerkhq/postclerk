import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/** One of a row of chips a page moves between: what it shows now is solid, the rest a soft tint. */
export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full pl-1.5 pr-3 text-[12.5px] transition-colors",
        active ? "bg-foreground text-background" : "bg-foreground/[0.05] text-foreground hover:bg-foreground/[0.09]",
      )}
    >
      {children}
    </button>
  )
}
