// Fee-related constants (must match state.rs).

/** Basis-points denominator (`10_000` = 100%). */
export const BPS_DIVISOR = 10_000

/**
 * Max basis points for any platform fee cut / base fee (must match
 * MAX_FEE_CUT_BPS in state.rs). The program rejects higher values with
 * InvalidFeeBps; admin UIs should validate against this before sending.
 */
export const MAX_FEE_CUT_BPS = 5_000
