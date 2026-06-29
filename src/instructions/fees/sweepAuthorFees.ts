import { PublicKey, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { Instruction } from '../../constants/program'
import { SweepAuthorFeesInstr } from '../../codec/schemas'
import { deriveAuthorFeePda } from '../pda'
import { readonlyMeta, signerMeta, writableMeta } from '../meta'

/**
 * Builds a `SweepAuthorFees` instruction that moves a channel's accumulated
 * per-message author fees from a set of author-fee shards into the author's
 * wallet.
 *
 * Account order matches the on-chain `process_sweep_author_fees`:
 * `[thread, author, ...shards]`. The author wallet signs and receives the
 * funds; the program enforces that it equals the thread's author.
 *
 * @param programId - The deployed Txtcel program address.
 * @param seed - The owning thread's 32-byte identity (derives the shard PDAs).
 * @param threadAccount - The thread account (read-only; carries the author).
 * @param authorWallet - The channel author; signs and receives the swept fees.
 * @param shardIndices - Author-fee shard indices to drain (appended in order).
 * @returns The assembled `TransactionInstruction`.
 */
export function buildSweepAuthorFeesInstruction(
  programId: PublicKey,
  seed: Uint8Array,
  threadAccount: PublicKey,
  authorWallet: PublicKey,
  shardIndices: number[],
) {
  const keys = [
    readonlyMeta(threadAccount),
    signerMeta(authorWallet),
  ]

  for (const idx of shardIndices) {
    keys.push(writableMeta(deriveAuthorFeePda(programId, seed, idx)))
  }

  return new TransactionInstruction({
    programId,
    keys,
    data: Buffer.from(SweepAuthorFeesInstr.serialize({
      tag: Instruction.SweepAuthorFees,
      shardIndices: Uint8Array.from(shardIndices),
    })),
  })
}
