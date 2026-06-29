import { PublicKey, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { Instruction } from '../../constants/program'
import { FeeU64Instr } from '../../codec/schemas'
import { signerMeta, writableMeta } from '../meta'

/**
 * Builds a `SetEntryFee` instruction that updates a gated channel's entry fee
 * on its `ThreadAccess` account. Thread-admin-only; the program verifies
 * `authority` equals the access account's admin.
 *
 * @param programId - The deployed Txtcel program address.
 * @param authority - The thread admin; signs the change.
 * @param accessAccount - The thread's `ThreadAccess` PDA whose entry fee is updated.
 * @param fee - The new entry fee in lamports.
 * @returns The assembled `TransactionInstruction`.
 */
export function buildSetEntryFeeInstruction(
  programId: PublicKey,
  authority: PublicKey,
  accessAccount: PublicKey,
  fee: bigint,
) {
  return new TransactionInstruction({
    programId,
    keys: [
      signerMeta(authority),
      writableMeta(accessAccount),
    ],
    data: Buffer.from(FeeU64Instr.serialize({ tag: Instruction.SetEntryFee, fee })),
  })
}
