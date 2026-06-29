import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { Instruction } from '../../constants/program'
import { LikeContentInstr } from '../../codec/schemas'
import { deriveAuthorFeePda, deriveContentPda, deriveLikesPda, deriveSettingsPda, deriveThreadPda, deriveTreasuryShardPda, randomAuthorFeeShard, randomTreasuryShard } from '../pda'
import { readonlyMeta, signerMeta, writableMeta } from '../meta'

/**
 * Builds a `LikeContent` instruction that records a like for one content slot
 * and pays the associated like fee.
 *
 * The likes counter (`AllocLikes`) is per-alloc, so the like targets the
 * `(allocSeq, slot)` pair. Random treasury and author-fee shards are chosen
 * internally to spread fee writes; their indices are echoed into the data so
 * the program can verify the matching shard accounts.
 *
 * @param programId - The deployed Txtcel program address.
 * @param payer - Fee payer; signs and pays the like fee.
 * @param seed - The owning thread's 32-byte identity.
 * @param allocSeq - Alloc sequence of the liked content.
 * @param slot - Slot within the alloc of the liked content.
 * @param maxFee - Slippage cap (lamports) on the base + author fee charged.
 * @returns The assembled `TransactionInstruction`.
 */
export function buildLikeContentInstruction(
  programId: PublicKey,
  payer: PublicKey,
  seed: Uint8Array,
  allocSeq: number,
  slot: number,
  maxFee: bigint,
) {
  const likesAccount = deriveLikesPda(programId, seed, allocSeq)
  const contentAccount = deriveContentPda(programId, seed, allocSeq, slot)
  const threadAccount = deriveThreadPda(programId, seed)
  const settingsAccount = deriveSettingsPda(programId)
  const treasuryShardIdx = randomTreasuryShard()
  const authorFeeShardIdx = randomAuthorFeeShard()
  const treasuryShard = deriveTreasuryShardPda(programId, treasuryShardIdx)
  const authorFeeShard = deriveAuthorFeePda(programId, seed, authorFeeShardIdx)

  return new TransactionInstruction({
    programId,
    keys: [
      signerMeta(payer),
      writableMeta(likesAccount),
      readonlyMeta(contentAccount),
      readonlyMeta(threadAccount),
      readonlyMeta(settingsAccount),
      writableMeta(treasuryShard),
      writableMeta(authorFeeShard),
      readonlyMeta(SystemProgram.programId),
    ],
    data: Buffer.from(LikeContentInstr.serialize({
      tag: Instruction.LikeContent,
      allocSeq,
      slot,
      treasuryShardIdx,
      authorFeeShardIdx,
      maxFee,
    })),
  })
}
