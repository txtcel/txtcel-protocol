import { PublicKey, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { Instruction } from '../../constants/program'
import { TreasuryArgInstr } from '../../codec/schemas'
import { deriveSettingsPda } from '../pda'
import { signerMeta, writableMeta } from '../meta'

/**
 * Builds a `SetTreasury` instruction that updates the global treasury wallet in
 * settings. Admin-only; the program verifies `authority` equals `settings.admin`.
 *
 * @param programId - The deployed Txtcel program address.
 * @param authority - The current admin; signs the change.
 * @param treasury - The new treasury wallet.
 * @returns The assembled `TransactionInstruction`.
 */
export function buildSetTreasuryInstruction(
  programId: PublicKey,
  authority: PublicKey,
  treasury: PublicKey,
) {
  const settingsAccount = deriveSettingsPda(programId)
  return new TransactionInstruction({
    programId,
    keys: [
      signerMeta(authority),
      writableMeta(settingsAccount),
    ],
    data: Buffer.from(TreasuryArgInstr.serialize({
      tag: Instruction.SetTreasury,
      treasury: treasury.toBytes(),
    })),
  })
}
