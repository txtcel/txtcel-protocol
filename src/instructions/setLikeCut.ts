import { PublicKey, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { Instruction } from '../constants/program'
import { FeeBpsInstr } from '../codec/schemas'
import { deriveSettingsPda } from './pda'

export function buildSetLikeCutInstruction(
  programId: PublicKey,
  authority: PublicKey,
  feeBps: number,
) {
  const settingsAccount = deriveSettingsPda(programId)
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: settingsAccount, isSigner: false, isWritable: true },
    ],
    data: Buffer.from(FeeBpsInstr.serialize({ tag: Instruction.SetLikeCut, feeBps })),
  })
}
