import { useSearch } from "@tanstack/react-router"
import { SectionMobileNav, type NavPage } from "@/components/shelf-link"

import { PAGES, type SocialViewName } from "./social-pages"

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
