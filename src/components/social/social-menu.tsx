import { useSearch } from "@tanstack/react-router"
import {
  CalendarBlank,
  ChartBar,
  GridFour,
  NotePencil,
  PlugsConnected,
  Queue,
  Rows,
  Sparkle,
} from "@phosphor-icons/react"

import { SectionMobileNav, type NavPage } from "@/components/shelf-link"

/**
 * Social's pages, in the sidebar's order: the posts as a queue, a calendar, drafts, every post and the feed as
 * Instagram shows it, then how they did, the accounts they go to, and the AI assistants that can work on them.
 */
const PAGES = [
  { view: "queue", label: "Queue", icon: Queue },
  { view: "calendar", label: "Calendar", icon: CalendarBlank },
  { view: "drafts", label: "Drafts", icon: NotePencil },
  { view: "posts", label: "All posts", icon: Rows },
  { view: "feed", label: "Feed preview", icon: GridFour },
  { view: "analytics", label: "Analytics", icon: ChartBar },
  { view: "accounts", label: "Accounts", icon: PlugsConnected },
  { view: "assistants", label: "AI assistants", icon: Sparkle },
] as const

export const SOCIAL_VIEWS = PAGES.map((page) => page.view)
export type SocialViewName = (typeof PAGES)[number]["view"]

export function socialPage(view: SocialViewName) {
  return PAGES.find((page) => page.view === view)!
}

/** The queue is where Social opens, so only the other views are named in the URL. */
function socialViewSearch(view: SocialViewName, account?: string) {
  return {
    view: view === "queue" ? undefined : view,
    account: view === "accounts" || view === "assistants" ? undefined : account,
  }
}

/** Social's pages, keeping the account chosen now. */
export function socialPages(view: SocialViewName, account: string | undefined): NavPage[] {
  return PAGES.map((page) => ({
    label: page.label,
    icon: page.icon,
    to: "/",
    search: socialViewSearch(page.view, account),
    active: page.view === view,
  }))
}

export function SocialMobileNav() {
  const { view = "queue", account } = useSearch({ from: "/" })
  return <SectionMobileNav label="Social views" pages={socialPages(view, account)} />
}
