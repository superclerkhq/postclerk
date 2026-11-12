# Postclerk

A free, open-source social media scheduler. Write a post once and schedule it to Instagram, Facebook, LinkedIn, Threads, TikTok, YouTube and Google Business Profile.

Use it at **[postclerk.io](https://postclerk.io)**, or run your own copy on Cloudflare for free.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/surgent-dev/postclerk)

![The post calendar](public/calendar.png)

It's built on the [Superclerk API](https://docs.superclerk.com), so there's no database to run and no developer app to register with each network. You sign in with Superclerk, connect your accounts through it, and your posts live in your Superclerk workspace.

## What you get

- A queue, a calendar, drafts and an Instagram feed preview
- One composer for every network, with per-network captions, media and settings
- A media library
- Analytics per account and per post
- Choose which pages and profiles each account posts to
- An MCP server, so Claude Code, Codex, Cursor or VS Code can draft and schedule posts for you

## Run your own

Click **Deploy to Cloudflare** above. Cloudflare copies this repository to your GitHub account, then builds and deploys it as a Worker, which the free plan covers. It asks for one secret, `SESSION_SECRET`: any random string of 32 or more characters, such as `openssl rand -base64 32` prints.

Or deploy from your own computer, with [Bun](https://bun.sh):

```sh
bun install
bun run deploy
openssl rand -base64 32 | bunx wrangler secret put SESSION_SECRET
```

Your copy answers at its `workers.dev` address, or at a domain you add in Cloudflare. Superclerk needs nothing set up for it.

## Develop

```sh
bun install
echo "SESSION_SECRET=$(openssl rand -base64 32)" > .dev.vars
bun run dev
```

Open <http://localhost:5173> and click **Sign in with Superclerk**. Approve the app in Superclerk (new to it? you make an account on the way), and you're back, signed in.

Everything in `src/components/social` is a good place to start changing things. Every call to Superclerk in it goes through [`@superclerk/sdk`](https://www.npmjs.com/package/@superclerk/sdk).

## Use it with AI assistants

Postclerk is also an MCP server, at `/mcp`. Its **AI assistants** page gives you a token and the command for each client, such as:

```sh
claude mcp add --transport http postclerk https://postclerk.io/mcp --header "Authorization: Bearer <token>"
```

Assistants can do what your sign-in allows: list your accounts, media and posts, create, edit, reschedule, publish and cancel posts, and connect accounts. Signing out of the browser the token came from disconnects them.

- claude.ai and ChatGPT connect with OAuth from their own servers, which Postclerk's MCP server doesn't offer yet.
- Assistants can attach images and videos already uploaded, but can't upload new ones yet.

## Build on the API

Everything here is the public [Superclerk API](https://docs.superclerk.com/social), so your own code can do the same:

```ts
import { Superclerk } from "@superclerk/sdk"

const superclerk = new Superclerk() // reads SUPERCLERK_API_KEY
const { accounts } = await superclerk.social.accounts.list()
const threads = accounts.find((account) => account.platform === "threads")!
await superclerk.social.posts.create({
  content: "Open this Saturday for emergency calls.",
  mediaItems: [],
  platforms: [{ accountId: threads.id, platform: "threads", platformSpecificData: {} }],
  scheduledFor: "2026-11-21T09:00:00-05:00",
})
```

## How it works

```
Browser or AI assistant → worker/index.ts on Cloudflare → api.superclerk.com
```

- Signing in is [OAuth with PKCE](https://oauth.net/2/pkce/). `/oauth/signin` sends you to Superclerk to approve the app, and `/oauth/callback` trades the code you come back with for a key. The app asks for the `social:write` and `connections:write` scopes, on the networks it posts to.
- Superclerk knows each copy by the address of its [client metadata document](https://datatracker.ietf.org/doc/draft-ietf-oauth-client-id-metadata-document/), `/oauth/client.json`, which the Worker serves. Superclerk can't read one from your own computer, so a copy running there signs in as postclerk.io, whose document lists your computer's callback.
- The Worker keeps nothing. Your key is sealed into your browser's cookie with AES-GCM under `SESSION_SECRET`. Page scripts never see it, and the Worker adds it to each call. **Sign out** revokes it.
- Superclerk enforces the key's scopes, so the Worker passes API calls and MCP requests on as they are.
- Photos and videos pass through the Worker on their way to storage, so Cloudflare's 100 MB limit on a request applies to each file.
- Connecting an account opens the network's own sign-in through a [connect link](https://docs.superclerk.com/connections).

## Good to know

- Scheduling and publishing use Superclerk's approved apps on each network, so their limits apply. TikTok, for example, requires the creator to review each post, which the composer does. Keep that screen if you change the composer.
- Turning on analytics for an account, and TikTok inbox uploads, still happen in the Superclerk app. Postclerk links you there.
- Upload files over 100 MB in Superclerk's own media library, where Postclerk finds them.

## License

[MIT](./LICENSE). The Claude Code and Codex logos come from [LobeHub Icons](https://github.com/lobehub/lobe-icons), also MIT. Each mark belongs to its owner.
