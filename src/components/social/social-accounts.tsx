import { useState, type ReactNode } from "react"
import { useSearch } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CircleNotch, Plus, PlugsConnected } from "@phosphor-icons/react"
import { superclerk } from "@/api/client"
import type { SocialAccount } from "@/api/social"
import { Button } from "@/components/common/button"
import { EmptyState, ErrorState, LoadingState } from "@/components/common/empty-state"
import { ConfirmDialog, FormError } from "@/components/common/form-dialog"
import { PANEL } from "@/components/common/section"
import { Switch } from "@/components/common/switch"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { errorMessage } from "@/lib/errors"
import {
  connectionAccounts,
  listSocialConnections,
  SocialNetworks,
  SocialPlatformLabels,
  type SocialConnection,
} from "@/lib/social"
import { cn } from "@/lib/utils"
import { PlatformLogo } from "./social-logo"

export const socialAccountsKey = ["social", "accounts"] as const

/** Sends the person to the network's own sign-in, and back to this page. */
function useConnect() {
  return useMutation({
    mutationFn: (target: { appID: string } | { connectionID: string }) =>
      superclerk.connect.links.create({
        ...target,
        headless: true,
        returnURL: new URL("/?view=accounts", window.location.origin).href,
      }),
    onSuccess: (link) => window.location.assign(link.url),
  })
}

function Reconnect({ connectionID }: { connectionID: string | null }) {
  const connect = useConnect()
  if (connectionID === null) return null
  return (
    <button
      type="button"
      disabled={connect.isPending}
      onClick={() => connect.mutate({ connectionID })}
      className="cursor-pointer font-medium text-foreground underline decoration-foreground/25 underline-offset-2"
    >
      Reconnect
    </button>
  )
}

/** The networks to connect, each opening its own sign-in. */
function ConnectMenu({ children }: { children: ReactNode }) {
  const connect = useConnect()
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          {SocialNetworks.map((network) => (
            <DropdownMenuItem
              key={network.appID}
              disabled={connect.isPending}
              onSelect={() => connect.mutate({ appID: network.appID })}
            >
              <PlatformLogo platform={network.platform} size={16} />
              {network.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {connect.error && <FormError>{errorMessage(connect.error, "Could not start connecting")}</FormError>}
    </>
  )
}

/** Where an account sits, and whether its connection still lets posts through. */
function Where({ where, account }: { where: string; account: SocialAccount | undefined }) {
  if (account?.status !== "disconnected") return where
  return (
    <>
      {where} · <span className="text-destructive">Disconnected</span> ·{" "}
      <Reconnect connectionID={account.connectionID} />
    </>
  )
}

function Row({ platform, children }: { platform: SocialAccount["platform"]; children: ReactNode }) {
  return (
    <div className="flex min-h-14 items-center gap-3 px-4 py-2.5">
      <PlatformLogo platform={platform} size={32} />
      {children}
    </div>
  )
}

/**
 * One place posts can go, switched on while the workspace publishes there. `add` is how it is switched on;
 * it is null once the connection stops offering the account, which can then only be switched off.
 */
function AccountRow({
  platform,
  label,
  where,
  account,
  add,
}: {
  platform: SocialAccount["platform"]
  label: string
  where: ReactNode
  account: SocialAccount | undefined
  add: { connectionID: string; providerAccountID: string } | null
}) {
  const cache = useQueryClient()
  const [removing, setRemoving] = useState(false)
  const connect = useMutation({
    mutationFn: ({ connectionID, providerAccountID }: { connectionID: string; providerAccountID: string }) =>
      superclerk.connections.accounts.add(connectionID, { providerAccountID }, { idempotencyKey: crypto.randomUUID() }),
    onSuccess: () => cache.invalidateQueries({ queryKey: socialAccountsKey }),
  })
  const remove = useMutation({
    mutationFn: (accountId: string) => superclerk.social.accounts.disconnect(accountId),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: socialAccountsKey })
      setRemoving(false)
    },
  })
  const name = `${label} on ${SocialPlatformLabels[platform]}`
  return (
    <Row platform={platform}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-foreground">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{connect.isPending ? "Adding…" : where}</p>
        {connect.error && <FormError>{errorMessage(connect.error, "The account could not be added")}</FormError>}
      </div>
      <label className="flex shrink-0 cursor-pointer has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
        <span className="sr-only">Post to {name}</span>
        <Switch
          checked={account !== undefined || connect.isPending}
          disabled={connect.isPending || (account === undefined && add === null)}
          onChange={(next) => {
            if (!next) return setRemoving(true)
            if (add === null) throw new Error("This account is no longer offered by its connection")
            connect.mutate(add)
          }}
        />
      </label>
      {account !== undefined && (
        <ConfirmDialog
          open={removing}
          title={`Stop posting to ${label}?`}
          description="Posts waiting to go to this account won’t publish there. Nothing already published is deleted, and you can switch it back on later."
          confirmLabel="Stop posting"
          pending={remove.isPending}
          onConfirm={() => remove.mutate(account.id)}
          onOpenChange={(open) => {
            if (!open) {
              setRemoving(false)
              remove.reset()
            }
          }}
        >
          {remove.error && <FormError>{errorMessage(remove.error, "The account could not be removed")}</FormError>}
        </ConfirmDialog>
      )}
    </Row>
  )
}

