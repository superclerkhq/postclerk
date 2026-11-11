import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import { createRootRoute, createRoute, createRouter, RouterProvider, useSearch } from "@tanstack/react-router"
import "@fontsource/inter/latin-300.css"
import "@fontsource/inter/latin-400.css"
import "@fontsource/inter/latin-500.css"
import "@fontsource/inter/latin-600.css"
import "@fontsource/inter/latin-700.css"
import "@fontsource/jetbrains-mono/latin-400.css"
import "@fontsource/outfit/latin-600.css"

import { ShelfPages } from "@/components/shelf-link"
import { SignInScreen } from "@/components/sign-in-screen"
import { AssistantsView } from "@/components/social/social-assistants"
import { SOCIAL_VIEWS, socialPages, SocialMobileNav, type SocialViewName } from "@/components/social/social-menu"
import { SocialView } from "@/components/social/social-view"
import { appConfigQuery } from "@/lib/app-config"
import "./index.css"

// iOS Safari ignores interactive-widget=resizes-content, so the frame follows the visual viewport instead.
const viewport = window.visualViewport!
const followViewport = () => {
  if (viewport.scale !== 1) return
  document.documentElement.style.setProperty("--app-viewport-top", `${viewport.offsetTop}px`)
  document.documentElement.style.setProperty("--app-viewport-height", `${viewport.height}px`)
}
followViewport()
viewport.addEventListener("resize", followViewport)
viewport.addEventListener("scroll", followViewport)

/** The queue is where the app opens, so only the other views are named in the URL. */
type NamedView = Exclude<SocialViewName, "queue">
const NAMED_VIEWS = new Set<string>(SOCIAL_VIEWS.filter((view) => view !== "queue"))

/** The app once it is signed in to Superclerk, and the sign-in screen before. */
function Home() {
  const config = useQuery(appConfigQuery)
  const { problem } = useSearch({ from: "/" })
  if (!config.data) return null
  return config.data.signedIn ? <Workspace /> : <SignInScreen problem={problem} />
}

function Workspace() {
  const { view = "queue", account } = useSearch({ from: "/" })
  return (
    <div className="app-viewport flex min-h-0 overflow-hidden bg-background pt-[env(safe-area-inset-top)] text-foreground">
      <aside className="hidden w-[240px] shrink-0 flex-col bg-shelf shadow-[inset_-0.5px_0_0_var(--chrome-edge)] sm:flex">
        <div className="superclerk-wordmark flex h-12 shrink-0 items-center gap-2 px-4 text-[18px] leading-none">
          <img src="/favicon.svg" alt="" className="size-5" />
          Social
        </div>
        <ShelfPages label="Social" pages={socialPages(view, account)} />
        <form method="post" action="/signout" className="shrink-0">
          <button type="submit" className="px-4 pt-3 text-xs text-muted-foreground hover:text-foreground">
            Sign out
          </button>
        </form>
        <a
          href="https://docs.superclerk.com"
          target="_blank"
          rel="noreferrer"
          className="shrink-0 px-4 py-3 text-xs text-muted-foreground hover:text-foreground"
        >
          Built on the Superclerk API
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

const root = createRootRoute()
const home = createRoute({
  getParentRoute: () => root,
  path: "/",
  validateSearch: (search): { view?: NamedView; account?: string; connect_error?: string; problem?: string } => ({
    view: typeof search.view === "string" && NAMED_VIEWS.has(search.view) ? (search.view as NamedView) : undefined,
    account: typeof search.account === "string" && search.account !== "" ? search.account : undefined,
    connect_error: typeof search.connect_error === "string" ? search.connect_error : undefined,
    // Why signing in or out went wrong, as the server sent the browser back.
    problem: typeof search.problem === "string" ? search.problem : undefined,
  }),
  component: Home,
})
const router = createRouter({ routeTree: root.addChildren([home]) })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1, staleTime: 2_000 } },
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
