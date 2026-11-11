import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { CaretDown, type Icon } from "@phosphor-icons/react"

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PRESS } from "@/components/ui/styles"
import { cn } from "@/lib/utils"

/** New shelf content fades in instead of popping: section switches, search, rows arriving live. */
export const SHELF_ENTER = "transition-opacity duration-200 ease-out starting:opacity-0 motion-reduce:transition-none"

/** A section shelf's list: rows inset 8px from the shelf edges, one pixel apart. */
export const SHELF_LIST = cn("flex min-h-0 flex-1 flex-col gap-px overflow-y-auto px-2 pb-2", SHELF_ENTER)

/** Shared by every shelf row so icons sit at 16px and labels at 40px from the shelf edge. */
export const SHELF_ROW = cn(
  "flex h-10 w-full cursor-pointer items-center gap-2 rounded-[10px] px-2 text-left text-[14px] text-foreground/90 sm:h-[30px]",
  PRESS,
  "hover:bg-foreground/[0.04] hover:text-foreground",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
)

export const SHELF_ROW_ACTIVE = "bg-foreground/[0.06] text-foreground hover:bg-foreground/[0.06]"

/** A page a section links to, and whether it is the one open now. */
type NavLink = { to: string; search?: Record<string, string | undefined>; label: string; active: boolean }
export type NavPage = NavLink & { icon: Icon }

/** A shelf row; anything after the label sits at the row's end. */
export function ShelfLink({ to, search, label, icon: PageIcon, active, children }: NavPage & { children?: ReactNode }) {
  return (
    <Link
      to={to}
      search={search}
      // The router marks any link whose path prefixes the URL as the current page, overriding ours.
      activeOptions={{ exact: true }}
      aria-current={active ? "page" : undefined}
      className={cn(SHELF_ROW, active && SHELF_ROW_ACTIVE)}
    >
      <PageIcon
        size={16}
        weight={active ? "fill" : "regular"}
        aria-hidden
        className={cn("shrink-0", !active && "text-muted-foreground/85")}
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {children}
    </Link>
  )
}

/** A section's pages as its shelf lists them. */
export function ShelfPages({ label, pages }: { label?: string; pages: readonly NavPage[] }) {
  return (
    <ul aria-label={label} className={SHELF_LIST}>
      {pages.map((page) => (
        <li key={page.label}>
          <ShelfLink {...page} />
        </li>
      ))}
    </ul>
  )
}

/** A section's pages for a phone, where the shelf is folded away: the one open now names the menu. */
export function SectionMobileNav({ label, pages }: { label: string; pages: readonly NavPage[] }) {
  const current = pages.find((page) => page.active)!
  return (
    <nav aria-label={label}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-9 min-w-0 cursor-pointer items-center gap-2 rounded-md px-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <current.icon size={17} weight="duotone" className="shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">{current.label}</span>
            <CaretDown size={12} weight="bold" className="shrink-0 text-muted-foreground" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="start" className="w-48">
          {pages.map((page) => (
            <DropdownMenuItem
              key={page.label}
              asChild
              className={page.active ? "text-brand [:where(&)>svg]:text-current" : undefined}
            >
              <Link to={page.to} search={page.search} aria-current={page.active ? "page" : undefined}>
                <page.icon size={17} weight={page.active ? "fill" : "duotone"} aria-hidden />
                {page.label}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  )
}
