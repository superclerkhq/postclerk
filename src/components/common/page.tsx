import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

const CONTAINER = "mx-auto w-full max-w-6xl"

export function PageHeader({
  title,
  eyebrow,
  count,
  description,
  actions,
}: {
  title: ReactNode
  eyebrow?: ReactNode
  count?: number
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="shrink-0 px-5 pb-6 pt-8 sm:px-8 sm:pb-7 sm:pt-12">
      <div
        className={cn(
          CONTAINER,
          "flex flex-col items-stretch gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6",
        )}
      >
        <div className="min-w-0 sm:flex-1">
          {eyebrow && <p className="text-[13px] font-medium text-muted-foreground">{eyebrow}</p>}
          <div className={cn("flex items-baseline gap-3", eyebrow && "mt-1.5")}>
            <h1 className="min-w-0 text-[28px] font-semibold leading-snug tracking-tight text-foreground">{title}</h1>
            {count !== undefined && count > 0 && (
              <span className="text-sm tabular-nums text-muted-foreground/80">{count}</span>
            )}
          </div>
          {description ? <p className="mt-1.5 text-[13px] text-muted-foreground">{description}</p> : null}
        </div>
        {actions && <div className="shrink-0 self-start pb-1">{actions}</div>}
      </div>
    </header>
  )
}

export function PageBody({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-16 [scrollbar-gutter:stable] sm:px-8">
      <div className={cn(CONTAINER, className)}>{children}</div>
    </div>
  )
}
