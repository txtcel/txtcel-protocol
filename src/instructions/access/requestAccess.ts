import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { Instruction } from '../../constants/program'
import { RequestAccessInstr } from '../../codec/schemas'
import { deriveAccessEntryPda, deriveAccessPda, deriveAuthorFeePda, deriveSettingsPda, deriveThreadPda, deriveTreasuryShardPda, randomAuthorFeeShard, randomTreasuryShard } from '../pda'
import { readonlyMeta, signerMeta, writableMeta } from '../meta'

/**
 * Builds a `RequestAccess` instruction that lets a wallet join a gated channel
 * by paying its entry fee, creating the caller's per-wallet `AccessEntry`.
 *
 * Random treasury and author-fee shards are chosen internally to spread the fee
 * writes; their indices are echoed into the data so the program can verify the
 * matching shard accounts.
 *
 * @param programId - The deployed Txtcel program address.
 * @param payer - The joining wallet; signs and pays the entry fee.
 * @param seed - The target thread's 32-byte identity.
 * @returns The assembled `TransactionInstruction`.
 */
export function buildRequestAccessInstruction(
  programId: PublicKey,
  payer: PublicKey,
  seed: Uint8Array,
) {
  const accessAccount = deriveAccessPda(programId, seed)
  const entryAccount = deriveAccessEntryPda(programId, seed, payer)
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
      writableMeta(accessAccount),
      writableMeta(entryAccount),
      readonlyMeta(threadAccount),
      readonlyMeta(settingsAccount),
      writableMeta(treasuryShard),
      writableMeta(authorFeeShard),
      readonlyMeta(SystemProgram.programId),
    ],
    data: Buffer.from(RequestAccessInstr.serialize({
      tag: Instruction.RequestAccess,
      treasuryShardIdx,
      authorFeeShardIdx,
    })),
  })
}
