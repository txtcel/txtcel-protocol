import { PublicKey, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { Instruction } from '../constants/program'
import { TreasuryArgInstr } from '../codec/schemas'
import { deriveSettingsPda } from './pda'

export function buildSetTreasuryInstruction(
  programId: PublicKey,
  authority: PublicKey,
  treasury: PublicKey,
) {
  const settingsAccount = deriveSettingsPda(programId)
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: settingsAccount, isSigner: false, isWritable: true },
    ],
    data: Buffer.from(TreasuryArgInstr.serialize({
      tag: Instruction.SetTreasury,
      treasury: treasury.toBytes(),
    })),
  })
}
