import { useRef, useState, type ReactNode } from "react"
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleNotch,
  FileVideo,
  Image,
  Images,
  LockSimple,
  Plus,
  WarningCircle,
  X,
} from "@phosphor-icons/react"
import { superclerk } from "@/api/client"
import type { SocialAsset, SocialMediaItem } from "@/api/social"
import { Button, BusyButton } from "@/components/common/button"
import { EmptyState, ErrorState, LoadingState } from "@/components/common/empty-state"
import { SearchField } from "@/components/common/search-field"
import { TextInput } from "@/components/common/form"
import { FormError } from "@/components/common/form-dialog"
import { SelectMenu } from "@/components/common/select-menu"
import { errorMessage } from "@/lib/errors"
import { cn } from "@/lib/utils"

export const assetKey = (id: string) => ["social", "media", id] as const

const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "video/mp4"]

/**
 * A file on its way into a post. The composer owns these, so a save can see every file that has not
 * become an attached asset yet.
 */
export type StagedUpload = {
  id: string
  /** The account whose own media this file joins; null for the media every account shares. */
  accountId: string | null
  file: File
  access: "public" | "private"
  /** Kept across retries, so a retry after a lost response confirms the same asset instead of making another. */
  key: string
  /** Cancels both a queued file and its in-flight upload when it is discarded. */
  abort: AbortController
  state: { kind: "uploading" } | { kind: "failed"; error: string }
}

export function MediaPreview({
  asset,
  altText,
  className,
  controls,
}: {
  asset?: SocialAsset
  altText?: string
  className?: string
  controls?: boolean
}) {
  return (
    <span
      className={cn(
        "relative flex min-w-0 items-center justify-center overflow-hidden bg-surface-medium text-muted-foreground",
        className,
      )}
    >
      {asset?.url ? (
        asset.contentType === "video/mp4" ? (
          <video
            src={asset.url}
            aria-label={altText || asset.filename}
            preload="metadata"
            controls={controls}
            muted={!controls}
            playsInline
            className="size-full object-cover"
          />
        ) : (
          <img src={asset.url} alt={altText || asset.filename} loading="lazy" className="size-full object-cover" />
        )
      ) : (
        <span className="flex min-w-0 flex-col items-center gap-1 p-2 text-center">
          {asset?.storageAccess === "private" ? (
            <LockSimple size={20} />
          ) : asset?.contentType === "video/mp4" ? (
            <FileVideo size={20} />
          ) : (
            <Image size={20} />
          )}
          {asset && <span className="line-clamp-2 max-w-full break-all text-[9px]">{asset.filename}</span>}
        </span>
      )}
    </span>
  )
}

function TileButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-6 cursor-pointer items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/75 focus-visible:outline-2 focus-visible:outline-white disabled:hidden"
    >
      {children}
    </button>
  )
}

