import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { Instruction } from '../constants/program'
import { InitThreadAccessInstr } from '../codec/schemas'
import { deriveAccessPda, deriveThreadPda, deriveTreasuryShardPda, randomTreasuryShard } from './pda'

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
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: threadAccount, isSigner: false, isWritable: false },
      { pubkey: accessAccount, isSigner: false, isWritable: true },
      { pubkey: treasuryShard, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(InitThreadAccessInstr.serialize({
      tag: Instruction.InitThreadAccess,
      enabled: enabled ? 1 : 0,
      treasuryShardIdx,
    })),
  })
}
