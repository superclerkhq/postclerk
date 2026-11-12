import { Hono, type Context } from "hono"
import { deleteCookie, getCookie, setCookie } from "hono/cookie"
import { csrf } from "hono/csrf"
import { HTTPException } from "hono/http-exception"
import { proxy } from "hono/proxy"
import { base64url, EncryptJWT, jwtDecrypt } from "jose"

type Env = {
  /** Superclerk's API, which the app signs in to. */
  SUPERCLERK_URL: string
  /** Encrypts each person's sign-in into their own cookie, so the Worker keeps nothing. */
  SESSION_SECRET: string
}
/** A person's sign-in: the Superclerk key it gave, which never reaches a page's scripts. */
type Session = { key: string }
/** A sign-in waiting for Superclerk to send the browser back. */
type SignIn = { state: string; verifier: string }
type Types = { Bindings: Env; Variables: { session: Session } }
type App = Context<Types>

// What the app asks to do: post, and connect the accounts it posts to, on the networks it posts to.
const SCOPE = "social:write connections:write"
const APPS = "instagram facebook-page linkedin-profile linkedin-page threads tiktok youtube google-business-profile"
const LOOPBACK = ["localhost", "127.0.0.1", "[::1]"]
// Superclerk can't read a client document on someone's own computer, so a copy running there signs in as
// postclerk.io, whose document lists this computer's callback.
const LOCAL_CLIENT_ID = "https://postclerk.io/oauth/client.json"
const SESSION_COOKIE = "postclerk_session"
const SIGN_IN_COOKIE = "postclerk_signin"
const SESSION_SECONDS = 365 * 86_400
// Longer than Superclerk gives a person to approve, so its limit is the one they meet.
const SIGN_IN_SECONDS = 3600

const encoder = new TextEncoder()
const random = () => base64url.encode(crypto.getRandomValues(new Uint8Array(32)))
const sha256 = async (text: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(text)))

function secret(env: Env) {
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32)
    throw new Error("Set SESSION_SECRET to a random string of 32 or more characters: openssl rand -base64 32")
  return sha256(env.SESSION_SECRET)
}

/** Encrypts a value so only this Worker reads it, for one purpose and until it expires (a JWE, RFC 7516). */
const seal = async (env: Env, purpose: string, value: Session | SignIn, seconds: number) =>
  new EncryptJWT(value)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setAudience(purpose)
    .setExpirationTime(`${seconds}s`)
    .encrypt(await secret(env))

/** What a sealed value holds. Undefined when there is none, or it was changed, sealed for another purpose or expired. */
const unseal = async <T>(env: Env, purpose: string, token = "") =>
  jwtDecrypt<T>(token, await secret(env), { audience: purpose }).then(
    ({ payload }) => payload,
    () => undefined,
  )

// Over HTTPS a cookie carries the __Host- prefix: it is Secure, and no other host can set it. Browsers take neither
// from a copy on http://localhost, which goes without.
const prefix = (c: App) => (c.req.url.startsWith("https:") ? "host" : undefined)

/**
 * A cookie no script reads. A Strict one comes only with this app's own requests. A Lax one also comes when another
 * site sends the browser here, as Superclerk does after a sign-in.
 */
const keep = (c: App, name: string, value: string, maxAge: number, sameSite: "Strict" | "Lax") =>
  setCookie(c, name, value, { httpOnly: true, sameSite, maxAge, prefix: prefix(c) })
const read = (c: App, name: string) => getCookie(c, name, prefix(c))
const forget = (c: App, name: string) => deleteCookie(c, name, { prefix: prefix(c) })

const readSession = (c: App) => unseal<Session>(c.env, "session", read(c, SESSION_COOKIE))

/** Back to the app, saying why when signing in or out went wrong. */
const home = (c: App, problem?: string) => c.redirect(problem ? `/?problem=${encodeURIComponent(problem)}` : "/", 303)

/** No sign-in, or one that is over: the page shows the sign-in screen, and the browser forgets the cookie. */
function signedOut(c: App) {
  forget(c, SESSION_COOKIE)
  return c.json({ error: { code: "signed_out", message: "Sign in with Superclerk first" } }, 401)
}

