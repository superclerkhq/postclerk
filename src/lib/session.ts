import { queryOptions } from "@tanstack/react-query"

/** The workspace this browser is signed in to, or null before it signs in to Superclerk. */
export const sessionQuery = queryOptions({
  queryKey: ["session"],
  queryFn: async (): Promise<{ workspace: string | null }> => (await fetch("/api/session")).json(),
})
