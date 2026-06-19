import { INDEX_NONE, TAG_ALLOC } from '../constants/program'
import type { AllocNodeData } from '../types/program'
import { AllocNodeSchema } from './schemas'

export function decodeAlloc(pubkey: string, data: Uint8Array): AllocNodeData {
  const raw = AllocNodeSchema.deserialize(data)
  if (raw.tag !== TAG_ALLOC) throw new Error('Invalid AllocNode tag')

  return {
    pubkey,
    seed: raw.thread,
    allocSeq: raw.allocSeq,
    upperAllocSeq: raw.upperAllocSeq === INDEX_NONE ? null : raw.upperAllocSeq,
    nextAllocSeq: raw.nextAllocSeq === INDEX_NONE ? null : raw.nextAllocSeq,
  }
}
