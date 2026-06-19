import { type Connection, type PublicKey } from '@solana/web3.js'
import { Buffer } from 'buffer'
import bs58 from 'bs58'
import {
  ACCESS_ALLOWED,
  ACCESS_DENIED,
  ACCESS_FEE_EXEMPT,
  TAG_ACCESS,
  TAG_ACCESS_ENTRY,
  TAG_ALLOC,
  TAG_CONTENT,
  TAG_LIKES,
  TAG_SETTINGS,
  TAG_THREAD,
} from '../constants/program'
import {
  decodeAccessEntry,
  decodeAlloc,
  decodeAllocLikes,
  decodeContent,
  decodeSettings,
  decodeThread,
  decodeThreadAccess,
} from '../codec'
import type {
  AccessEntryData,
  AllocLikesData,
  AllocNodeData,
  ContentNodeData,
  ProgramSettingsData,
  ThreadAccessData,
  ThreadNodeData,
} from '../types/program'
import { deriveSettingsPda } from './pda'

export async function loadThreadNode(
  connection: Connection,
  programId: PublicKey,
  pubkey: PublicKey,
): Promise<ThreadNodeData> {
  const info = await connection.getAccountInfo(pubkey, 'confirmed')
  if (!info) throw new Error('ThreadNode not found')
  if (!info.owner.equals(programId)) throw new Error('ThreadNode not owned by program')
  if (info.data.length === 0 || info.data[0] !== TAG_THREAD) throw new Error('Invalid ThreadNode data')
  return decodeThread(pubkey.toBase58(), info.data)
}

export async function loadAllocNode(
  connection: Connection,
  programId: PublicKey,
  pubkey: PublicKey,
): Promise<AllocNodeData> {
  const info = await connection.getAccountInfo(pubkey, 'confirmed')
  if (!info) throw new Error('AllocNode not found')
  if (!info.owner.equals(programId)) throw new Error('AllocNode not owned by program')
  if (info.data.length === 0 || info.data[0] !== TAG_ALLOC) throw new Error('Invalid AllocNode data')
  return decodeAlloc(pubkey.toBase58(), info.data)
}

export async function loadContentNode(
  connection: Connection,
  programId: PublicKey,
  pubkey: PublicKey,
): Promise<ContentNodeData> {
  const info = await connection.getAccountInfo(pubkey, 'confirmed')
  if (!info) throw new Error('ContentNode not found')
  if (!info.owner.equals(programId)) throw new Error('ContentNode not owned by program')
  if (info.data.length === 0 || info.data[0] !== TAG_CONTENT) throw new Error('Invalid ContentNode data')
  return decodeContent(pubkey.toBase58(), info.data)
}

export async function loadProgramSettings(
  connection: Connection,
  programId: PublicKey,
): Promise<ProgramSettingsData | null> {
  const settingsKey = deriveSettingsPda(programId)
  const info = await connection.getAccountInfo(settingsKey, 'confirmed')
  if (!info) return null
  if (!info.owner.equals(programId)) throw new Error('ProgramSettings not owned by program')
  if (info.data.length === 0 || info.data[0] !== TAG_SETTINGS) throw new Error('Invalid ProgramSettings data')
  return decodeSettings(settingsKey.toBase58(), info.data)
}

export async function loadThreadAccess(
  connection: Connection,
  programId: PublicKey,
  accessKey: PublicKey,
): Promise<ThreadAccessData> {
  const info = await connection.getAccountInfo(accessKey, 'confirmed')
  if (!info) throw new Error('ThreadAccess not found')
  if (!info.owner.equals(programId)) throw new Error('ThreadAccess not owned by program')
  if (info.data.length === 0 || info.data[0] !== TAG_ACCESS) throw new Error('Invalid ThreadAccess data')
  return decodeThreadAccess(accessKey.toBase58(), info.data)
}

export async function loadAllocLikes(
  connection: Connection,
  programId: PublicKey,
  pubkey: PublicKey,
): Promise<AllocLikesData | null> {
  const info = await connection.getAccountInfo(pubkey, 'confirmed')
  if (!info) return null
  if (!info.owner.equals(programId)) throw new Error('AllocLikes not owned by program')
  if (info.data.length === 0 || info.data[0] !== TAG_LIKES) throw new Error('Invalid AllocLikes data')
  return decodeAllocLikes(pubkey.toBase58(), info.data)
}

/**
 * Lists all AccessEntry PDAs for a thread (membership records). The on-chain
 * size limit was removed, so the whitelist/blacklist are now reconstructed for
 * the UI by scanning program accounts filtered by tag + seed.
 */
export async function loadAccessEntries(
  connection: Connection,
  programId: PublicKey,
  seed: Uint8Array,
): Promise<{ whitelist: string[]; blacklist: string[]; feeExempt: string[] }> {
  const accounts = await connection.getProgramAccounts(programId, {
    commitment: 'confirmed',
    filters: [
      { memcmp: { offset: 0, bytes: bs58.encode(Buffer.from([TAG_ACCESS_ENTRY])) } },
      { memcmp: { offset: 1, bytes: bs58.encode(Buffer.from(seed)) } },
    ],
  })

  const whitelist: string[] = []
  const blacklist: string[] = []
  const feeExempt: string[] = []

  for (const { account } of accounts) {
    if (account.data.length === 0 || account.data[0] !== TAG_ACCESS_ENTRY) continue
    const entry: AccessEntryData = decodeAccessEntry('', account.data)
    if (entry.status === ACCESS_ALLOWED) whitelist.push(entry.wallet)
    else if (entry.status === ACCESS_DENIED) blacklist.push(entry.wallet)
    else if (entry.status === ACCESS_FEE_EXEMPT) feeExempt.push(entry.wallet)
  }

  return { whitelist, blacklist, feeExempt }
}
