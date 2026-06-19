import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js'
import {
  CONTENT_SLOTS,
  DESIRED_CANDIDATES,
  EXTEND_THRESHOLD,
  MAX_BODY_LEN,
  TX_POLL_INTERVAL_MS,
  TX_POLL_TIMEOUT_MS,
} from '../constants/program'
import {
  deriveAllocPda,
  deriveAuthorFeePda,
  deriveContentPda,
  deriveSettingsPda,
  deriveThreadPda,
  deriveTreasuryShardPda,
  randomAuthorFeeShard,
  randomTreasuryShard,
} from './pda'
import { loadAllocNode, loadProgramSettings, loadThreadNode } from './loaders'
import { buildCreateRootAllocInstruction } from './createRootAlloc'
import { buildFillSlotInstruction } from './fillSlot'
import { buildAppendContentInstruction } from './appendContent'

export type WalletSigner = {
  publicKey: PublicKey
  signTransaction: (tx: Transaction) => Promise<Transaction>
}

function ensureTextBytes(text: string) {
  const bytes = new TextEncoder().encode(text)

  if (bytes.length === 0) {
    throw new Error('Text must not be empty')
  }

  if (bytes.length > MAX_BODY_LEN) {
    throw new Error(`Body is too long (max ${MAX_BODY_LEN} bytes)`)
  }

  return bytes
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr]

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }

  return result
}

type Candidate = { pda: PublicKey; allocSeq: number; slot: number }

const TX_SIZE_LIMIT = 1232
const TX_OVERHEAD = 1 + 64 + 3 + 32 // sig_count + signature + header + blockhash
const FILL_SLOT_FIXED_OVERHEAD = 1 + 2 + 4 + 4 + 1 + 2 + 1 + 4 + 1 + 8 // instruction data excluding text and candidates (tag + kind u16 + body_len + candidates_len + extend + shards + reply + max_fee u64)
const CANDIDATE_SIZE = 4 + 1 // allocSeq + slot in instruction data
const ACCOUNT_KEY_SIZE = 32
const FILL_SLOT_BASE_ACCOUNTS = 6 // payer, thread, settings, treasury, author_fee, system
const FILL_SLOT_ACCESS_ACCOUNTS = 2 // access + per-wallet entry (mandatory)
const CONTENT_NODE_FIXED_SIZE = 89 // ContentNode size excluding body bytes: header (1+4+1+32+32+8+4+1=83) + kind u16 (2) + Vec len prefix (4)
const MAX_FEE_SLIPPAGE_NUM = 2n // tolerate up to 2x the expected fee
const APPEND_INSTR_ACCOUNTS = 7 // payer, content, thread, settings, treasury, author_fee, system
const APPEND_TX_OVERHEAD =
  TX_OVERHEAD
  + 1 + (APPEND_INSTR_ACCOUNTS + 1) * ACCOUNT_KEY_SIZE // compact(keys) + keys (+ program ID)
  + 1                                                   // compact(num_instructions)
  + 1                                                   // program_id_index
  + 1 + APPEND_INSTR_ACCOUNTS                           // compact(accounts) + account indices
  + 2                                                   // compact(data_len)
  + 1 + 4 + 2 + 1                                      // tag + chunk_len u32 + treasury_shard_idx u16 + author_fee_shard_idx u8

function estimateFillSlotTxSize(nCandidates: number, hasExtend: boolean, textLen: number): number {
  const nAccounts = FILL_SLOT_BASE_ACCOUNTS + nCandidates + FILL_SLOT_ACCESS_ACCOUNTS + (hasExtend ? 2 : 0)
  const accountsSize = 1 + (nAccounts + 1) * ACCOUNT_KEY_SIZE // +1 for program ID key
  const instrDataSize = FILL_SLOT_FIXED_OVERHEAD + textLen + nCandidates * CANDIDATE_SIZE
  const instrOverhead = 1 + 1 + 1 + nAccounts + 2 // program idx + accounts compact + data compact
  return TX_OVERHEAD + accountsSize + instrOverhead + instrDataSize
}

function maxFillSlotTextLen(nCandidates: number, hasExtend: boolean): number {
  const withoutText = estimateFillSlotTxSize(nCandidates, hasExtend, 0)
  return TX_SIZE_LIMIT - withoutText
}

function maxAppendChunkLen(): number {
  return TX_SIZE_LIMIT - APPEND_TX_OVERHEAD
}

