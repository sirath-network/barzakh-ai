/**
 * In-memory store for pending agent swap confirmations.
 * Entries auto-expire after 5 minutes.
 */

export interface PendingConfirmation {
  userId: string;
  args: any;
  rawResult: any;
  transactions: any[];
  createdAt: number;
  timeoutId: ReturnType<typeof setTimeout>;
}

const CONFIRMATION_TTL_MS = 5 * 60 * 1000; // 5 minutes

const globalForConfirmations = globalThis as unknown as {
  __pendingConfirmations?: Map<string, PendingConfirmation>;
};

const pendingConfirmations =
  globalForConfirmations.__pendingConfirmations ??
  (globalForConfirmations.__pendingConfirmations = new Map<string, PendingConfirmation>());

export function storePendingConfirmation(
  confirmationId: string,
  data: Omit<PendingConfirmation, 'createdAt' | 'timeoutId'>
): void {
  // Clean up any existing entry with same ID
  removePendingConfirmation(confirmationId);

  const timeoutId = setTimeout(() => {
    pendingConfirmations.delete(confirmationId);
    console.log(`[PendingConfirmations] Expired: ${confirmationId}`);
  }, CONFIRMATION_TTL_MS);

  pendingConfirmations.set(confirmationId, {
    ...data,
    createdAt: Date.now(),
    timeoutId,
  });

  console.log(`[PendingConfirmations] Stored: ${confirmationId} (expires in 5 min)`);
}

export function getPendingConfirmation(confirmationId: string): PendingConfirmation | undefined {
  return pendingConfirmations.get(confirmationId);
}

export function removePendingConfirmation(confirmationId: string): boolean {
  const entry = pendingConfirmations.get(confirmationId);
  if (entry) {
    clearTimeout(entry.timeoutId);
    pendingConfirmations.delete(confirmationId);
    return true;
  }
  return false;
}
