import { queryOptions } from "@tanstack/react-query"

/** Whether this browser is signed in to Superclerk. */
export const sessionQuery = queryOptions({
  queryKey: ["session"],
  queryFn: async (): Promise<{ signedIn: boolean }> => (await fetch("/api/session")).json(),
})