function MediaTile({
  item,
  index,
  total,
  initialAsset,
  selected,
  onSelect,
  onMove,
  onRemove,
}: {
  item: SocialMediaItem
  index: number
  total: number
  initialAsset?: SocialAsset
  selected: boolean
  onSelect: () => void
  onMove: (to: number) => void
  onRemove: () => void
}) {
  const asset = useQuery({
    queryKey: assetKey(item.assetId),
    queryFn: () => superclerk.social.media.get(item.assetId),
    initialData: initialAsset,
  })
  const name = asset.data?.filename ?? `media ${index + 1}`
  return (
    <div
      className={cn(
        "group relative aspect-square overflow-hidden rounded-lg bg-surface-medium",
        selected && "ring-2 ring-brand ring-offset-2 ring-offset-background",
      )}
    >
      {asset.data?.contentType === "video/mp4" ? (
        <MediaPreview asset={asset.data} altText={item.altText} className="size-full" controls />
      ) : (
        <button
          type="button"
          aria-label={`Alt text for ${name}`}
          aria-pressed={selected}
          onClick={onSelect}
          className="absolute inset-0 cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        >
          <MediaPreview asset={asset.data} altText={item.altText} className="size-full" />
        </button>
      )}
      {total > 1 && (
        <span className="pointer-events-none absolute left-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-black/55 text-[10px] font-semibold tabular-nums text-white">
          {index + 1}
        </span>
      )}
      {item.altText && (
        <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded bg-black/55 px-1 py-px text-[9px] font-semibold tracking-wide text-white">
          ALT
        </span>
      )}
      {asset.error && (
        <span role="alert" className="absolute inset-x-0 bottom-0 bg-destructive px-1.5 py-1 text-[10px] text-white">
          {errorMessage(asset.error, "Could not load this file")}
        </span>
      )}
      <div className="absolute right-1 top-1 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100">
        {asset.data?.contentType === "video/mp4" && (
          <TileButton label={`Alt text for ${name}`} onClick={onSelect}>
            <span className="text-[8px] font-semibold">ALT</span>
          </TileButton>
        )}
        {total > 1 && (
          <>
            <TileButton label={`Move ${name} earlier`} disabled={index === 0} onClick={() => onMove(index - 1)}>
              <ArrowLeft size={11} weight="bold" />
            </TileButton>
            <TileButton label={`Move ${name} later`} disabled={index === total - 1} onClick={() => onMove(index + 1)}>
              <ArrowRight size={11} weight="bold" />
            </TileButton>
          </>
        )}
        <TileButton label={`Remove ${name}`} onClick={onRemove}>
          <X size={11} weight="bold" />
        </TileButton>
      </div>
    </div>
  )
}

function UploadTile({
  upload,
  onRetry,
  onDiscard,
}: {
  upload: StagedUpload
  onRetry: () => void
  onDiscard: () => void
}) {
  const failed = upload.state.kind === "failed"
  return (
    <div
      role="group"
      aria-label={upload.file.name}
      title={upload.state.kind === "failed" ? upload.state.error : upload.file.name}
      className={cn(
        "relative flex aspect-square flex-col items-center justify-center gap-1 overflow-hidden rounded-lg px-2 text-center",
        failed ? "bg-destructive/[0.07] text-destructive" : "bg-surface-soft text-muted-foreground",
      )}
    >
      {upload.state.kind === "uploading" ? (
        <>
          <CircleNotch size={16} className="animate-spin" />
          <span role="status" className="text-[11px]">
            Uploading
          </span>
        </>
      ) : (
        <>
          <WarningCircle size={16} weight="fill" />
          <span className="text-[11px] font-medium">Didn’t upload</span>
          <span className="flex gap-1 pt-0.5">
            <button
              type="button"
              aria-label={`Retry ${upload.file.name}`}
              onClick={onRetry}
              className="cursor-pointer rounded-md bg-background px-1.5 py-0.5 text-[10.5px] font-medium text-foreground shadow-[0_0_0_0.5px_var(--chrome-edge)] hover:bg-surface-medium"
            >
              Retry
            </button>
          </span>
        </>
      )}
      <button
        type="button"
        aria-label={`Remove ${upload.file.name}`}
        onClick={onDiscard}
        className="absolute right-1 top-1 flex size-6 cursor-pointer items-center justify-center rounded-full bg-background/80 text-foreground hover:bg-background focus-visible:outline-2 focus-visible:outline-ring"
      >
        <X size={11} weight="bold" />
      </button>
      <span className="line-clamp-1 max-w-full break-all text-[10px] opacity-75">{upload.file.name}</span>
    </div>
  )
}

