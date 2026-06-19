import { PublicKey, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { Instruction } from '../constants/program'
import { WalletArgInstr } from '../codec/schemas'
import { deriveSettingsPda } from './pda'

export function buildSetAdminInstruction(
  programId: PublicKey,
  authority: PublicKey,
  newAdmin: PublicKey,
) {
  const settingsAccount = deriveSettingsPda(programId)
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: settingsAccount, isSigner: false, isWritable: true },
    ],
    data: Buffer.from(WalletArgInstr.serialize({
      tag: Instruction.SetAdmin,
      wallet: newAdmin.toBytes(),
    })),
  })
}