/** Superclerk's answer, unless it no longer knows the key, as when the person revoked it there: the sign-in is over. */
const unlessEnded = (c: App, answer: Response) => (answer.status === 401 ? signedOut(c) : answer)

/** How Superclerk knows this copy: the address of its client document, and where it sends the browser back. */
function client(c: App) {
  const { origin, hostname } = new URL(c.req.url)
  return {
    id: LOOPBACK.includes(hostname) ? LOCAL_CLIENT_ID : `${origin}/oauth/client.json`,
    redirectURI: `${origin}/oauth/callback`,
  }
}

/** A request passed on to Superclerk with a person's key, and without this app's own cookies and site. */
const superclerk = (c: App, { key }: Session, path: string) =>
  proxy(new URL(path, c.env.SUPERCLERK_URL), {
    raw: c.req.raw,
    headers: {
      ...c.req.header(),
      authorization: `Bearer ${key}`,
      cookie: undefined,
      origin: undefined,
      referer: undefined,
    },
    redirect: "manual",
  })

const app = new Hono<Types>()

// Pages on other sites can't submit a form to the routes that read a cookie. Assistants on /mcp send a token instead.
app.use("/oauth/*", csrf())
app.use("/api/*", csrf())

app.onError((error, c) => {
  if (error instanceof HTTPException) return error.getResponse()
  // Superclerk couldn't be reached, or this copy is set up wrong. The Worker's logs say which.
  console.error(error)
  const problem = "Postclerk hit a problem. Try again in a moment."
  return c.req.path.startsWith("/oauth/")
    ? home(c, problem)
    : c.json({ error: { code: "bad_gateway", message: problem } }, 502)
})

/**
 * Who this copy of the app is, as Superclerk reads it when someone signs in (a Client ID Metadata Document). Its own
 * address over HTTPS, and this computer's for a copy running on one.
 */
app.get("/oauth/client.json", (c) => {
  const { origin } = new URL(c.req.url)
  return c.json({
    client_id: `${origin}/oauth/client.json`,
    client_name: "Postclerk",
    client_uri: origin,
    redirect_uris: [origin, ...LOOPBACK.map((host) => `http://${host}`)].map((site) => `${site}/oauth/callback`),
    token_endpoint_auth_method: "none",
  })
})

/** Sends the browser to Superclerk to approve this app: OAuth's authorization code flow with PKCE. */
app.post("/oauth/signin", async (c) => {
  const started: SignIn = { state: random(), verifier: random() }
  const { id, redirectURI } = client(c)
  const authorize = new URL("/oauth/authorize", c.env.SUPERCLERK_URL)
  authorize.search = new URLSearchParams({
    response_type: "code",
    client_id: id,
    redirect_uri: redirectURI,
    state: started.state,
    code_challenge: base64url.encode(await sha256(started.verifier)),
    code_challenge_method: "S256",
    scope: SCOPE,
    apps: APPS,
  }).toString()
  keep(c, SIGN_IN_COOKIE, await seal(c.env, "signin", started, SIGN_IN_SECONDS), SIGN_IN_SECONDS, "Lax")
  return c.redirect(authorize.href, 303)
})

/** Where Superclerk sends the browser back: the code trades for a key, if this browser asked for it. */
app.get("/oauth/callback", async (c) => {
  const started = await unseal<SignIn>(c.env, "signin", read(c, SIGN_IN_COOKIE))
  forget(c, SIGN_IN_COOKIE)
  const { code, state } = c.req.query()
  // The person said no on Superclerk.
  if (code === undefined) return home(c)
  // A code this browser didn't ask for may be someone else's, sent to sign this browser in to their workspace.
  if (!started || state !== started.state) return home(c, "This sign-in didn’t start here. Sign in again.")
  const { id, redirectURI } = client(c)
  const answer = await fetch(new URL("/oauth/token", c.env.SUPERCLERK_URL), {
    method: "POST",
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: id,
      redirect_uri: redirectURI,
      code_verifier: started.verifier,
    }),
  })
  if (!answer.ok) {
    // Whatever Superclerk said goes to the Worker's logs; the person learns that signing in failed, never silently.
    console.error("Superclerk refused the sign-in code", answer.status, await answer.text())
    return home(c, `Superclerk couldn’t finish signing you in (${answer.status}). Try again.`)
  }
  const { access_token: key } = (await answer.json()) as { access_token: string }
  keep(c, SESSION_COOKIE, await seal(c.env, "session", { key }, SESSION_SECONDS), SESSION_SECONDS, "Strict")
  return home(c)
})