/**
 * Every account one connection can publish to, found as soon as the page opens. Saved accounts show
 * straight away; the connection's answer adds the ones not switched on yet.
 */
function ConnectionAccounts({
  connection,
  saved,
  named,
}: {
  connection: SocialConnection
  /** This connection's accounts the workspace publishes to. */
  saved: SocialAccount[]
  /** Whether the platform has several connections, so this one is told apart by its name. */
  named: boolean
}) {
  const offered = useQuery({
    queryKey: ["social", "discovery", connection.id],
    queryFn: () => connectionAccounts(connection.id),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  })
  const platform = SocialPlatformLabels[connection.platform]
  const where = named ? `${platform} · ${connection.label}` : platform
  const candidates = offered.data
  const unlisted =
    candidates === undefined
      ? saved
      : saved.filter((account) => !candidates.some((candidate) => candidate.providerAccountID === account.nativeId))
  return (
    <>
      {candidates?.map((candidate) => {
        const account = saved.find((item) => item.nativeId === candidate.providerAccountID)
        return (
          <AccountRow
            key={candidate.providerAccountID}
            platform={connection.platform}
            label={candidate.label}
            where={<Where where={where} account={account} />}
            account={account}
            add={{ connectionID: connection.id, providerAccountID: candidate.providerAccountID }}
          />
        )
      })}
      {unlisted.map((account) => (
        <AccountRow
          key={account.id}
          platform={account.platform}
          label={account.label}
          where={
            candidates === undefined ? (
              <Where where={where} account={account} />
            ) : (
              `${where} · No longer available on this connection`
            )
          }
          account={account}
          add={null}
        />
      ))}
      {offered.isPending && saved.length === 0 && (
        <Row platform={connection.platform}>
          <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">Finding your {platform} accounts…</p>
          <CircleNotch size={14} className="shrink-0 animate-spin text-muted-foreground" />
        </Row>
      )}
      {offered.isError && (
        <Row platform={connection.platform}>
          <p className="min-w-0 flex-1 text-xs text-destructive">
            {errorMessage(offered.error, `Couldn’t load your ${platform} accounts`)}
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={() => void offered.refetch()}>
            Retry
          </Button>
        </Row>
      )}
      {candidates?.length === 0 && saved.length === 0 && (
        <Row platform={connection.platform}>
          <p className="min-w-0 flex-1 text-xs text-muted-foreground">{where} has no accounts you can post to yet.</p>
        </Row>
      )}
    </>
  )
}

/**
 * Where posts can go: every account the workspace's connected platforms offer, each switched on or off in
 * place. Beyond a sign-in's only account, nothing is switched on for the person.
 */
export function AccountsView({ accounts }: { accounts: SocialAccount[] }) {
  const failed = useSearch({ from: "/" }).connect_error
  const connections = useQuery({ queryKey: ["social", "connections"], queryFn: listSocialConnections })
  if (connections.data === undefined)
    return connections.error ? (
      <ErrorState
        message={errorMessage(connections.error, "Could not load connected platforms")}
        onRetry={connections.refetch}
      />
    ) : (
      <LoadingState message="Loading connected platforms…" />
    )
  const linked = connections.data
  const saved = accounts.filter((account) => account.status !== "disabled")
  const owns = (connection: SocialConnection, account: SocialAccount) =>
    account.platform === connection.platform && account.connectionID === connection.id
  const orphaned = saved.filter((account) => !linked.some((connection) => owns(connection, account)))
  if (linked.length === 0 && orphaned.length === 0)
    return (
      <EmptyState
        className="max-w-3xl rounded-2xl bg-surface-soft py-12"
        icon={<PlugsConnected size={24} weight="duotone" />}
        title="Connect a platform to start posting"
        description="Connect Instagram, Facebook, LinkedIn and others. Their accounts show up here."
        action={
          <ConnectMenu>
            <Button size="sm">Connect a platform</Button>
          </ConnectMenu>
        }
      />
    )
  return (
    <div className="min-w-0 max-w-3xl space-y-3">
      {failed !== undefined && <FormError>That account didn’t connect ({failed}). Try again.</FormError>}
      <div className={cn(PANEL, "divide-y divide-border/50")}>
        {linked.map((connection) => (
          <ConnectionAccounts
            key={connection.id}
            connection={connection}
            saved={saved.filter((account) => owns(connection, account))}
            named={linked.filter((item) => item.platform === connection.platform).length > 1}
          />
        ))}
        {orphaned.map((account) => (
          <AccountRow
            key={account.id}
            platform={account.platform}
            label={account.label}
            where={
              <>
                {SocialPlatformLabels[account.platform]} · <span className="text-destructive">Disconnected</span> ·{" "}
                <Reconnect connectionID={account.connectionID} />
              </>
            }
            account={account}
            add={null}
          />
        ))}
      </div>
      <ConnectMenu>
        <Button variant="ghost" size="sm" className="-ml-2">
          <Plus size={12} weight="bold" />
          Connect another platform
        </Button>
      </ConnectMenu>
    </div>
  )
}
