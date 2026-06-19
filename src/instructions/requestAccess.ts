import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { Instruction } from '../constants/program'
import { RequestAccessInstr } from '../codec/schemas'
import { deriveAccessEntryPda, deriveAccessPda, deriveAuthorFeePda, deriveSettingsPda, deriveThreadPda, deriveTreasuryShardPda, randomAuthorFeeShard, randomTreasuryShard } from './pda'

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
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: accessAccount, isSigner: false, isWritable: true },
      { pubkey: entryAccount, isSigner: false, isWritable: true },
      { pubkey: threadAccount, isSigner: false, isWritable: false },
      { pubkey: settingsAccount, isSigner: false, isWritable: false },
      { pubkey: treasuryShard, isSigner: false, isWritable: true },
      { pubkey: authorFeeShard, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(RequestAccessInstr.serialize({
      tag: Instruction.RequestAccess,
      treasuryShardIdx,
      authorFeeShardIdx,
    })),
  })
}
