import { useSearch } from "@tanstack/react-router"

import { ShelfPages } from "@/components/shelf-link"
import { AssistantsView } from "@/components/social/social-assistants"
import { socialPages, SocialMobileNav } from "@/components/social/social-menu"
import { SocialView } from "@/components/social/social-view"

/** The app once this browser is signed in to `workspace`. It loads only then, so the landing page stays light. */
export default function Workspace({ workspace }: { workspace: string }) {
  const { view = "queue", account } = useSearch({ from: "/" })
  return (
    <div className="app-viewport flex min-h-0 overflow-hidden bg-background pt-[env(safe-area-inset-top)] text-foreground">
      <aside className="hidden w-[240px] shrink-0 flex-col bg-shelf shadow-[inset_-0.5px_0_0_var(--chrome-edge)] sm:flex">
        <div className="wordmark flex h-12 shrink-0 items-center gap-2 px-4 text-[18px] leading-none">
          <img src="/favicon.svg" alt="" className="size-5" />
          Postclerk
        </div>
        <ShelfPages label="Social" pages={socialPages(view, account)} />
        <p className="shrink-0 truncate px-4 pt-3 text-xs text-muted-foreground" title={workspace}>
          Signed in to <span className="font-medium text-foreground">{workspace}</span>
        </p>
        <form method="post" action="/oauth/signout" className="shrink-0">
          <button type="submit" className="px-4 pt-1.5 text-xs text-muted-foreground hover:text-foreground">
            Sign out
          </button>
        </form>
        <a
          href="https://github.com/superclerkhq/postclerk"
          target="_blank"
          rel="noreferrer"
          className="shrink-0 px-4 py-3 text-xs text-muted-foreground hover:text-foreground"
        >
          Open source, on the Superclerk API
        </a>
      </aside>
      <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
        <header className="flex h-12 shrink-0 items-center border-b border-border/70 px-2 sm:hidden">
          <SocialMobileNav />
        </header>
        {view === "assistants" ? <AssistantsView /> : <SocialView view={view} accountId={account} />}
      </main>
    </div>
  )
}
