import { PublicKey, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { Instruction } from '../../constants/program'
import { SweepTreasuryInstr } from '../../codec/schemas'
import { deriveSettingsPda, deriveTreasuryShardPda } from '../pda'
import { readonlyMeta, writableMeta } from '../meta'

/**
 * Builds a `SweepTreasury` instruction that moves accumulated platform
 * commission from a set of treasury shards into the treasury wallet.
 *
 * Account order matches the on-chain `process_sweep_treasury`:
 * `[settings, treasury, ...shards]`. The transaction fee payer signs and pays;
 * the program enforces that `treasury` equals `settings.treasury`.
 *
 * @param programId - The deployed Txtcel program address.
 * @param treasuryWallet - Destination wallet; must equal `settings.treasury`.
 * @param shardIndices - Treasury shard indices to drain (appended in order).
 * @returns The assembled `TransactionInstruction`.
 */
export function buildSweepTreasuryInstruction(
  programId: PublicKey,
  treasuryWallet: PublicKey,
  shardIndices: number[],
): TransactionInstruction {
  const keys = [
    readonlyMeta(deriveSettingsPda(programId)),
    writableMeta(treasuryWallet),
  ]

  for (const idx of shardIndices) {
    keys.push(writableMeta(deriveTreasuryShardPda(programId, idx)))
  }

  return new TransactionInstruction({
    programId,
    keys,
    data: Buffer.from(SweepTreasuryInstr.serialize({
      tag: Instruction.SweepTreasury,
      shardIndices: Uint16Array.from(shardIndices),
    })),
  })
}
