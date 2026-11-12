import { afterEach, beforeEach, expect, setSystemTime, test } from "bun:test"

import app from "../worker/index"

const SITE = "https://postclerk.test"
const SUPERCLERK = "https://superclerk.test"
const KEY = "sc_test_key"
const env = { SUPERCLERK_URL: SUPERCLERK, SESSION_SECRET: "a-test-secret-of-at-least-32-characters" }
const form = { "content-type": "application/x-www-form-urlencoded" }

// Superclerk and storage, as the Worker calls them: each test sets the answers and reads what was sent.
const realFetch = globalThis.fetch
let sent: Request[]
let answer: (request: Request) => Response | Promise<Response>
const issueKey = () => Response.json({ access_token: KEY, token_type: "Bearer" })
beforeEach(() => {
  sent = []
  answer = issueKey
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init)
    sent.push(request.clone())
    return answer(request)
  }) as typeof fetch
})
afterEach(() => {
  globalThis.fetch = realFetch
  setSystemTime()
})

/** A browser on the app's own pages: it keeps the cookies responses set, and sends them back. */
function browser(site = SITE) {
  const cookies = new Map<string, string>()
  const request = async (path: string, init: RequestInit = {}) => {
    const headers = new Headers({ origin: site, ...init.headers })
    headers.set("cookie", [...cookies].map(([name, value]) => `${name}=${value}`).join("; "))
    const response = await app.request(`${site}${path}`, { ...init, headers }, env)
    for (const cookie of response.headers.getSetCookie()) {
      const [name, value] = cookie.split(";")[0].split("=")
      if (value === "") cookies.delete(name)
      else cookies.set(name, value)
    }
    return response
  }
  return { cookies, request }
}

/** Signs a browser in: the sign-in form, Superclerk's approval, and the way back. */
async function signIn(visitor = browser()) {
  const begun = await visitor.request("/oauth/signin", { method: "POST", headers: form })
  const authorize = new URL(begun.headers.get("location")!)
  const back = await visitor.request(`/oauth/callback?code=the-code&state=${authorize.searchParams.get("state")}`)
  return { visitor, begun, authorize, back }
}

const problem = (response: Response) => new URL(response.headers.get("location")!, SITE).searchParams.get("problem")
const sha256 = async (text: string) =>
  Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))).toString("base64url")

test("the client document names this copy, its callback and this computer's", async () => {
  const document = await (await browser().request("/oauth/client.json")).json()
  expect(document).toEqual({
    client_id: `${SITE}/oauth/client.json`,
    client_name: "Postclerk",
    client_uri: SITE,
    redirect_uris: [
      `${SITE}/oauth/callback`,
      "http://localhost/oauth/callback",
      "http://127.0.0.1/oauth/callback",
      "http://[::1]/oauth/callback",
    ],
    token_endpoint_auth_method: "none",
  })
})

test("signing in sends the browser to Superclerk with PKCE, the scopes and the apps", async () => {
  const { begun, authorize } = await signIn()
  expect(begun.status).toBe(303)
  expect(authorize.origin + authorize.pathname).toBe(`${SUPERCLERK}/oauth/authorize`)
  expect(Object.fromEntries(authorize.searchParams)).toMatchObject({
    response_type: "code",
    client_id: `${SITE}/oauth/client.json`,
    redirect_uri: `${SITE}/oauth/callback`,
    code_challenge_method: "S256",
    scope: "social:write connections:write",
    apps: "instagram facebook-page linkedin-profile linkedin-page threads tiktok youtube google-business-profile",
  })
  // Superclerk sends the browser back from another site, so this cookie alone is Lax.
  expect(begun.headers.get("set-cookie")).toMatch(
    /^__Host-postclerk_signin=[^;]+; Max-Age=3600; Path=\/; HttpOnly; Secure; SameSite=Lax$/,
  )
})

