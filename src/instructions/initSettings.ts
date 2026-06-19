import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { Instruction } from '../constants/program'
import { TreasuryArgInstr } from '../codec/schemas'
import { deriveSettingsPda } from './pda'

export function buildInitSettingsInstruction(
  programId: PublicKey,
  authority: PublicKey,
  treasury: PublicKey,
) {
  const BPF_LOADER_UPGRADEABLE_ID = new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111')
  const [programdataAccount] = PublicKey.findProgramAddressSync(
    [programId.toBytes()],
    BPF_LOADER_UPGRADEABLE_ID,
  )
  const settingsAccount = deriveSettingsPda(programId)

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: settingsAccount, isSigner: false, isWritable: true },
      { pubkey: programdataAccount, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(TreasuryArgInstr.serialize({
      tag: Instruction.InitSettings,
      treasury: treasury.toBytes(),
    })),
  })
}
