import { APIError, Superclerk } from "@superclerk/sdk"

export { APIError as ApiError }

/** Calls go through this app's server, which adds the real key. */
export const superclerk = new Superclerk({
  apiKey: "added-by-the-server",
  baseURL: `${window.location.origin}/api`,
  // Without this header the browser sends its own login for this site, when one is set.
  fetch: (request) => {
    const outgoing = new Request(request)
    outgoing.headers.delete("authorization")
    return fetch(outgoing)
  },
})
