// PDA seed prefixes (must match state.rs). Child PDAs are derived from the
// thread account's pubkey; the thread itself is a full-address account (not a
// PDA), so there is no thread seed prefix anymore.

/** Seed prefix for the global settings PDA. */
export const SEED_SETTINGS = 'settings'
/** Seed prefix for alloc node PDAs. */
export const SEED_ALLOC = 'alloc'
/** Seed prefix for content (message) PDAs. */
export const SEED_CONTENT = 'content'
/** Seed prefix for `ThreadAccess` PDAs. */
export const SEED_ACCESS = 'access'
/** Seed prefix for `AllocLikes` PDAs. */
export const SEED_LIKES = 'likes'
/** Seed prefix for treasury vault shard PDAs. */
export const SEED_TREASURY_SHARD = 'treasury_shard'
/** Seed prefix for author-fee vault shard PDAs. */
export const SEED_AUTHOR_FEE = 'author_fee'
/** Seed prefix for per-wallet `AccessEntry` PDAs. */
export const SEED_ACL = 'acl'
/** Seed prefix for `FollowRegistry` PDAs. */
export const SEED_FOLLOWS = 'follows'
/** Seed prefix for `FollowerShard` counter PDAs. */
export const SEED_FOLLOWER_COUNT = 'follower_count'

/**
 * BPF upgradeable loader — owns the ProgramData account that records the
 * program's upgrade authority (the "deploy author").
 */
export const BPF_LOADER_UPGRADEABLE_ID = 'BPFLoaderUpgradeab1e11111111111111111111111'
