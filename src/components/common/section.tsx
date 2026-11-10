import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/** The soft card every stat and table sits on. Shared because Billing renders usage sections and
 *  its own sections on one page — two definitions drifted apart once already, and the seam showed. */
export const PANEL = "overflow-hidden rounded-2xl bg-surface-soft"

export function SectionHead({
  title,
  description,
  trailing,
}: {
  title: string
  description: string
  trailing?: ReactNode
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  )
}

export function Metric({
  icon,
  label,
  value,
  title,
  tone,
  detail,
  compact = false,
}: {
  icon?: ReactNode
  label: string
  value: string
  title?: string
  /** Overrides the value color — used to flag a negative margin. */
  tone?: string
  /** A quiet line under the value that says what it counts. */
  detail?: string
  /** A smaller tile, for a row of them in a side panel. */
  compact?: boolean
}) {
  return (
    <div className={compact ? "rounded-xl bg-muted/50 px-3 py-2.5" : "rounded-2xl bg-surface-soft px-4 py-3.5"}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon ? <span className="shrink-0 text-muted-foreground/70">{icon}</span> : null}
        <span className="min-w-0 truncate">{label}</span>
      </div>
      <div
        className={cn(
          "truncate tabular-nums",
          compact ? "mt-0.5 text-[15px] font-medium" : "mt-2 text-xl font-semibold",
          tone ?? "text-foreground",
        )}
        title={title ?? value}
      >
        {value}
      </div>
      {detail && <div className="mt-0.5 truncate text-xs text-muted-foreground">{detail}</div>}
    </div>
  )
}
