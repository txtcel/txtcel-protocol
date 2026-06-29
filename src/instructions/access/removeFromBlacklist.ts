import { PublicKey } from '@solana/web3.js'
import { Instruction } from '../../constants/program'
import { buildAclEntryInstruction } from './acl'

/**
 * Builds a `RemoveFromBlacklist` instruction that lifts a wallet's ban on a
 * channel. Thread-admin-only.
 *
 * @param programId - The deployed Txtcel program address.
 * @param authority - The thread admin; signs the change.
 * @param seed - The owning thread's 32-byte identity.
 * @param wallet - The wallet to remove from the blacklist.
 * @returns The assembled `TransactionInstruction`.
 */
export function buildRemoveFromBlacklistInstruction(
  programId: PublicKey,
  authority: PublicKey,
  seed: Uint8Array,
  wallet: PublicKey,
) {
  return buildAclEntryInstruction(Instruction.RemoveFromBlacklist, programId, authority, seed, wallet)
}
