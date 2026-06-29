import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { Instruction } from '../../constants/program'
import { InitThreadAccessInstr } from '../../codec/schemas'
import { deriveAccessPda, deriveThreadPda, deriveTreasuryShardPda, randomTreasuryShard } from '../pda'
import { readonlyMeta, signerMeta, writableMeta } from '../meta'

/**
 * Builds an `InitThreadAccess` instruction that creates a channel's
 * `ThreadAccess` account, enabling gating (whitelist/blacklist/entry fee).
 *
 * Thread-author-only. A random treasury shard is picked internally to spread
 * the account-creation fee write; its index is echoed into the data so the
 * program can verify the matching shard account.
 *
 * @param programId - The deployed Txtcel program address.
 * @param authority - The thread author; signs and funds the access account rent.
 * @param seed - The owning thread's 32-byte identity.
 * @param enabled - Whether gating starts enabled.
 * @returns The assembled `TransactionInstruction`.
 */
export function buildInitThreadAccessInstruction(
  programId: PublicKey,
  authority: PublicKey,
  seed: Uint8Array,
  enabled: boolean,
) {
  const threadAccount = deriveThreadPda(programId, seed)
  const accessAccount = deriveAccessPda(programId, seed)
  const treasuryShardIdx = randomTreasuryShard()
  const treasuryShard = deriveTreasuryShardPda(programId, treasuryShardIdx)

  return new TransactionInstruction({
    programId,
    keys: [
      signerMeta(authority),
      readonlyMeta(threadAccount),
      writableMeta(accessAccount),
      writableMeta(treasuryShard),
      readonlyMeta(SystemProgram.programId),
    ],
    data: Buffer.from(InitThreadAccessInstr.serialize({
      tag: Instruction.InitThreadAccess,
      enabled: enabled ? 1 : 0,
      treasuryShardIdx,
    })),
  })
}