test("the callback trades the code with its verifier, and keeps the key in a cookie scripts and other sites never get", async () => {
  const { visitor, authorize, back } = await signIn()
  expect(sent).toHaveLength(1)
  expect(sent[0].url).toBe(`${SUPERCLERK}/oauth/token`)
  const exchange = new URLSearchParams(await sent[0].text())
  expect(Object.fromEntries(exchange)).toMatchObject({
    grant_type: "authorization_code",
    code: "the-code",
    client_id: `${SITE}/oauth/client.json`,
    redirect_uri: `${SITE}/oauth/callback`,
  })
  expect(await sha256(exchange.get("code_verifier")!)).toBe(authorize.searchParams.get("code_challenge")!)

  expect(back.status).toBe(303)
  expect(back.headers.get("location")).toBe("/")
  const session = back.headers.getSetCookie().find((cookie) => cookie.startsWith("__Host-postclerk_session="))
  expect(session).toMatch(/; Max-Age=31536000; Path=\/; HttpOnly; Secure; SameSite=Strict$/)
  expect(session).not.toContain(KEY)
  expect([...visitor.cookies.keys()]).toEqual(["__Host-postclerk_session"])
  expect(await (await visitor.request("/api/session")).json()).toEqual({ signedIn: true })
})

test("a copy on this computer signs in as postclerk.io, with plain cookies", async () => {
  const { begun, authorize } = await signIn(browser("http://localhost:5173"))
  expect(authorize.searchParams.get("client_id")).toBe("https://postclerk.io/oauth/client.json")
  expect(authorize.searchParams.get("redirect_uri")).toBe("http://localhost:5173/oauth/callback")
  expect(begun.headers.get("set-cookie")).toMatch(
    /^postclerk_signin=[^;]+; Max-Age=3600; Path=\/; HttpOnly; SameSite=Lax$/,
  )
})

test("a callback this browser didn't start never signs it in", async () => {
  const stranger = browser()
  expect(problem(await stranger.request("/oauth/callback?code=theirs&state=theirs"))).toContain("didn’t start here")
  const visitor = browser()
  await visitor.request("/oauth/signin", { method: "POST", headers: form })
  expect(problem(await visitor.request("/oauth/callback?code=theirs&state=theirs"))).toContain("didn’t start here")
  expect(sent).toHaveLength(0)
  expect(await (await visitor.request("/api/session")).json()).toEqual({ signedIn: false })
})

test("a sign-in the person declines, or one Superclerk refuses, leaves the browser signed out and says why", async () => {
  const visitor = browser()
  const declined = await visitor.request("/oauth/callback?error=access_denied")
  expect(declined.headers.get("location")).toBe("/")

  answer = () => Response.json({ error: "invalid_grant" }, { status: 400 })
  const { back } = await signIn(visitor)
  expect(problem(back)).toBe("Superclerk couldn’t finish signing you in (400). Try again.")
  expect(visitor.cookies.size).toBe(0)
})

test("API calls reach Superclerk with the key, and without this app's cookie or site", async () => {
  const { visitor } = await signIn()
  answer = () => Response.json({ posts: [] })
  const response = await visitor.request("/api/v1/social/posts?limit=5", { headers: { referer: `${SITE}/` } })
  expect(await response.json()).toEqual({ posts: [] })
  const forwarded = sent.at(-1)!
  expect(forwarded.url).toBe(`${SUPERCLERK}/v1/social/posts?limit=5`)
  expect(forwarded.headers.get("authorization")).toBe(`Bearer ${KEY}`)
  for (const name of ["cookie", "origin", "referer"]) expect(forwarded.headers.get(name)).toBeNull()
})

test("a visitor who isn't signed in gets 401, and nothing reaches Superclerk", async () => {
  for (const path of ["/api/v1/social/posts", "/api/assistant-token"]) {
    const response = await browser().request(path)
    expect(response.status).toBe(401)
    expect((await response.json()).error.code).toBe("signed_out")
  }
  expect(sent).toHaveLength(0)
})

test("when Superclerk no longer knows the key, the sign-in is over", async () => {
  const { visitor } = await signIn()
  answer = () => Response.json({ error: { code: "unauthorized" } }, { status: 401 })
  const response = await visitor.request("/api/v1/social/posts")
  expect(response.status).toBe(401)
  expect((await response.json()).error.code).toBe("signed_out")
  expect(visitor.cookies.size).toBe(0)
})

test("a sign-in lasts a year", async () => {
  const { visitor } = await signIn()
  setSystemTime(new Date(Date.now() + 364 * 86_400_000))
  expect(await (await visitor.request("/api/session")).json()).toEqual({ signedIn: true })
  setSystemTime(new Date(Date.now() + 2 * 86_400_000))
  expect(await (await visitor.request("/api/session")).json()).toEqual({ signedIn: false })
})

