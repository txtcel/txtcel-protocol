import { PublicKey, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { Instruction } from '../../constants/program'
import { WalletArgInstr } from '../../codec/schemas'
import { deriveSettingsPda } from '../pda'
import { signerMeta, writableMeta } from '../meta'

/**
 * Builds a `SetAdmin` instruction that transfers the global admin role to a new
 * wallet. Admin-only; the program verifies `authority` equals `settings.admin`.
 *
 * @param programId - The deployed Txtcel program address.
 * @param authority - The current admin; signs the transfer.
 * @param newAdmin - The wallet to become the new admin.
 * @returns The assembled `TransactionInstruction`.
 */
export function buildSetAdminInstruction(
  programId: PublicKey,
  authority: PublicKey,
  newAdmin: PublicKey,
) {
  const settingsAccount = deriveSettingsPda(programId)
  return new TransactionInstruction({
    programId,
    keys: [
      signerMeta(authority),
      writableMeta(settingsAccount),
    ],
    data: Buffer.from(WalletArgInstr.serialize({
      tag: Instruction.SetAdmin,
      wallet: newAdmin.toBytes(),
    })),
  })
}
