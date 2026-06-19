import { PublicKey, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { Instruction } from '../constants/program'
import { FeeU64Instr } from '../codec/schemas'

export function buildSetMessageFeeInstruction(
  programId: PublicKey,
  authority: PublicKey,
  threadAccount: PublicKey,
  fee: bigint,
) {
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: threadAccount, isSigner: false, isWritable: true },
    ],
    data: Buffer.from(FeeU64Instr.serialize({ tag: Instruction.SetMessageFee, fee })),
  })
}
