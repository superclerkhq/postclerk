interface Env {
  /** Superclerk's API, which the app signs in to. */
  SUPERCLERK_URL: string
  /** Seals each person's sign-in into their own cookie, so the Worker keeps nothing. */
  SESSION_SECRET: string
}

/** A person's sign-in: the Superclerk key it gave, which never reaches a page's scripts. */
type Session = { key: string }
/** A sign-in waiting for Superclerk to send the browser back. */
type SignIn = { state: string; verifier: string; clientID: string; redirectURI: string }

// What the app asks to do: post, and connect the accounts it posts to, on the networks it posts to.
const SCOPE = "social:write connections:write"
const APPS = "instagram facebook-page linkedin-profile linkedin-page threads tiktok youtube google-business-profile"
const LOOPBACK = ["localhost", "127.0.0.1", "[::1]"]
// Superclerk can't read a client document on someone's own computer, so a copy running there signs in as
// postclerk.io, whose document lists this computer's callback.
const LOCAL_CLIENT_ID = "https://postclerk.io/oauth/client.json"
const SESSION_COOKIE = "postclerk_session"
const SIGN_IN_COOKIE = "postclerk_signin"
// How long a sign-in lasts, and how long Superclerk gives a person to approve one.
const SESSION_SECONDS = 365 * 86_400
const SIGN_IN_SECONDS = 600

const encoder = new TextEncoder()
const base64url = (bytes: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
const fromBase64url = (text: string) =>
  Uint8Array.from(atob(text.replace(/-/g, "+").replace(/_/g, "/")), (char) => char.charCodeAt(0))
const random = () => base64url(crypto.getRandomValues(new Uint8Array(32)))

async function cipher(env: Env) {
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32)
    throw new Error("Set SESSION_SECRET to a random string of 32 or more characters: openssl rand -base64 32")
  const material = await crypto.subtle.digest("SHA-256", encoder.encode(env.SESSION_SECRET))
  return crypto.subtle.importKey("raw", material, "AES-GCM", false, ["encrypt", "decrypt"])
}

/** Seals a value so only this Worker reads it, for one purpose and until it expires. */
async function seal(env: Env, purpose: string, value: Session | SignIn, seconds: number) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const sealed = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: encoder.encode(purpose) },
    await cipher(env),
    encoder.encode(JSON.stringify({ ...value, expires: Date.now() + seconds * 1000 })),
  )
  return `${base64url(iv)}.${base64url(sealed)}`
}

/** What a sealed value holds. Undefined when there is none, or it was changed, sealed for another purpose or expired. */
async function unseal<T extends Session | SignIn>(env: Env, purpose: string, token: string | undefined) {
  const key = await cipher(env)
  const [iv, sealed] = token?.split(".") ?? []
  if (!iv || !sealed) return undefined
  try {
    const opened = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64url(iv), additionalData: encoder.encode(purpose) },
      key,
      fromBase64url(sealed),
    )
    const value = JSON.parse(new TextDecoder().decode(opened)) as T & { expires: number }
    return value.expires > Date.now() ? value : undefined
  } catch {
    return undefined
  }
}

// Over HTTPS a cookie is Secure, and its name keeps other hosts and scripts from setting it. Browsers take neither
// from a copy on http://localhost, which goes without.
const https = (url: URL) => url.protocol === "https:"
const cookieName = (url: URL, name: string) => (https(url) ? `__Host-Http-${name}` : name)

const readCookie = (request: Request, url: URL, name: string) =>
  request.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${cookieName(url, name)}=([^;]*)`))?.[1]

/**
 * A cookie no script reads. A Strict one comes only with this app's own requests. A Lax one also comes when another
 * site sends the browser here, as Superclerk does after a sign-in.
 */
const cookie = (url: URL, name: string, value: string, seconds: number, sameSite: "Strict" | "Lax") =>
  `${cookieName(url, name)}=${value}; Max-Age=${seconds}; Path=/; HttpOnly; SameSite=${sameSite}${https(url) ? "; Secure" : ""}`

const failure = (status: number, code: string, message: string, headers?: HeadersInit) =>
  Response.json({ error: { code, message } }, { status, headers })

/** Back to the app, saying why when signing in or out went wrong. */
function home(problem: string | undefined, ...cookies: string[]) {
  const headers = new Headers({ location: problem ? `/?problem=${encodeURIComponent(problem)}` : "/" })
  for (const value of cookies) headers.append("set-cookie", value)
  return new Response(null, { status: 303, headers })
}

/** No sign-in, or one that is over: the page shows the sign-in screen, and the browser forgets the cookie. */
const signedOut = (url: URL) =>
  failure(401, "signed_out", "Sign in with Superclerk first", {
    "set-cookie": cookie(url, SESSION_COOKIE, "", 0, "Strict"),
  })

/**
 * Who this copy of the app is, as Superclerk reads it when someone signs in (a Client ID Metadata Document). Its own
 * address over HTTPS, and this computer's for a copy running on one.
 */
function clientDocument(url: URL) {
  const callbacks = [url.origin, ...LOOPBACK.map((host) => `http://${host}`)].map(
    (origin) => `${origin}/oauth/callback`,
  )
  return Response.json({
    client_id: `${url.origin}/oauth/client.json`,
    client_name: "Postclerk",
    client_uri: url.origin,
    redirect_uris: callbacks,
    token_endpoint_auth_method: "none",
  })
}

