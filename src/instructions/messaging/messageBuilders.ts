import { Transaction } from '@solana/web3.js'
import type { Connection, PublicKey } from '@solana/web3.js'
import {
  CONTENT_SLOTS,
  DESIRED_CANDIDATES,
  EXTEND_THRESHOLD,
} from '../../constants/program'
import {
  deriveAuthorFeePda,
  deriveSettingsPda,
  deriveThreadPda,
  deriveTreasuryShardPda,
  randomAuthorFeeShard,
  randomTreasuryShard,
} from '../pda'
import { loadProgramSettings, loadThreadNode } from '../loaders'
import { buildFillSlotInstruction } from './fillSlot'
import { buildPrepareAllocInstruction } from './prepareAlloc'
import { buildAppendContentInstruction } from './appendContent'
import {
  CONTENT_NODE_FIXED_SIZE,
  MAX_FEE_SLIPPAGE_NUM,
  PREPARE_ALLOC_MARGINAL_SIZE,
} from '../../constants/tx-size'
import type { Candidate } from './candidates'
import {
  ensureTextBytes,
  maxAppendChunkLen,
  maxFillSlotTextLen,
  pageCandidates,
  shuffle,
} from './candidates'

/**
 * Builds the transaction(s) needed to post a message — the recommended way to
 * send. These are POST-ONLY transactions: a `FillSlot` transaction first,
 * followed by `AppendContent` transactions when the text is larger than one
 * transaction. They never co-bundle a `prepare_alloc`; growing the alloc chain
 * is the separate, best-effort {@link buildExtendAllocTransaction}.
 *
 * Candidate selection uses a rolling 2-page window: free slots are gathered
 * from BOTH the previous page (`N-1`, when it exists) and the tail page (`N`),
 * where `N = thread.lastAllocSeq`. This lets senders mop up leftover slots on
 * the previous page while the tail fills, fetched in a single
 * `getMultipleAccountsInfo`. From that pool we shuffle and pick up to
 * `DESIRED_CANDIDATES` to reduce write contention between concurrent senders.
 *
 * Liveness fallback: if the whole 2-page window is full (a rare burst), this
 * co-bundles `prepare_alloc(N)` BEFORE a `fill_slot` targeting page `N+1` as a
 * last resort, so a message can always be posted in one transaction.
 *
 * @param connection - RPC connection (used to read state and rent).
 * @param programId - The deployed Txtcel program address.
 * @param payerKey - The wallet posting the message (fee payer / author).
 * @param seed - The target thread's 32-byte identity.
 * @param text - The message text (UTF-8).
 * @param replyTo - Optional `{ allocSeq, slot }` to thread this as a reply.
 * @returns The ordered transactions to sign and send.
 * @throws `'Text must not be empty'` or `'Body is too long'`.
 */
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

  // Rolling 2-page window: the tail page `N` plus the previous page `N-1` (when
  // it exists). Leftover free slots on `N-1` are still fillable, so we let
  // senders consume them while the tail fills.
  const windowCandidates: Candidate[] =
    lastAllocSeq >= 1
      ? [...pageCandidates(programId, seed, lastAllocSeq - 1), ...pageCandidates(programId, seed, lastAllocSeq)]
      : pageCandidates(programId, seed, lastAllocSeq)

  const windowInfos = await connection.getMultipleAccountsInfo(windowCandidates.map(c => c.pda))
  const freeInWindow = windowCandidates.filter((_, i) => windowInfos[i] === null)

  const treasuryShardIdx = randomTreasuryShard()
  const authorFeeShardIdx = randomAuthorFeeShard()

  // Liveness fallback: the entire window is full (rare burst). Grow the chain
  // inline by co-bundling `prepare_alloc(N)` (which creates page `N+1`) before a
  // `fill_slot` whose candidates target the freshly created page `N+1`, so a
  // post is always possible. The normal path below never co-bundles.
  const extendInline = freeInWindow.length === 0

  const selected = extendInline
    ? pageCandidates(programId, seed, lastAllocSeq + 1).slice(0, DESIRED_CANDIDATES)
    : shuffle(freeInWindow).slice(0, DESIRED_CANDIDATES)

  // In the fallback, hold back room for the co-bundled `prepare_alloc`.
  const reserve = extendInline ? PREPARE_ALLOC_MARGINAL_SIZE : 0
  const maxFirst = maxFillSlotTextLen(selected.length, reserve)
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
    replyAllocSeq: replyTo?.allocSeq ?? null,
    replySlot: replyTo?.slot ?? null,
  })

  const firstTx = new Transaction()
  // Fallback only: `prepare_alloc(N)` must run BEFORE the fill so page `N+1`
  // exists by the time `fill_slot` writes into it.
  if (extendInline) {
    firstTx.add(buildPrepareAllocInstruction(programId, payerKey, seed, lastAllocSeq))
  }
  firstTx.add(fillSlotIx)

  const transactions: Transaction[] = [firstTx]

  if (firstChunkLen < textBytes.length) {
    const remaining = textBytes.subarray(firstChunkLen)
    const appendMax = maxAppendChunkLen()
    const contentPda = selected[0].pda
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

/**
 * Builds a best-effort `prepare_alloc(N)` transaction that grows the alloc
 * chain when the tail page `N = thread.lastAllocSeq` has crossed
 * `EXTEND_THRESHOLD` filled slots (`filled = CONTENT_SLOTS - freeOnPageN`),
 * else returns `null`.
 *
 * This is decoupled from posting: callers fire it best-effort alongside their
 * post and MUST ignore its failure. Because extending is racy, another sender
 * may have already created page `N+1`, in which case the on-chain program
 * rejects this with `InvalidAllocSeq` — that failure is expected and harmless.
 *
 * @param connection - RPC connection (used to read state).
 * @param programId - The deployed Txtcel program address.
 * @param payerKey - The wallet that funds the new page's rent (fee payer).
 * @param seed - The target thread's 32-byte identity.
 * @returns A `prepare_alloc(N)` transaction, or `null` when no extend is due.
 */
export async function buildExtendAllocTransaction(
  connection: Connection,
  programId: PublicKey,
  payerKey: PublicKey,
  seed: Uint8Array,
): Promise<Transaction | null> {
  const threadPda = deriveThreadPda(programId, seed)
  const thread = await loadThreadNode(connection, programId, threadPda)
  const lastAllocSeq = thread.lastAllocSeq

  const tailCandidates = pageCandidates(programId, seed, lastAllocSeq)
  const tailInfos = await connection.getMultipleAccountsInfo(tailCandidates.map(c => c.pda))
  const freeOnPageN = tailInfos.filter(info => info === null).length
  const filled = CONTENT_SLOTS - freeOnPageN

  if (filled < EXTEND_THRESHOLD) return null

  return new Transaction().add(buildPrepareAllocInstruction(programId, payerKey, seed, lastAllocSeq))
}

/**
 * Returns only the first (`FillSlot`) transaction for a message.
 *
 * @param connection - RPC connection.
 * @param programId - The deployed Txtcel program address.
 * @param payerKey - The wallet posting the message (fee payer / author).
 * @param seed - The target thread's 32-byte identity.
 * @param text - The message text (UTF-8).
 * @param replyTo - Optional `{ allocSeq, slot }` to thread this as a reply.
 * @returns The first transaction only.
 * @deprecated Use {@link buildSendMessageTransactions} for chunked support; this
 *   drops any `AppendContent` transactions needed for long messages.
 */
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
