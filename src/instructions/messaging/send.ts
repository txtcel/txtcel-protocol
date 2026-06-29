import {
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js'
import type { Connection } from '@solana/web3.js'
import { deriveAllocPda, deriveThreadPda } from '../pda'
import { buildCreateRootAllocInstruction } from './createRootAlloc'
import { buildExtendAllocTransaction, buildSendMessageTransactions } from './messageBuilders'
import type { WalletSigner } from './wallet'
import { pollConfirmation, sendWithWallet, signAllWithWallet } from './wallet'

/**
 * Posts a message with a wallet, batching the wallet approval. It builds the
 * POST transactions ({@link buildSendMessageTransactions}: a `fill_slot` plus
 * any `append_content` chunks) and the best-effort extend transaction
 * ({@link buildExtendAllocTransaction}), then signs them ALL in a single
 * `signAllTransactions` approval (falling back to per-tx `signTransaction`).
 *
 * The transactions are sent as INDEPENDENT transactions: the `fill_slot` is
 * sent and confirmed first (it creates the content node), then each
 * `append_content` chunk in order (they reference that node). The extend
 * transaction is fired best-effort AFTER the post — its send/confirm failure is
 * caught and ignored (e.g. `InvalidAllocSeq` when another sender already
 * extended), so it can never fail the post.
 *
 * @param connection - RPC connection.
 * @param programId - The deployed Txtcel program address.
 * @param wallet - The wallet-adapter-style signer / fee payer / author.
 * @param seed - The target thread's 32-byte identity.
 * @param text - The message text (UTF-8).
 * @param replyTo - Optional `{ allocSeq, slot }` to thread this as a reply.
 * @param onSent - Optional callback fired right after the first post submission.
 * @returns The confirmed post signatures and the extend signature (or `null`).
 * @throws `'Wallet not connected'`, `'Text must not be empty'` or `'Body is too long'`.
 */
export async function sendMessageWithWallet(
  connection: Connection,
  programId: PublicKey,
  wallet: WalletSigner,
  seed: Uint8Array,
  text: string,
  replyTo?: { allocSeq: number; slot: number } | null,
  onSent?: () => void,
): Promise<{ signatures: string[]; extendSignature: string | null }> {
  if (!wallet.publicKey) throw new Error('Wallet not connected')

  const postTxs = await buildSendMessageTransactions(connection, programId, wallet.publicKey, seed, text, replyTo)
  const extendTx = await buildExtendAllocTransaction(connection, programId, wallet.publicKey, seed)

  // Single wallet approval for the whole batch: share one blockhash/payer and
  // sign post txs + the best-effort extend together.
  const { blockhash } = await connection.getLatestBlockhash('confirmed')
  const batch = extendTx ? [...postTxs, extendTx] : [...postTxs]
  for (const tx of batch) {
    tx.recentBlockhash = blockhash
    tx.feePayer = wallet.publicKey
  }

  const signed = await signAllWithWallet(wallet, batch)
  const signedPost = signed.slice(0, postTxs.length)
  const signedExtend = extendTx ? signed[postTxs.length] : null

  // Post is required. Send + confirm fill first, then append chunks in order.
  const signatures: string[] = []
  for (let index = 0; index < signedPost.length; index++) {
    const signature = await connection.sendRawTransaction(signedPost[index].serialize())
    signatures.push(signature)
    if (index === 0) onSent?.()
    await pollConfirmation(connection, signature)
  }

  // Extend is best-effort: never let its failure affect the post.
  let extendSignature: string | null = null
  if (signedExtend) {
    try {
      extendSignature = await connection.sendRawTransaction(signedExtend.serialize())
    } catch {
      extendSignature = null
    }
  }

  return { signatures, extendSignature }
}

/**
 * Creates a new channel (thread) + root alloc and confirms it, using a local
 * `Keypair` as fee payer. A fresh thread keypair is generated internally and
 * co-signs creation; its pubkey becomes the channel `seed`.
 *
 * @param connection - RPC connection.
 * @param programId - The deployed Txtcel program address (base58 string).
 * @param payer - Local fee payer keypair.
 * @param messageFee - Per-message author fee in lamports (default `0n`).
 * @param title - Channel title (≤ `MAX_TITLE_LEN` bytes, default `''`).
 * @param onSent - Optional callback fired right after submission.
 * @returns The signature plus the new channel's `seed`, `threadPda` and `allocPda`.
 */
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

/**
 * Same as {@link createRootAlloc} but for a wallet-adapter-style signer. The
 * wallet is the fee payer; the generated thread keypair is an extra co-signer.
 *
 * @param connection - RPC connection.
 * @param programId - The deployed Txtcel program address (base58 string).
 * @param wallet - The wallet-adapter-style signer / fee payer.
 * @param messageFee - Per-message author fee in lamports (default `0n`).
 * @param title - Channel title (≤ `MAX_TITLE_LEN` bytes, default `''`).
 * @param onSent - Optional callback fired right after submission.
 * @returns The signature plus the new channel's `seed`, `threadPda` and `allocPda`.
 * @throws `'Wallet not connected'` if the wallet has no public key.
 */
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
