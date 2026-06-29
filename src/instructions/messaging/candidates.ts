import type { PublicKey } from '@solana/web3.js'
import { CONTENT_SLOTS, MAX_BODY_LEN } from '../../constants/program'
import {
  ACCOUNT_KEY_SIZE,
  APPEND_TX_OVERHEAD,
  CANDIDATE_SIZE,
  FILL_SLOT_ACCESS_ACCOUNTS,
  FILL_SLOT_BASE_ACCOUNTS,
  FILL_SLOT_FIXED_OVERHEAD,
  TX_OVERHEAD,
  TX_SIZE_LIMIT,
} from '../../constants/tx-size'
import { deriveContentPda } from '../pda'

/** A single fill candidate: the content PDA for a `(allocSeq, slot)` pair. */
export type Candidate = { pda: PublicKey; allocSeq: number; slot: number }

/**
 * Encodes message text to UTF-8 bytes, enforcing the non-empty and
 * `MAX_BODY_LEN` constraints the program also checks.
 *
 * @param text - The message text.
 * @returns The UTF-8 encoded bytes.
 * @throws `'Text must not be empty'` or `'Body is too long (...)'`.
 */
export function ensureTextBytes(text: string) {
  const bytes = new TextEncoder().encode(text)

  if (bytes.length === 0) {
    throw new Error('Text must not be empty')
  }

  if (bytes.length > MAX_BODY_LEN) {
    throw new Error(`Body is too long (max ${MAX_BODY_LEN} bytes)`)
  }

  return bytes
}

/**
 * Returns a shuffled copy of `arr` (Fisher–Yates). Used to randomize fill
 * candidate order so concurrent senders are less likely to contend on the same
 * content slot.
 *
 * @param arr - The array to shuffle (not mutated).
 * @returns A new shuffled array.
 */
export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr]

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }

  return result
}

/**
 * Estimates the serialized byte size of a `fill_slot` transaction, used to
 * decide how much text fits in the first transaction before chunking the
 * remainder via `append_content`.
 *
 * @param nCandidates - Number of fill candidates in the instruction.
 * @param textLen - Length of the inlined body bytes.
 * @returns The estimated transaction size in bytes.
 */
function estimateFillSlotTxSize(nCandidates: number, textLen: number): number {
  const nAccounts = FILL_SLOT_BASE_ACCOUNTS + nCandidates + FILL_SLOT_ACCESS_ACCOUNTS
  const accountsSize = 1 + (nAccounts + 1) * ACCOUNT_KEY_SIZE // +1 for program ID key
  const instrDataSize = FILL_SLOT_FIXED_OVERHEAD + textLen + nCandidates * CANDIDATE_SIZE
  const instrOverhead = 1 + 1 + 1 + nAccounts + 2 // program idx + accounts compact + data compact
  return TX_OVERHEAD + accountsSize + instrOverhead + instrDataSize
}

/**
 * Maximum body bytes that fit in a `fill_slot` transaction given its candidate
 * count.
 *
 * @param nCandidates - Number of fill candidates in the instruction.
 * @param reserve - Extra bytes to hold back (e.g. for a co-bundled
 *   `prepare_alloc` in the liveness fallback). Defaults to `0`.
 * @returns The maximum first-chunk body length in bytes.
 */
export function maxFillSlotTextLen(nCandidates: number, reserve = 0): number {
  const withoutText = estimateFillSlotTxSize(nCandidates, 0)
  return TX_SIZE_LIMIT - withoutText - reserve
}

/**
 * Maximum chunk bytes that fit in a single `append_content` transaction.
 *
 * @returns The maximum append-chunk length in bytes.
 */
export function maxAppendChunkLen(): number {
  return TX_SIZE_LIMIT - APPEND_TX_OVERHEAD
}

/** Builds the content PDA candidates for a single alloc page (`allocSeq`). */
export function pageCandidates(programId: PublicKey, seed: Uint8Array, allocSeq: number): Candidate[] {
  return Array.from({ length: CONTENT_SLOTS }, (_, slot) => ({
    pda: deriveContentPda(programId, seed, allocSeq, slot),
    allocSeq,
    slot,
  }))
}
