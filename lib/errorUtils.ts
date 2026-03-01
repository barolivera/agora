/**
 * Maps a raw error thrown by Arkiv SDK calls or wallet interactions
 * to a concise, user-friendly message.
 */
export function friendlyError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const msg = raw.toLowerCase();

  if (
    msg.includes('user rejected') ||
    msg.includes('user denied') ||
    msg.includes('rejected the request') ||
    msg.includes('transaction was rejected') ||
    msg.includes('action_rejected')
  ) {
    return 'Transaction cancelled.';
  }

  if (
    msg.includes('insufficient funds') ||
    msg.includes('insufficient balance') ||
    msg.includes('gas required exceeds') ||
    msg.includes('not enough eth')
  ) {
    return 'Not enough ETH for gas. Get testnet ETH at kaolin.hoodi.arkiv.network/faucet';
  }

  if (
    msg.includes('network') ||
    msg.includes('failed to fetch') ||
    msg.includes('econnrefused') ||
    msg.includes('timeout') ||
    msg.includes('fetch error')
  ) {
    return "Couldn't connect to Arkiv. Check your connection.";
  }

  return 'Something went wrong. Please try again.';
}
