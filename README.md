# Superclerk Social

A free, open-source social media scheduler. Write a post once and schedule it to Instagram, Facebook, LinkedIn, Threads, TikTok, YouTube and Google Business Profile.

![The post calendar](docs/calendar.png)

It's built on the [Superclerk API](https://docs.superclerk.com), so there's no database to run and no developer app to register with each network. You connect your accounts through Superclerk, and your posts live in your Superclerk workspace.

## What you get

- A queue, a calendar, drafts and an Instagram feed preview
- One composer for every network, with per-network captions, media and settings
- A media library
- Analytics per account and per post
- Choose which pages and profiles each account posts to

## Run it

You need [Bun](https://bun.sh) and a Superclerk API key: sign up at [superclerk.com](https://superclerk.com), then create one under Settings, Developer API.

```sh
bun install
cp .env.example .env   # add your SUPERCLERK_API_KEY
bun run dev
```

Open <http://localhost:3000>.

To run it in production:

```sh
bun run build
bun run start
```

It answers only on your own computer unless you set `HOST`. To put it on a server, also set `APP_PASSWORD`: anyone who can open the app can post to your accounts.

## How it works

```
Browser → server.ts (holds your API key) → api.superclerk.com
```

- The browser uses [`@superclerk/sdk`](https://www.npmjs.com/package/@superclerk/sdk) and never sees your key. `server.ts` adds it, and only forwards the parts of the API this app uses.
- Photos and videos pass through `server.ts` to storage.
- Connecting an account opens the network's own sign-in through a [connect link](https://docs.superclerk.com/connections).

Everything in `src/components/social` is a good place to start changing things. Every call to Superclerk in it goes through the SDK.

## Good to know

- Scheduling and publishing use Superclerk's approved apps on each network, so their limits apply. TikTok, for example, requires the creator to review each post, which the composer does. Keep that screen if you change the composer.
- Turning on analytics for an account, and TikTok inbox uploads, still happen in the Superclerk app. The app links you there.

## License

[MIT](./LICENSE)
