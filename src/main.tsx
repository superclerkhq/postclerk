import { lazy, StrictMode, Suspense } from "react"
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

import { Landing } from "@/components/landing"
import { SOCIAL_VIEWS, type SocialViewName } from "@/components/social/social-pages"
import { sessionQuery } from "@/lib/session"
import "./index.css"

const Workspace = lazy(() => import("@/workspace"))

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

/** The app once this browser is signed in to Superclerk, and the landing page before. */
function Home() {
  const session = useQuery(sessionQuery)
  const { problem } = useSearch({ from: "/" })
  if (!session.data) return null
  const { workspace } = session.data
  if (workspace === null) return <Landing problem={problem} />
  return (
    <Suspense>
      <Workspace workspace={workspace} />
    </Suspense>
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
