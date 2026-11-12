import {
  ArrowUpRight,
  CalendarBlank,
  CaretRight,
  Check,
  Code,
  FileText,
  FileTs,
  FolderSimple,
  GithubLogo,
  Key,
  LockSimple,
  Plus,
  Robot,
  SignOut,
} from "@phosphor-icons/react"
import type { ReactNode } from "react"

import type { SocialAccount } from "@/api/social"
import { SocialPlatformLogos } from "@/lib/social"
import "./landing.css"

const REPOSITORY = "https://github.com/superclerkhq/postclerk"
const DEPLOY = `https://deploy.workers.cloudflare.com/?url=${REPOSITORY}`
const NETWORKS: [SocialAccount["platform"], string][] = [
  ["instagram", "Instagram"],
  ["facebook", "Facebook"],
  ["linkedin", "LinkedIn"],
  ["threads", "Threads"],
  ["tiktok", "TikTok"],
  ["youtube", "YouTube"],
  ["googlebusiness", "Google Business Profile"],
]

// The example business is the one on calendar.png, so every drawing below tells the same week.
const QUEUE = [
  { when: "Tue · 9:00 AM", text: "Quick tip: a dirty filter makes your furnace work 15% harder." },
  { when: "Wed · 9:00 AM", text: "Bleed your radiators before the first cold night." },
  { when: "Thu · 9:00 AM", text: "That clicking noise from the boiler? Here’s what it means." },
]
const DESTINATIONS: [SocialAccount["platform"], string][] = [
  ["instagram", "northwind.hvac"],
  ["facebook", "Northwind Heating & Air"],
  ["linkedin", "Northwind Heating & Air"],
  ["threads", "northwind.hvac"],
]
// November 2026 starts on a Sunday; these are the days calendar.png has posts on.
const POSTED: Record<number, SocialAccount["platform"]> = {
  12: "instagram",
  13: "facebook",
  15: "linkedin",
  16: "threads",
  19: "instagram",
  23: "googlebusiness",
}
const IMPRESSIONS = [38, 52, 44, 70, 58, 64, 88, 100]

// The repository as it is: the server is one file, and there's no database to set up.
const REPO: [icon: ReactNode, name: string, what: string][] = [
  [<FileTs key="i" size={16} aria-hidden />, "worker/index.ts", "The whole server, one file"],
  [<FolderSimple key="i" size={16} aria-hidden />, "src/components/social", "Every screen you use"],
  [<FileTs key="i" size={16} aria-hidden />, "test/worker.test.ts", "Tested on every push"],
  [<FileText key="i" size={16} aria-hidden />, "wrangler.jsonc", "One Worker, no database"],
]
const TRUST: [icon: ReactNode, title: string, text: string][] = [
  [
    <Key key="i" size={16} weight="bold" aria-hidden />,
    "No keys to paste",
    "Sign in with Superclerk. Your accounts connect there, and your posts live in your workspace.",
  ],
  [
    <LockSimple key="i" size={16} weight="bold" aria-hidden />,
    "Only what it needs",
    "Postclerk sees your social accounts and posts, nothing else. Your sign-in is sealed in your browser.",
  ],
  [
    <SignOut key="i" size={16} weight="bold" aria-hidden />,
    "Yours to end",
    "Signing out ends Postclerk’s access, and disconnects the agents you set up from that browser.",
  ],
]

const FAQ: [question: string, answer: ReactNode][] = [
  [
    "Is Postclerk free?",
    "Yes. Postclerk is free and open source under the MIT license. Use it here, or run your own copy on Cloudflare’s free plan.",
  ],
  [
    "Which networks does it post to?",
    "Instagram, Facebook, LinkedIn, Threads, TikTok, YouTube and Google Business Profile. TikTok asks the creator to review each post, so the composer does that step with you.",
  ],
  [
    "How do I connect my AI agent?",
    "Open AI assistants in Postclerk. It gives you a ready command for Claude Code and Codex, and a server URL and header for Cursor, VS Code or any other MCP client.",
  ],
  [
    "What can Postclerk see?",
    "Only your Superclerk workspace’s social accounts and posts. Signing out ends its access, and disconnects any agent you set up from that browser.",
  ],
  [
    "Why sign in with Superclerk?",
    "Superclerk is where your accounts connect and your posts live, so there’s no database to run and no developer app to register with each network.",
  ],
]

