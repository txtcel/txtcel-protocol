import { PublicKey } from '@solana/web3.js'
import { Instruction } from '../../constants/program'
import { buildAclEntryInstruction } from './acl'

/**
 * Builds an `AddToBlacklist` instruction that bans a wallet from a channel
 * (status `ACCESS_DENIED`). Thread-admin-only.
 *
 * @param programId - The deployed Txtcel program address.
 * @param authority - The thread admin; signs and funds entry-account rent.
 * @param seed - The owning thread's 32-byte identity.
 * @param wallet - The wallet to blacklist.
 * @returns The assembled `TransactionInstruction`.
 */
export function buildAddToBlacklistInstruction(
  programId: PublicKey,
  authority: PublicKey,
  seed: Uint8Array,
  wallet: PublicKey,
) {
  return buildAclEntryInstruction(Instruction.AddToBlacklist, programId, authority, seed, wallet)
}
