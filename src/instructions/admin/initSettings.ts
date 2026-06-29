import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { Instruction } from '../../constants/program'
import { TreasuryArgInstr } from '../../codec/schemas'
import { deriveProgramDataPda, deriveSettingsPda } from '../pda'
import { readonlyMeta, signerMeta, writableMeta } from '../meta'

/**
 * Builds an `InitSettings` instruction that creates the global settings account
 * and records the initial treasury wallet.
 *
 * Only the program's upgrade authority may initialize settings: the BPF loader
 * ProgramData account (which stores that authority) is passed read-only so the
 * program can verify the signer. Run once per deployment.
 *
 * @param programId - The deployed Txtcel program address.
 * @param authority - The program's upgrade authority; signs and funds settings rent.
 * @param treasury - Initial treasury wallet recorded in settings.
 * @returns The assembled `TransactionInstruction`.
 */
export function buildInitSettingsInstruction(
  programId: PublicKey,
  authority: PublicKey,
  treasury: PublicKey,
) {
  const programdataAccount = deriveProgramDataPda(programId)
  const settingsAccount = deriveSettingsPda(programId)

  return new TransactionInstruction({
    programId,
    keys: [
      signerMeta(authority),
      writableMeta(settingsAccount),
      readonlyMeta(programdataAccount),
      readonlyMeta(SystemProgram.programId),
    ],
    data: Buffer.from(TreasuryArgInstr.serialize({
      tag: Instruction.InitSettings,
      treasury: treasury.toBytes(),
    })),
  })
}