export async function buildSendMessageTransactions(
  connection: Connection,
  programId: PublicKey,
  payerKey: PublicKey,
  seed: Uint8Array,
  text: string,
  replyTo?: { allocSeq: number; slot: number } | null,
): Promise<Transaction[]> {
  const textBytes = ensureTextBytes(text)
  const threadPda = deriveThreadPda(programId, seed)
  const thread = await loadThreadNode(connection, programId, threadPda)
  const lastAllocSeq = thread.lastAllocSeq

  const lastAllocPda = deriveAllocPda(programId, seed, lastAllocSeq)
  const lastAlloc = await loadAllocNode(connection, programId, lastAllocPda)

  const lastAllocCandidates: Candidate[] = Array.from({ length: CONTENT_SLOTS }, (_, slot) => ({
    pda: deriveContentPda(programId, seed, lastAllocSeq, slot),
    allocSeq: lastAllocSeq,
    slot,
  }))

  const lastInfos = await connection.getMultipleAccountsInfo(
    lastAllocCandidates.map(c => c.pda),
  )
  const freeInLast = lastAllocCandidates.filter((_, i) => lastInfos[i] === null)

  let freeInNext: Candidate[] = []

  if (freeInLast.length < DESIRED_CANDIDATES && lastAlloc.nextAllocSeq !== null) {
    const nextSeq = lastAlloc.nextAllocSeq
    const nextAllocCandidates: Candidate[] = Array.from({ length: CONTENT_SLOTS }, (_, slot) => ({
      pda: deriveContentPda(programId, seed, nextSeq, slot),
      allocSeq: nextSeq,
      slot,
    }))
    const nextInfos = await connection.getMultipleAccountsInfo(
      nextAllocCandidates.map(c => c.pda),
    )
    freeInNext = nextAllocCandidates.filter((_, i) => nextInfos[i] === null)
  }

  const allFree = [...freeInLast, ...freeInNext]
  if (allFree.length === 0) throw new Error('No free slots in thread')
  const selected = shuffle(allFree).slice(0, DESIRED_CANDIDATES)

  const treasuryShardIdx = randomTreasuryShard()
  const authorFeeShardIdx = randomAuthorFeeShard()

  const filledInLast = CONTENT_SLOTS - freeInLast.length
  let extendInfo: { currentAllocPda: PublicKey; newAllocPda: PublicKey } | undefined

  if (filledInLast >= EXTEND_THRESHOLD && lastAlloc.nextAllocSeq === null) {
    extendInfo = {
      currentAllocPda: lastAllocPda,
      newAllocPda: deriveAllocPda(programId, seed, lastAllocSeq + 1),
    }
  }

  const maxFirst = maxFillSlotTextLen(selected.length, !!extendInfo)
  const firstChunkLen = Math.min(textBytes.length, maxFirst)
  const firstChunk = textBytes.subarray(0, firstChunkLen)

  // Slippage protection: cap the protocol + author fee the program may charge
  // for this content slot so the author/admin cannot front-run a fee hike.
  const settings = await loadProgramSettings(connection, programId)
  const baseFeeBps = BigInt(settings?.baseFeeBps ?? 1000)
  const messageFee = payerKey.toBase58() === thread.author ? 0n : thread.messageFee
  const contentRent = BigInt(
    await connection.getMinimumBalanceForRentExemption(CONTENT_NODE_FIXED_SIZE + firstChunkLen, 'confirmed'),
  )
  // Base fee is a percentage of rent (admin-set, can change → apply slippage);
  // the message fee is a fixed per-chat amount set by the owner.
  const baseFee = (contentRent * baseFeeBps) / 10_000n
  const maxFee = baseFee * MAX_FEE_SLIPPAGE_NUM + messageFee + 1n

  const fillSlotIx = buildFillSlotInstruction({
    programId,
    payer: payerKey,
    seed,
    candidates: selected,
    treasuryShardIdx,
    authorFeeShardIdx,
    bodyBytes: firstChunk,
    maxFee,
    extendInfo,
    replyAllocSeq: replyTo?.allocSeq ?? null,
    replySlot: replyTo?.slot ?? null,
  })

  const transactions: Transaction[] = [new Transaction().add(fillSlotIx)]

  if (firstChunkLen < textBytes.length) {
    const remaining = textBytes.subarray(firstChunkLen)
    const appendMax = maxAppendChunkLen()
    const contentPda = selected[0].pda
    const threadPda = deriveThreadPda(programId, seed)
    const settingsPda = deriveSettingsPda(programId)
    const treasuryShardPda = deriveTreasuryShardPda(programId, treasuryShardIdx)
    const authorFeeShardPda = deriveAuthorFeePda(programId, seed, authorFeeShardIdx)

    for (let offset = 0; offset < remaining.length; offset += appendMax) {
      const chunk = remaining.subarray(offset, offset + appendMax)
      const appendIx = buildAppendContentInstruction(
        programId, payerKey, contentPda,
        threadPda, settingsPda, treasuryShardPda, authorFeeShardPda,
        chunk, treasuryShardIdx, authorFeeShardIdx,
      )
      transactions.push(new Transaction().add(appendIx))
    }
  }

  return transactions
}

