import { INDEX_NONE, KIND_TEXT, TAG_CONTENT } from '../constants/program'
import type { ContentNodeData } from '../types/program'
import { ContentNodeSchema, formatTimestamp, pubkeyToBase58 } from './schemas'

const textDecoder = new TextDecoder()

/**
 * Decodes a raw content (message) account into {@link ContentNodeData}.
 *
 * Reply links use `INDEX_NONE` as the on-chain "no reply" sentinel and are
 * surfaced here as `null`. `body` is opaque: text is exposed only for the
 * default {@link KIND_TEXT} kind, while the raw bytes are always returned so
 * callers can decode unknown/future kinds themselves.
 *
 * @param pubkey - The account's base58 address (carried through onto the result).
 * @param data - The raw account data bytes.
 * @returns The decoded content node.
 * @throws If the tag byte is not `TAG_CONTENT`.
 */
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
