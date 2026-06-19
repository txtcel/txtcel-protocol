import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { Instruction } from '../constants/program'
import { LikeContentInstr } from '../codec/schemas'
import { deriveAuthorFeePda, deriveContentPda, deriveLikesPda, deriveSettingsPda, deriveThreadPda, deriveTreasuryShardPda, randomAuthorFeeShard, randomTreasuryShard } from './pda'

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
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: likesAccount, isSigner: false, isWritable: true },
      { pubkey: contentAccount, isSigner: false, isWritable: false },
      { pubkey: threadAccount, isSigner: false, isWritable: false },
      { pubkey: settingsAccount, isSigner: false, isWritable: false },
      { pubkey: treasuryShard, isSigner: false, isWritable: true },
      { pubkey: authorFeeShard, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
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