function MediaLibrary({
  attached,
  onAttach,
  onClose,
}: {
  attached: readonly SocialMediaItem[]
  onAttach: (asset: SocialAsset) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState("")
  const library = useInfiniteQuery({
    queryKey: ["social", "library", search.trim()],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      superclerk.social.media.list({ cursor: pageParam, search: search.trim() === "" ? undefined : search.trim() }),
    getNextPageParam: (last) => (last.nextCursor === null ? undefined : last.nextCursor),
  })
  return (
    <div className="space-y-3 rounded-xl bg-surface-soft p-3">
      <div className="flex items-center gap-2">
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Search your uploads"
          label="Search media library"
          className="min-w-0 flex-1"
        />
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Done
        </Button>
      </div>
      {library.data === undefined ? (
        library.error ? (
          <ErrorState message={errorMessage(library.error, "Could not load media")} onRetry={library.refetch} />
        ) : (
          <LoadingState message="Loading media…" />
        )
      ) : (
        <>
          {library.error && <FormError>{errorMessage(library.error, "Could not refresh media")}</FormError>}
          {library.data.pages[0]?.items.length === 0 ? (
            <EmptyState
              className="py-8"
              title={search.trim() ? "No matching files" : "No uploads yet"}
              description={search.trim() ? "Try another filename." : "Files you upload here can be reused in any post."}
            />
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {library.data.pages
                .flatMap((page) => page.items)
                .map((asset) => {
                  const added = attached.some((item) => item.assetId === asset.id)
                  return (
                    <button
                      type="button"
                      key={asset.id}
                      aria-label={`Attach ${asset.filename}`}
                      title={asset.filename}
                      disabled={added}
                      onClick={() => onAttach(asset)}
                      className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-background focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-default"
                    >
                      <MediaPreview asset={asset} className="size-full transition-opacity group-hover:opacity-90" />
                      {added && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white">
                          <Check size={18} weight="bold" />
                        </span>
                      )}
                    </button>
                  )
                })}
            </div>
          )}
          {library.hasNextPage && (
            <BusyButton
              type="button"
              variant="ghost"
              size="sm"
              pending={library.isFetchingNextPage}
              onClick={() => void library.fetchNextPage()}
            >
              Load more
            </BusyButton>
          )}
        </>
      )}
    </div>
  )
}

/**
 * The post's pictures, in the order they publish. Files upload the moment they are added; one that fails
 * stays here with Retry and Remove until the person decides, so nothing is dropped from a post unseen.
 */
