import { PublicKey } from '@solana/web3.js'
import { Instruction } from '../../constants/program'
import { buildAclEntryInstruction } from './acl'

/**
 * Builds an `AddToFeeWhitelist` instruction that marks a wallet fee-exempt on a
 * channel (status `ACCESS_FEE_EXEMPT`): allowed to post AND exempt from the
 * per-message author fee. Thread-admin-only.
 *
 * @param programId - The deployed Txtcel program address.
 * @param authority - The thread admin; signs and funds entry-account rent.
 * @param seed - The owning thread's 32-byte identity.
 * @param wallet - The wallet to mark fee-exempt.
 * @returns The assembled `TransactionInstruction`.
 */
export function buildAddToFeeWhitelistInstruction(
  programId: PublicKey,
  authority: PublicKey,
  seed: Uint8Array,
  wallet: PublicKey,
) {
  return buildAclEntryInstruction(Instruction.AddToFeeWhitelist, programId, authority, seed, wallet)
}
