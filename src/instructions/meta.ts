import type { AccountMeta, PublicKey } from '@solana/web3.js'

/**
 * Internal helpers that build `AccountMeta` entries for instruction key lists.
 *
 * They exist purely to remove the repeated `{ pubkey, isSigner, isWritable }`
 * boilerplate from the instruction builders and make the signer/writable intent
 * of each account read at a glance. They are intentionally NOT part of the
 * public API: account order, signer and writable flags are on-chain-observable,
 * so call sites must keep building their key arrays in the exact program order.
 */

/**
 * A signing, writable account — typically the fee payer / authority that must
 * approve and may be debited by the instruction.
 *
 * @param pubkey - The account address.
 * @returns The corresponding signer + writable `AccountMeta`.
 */
export function signerMeta(pubkey: PublicKey): AccountMeta {
  return { pubkey, isSigner: true, isWritable: true }
}

/**
 * A non-signing, writable account — mutated by the program but not required to
 * sign (e.g. a PDA the program owns and updates).
 *
 * @param pubkey - The account address.
 * @returns The corresponding writable `AccountMeta`.
 */
export function writableMeta(pubkey: PublicKey): AccountMeta {
  return { pubkey, isSigner: false, isWritable: true }
}

/**
 * A non-signing, read-only account — inspected by the program but never mutated
 * (e.g. settings, the system program, gating PDAs).
 *
 * @param pubkey - The account address.
 * @returns The corresponding read-only `AccountMeta`.
 */
export function readonlyMeta(pubkey: PublicKey): AccountMeta {
  return { pubkey, isSigner: false, isWritable: false }
}