export function MediaTray({
  label,
  items,
  uploads,
  initialAssets,
  access,
  onFiles,
  onRetry,
  onDiscard,
  onChange,
}: {
  label: string
  items: SocialMediaItem[]
  uploads: readonly StagedUpload[]
  initialAssets: readonly SocialAsset[]
  /** Offered only where private media can publish, which is YouTube alone. */
  access: { value: "public" | "private"; onChange: (value: "public" | "private") => void } | null
  onFiles: (files: File[]) => void
  onRetry: (upload: StagedUpload) => void
  onDiscard: (upload: StagedUpload) => void
  onChange: (update: (current: SocialMediaItem[]) => SocialMediaItem[]) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const cache = useQueryClient()
  const [selected, setSelected] = useState<string | null>(null)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [rejected, setRejected] = useState<string[]>([])
  const selectedIndex = items.findIndex((item) => item.assetId === selected)
  const add = (files: File[]) => {
    setRejected(files.filter((file) => !MEDIA_TYPES.includes(file.type)).map((file) => file.name))
    onFiles(files.filter((file) => MEDIA_TYPES.includes(file.type)))
  }
  return (
    <section aria-label={label} className="space-y-2.5">
      <div className="flex min-h-7 items-center gap-2">
        <h3 className="text-xs font-medium text-foreground">{label}</h3>
        <div className="ml-auto flex items-center gap-1.5">
          {access && (
            <SelectMenu
              size="sm"
              aria-label="Upload access"
              value={access.value}
              items={[
                { value: "public", label: "Public link" },
                { value: "private", label: "Private" },
              ]}
              onChange={(value) => access.onChange(value as typeof access.value)}
              className="w-32"
            />
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Media library"
            aria-expanded={libraryOpen}
            onClick={() => setLibraryOpen(!libraryOpen)}
          >
            <Images size={14} />
            Library
          </Button>
        </div>
      </div>
      <div
        tabIndex={-1}
        role="group"
        aria-label={`Drop or paste ${label.toLowerCase()}`}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          add(Array.from(event.dataTransfer.files))
        }}
        onPaste={(event) => {
          if (event.clipboardData.files.length === 0) return
          event.preventDefault()
          add(Array.from(event.clipboardData.files))
        }}
        className={cn("rounded-xl outline-none transition-shadow", dragging && "ring-2 ring-brand/50")}
      >
        <input
          ref={input}
          type="file"
          multiple
          accept={MEDIA_TYPES.join(",")}
          aria-label="Choose photos or video"
          className="sr-only"
          onChange={(event) => {
            add(Array.from(event.target.files ?? []))
            event.target.value = ""
          }}
        />
        {items.length === 0 && uploads.length === 0 ? (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border px-4 py-7 text-center transition-colors hover:bg-surface-soft focus-visible:outline-2 focus-visible:outline-ring"
          >
            <span className="mb-1 flex size-8 items-center justify-center rounded-full bg-surface-medium text-muted-foreground">
              <Plus size={15} weight="bold" />
            </span>
            <span className="text-[13px] font-medium text-foreground">Add photos or video</span>
            <span className="text-xs text-muted-foreground">
              Drop, paste or choose · JPEG, PNG, WebP or MP4
              {access?.value === "private" ? " · private" : " · shared by public link"}
            </span>
          </button>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2">
            {items.map((item, index) => (
              <MediaTile
                key={item.assetId}
                item={item}
                index={index}
                total={items.length}
                initialAsset={initialAssets.find((asset) => asset.id === item.assetId)}
                selected={selected === item.assetId}
                onSelect={() => setSelected(selected === item.assetId ? null : item.assetId)}
                onMove={(to) =>
                  onChange((current) => {
                    const next = [...current]
                    const [moved] = next.splice(index, 1)
                    next.splice(to, 0, moved!)
                    return next
                  })
                }
                onRemove={() => onChange((current) => current.filter((entry) => entry.assetId !== item.assetId))}
              />
            ))}
            {uploads.map((upload) => (
              <UploadTile
                key={upload.id}
                upload={upload}
                onRetry={() => onRetry(upload)}
                onDiscard={() => onDiscard(upload)}
              />
            ))}
            <button
              type="button"
              aria-label="Add photos or video"
              onClick={() => input.current?.click()}
              className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:bg-surface-soft hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              <Plus size={15} weight="bold" />
              <span className="text-[11px]">Add</span>
            </button>
          </div>
        )}
      </div>
      {selectedIndex !== -1 && (
        <TextInput
          aria-label={`Alt text for media ${selectedIndex + 1}`}
          maxLength={1000}
          autoFocus
          value={items[selectedIndex]!.altText ?? ""}
          placeholder={`Describe photo ${selectedIndex + 1} for people using screen readers`}
          onChange={(event) => {
            const altText = event.target.value
            onChange((current) =>
              current.map((entry, position) =>
                position === selectedIndex
                  ? altText === ""
                    ? { assetId: entry.assetId }
                    : { ...entry, altText }
                  : entry,
              ),
            )
          }}
          className="text-xs"
        />
      )}
      {uploads.map((upload) =>
        upload.state.kind === "failed" ? (
          <FormError key={upload.id}>
            {upload.file.name} didn’t upload: {upload.state.error}
          </FormError>
        ) : null,
      )}
      {rejected.length > 0 && (
        <FormError>
          {rejected.join(", ")} {rejected.length === 1 ? "isn’t" : "aren’t"} a supported file. Use JPEG, PNG, WebP or
          MP4.
        </FormError>
      )}
      {access?.value === "private" && (
        <p className="text-xs text-muted-foreground">Private files have no public link and publish only to YouTube.</p>
      )}
      {libraryOpen && (
        <MediaLibrary
          attached={items}
          onAttach={(asset) => {
            cache.setQueryData(assetKey(asset.id), asset)
            onChange((current) =>
              current.some((item) => item.assetId === asset.id) ? current : [...current, { assetId: asset.id }],
            )
          }}
          onClose={() => setLibraryOpen(false)}
        />
      )}
    </section>
  )
}
