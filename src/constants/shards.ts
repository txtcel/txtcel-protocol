// Shard counts (must match state.rs).

/** Number of treasury vault shards (spreads platform-fee write contention). */
export const N_TREASURY_SHARDS = 512
/** Number of per-channel author-fee vault shards. */
export const N_AUTHOR_FEE_SHARDS = 4
/**
 * Number of shards the per-channel follower counter is split across (must match
 * N_FOLLOWER_SHARDS in state.rs). The live total is the sum of all shards.
 */
export const N_FOLLOWER_SHARDS = 8
/** Max channels one wallet can follow (must match MAX_FOLLOWS in state.rs). */
export const MAX_FOLLOWS = 1000
