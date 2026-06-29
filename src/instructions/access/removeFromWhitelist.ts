import { PublicKey } from '@solana/web3.js'
import { Instruction } from '../../constants/program'
import { buildAclEntryInstruction } from './acl'

/**
 * Builds a `RemoveFromWhitelist` instruction that revokes a wallet's posting
 * access to a gated channel. Thread-admin-only.
 *
 * @param programId - The deployed Txtcel program address.
 * @param authority - The thread admin; signs the change.
 * @param seed - The owning thread's 32-byte identity.
 * @param wallet - The wallet to remove from the whitelist.
 * @returns The assembled `TransactionInstruction`.
 */
export function buildRemoveFromWhitelistInstruction(
  programId: PublicKey,
  authority: PublicKey,
  seed: Uint8Array,
  wallet: PublicKey,
) {
  return buildAclEntryInstruction(Instruction.RemoveFromWhitelist, programId, authority, seed, wallet)
}