/** Sends the browser to Superclerk to approve this app: OAuth's authorization code flow with PKCE. */
async function signIn(url: URL, env: Env) {
  const started: SignIn = {
    state: random(),
    verifier: random(),
    clientID: LOOPBACK.includes(url.hostname) ? LOCAL_CLIENT_ID : `${url.origin}/oauth/client.json`,
    redirectURI: `${url.origin}/oauth/callback`,
  }
  const authorize = new URL("/oauth/authorize", env.SUPERCLERK_URL)
  authorize.search = new URLSearchParams({
    response_type: "code",
    client_id: started.clientID,
    redirect_uri: started.redirectURI,
    state: started.state,
    code_challenge: base64url(await crypto.subtle.digest("SHA-256", encoder.encode(started.verifier))),
    code_challenge_method: "S256",
    scope: SCOPE,
    apps: APPS,
  }).toString()
  const sealed = await seal(env, "signin", started, SIGN_IN_SECONDS)
  return new Response(null, {
    status: 303,
    headers: { location: authorize.href, "set-cookie": cookie(url, SIGN_IN_COOKIE, sealed, SIGN_IN_SECONDS, "Lax") },
  })
}

/** Where Superclerk sends the browser back: the code trades for a key, if this browser asked for it. */
async function finishSignIn(request: Request, url: URL, env: Env) {
  const started = await unseal<SignIn>(env, "signin", readCookie(request, url, SIGN_IN_COOKIE))
  const done = cookie(url, SIGN_IN_COOKIE, "", 0, "Lax")
  const code = url.searchParams.get("code")
  // The person said no on Superclerk.
  if (code === null) return home(undefined, done)
  // A code this browser didn't ask for may be someone else's, sent to sign this browser in to their workspace.
  if (!started || url.searchParams.get("state") !== started.state)
    return home("This sign-in didn’t start here. Sign in again.", done)
  const answer = await fetch(new URL("/oauth/token", env.SUPERCLERK_URL), {
    method: "POST",
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: started.clientID,
      redirect_uri: started.redirectURI,
      code_verifier: started.verifier,
    }),
  })
  if (!answer.ok) {
    // Whatever Superclerk said goes to the Worker's logs; the person learns that signing in failed, never silently.
    console.error("Superclerk refused the sign-in code", answer.status, await answer.text())
    return home(`Superclerk couldn’t finish signing you in (${answer.status}). Try again.`, done)
  }
  const { access_token: key } = (await answer.json()) as { access_token: string }
  const session = await seal(env, "session", { key }, SESSION_SECONDS)
  return home(undefined, done, cookie(url, SESSION_COOKIE, session, SESSION_SECONDS, "Strict"))
}

/** Signs this browser out, and asks Superclerk to revoke the key its sign-in gave (RFC 7009). */
async function signOut(session: Session | undefined, url: URL, env: Env) {
  const done = cookie(url, SESSION_COOKIE, "", 0, "Strict")
  if (!session) return home(undefined, done)
  // The browser is signed out either way, even when Superclerk can't be reached.
  const revoked = await fetch(new URL("/oauth/revoke", env.SUPERCLERK_URL), {
    method: "POST",
    body: new URLSearchParams({ token: session.key }),
  }).then(
    (answer) => answer.ok,
    () => false,
  )
  const problem =
    "Signed out, but Superclerk didn’t revoke the app’s key. Revoke it in Superclerk: Settings, Developer API."
  return home(revoked ? undefined : problem, done)
}

/** A request's headers as Superclerk gets them: with the key, and without this app's own cookies and site. */
function upstreamHeaders(request: Request, { key }: Session) {
  const headers = new Headers(request.headers)
  for (const name of ["cookie", "host", "origin", "referer"]) headers.delete(name)
  headers.set("authorization", `Bearer ${key}`)
  return headers
}

