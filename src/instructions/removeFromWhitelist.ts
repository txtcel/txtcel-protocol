import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { Instruction } from '../constants/program'
import { WalletArgInstr } from '../codec/schemas'
import { deriveAccessEntryPda, deriveAccessPda } from './pda'

export function buildRemoveFromWhitelistInstruction(
  programId: PublicKey,
  authority: PublicKey,
  seed: Uint8Array,
  wallet: PublicKey,
) {
  const accessAccount = deriveAccessPda(programId, seed)
  const entryAccount = deriveAccessEntryPda(programId, seed, wallet)

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: accessAccount, isSigner: false, isWritable: true },
      { pubkey: entryAccount, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(WalletArgInstr.serialize({
      tag: Instruction.RemoveFromWhitelist,
      wallet: wallet.toBytes(),
    })),
  })
}
