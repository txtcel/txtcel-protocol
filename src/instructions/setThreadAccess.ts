import { PublicKey, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { Instruction } from '../constants/program'
import { SetThreadAccessInstr } from '../codec/schemas'

export function buildSetThreadAccessInstruction(
  programId: PublicKey,
  authority: PublicKey,
  accessAccount: PublicKey,
  enabled: boolean,
) {
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: accessAccount, isSigner: false, isWritable: true },
    ],
    data: Buffer.from(SetThreadAccessInstr.serialize({
      tag: Instruction.SetThreadAccess,
      enabled: enabled ? 1 : 0,
    })),
  })
}
