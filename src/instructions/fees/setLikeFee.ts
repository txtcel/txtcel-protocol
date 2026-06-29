import { PublicKey, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { Instruction } from '../../constants/program'
import { FeeU64Instr } from '../../codec/schemas'
import { signerMeta, writableMeta } from '../meta'

/**
 * Builds a `SetLikeFee` instruction that updates a channel's per-like fee.
 * Thread-author-only; the program verifies `authority` equals the thread's
 * author.
 *
 * @param programId - The deployed Txtcel program address.
 * @param authority - The thread author; signs the change.
 * @param threadAccount - The thread account whose like fee is updated.
 * @param fee - The new per-like fee in lamports.
 * @returns The assembled `TransactionInstruction`.
 */
export function buildSetLikeFeeInstruction(
  programId: PublicKey,
  authority: PublicKey,
  threadAccount: PublicKey,
  fee: bigint,
) {
  return new TransactionInstruction({
    programId,
    keys: [
      signerMeta(authority),
      writableMeta(threadAccount),
    ],
    data: Buffer.from(FeeU64Instr.serialize({ tag: Instruction.SetLikeFee, fee })),
  })
}
