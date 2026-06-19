// Account discriminator tags (must match state.rs)
export const TAG_CONTENT = 1
export const TAG_ALLOC = 2
export const TAG_THREAD = 3
export const TAG_SETTINGS = 5
export const TAG_ACCESS = 6
export const TAG_LIKES = 7
export const TAG_ACCESS_ENTRY = 9

// Content message-type discriminators (must match content/body.rs).
// `kind` selects how `body` bytes are interpreted; new kinds can be added
// post-deploy without a program upgrade since the body is opaque on-chain.
export const KIND_TEXT = 0

// Access entry status (must match state.rs)
export const ACCESS_ALLOWED = 0
export const ACCESS_DENIED = 1
// Allowed to post AND exempt from the per-message author fee.
export const ACCESS_FEE_EXEMPT = 2

// Layout sizes
export const CHILDREN_LEN = 32
export const NEXT_ALLOC_INDEX = 31
export const CONTENT_SLOTS = 31
export const EXTEND_THRESHOLD = 16
export const MAX_BODY_LEN = 8192
export const MAX_TITLE_LEN = 64
export const INDEX_NONE = 0xffffffff
export const PUBKEY_SIZE = 32

// Shard counts
export const N_TREASURY_SHARDS = 512
export const N_AUTHOR_FEE_SHARDS = 4

// PDA seed prefixes (must match state.rs). Child PDAs are derived from the
// thread account's pubkey; the thread itself is a full-address account (not a
// PDA), so there is no thread seed prefix anymore.
export const SEED_SETTINGS = 'settings'
export const SEED_ALLOC = 'alloc'
export const SEED_CONTENT = 'content'
export const SEED_ACCESS = 'access'
export const SEED_LIKES = 'likes'
export const SEED_TREASURY_SHARD = 'treasury_shard'
export const SEED_AUTHOR_FEE = 'author_fee'
export const SEED_ACL = 'acl'

// BPF upgradeable loader — owns the ProgramData account that records the
// program's upgrade authority (the "deploy author").
export const BPF_LOADER_UPGRADEABLE_ID = 'BPFLoaderUpgradeab1e11111111111111111111111'

// Instruction variant indices (must match ProgramInstruction enum in instruction.rs)
export const Instruction = {
  CreateRootAlloc: 0,
  FillSlot: 1,
  PrepareAlloc: 2,
  SweepTreasury: 3,
  SweepAuthorFees: 4,
  CloseAccount: 5,
  InitSettings: 6,
  SetTreasury: 7,
  InitThreadAccess: 8,
  SetThreadAccess: 9,
  AddToWhitelist: 10,
  RemoveFromWhitelist: 11,
  SetMessageFee: 12,
  SetBaseFee: 13,
  SetAuthorFeeCut: 14,
  SetEntryCut: 15,
  SetLikeCut: 16,
  SetLikeFee: 17,
  SetEntryFee: 18,
  RequestAccess: 19,
  LikeContent: 20,
  AddToBlacklist: 21,
  RemoveFromBlacklist: 22,
  AppendContent: 23,
  SetAdmin: 24,
  AddToFeeWhitelist: 25,
  RemoveFromFeeWhitelist: 26,
} as const

export const DESIRED_CANDIDATES = 3
export const BPS_DIVISOR = 10_000

// Transaction polling
export const TX_POLL_TIMEOUT_MS = 60_000
export const TX_POLL_INTERVAL_MS = 2_000
