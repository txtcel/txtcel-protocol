import { TAG_ALLOC } from '../constants/program'
import type { AllocNodeData } from '../types/program'
import { AllocNodeSchema } from './schemas'

/**
 * Decodes a raw alloc node account into {@link AllocNodeData}.
 *
 * Alloc nodes are addressed by the dense PDA sequence
 * `[ALLOC_SEED, thread, allocSeq]` for `allocSeq` in `0..=thread.lastAllocSeq`;
 * the node itself carries no forward/back links.
 *
 * @param pubkey - The account's base58 address (carried through onto the result).
 * @param data - The raw account data bytes.
 * @returns The decoded alloc node.
 * @throws If the tag byte is not `TAG_ALLOC`.
 */
export function decodeAlloc(pubkey: string, data: Uint8Array): AllocNodeData {
  const raw = AllocNodeSchema.deserialize(data)
  if (raw.tag !== TAG_ALLOC) throw new Error('Invalid AllocNode tag')

  return {
    pubkey,
    seed: raw.thread,
    allocSeq: raw.allocSeq,
  }
}
