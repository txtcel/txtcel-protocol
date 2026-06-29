// Access entry status values (must match state.rs).

/** `AccessEntry` status: wallet is whitelisted (allowed to post). */
export const ACCESS_ALLOWED = 0
/** `AccessEntry` status: wallet is blacklisted (denied). */
export const ACCESS_DENIED = 1
/** `AccessEntry` status: allowed to post AND exempt from the per-message author fee. */
export const ACCESS_FEE_EXEMPT = 2
