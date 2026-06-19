import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { Instruction } from '../constants/program'
import { AppendContentInstr } from '../codec/schemas'

export function buildAppendContentInstruction(
  programId: PublicKey,
  payer: PublicKey,
  contentAccount: PublicKey,
  threadAccount: PublicKey,
  settingsAccount: PublicKey,
  treasuryShard: PublicKey,
  authorFeeShard: PublicKey,
  chunk: Uint8Array,
  treasuryShardIdx: number,
  authorFeeShardIdx: number,
) {
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: contentAccount, isSigner: false, isWritable: true },
      { pubkey: threadAccount, isSigner: false, isWritable: false },
      { pubkey: settingsAccount, isSigner: false, isWritable: false },
      { pubkey: treasuryShard, isSigner: false, isWritable: true },
      { pubkey: authorFeeShard, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(AppendContentInstr.serialize({
      tag: Instruction.AppendContent,
      chunk,
      treasuryShardIdx,
      authorFeeShardIdx,
    })),
  })
}
