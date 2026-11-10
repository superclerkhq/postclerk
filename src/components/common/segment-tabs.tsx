import { Link } from "@tanstack/react-router"

import type { NavLink } from "@/components/shelf-link"
import { cn } from "@/lib/utils"

/** A page's views as one segmented row: a soft track with the open view raised. Each view is a link. */
export function SegmentTabs({ label, tabs }: { label: string; tabs: readonly NavLink[] }) {
  return (
    <nav aria-label={label} className="-mx-1 overflow-x-auto px-1">
      <ul className="inline-flex min-w-max items-center gap-0.5 rounded-[11px] bg-foreground/[0.045] p-[3px]">
        {tabs.map((tab) => (
          <li key={tab.label}>
            <Link
              to={tab.to}
              search={tab.search}
              activeOptions={{ exact: true }}
              aria-current={tab.active ? "page" : undefined}
              className={cn(
                "flex h-[30px] items-center rounded-[8px] px-3.5 text-[13px] font-medium",
                "transition-[color,background-color,box-shadow] duration-200",
                "outline-2 -outline-offset-2 outline-transparent focus-visible:outline-ring",
                tab.active
                  ? "bg-background text-foreground shadow-[0_0_0_0.5px_var(--chrome-edge),0_1px_2px_rgb(0_0_0/0.06)] dark:bg-foreground/[0.1]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
