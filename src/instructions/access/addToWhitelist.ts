import { PublicKey } from '@solana/web3.js'
import { Instruction } from '../../constants/program'
import { buildAclEntryInstruction } from './acl'

/**
 * Builds an `AddToWhitelist` instruction that grants a wallet posting access to
 * a gated channel (status `ACCESS_ALLOWED`). Thread-admin-only.
 *
 * @param programId - The deployed Txtcel program address.
 * @param authority - The thread admin; signs and funds entry-account rent.
 * @param seed - The owning thread's 32-byte identity.
 * @param wallet - The wallet to whitelist.
 * @returns The assembled `TransactionInstruction`.
 */
export function buildAddToWhitelistInstruction(
  programId: PublicKey,
  authority: PublicKey,
  seed: Uint8Array,
  wallet: PublicKey,
) {
  return buildAclEntryInstruction(Instruction.AddToWhitelist, programId, authority, seed, wallet)
}
