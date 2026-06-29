// Account discriminator tags (first data byte; must match state.rs).
// Each program-owned account starts with one of these so callers can identify
// an account's type before decoding.

/** `ContentNode` (message) account tag. */
export const TAG_CONTENT = 1
/** `AllocNode` (alloc-chain page) account tag. */
export const TAG_ALLOC = 2
/** `ThreadNode` (channel) account tag. */
export const TAG_THREAD = 3
/** `ProgramSettings` (global config) account tag. */
export const TAG_SETTINGS = 5
/** `ThreadAccess` (per-channel gating) account tag. */
export const TAG_ACCESS = 6
/** `AllocLikes` (per-alloc like counters) account tag. */
export const TAG_LIKES = 7
/** Per-wallet `AccessEntry` (membership record) account tag. */
export const TAG_ACCESS_ENTRY = 9
/** `FollowRegistry` (a wallet's followed channels) account tag. */
export const TAG_FOLLOW_REGISTRY = 10
/** `FollowerShard` (one shard of a channel's follower counter) account tag. */
export const TAG_FOLLOWER_SHARD = 11
