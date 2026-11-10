import { useSearch } from "@tanstack/react-router"
import { ChartBar, PlugsConnected, Queue } from "@phosphor-icons/react"

import { SegmentTabs } from "@/components/common/segment-tabs"
import { SectionMobileNav, type NavPage } from "@/components/shelf-link"

export const SOCIAL_VIEWS = ["queue", "calendar", "drafts", "posts", "feed", "analytics", "accounts"] as const
export type SocialViewName = (typeof SOCIAL_VIEWS)[number]

/** The posts as a queue, a calendar, drafts, every post, or the feed as Instagram shows it: views of one Posts page. */
const POST_VIEWS = [
  { view: "queue", label: "Queue" },
  { view: "calendar", label: "Calendar" },
  { view: "drafts", label: "Drafts" },
  { view: "posts", label: "All posts" },
  { view: "feed", label: "Feed preview" },
] as const

/** Social's pages: the posts, how they did, and the accounts they go to. */
const PAGES = [
  { view: "queue", label: "Posts", icon: Queue },
  { view: "analytics", label: "Analytics", icon: ChartBar },
  { view: "accounts", label: "Accounts", icon: PlugsConnected },
] as const

export function isPostView(view: SocialViewName) {
  return POST_VIEWS.some((post) => post.view === view)
}

/** The page a view is on. */
export function socialPage(view: SocialViewName) {
  return isPostView(view) ? PAGES[0] : PAGES.find((page) => page.view === view)!
}

/** The queue is where Social opens, so only the other views are named in the URL. */
export function socialViewSearch(view: SocialViewName, account?: string) {
  return {
    view: view === "queue" ? undefined : view,
    account: view === "accounts" ? undefined : account,
  }
}

/** Social's pages, keeping the account chosen now; none is open when the view is outside Social. */
export function socialPages(view: SocialViewName | undefined, account: string | undefined): NavPage[] {
  const current = view && socialPage(view)
  return PAGES.map((page) => ({
    label: page.label,
    icon: page.icon,
    to: "/",
    search: socialViewSearch(page.view, account),
    active: page === current,
  }))
}

export function PostViewTabs({ view, account }: { view: SocialViewName; account: string | undefined }) {
  return (
    <SegmentTabs
      label="Post views"
      tabs={POST_VIEWS.map((post) => ({
        label: post.label,
        to: "/",
        search: socialViewSearch(post.view, account),
        active: post.view === view,
      }))}
    />
  )
}

export function SocialMobileNav() {
  const { view = "queue", account } = useSearch({ from: "/" })
  return <SectionMobileNav label="Social views" pages={socialPages(view, account)} />
}
