import { timingSafeEqual } from "node:crypto"
import path from "node:path"
import { APIError, Superclerk, type SocialMediaCreateParams } from "@superclerk/sdk"

// The server holds the API key, so it never reaches a browser. The SDK reads SUPERCLERK_API_KEY from the environment.
const superclerk = new Superclerk()

const hostname = process.env.HOST ?? "127.0.0.1"
const password = process.env.APP_PASSWORD
if (!password && hostname !== "127.0.0.1" && hostname !== "localhost")
  throw new Error(
    "Set APP_PASSWORD before listening on another address: this server can post to every connected account",
  )

// The parts of the API this app uses. The key can do more, so nothing else goes through here.
const ALLOWED = [/^\/v1\/social\//, /^\/v1\/connections(\/[^/]+\/accounts)?$/, /^\/v1\/connect\/links(\/[^/]+)?$/]
// The API's own limit on one file.
const MAX_UPLOAD_BYTES = 5 * 1024 ** 3

const failure = (status: number, code: string, message: string) =>
  Response.json({ error: { code, message } }, { status })

function hasPassword(request: Request) {
  if (!password) return true
  const sent = Buffer.from((request.headers.get("authorization") ?? "").replace(/^Basic /, ""), "base64")
  const expected = Buffer.from(`:${password}`)
  // Any username is fine: the password is the whole credential.
  const given = sent.subarray(Math.max(0, sent.indexOf(":")))
  return given.length === expected.length && timingSafeEqual(given, expected)
}

async function forward(request: Request, url: URL) {
  const target = url.pathname.slice("/api".length)
  if (!ALLOWED.some((path) => path.test(target))) return failure(403, "not_allowed", "This app doesn't use that API")
  const headers = new Headers(request.headers)
  for (const name of ["host", "cookie", "origin", "referer"]) headers.delete(name)
  headers.set("authorization", `Bearer ${process.env.SUPERCLERK_API_KEY}`)
  // Answered as it comes, so the response passes through untouched.
  headers.set("accept-encoding", "identity")
  const upstream = await fetch(`${superclerk.baseURL}${target}${url.search}`, {
    method: request.method,
    headers,
    body: request.body,
    redirect: "manual",
  })
  return new Response(upstream.body, upstream)
}

// Storage takes browser uploads only from Superclerk's own sites, so the bytes pass through here.
async function upload(request: Request) {
  const metadata = JSON.parse(decodeURIComponent(request.headers.get("x-upload")!)) as SocialMediaCreateParams
  const idempotencyKey = request.headers.get("idempotency-key")!
  const { asset, upload } = await superclerk.social.media.create(metadata, { idempotencyKey })
  if (asset.status === "ready") return Response.json(asset)
  const stored = await fetch(upload.url, { method: upload.method, headers: upload.headers, body: request.body })
  // 412: an earlier try already stored these bytes. Confirming checks them either way.
  if (!stored.ok && stored.status !== 412) return failure(502, "upload_failed", `Storage answered ${stored.status}`)
  return Response.json(await superclerk.social.media.confirm(asset.id, { idempotencyKey: crypto.randomUUID() }))
}

async function page(pathname: string) {
  const file = Bun.file(path.join("dist", pathname))
  return new Response((await file.exists()) ? file : Bun.file("dist/index.html"))
}

const server = Bun.serve({
  hostname,
  port: Number(process.env.PORT ?? 3000),
  maxRequestBodySize: MAX_UPLOAD_BYTES,
  idleTimeout: 255,
  async fetch(request) {
    if (!hasPassword(request))
      return new Response("Password required", {
        status: 401,
        headers: { "www-authenticate": 'Basic realm="Superclerk Social"' },
      })
    const url = new URL(request.url)
    const origin = request.headers.get("origin")
    if (origin && new URL(origin).host !== url.host)
      return failure(403, "wrong_origin", "Cross-site requests are refused")
    try {
      if (url.pathname.startsWith("/api/")) return await forward(request, url)
      if (url.pathname === "/upload" && request.method === "POST") return await upload(request)
    } catch (error) {
      if (error instanceof APIError) return failure(error.status, error.code, error.message)
      console.error(error)
      return failure(502, "bad_gateway", "Could not reach Superclerk")
    }
    return page(url.pathname)
  },
})

console.log(`Superclerk Social is running at ${server.url}`)