/** @deprecated Use buildSendMessageTransactions for chunked support */
export async function buildSendMessageTransaction(
  connection: Connection,
  programId: PublicKey,
  payerKey: PublicKey,
  seed: Uint8Array,
  text: string,
  replyTo?: { allocSeq: number; slot: number } | null,
): Promise<Transaction> {
  const txs = await buildSendMessageTransactions(connection, programId, payerKey, seed, text, replyTo)
  return txs[0]
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

async function pollConfirmation(
  connection: Connection,
  signature: string,
  timeoutMs = TX_POLL_TIMEOUT_MS,
  intervalMs = TX_POLL_INTERVAL_MS,
): Promise<void> {
  const start = Date.now()

  while (Date.now() - start < timeoutMs) {
    const { value } = await connection.getSignatureStatuses([signature])
    const status = value?.[0]

    if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') {
      if (status.err) throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`)
      return
    }

    await sleep(intervalMs)
  }

  throw new Error(`Transaction confirmation timeout after ${timeoutMs / 1000}s`)
}

async function sendWithWallet(
  connection: Connection,
  wallet: WalletSigner,
  transaction: Transaction,
  signers: Keypair[],
  onSent?: () => void,
) {
  const { blockhash } = await connection.getLatestBlockhash('confirmed')
  transaction.recentBlockhash = blockhash
  transaction.feePayer = wallet.publicKey

  if (signers.length > 0) {
    transaction.partialSign(...signers)
  }

  const signed = await wallet.signTransaction(transaction)
  const signature = await connection.sendRawTransaction(signed.serialize())
  onSent?.()
  await pollConfirmation(connection, signature)
  return signature
}

export async function createRootAlloc(
  connection: Connection,
  programId: string,
  payer: Keypair,
  messageFee: bigint = 0n,
  title: string = '',
  onSent?: () => void,
): Promise<{ signature: string; seed: Uint8Array; threadPda: string; allocPda: string }> {
  const programKey = new PublicKey(programId)
  // The thread is a fresh full-address account; its keypair co-signs creation.
  const threadKeypair = Keypair.generate()
  const seed = threadKeypair.publicKey.toBytes()

  const instruction = buildCreateRootAllocInstruction(programKey, payer.publicKey, seed, messageFee, title)
  const transaction = new Transaction().add(instruction)
  transaction.feePayer = payer.publicKey
  onSent?.()
  const signature = await sendAndConfirmTransaction(connection, transaction, [payer, threadKeypair], {
    commitment: 'confirmed',
  })

  return {
    signature,
    seed,
    threadPda: deriveThreadPda(programKey, seed).toBase58(),
    allocPda: deriveAllocPda(programKey, seed, 0).toBase58(),
  }
}

export async function createRootAllocWithWallet(
  connection: Connection,
  programId: string,
  wallet: WalletSigner,
  messageFee: bigint = 0n,
  title: string = '',
  onSent?: () => void,
): Promise<{ signature: string; seed: Uint8Array; threadPda: string; allocPda: string }> {
  if (!wallet.publicKey) throw new Error('Wallet not connected')
  const programKey = new PublicKey(programId)
  // The thread is a fresh full-address account; its keypair co-signs creation
  // alongside the wallet (the wallet is fee payer, the thread keypair is an
  // extra signer).
  const threadKeypair = Keypair.generate()
  const seed = threadKeypair.publicKey.toBytes()

  const instruction = buildCreateRootAllocInstruction(programKey, wallet.publicKey, seed, messageFee, title)
  const transaction = new Transaction().add(instruction)
  const signature = await sendWithWallet(connection, wallet, transaction, [threadKeypair], onSent)

  return {
    signature,
    seed,
    threadPda: deriveThreadPda(programKey, seed).toBase58(),
    allocPda: deriveAllocPda(programKey, seed, 0).toBase58(),
  }
}
