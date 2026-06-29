/** Decoded content (message) account. */
export type ContentNodeData = {
  /** Base58 address of the content account. */
  pubkey: string
  /** Alloc sequence this slot belongs to. */
  allocSeq: number
  /** Slot index within the alloc. */
  slot: number
  /** Owning thread's identity bytes. */
  seed: Uint8Array
  /** Base58 author address, or `''` when unset. */
  author: string
  /** Creation time as an ISO-8601 string. */
  createdAt: string
  /** Alloc sequence of the replied-to message, or `null` for a top-level post. */
  replyAllocSeq: number | null
  /** Slot of the replied-to message, or `null` for a top-level post. */
  replySlot: number | null
  /** On-chain message-type discriminator (see KIND_* constants). */
  contentKind: number
  /** Opaque, type-specific payload bytes as stored on chain. */
  body: Uint8Array
  /** Decoded UTF-8 text when `contentKind === KIND_TEXT`, otherwise empty. */
  text: string
}

/** {@link ContentNodeData} tagged with a discriminant for union handling. */
export type ContentNode = ContentNodeData & { kind: 'content' }

/** Decoded alloc node (one page in a thread's alloc chain). */
export type AllocNodeData = {
  /** Base58 address of the alloc account. */
  pubkey: string
  /** Owning thread's identity bytes. */
  seed: Uint8Array
  /** This page's alloc sequence. */
  allocSeq: number
}

/** Decoded thread (channel) account. */
export type ThreadNodeData = {
  /** Base58 address of the thread account (also the channel identity). */
  pubkey: string
  /** Channel identity bytes (the thread account's pubkey bytes). */
  seed: Uint8Array
  /** Number of alloc pages created for this thread. */
  allocCount: number
  /** Sequence of the most recently created alloc page. */
  lastAllocSeq: number
  /** Base58 author (channel owner) address. */
  author: string
  /** Per-message author fee in lamports. */
  messageFee: bigint
  /** Per-like fee in lamports. */
  likeFee: bigint
  /** Channel title (decoded UTF-8). */
  title: string
}

/** Decoded global program settings account. */
export type ProgramSettingsData = {
  /** Base58 address of the settings account. */
  pubkey: string
  /** Base58 admin wallet. */
  admin: string
  /** Base58 treasury wallet. */
  treasury: string
  /** Platform base fee in basis points. */
  baseFeeBps: number
  /** Platform cut of per-message author fees in basis points. */
  authorFeeCutBps: number
  /** Platform cut of channel entry fees in basis points. */
  entryCutBps: number
  /** Platform cut of like fees in basis points. */
  likeCutBps: number
}

/** Decoded `ThreadAccess` (per-channel gating) account. */
export type ThreadAccessData = {
  /** Base58 address of the `ThreadAccess` account. */
  pubkey: string
  /** Owning thread's identity bytes. */
  seed: Uint8Array
  /** Whether gating is currently enabled. */
  enabled: boolean
  /** Base58 admin (thread owner) address. */
  admin: string
  /** Entry fee in lamports for joining the channel. */
  entryFee: bigint
  /** Number of live whitelist (ACCESS_ALLOWED) members for this thread. */
  whitelistCount: number
}

/** Decoded per-wallet `AccessEntry` membership record. */
export type AccessEntryData = {
  /** Base58 address of the `AccessEntry` account. */
  pubkey: string
  /** Owning thread's identity bytes. */
  seed: Uint8Array
  /** Base58 member wallet address. */
  wallet: string
  /** Membership status (ACCESS_ALLOWED / ACCESS_DENIED / ACCESS_FEE_EXEMPT). */
  status: number
}

/** Decoded `AllocLikes` counter account. */
export type AllocLikesData = {
  /** Base58 address of the `AllocLikes` account. */
  pubkey: string
  /** Alloc sequence these counters belong to. */
  allocSeq: number
  /** Per-slot like counts (`counts[i]` is the count for slot `i`). */
  counts: number[]
}

/** Decoded `FollowRegistry` (a wallet's followed channels) account. */
export type FollowRegistryData = {
  /** Base58 address of the `FollowRegistry` account. */
  pubkey: string
  /** Base58 owner wallet address. */
  owner: string
  /** Base58 addresses of the channels this wallet follows. */
  channels: string[]
}

/** Decoded `FollowerShard` (one shard of a channel's follower counter) account. */
export type FollowerShardData = {
  /** Base58 address of the `FollowerShard` account. */
  pubkey: string
  /** Base58 address of the channel (thread) this shard counts. */
  thread: string
  /** Shard index in `[0, N_FOLLOWER_SHARDS)`. */
  shard: number
  /** Follower count held by this shard. */
  count: bigint
}
