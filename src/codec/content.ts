import { INDEX_NONE, KIND_TEXT, TAG_CONTENT } from '../constants/program'
import type { ContentNodeData } from '../types/program'
import { ContentNodeSchema, formatTimestamp, pubkeyToBase58 } from './schemas'

const textDecoder = new TextDecoder()

export function decodeContent(pubkey: string, data: Uint8Array): ContentNodeData {
  const raw = ContentNodeSchema.deserialize(data)
  if (raw.tag !== TAG_CONTENT) throw new Error('Invalid ContentNode tag')

  const hasReply = raw.replyAllocSeq !== INDEX_NONE
  // `body` is opaque; text is the default kind. For unknown/future kinds we
  // still expose the raw bytes so callers can decode them however they need.
  return {
    pubkey,
    allocSeq: raw.allocSeq,
    slot: raw.slot,
    seed: raw.thread,
    author: pubkeyToBase58(raw.author),
    createdAt: formatTimestamp(raw.createdAt),
    replyAllocSeq: hasReply ? raw.replyAllocSeq : null,
    replySlot: hasReply ? raw.replySlot : null,
    contentKind: raw.kind,
    body: raw.body,
    text: raw.kind === KIND_TEXT ? textDecoder.decode(raw.body) : '',
  }
}
