import type { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js'
import { TX_POLL_INTERVAL_MS, TX_POLL_TIMEOUT_MS } from '../../constants/program'

/**
 * Minimal wallet-adapter-style signer: just enough surface to set the fee payer
 * and sign a transaction, without depending on any wallet-adapter package.
 */
export type WalletSigner = {
  /** The wallet's public key (used as fee payer). */
  publicKey: PublicKey
  /** Signs a transaction and returns the signed copy. */
  signTransaction: (tx: Transaction) => Promise<Transaction>
  /**
   * Optional batch signer (wallet-adapter `signAllTransactions`). When present,
   * a group of related transactions (e.g. the post txs plus a best-effort
   * `prepare_alloc`) can be signed with a single wallet approval instead of one
   * prompt per transaction.
   */
  signAllTransactions?: (txs: Transaction[]) => Promise<Transaction[]>
}

/** Resolves after `ms` milliseconds. */
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/**
 * Polls a signature's status until it is confirmed/finalized or the timeout
 * elapses.
 *
 * @param connection - RPC connection.
 * @param signature - The transaction signature to poll.
 * @param timeoutMs - Overall timeout in ms (default `TX_POLL_TIMEOUT_MS`).
 * @param intervalMs - Delay between polls in ms (default `TX_POLL_INTERVAL_MS`).
 * @throws If the transaction errors on chain or confirmation times out.
 */
export async function pollConfirmation(
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

/**
 * Sets a fresh blockhash + fee payer, applies any extra local signers, then
 * signs with the wallet, submits, and waits for confirmation.
 *
 * @param connection - RPC connection.
 * @param wallet - The wallet-adapter-style signer / fee payer.
 * @param transaction - The transaction to send (mutated in place).
 * @param signers - Extra local keypairs that must co-sign (e.g. a new account).
 * @param onSent - Optional callback fired right after submission.
 * @returns The transaction signature once confirmed.
 */
export async function sendWithWallet(
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

/**
 * Signs a batch of transactions with a single wallet approval when the wallet
 * exposes `signAllTransactions`, otherwise falls back to one `signTransaction`
 * prompt per transaction.
 *
 * @param wallet - The wallet-adapter-style signer.
 * @param txs - The transactions to sign (must already have blockhash + payer).
 * @returns The signed transactions, in the same order.
 */
export async function signAllWithWallet(wallet: WalletSigner, txs: Transaction[]): Promise<Transaction[]> {
  if (wallet.signAllTransactions) {
    return wallet.signAllTransactions(txs)
  }

  const signed: Transaction[] = []
  for (const tx of txs) {
    signed.push(await wallet.signTransaction(tx))
  }
  return signed
}
