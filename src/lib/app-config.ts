import { queryOptions } from "@tanstack/react-query"

/** What the app's server says about itself: whether it asks for a password, and whether it's signed in to Superclerk. */
export type AppConfig = { passwordRequired: boolean; signedIn: boolean }

export const appConfigQuery = queryOptions({
  queryKey: ["app-config"],
  queryFn: async (): Promise<AppConfig> => (await fetch("/config.json")).json(),
})
