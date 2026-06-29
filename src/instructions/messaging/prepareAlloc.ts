import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { Instruction } from '../../constants/program'
import { PrepareAllocInstr } from '../../codec/schemas'
import { deriveAllocPda, deriveThreadPda } from '../pda'
import { readonlyMeta, signerMeta, writableMeta } from '../meta'

/**
 * Builds a `PrepareAlloc` instruction that links a new alloc page onto the
 * chain by pre-creating `allocSeq + 1` and pointing the current page at it.
 *
 * This is the only instruction that grows the alloc chain (`fill_slot` is
 * element-only), so it is co-bundled with a fill when a page crosses the
 * extend threshold. The thread account is writable here because its
 * `lastAllocSeq` / link bookkeeping is updated.
 *
 * @param programId - The deployed Txtcel program address.
 * @param payer - Fee payer; signs and funds the new alloc's rent.
 * @param seed - The owning thread's 32-byte identity.
 * @param allocSeq - The current (last) alloc sequence; the new page is `allocSeq + 1`.
 * @returns The assembled `TransactionInstruction`.
 */
export function buildPrepareAllocInstruction(
  programId: PublicKey,
  payer: PublicKey,
  seed: Uint8Array,
  allocSeq: number,
) {
  const currentAllocPda = deriveAllocPda(programId, seed, allocSeq)
  const newAllocPda = deriveAllocPda(programId, seed, allocSeq + 1)
  const threadAccount = deriveThreadPda(programId, seed)

  return new TransactionInstruction({
    programId,
    keys: [
      signerMeta(payer),
      writableMeta(currentAllocPda),
      writableMeta(newAllocPda),
      writableMeta(threadAccount),
      readonlyMeta(SystemProgram.programId),
    ],
    data: Buffer.from(PrepareAllocInstr.serialize({
      tag: Instruction.PrepareAlloc,
      allocSeq,
    })),
  })
}