/** Signs this browser out, and asks Superclerk to revoke the key its sign-in gave (RFC 7009). */
app.post("/oauth/signout", async (c) => {
  const current = await readSession(c)
  forget(c, SESSION_COOKIE)
  if (!current) return home(c)
  // The browser is signed out either way, even when Superclerk can't be reached.
  const revoked = await fetch(new URL("/oauth/revoke", c.env.SUPERCLERK_URL), {
    method: "POST",
    body: new URLSearchParams({ token: current.key }),
  }).then(
    (answer) => answer.ok,
    () => false,
  )
  const problem =
    "Signed out, but Superclerk didn’t revoke the app’s key. Revoke it in Superclerk: Settings, Developer API."
  return home(c, revoked ? undefined : problem)
})

/**
 * Superclerk's MCP server, for an assistant holding a token from the AI assistants page. The key's scopes decide which
 * tools it lists and runs.
 */
app.all("/mcp", async (c) => {
  const refuse = (message: string) => c.json({ jsonrpc: "2.0", id: null, error: { code: -32001, message } }, 401)
  const [, token] = /^Bearer (.+)$/i.exec(c.req.header("authorization") ?? "") ?? []
  const assistant = await unseal<Session>(c.env, "assistant", token)
  if (!assistant) return refuse("Postclerk doesn’t know this token. Copy a new one from its AI assistants page.")
  const answer = await superclerk(c, assistant, "/v1/mcp")
  if (answer.status === 401)
    return refuse("This token’s sign-in has ended. Copy a new one from Postclerk’s AI assistants page.")
  // Superclerk's own sign-in can't connect an assistant to Postclerk, so it isn't offered.
  answer.headers.delete("www-authenticate")
  return answer
})

app.get("/api/session", async (c) => c.json({ signedIn: (await readSession(c)) !== undefined }))

// Everything else under /api is for a signed-in person.
app.use("/api/*", async (c, next) => {
  const current = await readSession(c)
  if (!current) return signedOut(c)
  c.set("session", current)
  await next()
})

app.get("/api/assistant-token", async (c) =>
  c.json({ token: await seal(c.env, "assistant", { key: c.var.session.key }, SESSION_SECONDS) }),
)

/** Storage takes browser uploads only from Superclerk's own sites, so a file's bytes pass through here. */
app.post("/api/upload", async (c) => {
  const authorization = `Bearer ${c.var.session.key}`
  const created = await fetch(new URL("/v1/social/media", c.env.SUPERCLERK_URL), {
    method: "POST",
    headers: {
      authorization,
      "content-type": "application/json",
      "idempotency-key": c.req.header("idempotency-key")!,
    },
    body: decodeURIComponent(c.req.header("x-upload")!),
  })
  if (!created.ok) return unlessEnded(c, created)
  const { asset, upload } = (await created.json()) as {
    asset: { id: string; status: string }
    upload: { url: string; method: string; headers: Record<string, string> }
  }
  if (asset.status === "ready") return c.json(asset)
  const stored = await fetch(upload.url, { method: upload.method, headers: upload.headers, body: c.req.raw.body })
  // 412: an earlier try already stored these bytes. Confirming checks them either way.
  if (!stored.ok && stored.status !== 412)
    return c.json({ error: { code: "upload_failed", message: `Storage answered ${stored.status}` } }, 502)
  return fetch(new URL(`/v1/social/media/${asset.id}/confirm`, c.env.SUPERCLERK_URL), {
    method: "POST",
    headers: { authorization, "idempotency-key": crypto.randomUUID() },
  })
})

/** Superclerk's own API, called with the person's key. The key's scopes decide what it may do. */
app.all("/api/*", async (c) =>
  unlessEnded(c, await superclerk(c, c.var.session, c.req.path.slice("/api".length) + new URL(c.req.url).search)),
)

export default app
