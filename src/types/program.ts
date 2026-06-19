export type ContentNodeData = {
  pubkey: string
  allocSeq: number
  slot: number
  seed: Uint8Array
  author: string
  createdAt: string
  replyAllocSeq: number | null
  replySlot: number | null
  /** On-chain message-type discriminator (see KIND_* constants). */
  contentKind: number
  /** Opaque, type-specific payload bytes as stored on chain. */
  body: Uint8Array
  /** Decoded UTF-8 text when `contentKind === KIND_TEXT`, otherwise empty. */
  text: string
}

export type ContentNode = ContentNodeData & { kind: 'content' }

export type AllocNodeData = {
  pubkey: string
  seed: Uint8Array
  allocSeq: number
  upperAllocSeq: number | null
  nextAllocSeq: number | null
}

export type ThreadNodeData = {
  pubkey: string
  seed: Uint8Array
  allocCount: number
  lastAllocSeq: number
  author: string
  messageFee: bigint
  likeFee: bigint
  title: string
}

export type ProgramSettingsData = {
  pubkey: string
  admin: string
  treasury: string
  baseFeeBps: number
  authorFeeCutBps: number
  entryCutBps: number
  likeCutBps: number
}

export type ThreadAccessData = {
  pubkey: string
  seed: Uint8Array
  enabled: boolean
  admin: string
  entryFee: bigint
  /** Number of live whitelist (ACCESS_ALLOWED) members for this thread. */
  whitelistCount: number
}

export type AccessEntryData = {
  pubkey: string
  seed: Uint8Array
  wallet: string
  status: number
}

export type AllocLikesData = {
  pubkey: string
  allocSeq: number
  counts: number[]
}