/** What a visitor sees until this browser signs in to Superclerk: what Postclerk is, and the way in. */
export function Landing({ problem }: { problem?: string }) {
  return (
    <main className="lp app-viewport">
      <header className="lp-nav">
        <div className="lp-wrap lp-nav-row">
          <a href="/" className="wordmark lp-logo">
            <img src="/favicon.svg" alt="" />
            Postclerk
          </a>
          <nav className="lp-nav-links">
            <a href={REPOSITORY} className="lp-nav-link">
              <GithubLogo size={17} weight="fill" aria-hidden />
              <span>GitHub</span>
            </a>
            <SignIn className="lp-btn lp-btn-dark lp-btn-sm">Sign in</SignIn>
          </nav>
        </div>
      </header>

      <section className="lp-hero" aria-labelledby="lp-title">
        <a href={REPOSITORY} className="lp-pill">
          Free and open source
          <CaretRight size={12} weight="bold" aria-hidden />
        </a>
        <h1 id="lp-title">The agentic social media manager</h1>
        <p className="lp-sub">
          Your AI agent writes and schedules the posts. You see every one in a calendar before it goes out.
        </p>
        {problem && (
          <p role="alert" className="lp-problem">
            {problem}
          </p>
        )}
        <div className="lp-actions">
          <SignIn className="lp-btn lp-btn-dark">Sign in with Superclerk</SignIn>
          <a href={REPOSITORY} className="lp-btn lp-btn-soft">
            <GithubLogo size={17} weight="fill" aria-hidden />
            View the code
          </a>
        </div>
        <div className="lp-networks">
          <span>Posts to</span>
          <ul>
            {NETWORKS.map(([platform, name]) => (
              <li key={platform} title={name}>
                <img src={SocialPlatformLogos[platform]} alt={name} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <figure className="lp-shot">
        <div className="lp-shot-bar" aria-hidden>
          <i />
          <i />
          <i />
          <span>postclerk.io</span>
        </div>
        <img
          src="/calendar.png"
          alt="Postclerk’s calendar, with the month’s posts scheduled to each network"
          width={1600}
          height={1000}
        />
      </figure>

      <section className="lp-section" aria-labelledby="lp-agents">
        <div className="lp-wrap">
          <Head icon={<Robot weight="bold" />} label="AI agents" id="lp-agents" title="Hand the posting to your agent">
            Connect Claude Code, Codex, Cursor or any MCP client. It writes, schedules, moves and publishes posts as
            you, and they land in your calendar.
          </Head>
          <div className="lp-agent">
            <div className="lp-term" aria-label="Claude Code scheduling three posts through Postclerk" role="img">
              <div className="lp-term-bar">
                <i />
                <i />
                <i />
              </div>
              <p className="lp-term-cmd">
                <span>$</span> claude mcp add --transport http postclerk https://postclerk.io/mcp --header
                "Authorization: Bearer ••••"
              </p>
              <p className="lp-term-ask">
                <span>&gt;</span> Turn this week’s three furnace tips into posts for Instagram, Facebook and LinkedIn,
                Tuesday to Thursday at 9am
              </p>
              {["Tue 9:00 AM", "Wed 9:00 AM", "Thu 9:00 AM"].map((when) => (
                <p key={when} className="lp-term-tool">
                  <span>●</span> create_social_post <em>{when}</em>
                </p>
              ))}
              <p className="lp-term-done">Scheduled 3 posts. They’re in your Postclerk queue.</p>
              <p className="lp-term-next">
                <span>&gt;</span> <i />
              </p>
            </div>
            <div className="lp-card lp-queue">
              <div className="lp-queue-head">
                <b>Queue</b>
                <span>
                  <img src="/logos/claudecode.svg" alt="" />
                  Added by Claude Code
                </span>
              </div>
              <ul>
                {QUEUE.map((post) => (
                  <li key={post.when}>
                    <span className="lp-queue-when">{post.when}</span>
                    <p>{post.text}</p>
                    <span className="lp-queue-to">
                      <Logos platforms={["instagram", "facebook", "linkedin"]} />
                      <span className="lp-ok">Scheduled</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-section" aria-labelledby="lp-tools">
        <div className="lp-wrap">
          <Head
            icon={<CalendarBlank weight="bold" />}
            label="Scheduling"
            id="lp-tools"
            title="Plan, post and measure in one place"
          >
            Everything you need to run your accounts by hand too, from one composer to the numbers after.
          </Head>
          <div className="lp-tools">
            <Tool
              title="Write once, post everywhere"
              text="One post goes to every account you pick, at the time you set."
            >
              <p className="lp-draft">
                Quick tip: a dirty filter makes your furnace work 15% harder. Swap it every 90 days.
              </p>
              <ul className="lp-dest">
                {DESTINATIONS.map(([platform, name]) => (
                  <li key={platform}>
                    <Logos platforms={[platform]} />
                    <span>{name}</span>
                    <Check size={14} weight="bold" aria-label="Scheduled" />
                  </li>
                ))}
              </ul>
            </Tool>
            <Tool
              title="Calendar, queue and drafts"
              text="See the month at a glance or the next posts in order. Drafts wait until you’re ready."
            >
              <div className="lp-month" role="img" aria-label="November, with six posts scheduled">
                <b>November 2026</b>
                <ol>
                  {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                    <li key={`h${i}`} className="lp-month-day">
                      {day}
                    </li>
                  ))}
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <li key={day} className={day === 11 ? "lp-today" : undefined}>
                      {day}
                      {POSTED[day] && <img src={SocialPlatformLogos[POSTED[day]]} alt="" />}
                    </li>
                  ))}
                </ol>
              </div>
            </Tool>
            <Tool title="See what worked" text="Followers, views and reactions for every account, and for each post.">
              <div className="lp-stats">
                <p className="lp-stats-who">
                  <Logos platforms={["linkedin"]} />
                  Northwind Heating & Air
                </p>
                <div className="lp-stats-tiles">
                  <span>
                    Followers<b>1,284</b>
                  </span>
                  <span>
                    Impressions<b>9.6k</b>
                  </span>
                </div>
                <div className="lp-bars" role="img" aria-label="Impressions rising across the last eight posts">
                  {IMPRESSIONS.map((height, i) => (
                    <i key={i} style={{ height: `${height}%` }} />
                  ))}
                </div>
              </div>
            </Tool>
          </div>
        </div>
      </section>

      <section className="lp-section" aria-labelledby="lp-open">
        <div className="lp-wrap">
          <div className="lp-src">
            <div className="lp-src-text">
              <span className="lp-label">
                <Code weight="bold" />
                Open source
              </span>
              <h2 id="lp-open">Open source, and yours to run</h2>
              <p>
                MIT licensed, with no database to run. Deploy your own copy on Cloudflare’s free plan in about two
                minutes.
              </p>
              <div className="lp-src-actions">
                <a href={DEPLOY} className="lp-btn lp-btn-dark">
                  Deploy to Cloudflare
                  <ArrowUpRight size={15} weight="bold" aria-hidden />
                </a>
                <a href={REPOSITORY} className="lp-btn lp-btn-soft">
                  <GithubLogo size={17} weight="fill" aria-hidden />
                  View on GitHub
                </a>
              </div>
            </div>
            <div className="lp-card lp-repo" role="img" aria-label="The postclerk repository on GitHub">
              <div className="lp-repo-head">
                <GithubLogo size={18} weight="fill" aria-hidden />
                <span>
                  superclerkhq / <b>postclerk</b>
                </span>
                <em>MIT</em>
              </div>
              <ul>
                {REPO.map(([icon, name, what]) => (
                  <li key={name}>
                    {icon}
                    <code>{name}</code>
                    <span>{what}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <ul className="lp-trust">
            {TRUST.map(([icon, title, text]) => (
              <li key={title}>
                <span className="lp-trust-icon">{icon}</span>
                <b>{title}</b>
                <p>{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="lp-section" aria-labelledby="lp-faq">
        <div className="lp-wrap lp-faq">
          <h2 id="lp-faq">Questions?</h2>
          {FAQ.map(([question, answer], i) => (
            <details key={question} open={i === 0}>
              <summary>
                {question}
                <Plus size={16} weight="bold" aria-hidden />
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="lp-close" aria-labelledby="lp-close">
        <h2 id="lp-close">Let your agent do the posting</h2>
        <p>Free and open source. New to Superclerk? You’ll make an account on the way.</p>
        <SignIn className="lp-btn lp-btn-dark">Sign in with Superclerk</SignIn>
      </section>

      <footer className="lp-wrap lp-foot">
        <span className="wordmark lp-logo">
          <img src="/favicon.svg" alt="" />
          Postclerk
        </span>
        <span className="lp-foot-links">
          <span>MIT licensed</span>
          <a href="https://docs.superclerk.com/social">Superclerk API</a>
          <a href={REPOSITORY}>GitHub</a>
        </span>
      </footer>
    </main>
  )
}

function SignIn({ className, children }: { className: string; children: ReactNode }) {
  return (
    <form method="post" action="/oauth/signin" className="contents">
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  )
}

function Head({
  icon,
  label,
  id,
  title,
  children,
}: {
  icon: ReactNode
  label: string
  id: string
  title: string
  children: ReactNode
}) {
  return (
    <div className="lp-head">
      <span className="lp-label">
        {icon}
        {label}
      </span>
      <h2 id={id}>{title}</h2>
      <p>{children}</p>
    </div>
  )
}

function Tool({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <article className="lp-tool">
      <h3>{title}</h3>
      <p>{text}</p>
      <div className="lp-tool-art">{children}</div>
    </article>
  )
}

function Logos({ platforms }: { platforms: SocialAccount["platform"][] }) {
  return (
    <span className="lp-logos" aria-hidden>
      {platforms.map((platform) => (
        <img key={platform} src={SocialPlatformLogos[platform]} alt="" />
      ))}
    </span>
  )
}
