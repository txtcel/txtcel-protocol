import { PublicKey, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { Instruction } from '../constants/program'
import { SweepTreasuryInstr } from '../codec/schemas'
import { deriveSettingsPda, deriveTreasuryShardPda } from './pda'

/**
 * Sweep accumulated platform commission from a set of treasury shards into the
 * treasury wallet. Account order matches the on-chain `process_sweep_treasury`:
 * `[settings, treasury, ...shards]`. The transaction fee payer signs and pays;
 * the program enforces that `treasury` equals `settings.treasury`.
 */
export function buildSweepTreasuryInstruction(
  programId: PublicKey,
  treasuryWallet: PublicKey,
  shardIndices: number[],
): TransactionInstruction {
  const keys = [
    { pubkey: deriveSettingsPda(programId), isSigner: false, isWritable: false },
    { pubkey: treasuryWallet, isSigner: false, isWritable: true },
  ]

  for (const idx of shardIndices) {
    keys.push({
      pubkey: deriveTreasuryShardPda(programId, idx),
      isSigner: false,
      isWritable: true,
    })
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
