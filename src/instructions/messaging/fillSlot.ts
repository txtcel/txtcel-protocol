import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { INDEX_NONE, Instruction, KIND_TEXT } from '../../constants/program'
import { FillSlotInstr } from '../../codec/schemas'
import { deriveAccessEntryPda, deriveAccessPda, deriveAuthorFeePda, deriveSettingsPda, deriveThreadPda, deriveTreasuryShardPda } from '../pda'
import { readonlyMeta, signerMeta, writableMeta } from '../meta'

/**
 * Options for {@link buildFillSlotInstruction}.
 */
export type FillSlotOptions = {
  /** The deployed Txtcel program address. */
  programId: PublicKey
  /** Fee payer; signs and pays rent + fees for the new content slot. */
  payer: PublicKey
  /** The owning thread's 32-byte identity. */
  seed: Uint8Array
  /**
   * Candidate slots the program may fill, in preference order. Each carries its
   * `(allocSeq, slot)` plus the pre-derived content PDA written to the keys.
   */
  candidates: Array<{ allocSeq: number; slot: number; pda: PublicKey }>
  /** Index of the treasury shard to credit (echoed into instruction data). */
  treasuryShardIdx: number
  /** Index of the author-fee shard to credit (echoed into instruction data). */
  authorFeeShardIdx: number
  /** Opaque message payload. For the default text kind this is UTF-8 bytes. */
  bodyBytes: Uint8Array
  /** Message-type discriminator; defaults to {@link KIND_TEXT}. */
  kind?: number
  /** Slippage cap (lamports) on the base + author fee charged. */
  maxFee: bigint
  /** Alloc sequence of the message being replied to, or `null` for a top-level post. */
  replyAllocSeq?: number | null
  /** Slot of the message being replied to, or `null` for a top-level post. */
  replySlot?: number | null
}

/**
 * Builds a `FillSlot` instruction that writes a new message into the first
 * usable candidate slot and pays the base + author fee.
 *
 * `fill_slot` is element-only: it never grows the alloc chain, so the thread
 * account is read-only here (linking a new page is the separate
 * `prepare_alloc` instruction). The mandatory `access` + per-wallet `entry`
 * gating PDAs (derived for `payer`) are appended after the candidates at fixed
 * positions; both are program-derived so they cannot be omitted to bypass
 * gating. Account order is on-chain-significant and must not change.
 *
 * @param opts - See {@link FillSlotOptions}.
 * @returns The assembled `TransactionInstruction`.
 */
export function buildFillSlotInstruction(opts: FillSlotOptions) {
  const {
    programId, payer, seed, candidates,
    treasuryShardIdx, authorFeeShardIdx,
    bodyBytes, kind = KIND_TEXT, maxFee,
    replyAllocSeq: replyAllocSeqRaw, replySlot: replySlotRaw,
  } = opts

  const threadAccount = deriveThreadPda(programId, seed)
  const settingsAccount = deriveSettingsPda(programId)
  const treasuryShard = deriveTreasuryShardPda(programId, treasuryShardIdx)
  const authorFeeShard = deriveAuthorFeePda(programId, seed, authorFeeShardIdx)
  // Access control is enforced on-chain via these two PDAs. The thread access
  // PDA carries the `enabled` flag; the per-wallet entry PDA carries the
  // allow/deny status for the payer. Both are mandatory and derived by the
  // program, so they cannot be omitted to bypass gating.
  const accessAccount = deriveAccessPda(programId, seed)
  const entryAccount = deriveAccessEntryPda(programId, seed, payer)

  // `fill_slot` is element-only: it never grows the alloc chain, so the thread
  // account is read-only here. Linking the next page is a separate instruction
  // (`prepare_alloc`).
  const keys = [
    signerMeta(payer),
    readonlyMeta(threadAccount),
    readonlyMeta(settingsAccount),
    writableMeta(treasuryShard),
    writableMeta(authorFeeShard),
    readonlyMeta(SystemProgram.programId),
  ]

  for (const candidate of candidates) {
    keys.push(writableMeta(candidate.pda))
  }

  keys.push(readonlyMeta(accessAccount))
  keys.push(readonlyMeta(entryAccount))

  return new TransactionInstruction({
    programId,
    keys,
    data: Buffer.from(FillSlotInstr.serialize({
      tag: Instruction.FillSlot,
      kind,
      body: bodyBytes,
      candidates: candidates.map(candidate => ({ allocSeq: candidate.allocSeq, slot: candidate.slot })),
      treasuryShardIdx,
      authorFeeShardIdx,
      replyAllocSeq: replyAllocSeqRaw ?? INDEX_NONE,
      replySlot: replySlotRaw ?? 0,
      maxFee,
    })),
  })
}
