import { APIError, Superclerk } from "@superclerk/sdk"

export { APIError as ApiError }

const SIGNED_OUT = "Postclerk was signed out of Superclerk. Sign in again."

/** Calls go through this app's Worker, which adds the real key. */
export const superclerk = new Superclerk({
  apiKey: "added-by-the-worker",
  baseURL: `${window.location.origin}/api`,
  fetch: async (request) => {
    const outgoing = new Request(request)
    // Without this header the browser sends its own login for this site, when one is set.
    outgoing.headers.delete("authorization")
    const response = await fetch(outgoing)
    // The sign-in is over, as when its key was revoked in Superclerk: back to the sign-in screen.
    if (response.status === 401) window.location.replace(`/?problem=${encodeURIComponent(SIGNED_OUT)}`)
    return response
  },
})
