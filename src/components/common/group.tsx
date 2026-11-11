import type { ReactNode } from "react"

// The Superclerk app's groups, as its agent profiles draw them: a soft tile per row, with no lines.

/** A titled group of related rows. */
export function Group({
  title,
  description,
  children,
}: {
  title: string
  description?: ReactNode
  children: ReactNode
}) {
  return (
    <section aria-label={title}>
      <div className="mb-2.5 px-1">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">{title}</h2>
        {description ? <p className="mt-0.5 text-[13px] leading-5 text-muted-foreground">{description}</p> : null}
      </div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </section>
  )
}

/**
 * A label on the left and its value or control on the right; they stack on narrow screens. The control takes the
 * room the label leaves, so a long one shrinks before the label does.
 */
export function GroupRow({ label, leading, children }: { label: ReactNode; leading?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-muted/50 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex shrink-0 items-center gap-3 sm:w-36">
        {leading ? <span className="flex size-6 shrink-0 items-center justify-center">{leading}</span> : null}
        <p className="text-[13.5px] font-medium text-foreground">{label}</p>
      </div>
      <div className="flex min-w-0 items-center gap-2 sm:flex-1 sm:justify-end">{children}</div>
    </div>
  )
}