/** Superclerk's own API, called with the person's key. The key's scopes decide what it may do. */
async function forward(request: Request, url: URL, session: Session, env: Env) {
  const upstream = await fetch(new URL(url.pathname.slice("/api".length) + url.search, env.SUPERCLERK_URL), {
    method: request.method,
    headers: upstreamHeaders(request, session),
    body: request.body,
    redirect: "manual",
  })
  return new Response(upstream.body, upstream)
}

const rpcFailure = (message: string) =>
  Response.json({ jsonrpc: "2.0", id: null, error: { code: -32001, message } }, { status: 401 })

/**
 * Superclerk's MCP server, for an assistant holding a token from the AI assistants page. The key's scopes decide which
 * tools it lists and runs.
 */
async function mcp(request: Request, env: Env) {
  const [, token] = /^Bearer (.+)$/i.exec(request.headers.get("authorization") ?? "") ?? []
  const session = await unseal<Session>(env, "assistant", token)
  if (!session) return rpcFailure("Postclerk doesn’t know this token. Copy a new one from its AI assistants page.")
  const upstream = await fetch(new URL("/v1/mcp", env.SUPERCLERK_URL), {
    method: request.method,
    headers: upstreamHeaders(request, session),
    body: request.body,
    redirect: "manual",
  })
  if (upstream.status === 401)
    return rpcFailure("This token’s sign-in has ended. Copy a new one from Postclerk’s AI assistants page.")
  // Superclerk's own sign-in can't connect an assistant to Postclerk, so it isn't offered.
  const headers = new Headers(upstream.headers)
  headers.delete("www-authenticate")
  return new Response(upstream.body, { status: upstream.status, headers })
}

/** Storage takes browser uploads only from Superclerk's own sites, so a file's bytes pass through here. */
async function upload(request: Request, { key }: Session, env: Env) {
  const created = await fetch(new URL("/v1/social/media", env.SUPERCLERK_URL), {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      "idempotency-key": request.headers.get("idempotency-key")!,
    },
    body: decodeURIComponent(request.headers.get("x-upload")!),
  })
  if (!created.ok) return created
  const { asset, upload } = (await created.json()) as {
    asset: { id: string; status: string }
    upload: { url: string; method: string; headers: Record<string, string> }
  }
  if (asset.status === "ready") return Response.json(asset)
  const stored = await fetch(upload.url, { method: upload.method, headers: upload.headers, body: request.body })
  // 412: an earlier try already stored these bytes. Confirming checks them either way.
  if (!stored.ok && stored.status !== 412) return failure(502, "upload_failed", `Storage answered ${stored.status}`)
  return fetch(new URL(`/v1/social/media/${asset.id}/confirm`, env.SUPERCLERK_URL), {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "idempotency-key": crypto.randomUUID() },
  })
}

async function route(request: Request, url: URL, env: Env) {
  const origin = request.headers.get("origin")
  // Pages on other sites can't act with a person's session. "null" names no site, so it never matches.
  if (origin !== null && origin !== url.origin) return failure(403, "wrong_origin", "Cross-site requests are refused")
  if (url.pathname === "/mcp") return mcp(request, env)
  if (url.pathname === "/oauth/client.json") return clientDocument(url)
  if (url.pathname === "/oauth/callback") return finishSignIn(request, url, env)
  if (url.pathname === "/oauth/signin" && request.method === "POST") return signIn(url, env)
  const session = await unseal<Session>(env, "session", readCookie(request, url, SESSION_COOKIE))
  if (url.pathname === "/oauth/signout" && request.method === "POST") return signOut(session, url, env)
  if (url.pathname === "/api/session") return Response.json({ signedIn: session !== undefined })
  if (!url.pathname.startsWith("/api/")) return failure(404, "not_found", "Not found")
  if (!session) return signedOut(url)
  if (url.pathname === "/api/assistant-token")
    return Response.json({ token: await seal(env, "assistant", session, SESSION_SECONDS) })
  const answer =
    url.pathname === "/api/upload" && request.method === "POST"
      ? await upload(request, session, env)
      : await forward(request, url, session, env)
  // Superclerk no longer knows the key, as when the person revoked it there: this sign-in is over.
  return answer.status === 401 ? signedOut(url) : answer
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    try {
      return await route(request, url, env)
    } catch (error) {
      // Superclerk couldn't be reached, or this copy is set up wrong. The Worker's logs say which.
      console.error(error)
      const problem = "Postclerk hit a problem. Try again in a moment."
      return url.pathname.startsWith("/oauth/") ? home(problem) : failure(502, "bad_gateway", problem)
    }
  },
} satisfies ExportedHandler<Env>
