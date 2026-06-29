import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { WalletArgInstr } from '../../codec/schemas'
import { deriveAccessEntryPda, deriveAccessPda } from '../pda'
import { readonlyMeta, signerMeta, writableMeta } from '../meta'

/**
 * Shared assembler for the per-wallet access-list instructions (whitelist /
 * blacklist / fee-whitelist add & remove). They all touch the same accounts —
 * the thread's `ThreadAccess` PDA and the target wallet's `AccessEntry` PDA —
 * and carry the same `{ tag, wallet }` data, differing only in the instruction
 * discriminator. Internal: not part of the public API.
 *
 * @param tag - The instruction variant index (one of the ACL `Instruction.*`).
 * @param programId - The deployed Txtcel program address.
 * @param authority - The thread admin; signs and funds any entry-account rent.
 * @param seed - The owning thread's 32-byte identity.
 * @param wallet - The wallet whose access entry is created/updated.
 * @returns The assembled `TransactionInstruction`.
 */
export function buildAclEntryInstruction(
  tag: number,
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
      signerMeta(authority),
      writableMeta(accessAccount),
      writableMeta(entryAccount),
      readonlyMeta(SystemProgram.programId),
    ],
    data: Buffer.from(WalletArgInstr.serialize({
      tag,
      wallet: wallet.toBytes(),
    })),
  })
}
