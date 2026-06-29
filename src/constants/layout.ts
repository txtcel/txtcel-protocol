// Content kind + layout sizes (must match state.rs / content/body.rs).

/**
 * Content message-type discriminator for plain UTF-8 text (must match
 * content/body.rs). `kind` selects how `body` bytes are interpreted; new kinds
 * can be added post-deploy without a program upgrade since the body is opaque
 * on-chain.
 */
export const KIND_TEXT = 0

/** Number of fillable content slots per alloc page. */
export const CONTENT_SLOTS = 32
/** Filled-slot count at which a page is auto-extended (a new page is linked). */
export const EXTEND_THRESHOLD = 16
/** Maximum content body length in bytes. */
export const MAX_BODY_LEN = 8192
/** Maximum channel title length in bytes. */
export const MAX_TITLE_LEN = 64
/** On-chain `u32` sentinel for "no value" (reply/link absent). */
export const INDEX_NONE = 0xffffffff
/** Size of a public key in bytes. */
export const PUBKEY_SIZE = 32
