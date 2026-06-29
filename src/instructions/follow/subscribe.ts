import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { Instruction } from '../../constants/program'
import { TagOnlyInstr } from '../../codec/schemas'
import { deriveFollowRegistryPda, deriveFollowerShardPda, deriveThreadPda, followerShardIndex } from '../pda'
import { readonlyMeta, signerMeta, writableMeta } from '../meta'

/**
 * Options shared by {@link buildSubscribeInstruction} and
 * {@link buildUnsubscribeInstruction}.
 */
export type FollowOptions = {
  /** The deployed Txtcel program address. */
  programId: PublicKey
  /** The wallet following / unfollowing; signs and pays any rent. */
  user: PublicKey
  /** The target channel's 32-byte identity. */
  seed: Uint8Array
}

/**
 * Shared assembler for the follow/unfollow instructions: both touch the same
 * three accounts (the user's `FollowRegistry`, the channel's per-wallet
 * `FollowerShard` counter, and the thread) and carry only a tag, differing
 * solely in the instruction discriminator.
 *
 * @param tag - The instruction variant index (`Subscribe` or `Unsubscribe`).
 * @param opts - See {@link FollowOptions}.
 * @returns The assembled `TransactionInstruction`.
 */
function buildFollowInstruction(tag: number, opts: FollowOptions) {
  const { programId, user, seed } = opts

  const threadAccount = deriveThreadPda(programId, seed)
  const followRegistry = deriveFollowRegistryPda(programId, user)
  const followerShard = deriveFollowerShardPda(programId, seed, followerShardIndex(user))

  return new TransactionInstruction({
    programId,
    keys: [
      signerMeta(user),
      writableMeta(followRegistry),
      writableMeta(followerShard),
      readonlyMeta(threadAccount),
      readonlyMeta(SystemProgram.programId),
    ],
    data: Buffer.from(TagOnlyInstr.serialize({ tag })),
  })
}

/**
 * Builds a `Subscribe` instruction that follows a channel for `user`.
 *
 * Adds the channel to the user's `FollowRegistry` and increments the channel's
 * follower shard counter. There is no fee; the user only pays registry/shard
 * rent.
 *
 * @param opts - See {@link FollowOptions}.
 * @returns The assembled `TransactionInstruction`.
 */
export function buildSubscribeInstruction(opts: FollowOptions) {
  return buildFollowInstruction(Instruction.Subscribe, opts)
}

/**
 * Builds an `Unsubscribe` instruction that unfollows a channel for `user`.
 *
 * Removes the channel from the user's `FollowRegistry`, decrements the
 * follower shard counter, and refunds the freed registry rent.
 *
 * @param opts - See {@link FollowOptions}.
 * @returns The assembled `TransactionInstruction`.
 */
export function buildUnsubscribeInstruction(opts: FollowOptions) {
  return buildFollowInstruction(Instruction.Unsubscribe, opts)
}
