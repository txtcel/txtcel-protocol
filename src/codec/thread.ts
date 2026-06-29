import { PublicKey } from '@solana/web3.js'
import { TAG_THREAD } from '../constants/program'
import type { ThreadNodeData } from '../types/program'
import { ThreadNodeSchema, pubkeyToBase58 } from './schemas'

const textDecoder = new TextDecoder()

/**
 * Decodes a raw thread (channel) account into {@link ThreadNodeData}.
 *
 * The thread is a full-address account, so its identity (`seed`, the bytes
 * child PDAs derive from) is its own pubkey — reconstructed here from `pubkey`
 * rather than read from the data.
 *
 * @param pubkey - The account's base58 address (also the channel identity).
 * @param data - The raw account data bytes.
 * @returns The decoded thread node.
 * @throws If the tag byte is not `TAG_THREAD`.
 */
export function decodeThread(pubkey: string, data: Uint8Array): ThreadNodeData {
  const raw = ThreadNodeSchema.deserialize(data)
  if (raw.tag !== TAG_THREAD) throw new Error('Invalid ThreadNode tag')

  return {
    pubkey,
    // The thread is a full-address account: its identity (the value child PDAs
    // are derived from) is its own pubkey, so `seed` carries those bytes.
    seed: new PublicKey(pubkey).toBytes(),
    allocCount: raw.allocCount,
    lastAllocSeq: raw.lastAllocSeq,
    author: pubkeyToBase58(raw.author),
    messageFee: raw.messageFee,
    likeFee: raw.likeFee,
    title: textDecoder.decode(raw.title),
  }
}
