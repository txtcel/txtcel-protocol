import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { Instruction } from '../../constants/program'
import { AppendContentInstr } from '../../codec/schemas'
import { readonlyMeta, signerMeta, writableMeta } from '../meta'

/**
 * Builds an `AppendContent` instruction that appends a chunk of bytes to an
 * existing content (message) account, growing its body.
 *
 * Used to send messages larger than one transaction: the first chunk goes in
 * via `fill_slot`, the remainder via repeated `append_content` calls. All PDAs
 * are passed in pre-derived (the caller already resolved them for the matching
 * `fill_slot`) so the shard indices must match the accounts supplied.
 *
 * @param programId - The deployed Txtcel program address.
 * @param payer - Fee payer; signs and pays the incremental rent + fees.
 * @param contentAccount - The content (message) PDA being appended to.
 * @param threadAccount - The owning thread account (read-only).
 * @param settingsAccount - The global settings PDA (read-only; carries base fee).
 * @param treasuryShard - Treasury vault shard PDA matching `treasuryShardIdx`.
 * @param authorFeeShard - Author-fee vault shard PDA matching `authorFeeShardIdx`.
 * @param chunk - The bytes to append.
 * @param treasuryShardIdx - Index of `treasuryShard`, echoed in instruction data.
 * @param authorFeeShardIdx - Index of `authorFeeShard`, echoed in instruction data.
 * @returns The assembled `TransactionInstruction`.
 */
export function buildAppendContentInstruction(
  programId: PublicKey,
  payer: PublicKey,
  contentAccount: PublicKey,
  threadAccount: PublicKey,
  settingsAccount: PublicKey,
  treasuryShard: PublicKey,
  authorFeeShard: PublicKey,
  chunk: Uint8Array,
  treasuryShardIdx: number,
  authorFeeShardIdx: number,
) {
  return new TransactionInstruction({
    programId,
    keys: [
      signerMeta(payer),
      writableMeta(contentAccount),
      readonlyMeta(threadAccount),
      readonlyMeta(settingsAccount),
      writableMeta(treasuryShard),
      writableMeta(authorFeeShard),
      readonlyMeta(SystemProgram.programId),
    ],
    data: Buffer.from(AppendContentInstr.serialize({
      tag: Instruction.AppendContent,
      chunk,
      treasuryShardIdx,
      authorFeeShardIdx,
    })),
  })
}
