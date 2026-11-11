import { Plugs } from "@phosphor-icons/react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { ReactNode } from "react"

import { buttonClass } from "@/components/common/button"
import { CopyButton } from "@/components/common/copy-button"
import { ErrorState, LoadingState } from "@/components/common/empty-state"
import { Group, GroupRow } from "@/components/common/group"
import { PageBody, PageHeader } from "@/components/common/page"
import { appConfigQuery, type AppConfig } from "@/lib/app-config"
import { errorMessage } from "@/lib/errors"

const NAME = "superclerk-social"
const MCP_URL = `${window.location.origin}/mcp`
// Cursor and VS Code add a server from a link, in the format each one's docs give. Neither link can carry a password.
const CURSOR_INSTALL = `cursor://anysphere.cursor-deeplink/mcp/install?name=${NAME}&config=${encodeURIComponent(btoa(JSON.stringify({ url: MCP_URL })))}`
const VSCODE_INSTALL = `vscode:mcp/install?${encodeURIComponent(JSON.stringify({ name: NAME, type: "http", url: MCP_URL }))}`
const TOOLS_LIST = {
  method: "POST",
  headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
} satisfies RequestInit

type ListedTool = { name: string; title: string; annotations: { readOnlyHint: boolean } }
type McpServer = { passwordRequired: boolean; tools: ListedTool[] }

/** The tools /mcp gives an assistant now, and whether the server asks for APP_PASSWORD. */
async function readServer(config: Promise<AppConfig>): Promise<McpServer> {
  const response = await fetch("/mcp", TOOLS_LIST)
  const text = await response.text()
  // One reply, sent as JSON or as a server-sent event.
  const reply = JSON.parse(
    response.headers.get("content-type")?.startsWith("text/event-stream") ? text.match(/^data: (.+)$/m)![1] : text,
  )
  if (reply.error) throw new Error(reply.error.message)
  return { passwordRequired: (await config).passwordRequired, tools: reply.result.tools }
}

export function AssistantsView() {
  const queryClient = useQueryClient()
  const server = useQuery({
    queryKey: ["mcp-server"],
    queryFn: () => readServer(queryClient.ensureQueryData(appConfigQuery)),
  })
  return (
    <>
      <PageHeader
        title="AI assistants"
        description="Let Claude, Cursor or another AI assistant draft and schedule posts here. It gets Social and nothing else."
      />
      <PageBody>
        {server.data ? (
          <Setup server={server.data} />
        ) : server.error ? (
          <ErrorState
            message={errorMessage(server.error, "Unable to reach the server")}
            onRetry={() => void server.refetch()}
          />
        ) : (
          <LoadingState message="Reading the server…" />
        )}
      </PageBody>
    </>
  )
}

function Setup({ server }: { server: McpServer }) {
  // A password goes as a Bearer token.
  const header = server.passwordRequired ? ` --header "Authorization: Bearer $APP_PASSWORD"` : ""
  const token = server.passwordRequired ? " --bearer-token-env-var APP_PASSWORD" : ""
  const reads = server.tools.filter((tool) => tool.annotations.readOnlyHint)
  const writes = server.tools.filter((tool) => !tool.annotations.readOnlyHint)
  return (
    <div className="max-w-4xl space-y-10">
      <Group
        title="Connect"
        description={
          server.passwordRequired
            ? "Assistants send APP_PASSWORD as a Bearer token."
            : "Assistants on this computer need nothing else."
        }
      >
        {!server.passwordRequired && (
          <>
            <GroupRow label="Cursor" leading={<ClientLogo src="/logos/cursor.svg" />}>
              <a href={CURSOR_INSTALL} className={buttonClass("secondary", "sm")}>
                Add to Cursor
              </a>
            </GroupRow>
            <GroupRow label="VS Code" leading={<ClientLogo src="/logos/vscode.svg" />}>
              <a href={VSCODE_INSTALL} className={buttonClass("secondary", "sm")}>
                Add to VS Code
              </a>
            </GroupRow>
          </>
        )}
        <GroupRow label="Claude Code" leading={<ClientLogo src="/logos/claudecode.svg" />}>
          <Command
            label="Copy the Claude Code command"
            value={`claude mcp add --transport http ${NAME} ${MCP_URL}${header}`}
          />
        </GroupRow>
        <GroupRow label="Codex" leading={<ClientLogo src="/logos/codex.svg" />}>
          <Command label="Copy the Codex command" value={`codex mcp add ${NAME} --url ${MCP_URL}${token}`} />
        </GroupRow>
        <GroupRow
          label="Other"
          leading={
            <ClientLogo>
              <Plugs weight="bold" className="size-[70%] text-zinc-500" />
            </ClientLogo>
          }
        >
          <Command label="Copy the server URL" value={MCP_URL} />
        </GroupRow>
      </Group>

      <Group title="What it can do" description="The tools the server gives an assistant, as it lists them now.">
        {server.tools.length === 0 ? (
          // Superclerk gives Social's tools only to a key with full access.
          <p className="rounded-lg bg-muted/50 px-4 py-3.5 text-[13px] text-muted-foreground">
            This app's API key has no Social tools. Create one with Full access under Settings, Developer API.
          </p>
        ) : (
          <div className="grid gap-1.5 sm:grid-cols-2">
            <ToolList label="Reads" tools={reads} />
            <ToolList label="Changes posts" tools={writes} />
          </div>
        )}
      </Group>

      <p className="px-1 text-xs leading-5 text-muted-foreground">
        Writing code instead? The same posts are in the{" "}
        <a
          className="font-medium text-foreground underline underline-offset-2"
          href="https://docs.superclerk.com/social"
          target="_blank"
          rel="noreferrer"
        >
          Superclerk API
        </a>
        .
      </p>
    </div>
  )
}

/** An assistant's mark on the white tile platform logos sit on, so the row of them reads as one set. */
function ClientLogo({ src, children }: { src?: string; children?: ReactNode }) {
  return (
    <span
      aria-hidden
      className="flex size-6 items-center justify-center rounded-md bg-white shadow-[0_0_0_0.5px_var(--chrome-edge)]"
    >
      {src ? <img src={src} alt="" className="size-[74%] object-contain" /> : children}
    </span>
  )
}

/** A command or URL on one line; the copy button takes all of it, however much shows. */
function Command({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex w-full min-w-0 items-center gap-1 rounded-md bg-background/60 pl-2.5 sm:max-w-[600px]">
      <code title={value} className="min-w-0 flex-1 truncate font-mono text-[12px] text-foreground">
        {value}
      </code>
      <CopyButton value={value} label={label} />
    </div>
  )
}

function ToolList({ label, tools }: { label: string; tools: ListedTool[] }) {
  return (
    <div className="rounded-lg bg-muted/50 px-4 py-3.5">
      <p className="text-[12.5px] text-muted-foreground">{label}</p>
      <ul className="mt-2 space-y-1.5">
        {tools.map((tool) => (
          <li key={tool.name} className="text-[13.5px] text-foreground">
            {tool.title}
          </li>
        ))}
      </ul>
    </div>
  )
}