test("an assistant's token works on /mcp, and nothing else does", async () => {
  const { visitor } = await signIn()
  const { token } = await (await visitor.request("/api/assistant-token")).json()
  const call = (bearer?: string) =>
    app.request(`${SITE}/mcp`, { method: "POST", headers: bearer ? { authorization: `Bearer ${bearer}` } : {} }, env)

  answer = () => Response.json({ jsonrpc: "2.0", id: 1, result: { tools: [] } })
  expect((await call(token)).status).toBe(200)
  expect(sent.at(-1)!.url).toBe(`${SUPERCLERK}/v1/mcp`)
  expect(sent.at(-1)!.headers.get("authorization")).toBe(`Bearer ${KEY}`)

  const before = sent.length
  for (const wrong of [undefined, "not-a-token", visitor.cookies.get("__Host-postclerk_session")]) {
    const refused = await call(wrong)
    expect(refused.status).toBe(401)
    expect((await refused.json()).error.message).toContain("doesn’t know this token")
  }
  expect(sent).toHaveLength(before)

  // The key was revoked: the token's sign-in has ended, and Superclerk's own sign-in isn't offered in its place.
  answer = () => new Response(null, { status: 401, headers: { "www-authenticate": "Bearer" } })
  const ended = await call(token)
  expect(ended.headers.get("www-authenticate")).toBeNull()
  expect((await ended.json()).error.message).toContain("sign-in has ended")
})

test("signing out revokes the key and forgets the cookie, even when Superclerk can't be reached", async () => {
  const { visitor } = await signIn()
  answer = () => new Response(null, { status: 200 })
  const out = await visitor.request("/oauth/signout", { method: "POST", headers: form })
  expect(out.headers.get("location")).toBe("/")
  expect(sent.at(-1)!.url).toBe(`${SUPERCLERK}/oauth/revoke`)
  expect(await sent.at(-1)!.text()).toBe(`token=${KEY}`)
  expect(visitor.cookies.size).toBe(0)

  answer = issueKey
  const again = (await signIn()).visitor
  answer = () => Promise.reject(new Error("unreachable"))
  expect(problem(await again.request("/oauth/signout", { method: "POST", headers: form }))).toContain("didn’t revoke")
  expect(again.cookies.size).toBe(0)
})

test("a form posted from another site is refused", async () => {
  const { visitor } = await signIn()
  const forged = await visitor.request("/oauth/signout", {
    method: "POST",
    headers: { ...form, origin: "https://evil.example", "sec-fetch-site": "cross-site" },
  })
  expect(forged.status).toBe(403)
  expect(visitor.cookies.size).toBe(1)
  expect(sent).toHaveLength(1)
})

test("an upload passes the file to storage, then confirms it", async () => {
  const { visitor } = await signIn()
  const upload = { url: "https://storage.test/media/1", method: "PUT", headers: { "content-type": "image/jpeg" } }
  answer = (request) =>
    request.url === upload.url
      ? new Response(null, { status: 200 })
      : Response.json(
          request.url.endsWith("/confirm") ? { id: "media_1", status: "ready" } : { asset: { id: "media_1" }, upload },
        )
  const metadata = { filename: "team.jpg", contentType: "image/jpeg", sizeBytes: 5 }
  const response = await visitor.request("/api/upload", {
    method: "POST",
    headers: { "idempotency-key": "once", "x-upload": encodeURIComponent(JSON.stringify(metadata)) },
    body: "bytes",
  })
  expect(await response.json()).toEqual({ id: "media_1", status: "ready" })
  const [created, stored, confirmed] = sent.slice(-3)
  expect(created.url).toBe(`${SUPERCLERK}/v1/social/media`)
  expect(created.headers.get("idempotency-key")).toBe("once")
  expect(await created.json()).toEqual(metadata)
  expect([stored.method, stored.url, await stored.text()]).toEqual(["PUT", upload.url, "bytes"])
  expect(stored.headers.get("authorization")).toBeNull()
  expect(confirmed.url).toBe(`${SUPERCLERK}/v1/social/media/media_1/confirm`)
})

test("when Superclerk can't be reached, the person sees a message, not a crash", async () => {
  const { visitor } = await signIn()
  answer = () => Promise.reject(new Error("unreachable"))
  const response = await visitor.request("/api/v1/social/posts")
  expect(response.status).toBe(502)
  expect((await response.json()).error.code).toBe("bad_gateway")

  const arriving = browser()
  const begun = await arriving.request("/oauth/signin", { method: "POST", headers: form })
  const state = new URL(begun.headers.get("location")!).searchParams.get("state")
  expect(problem(await arriving.request(`/oauth/callback?code=the-code&state=${state}`))).toContain("hit a problem")
})
