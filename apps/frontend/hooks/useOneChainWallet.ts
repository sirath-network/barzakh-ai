'use client';

import { useCurrentAccount, useSignAndExecuteTransaction } from '@onelabs/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { useCallback } from 'react';

/**
 * useOneChainWallet
 * 
 * Custom hook that exposes OneChain wallet functionality for authentication
 * and transaction operations.
 * 
 * Usage:
 *   const { account, isConnected, signMessage } = useOneChainWallet();
 */
export function useOneChainWallet() {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signAndExecute, isPending: isSigning } = useSignAndExecuteTransaction();

  const isConnected = !!currentAccount?.address;
  const address = currentAccount?.address || null;

  /**
   * Sign a message for authentication purposes
   */
  const signMessage = useCallback(
    async (message: string): Promise<{ signature: string; messageBytes: string }> => {
      if (!currentAccount?.address) {
        throw new Error('No wallet connected');
      }

      try {
        const messageBytes = new TextEncoder().encode(message);
        
        // Create a simple transaction that we'll use to get a signature
        // Note: We're using this to get a message signature for auth, not actual execution
        const tx = new Transaction();
        tx.pure.string(message);

        const result = await signAndExecute({
          transaction: tx,
          options: {
            showEffects: false,
            showObjectChanges: false,
          },
        });

        // Extract signature from result
        // The signature is in the execution result
        if (result && typeof result === 'object' && 'signature' in result) {
          return {
            signature: result.signature as string,
            messageBytes: Array.from(messageBytes).join(','),
          };
        }

        throw new Error('Failed to sign message');
      } catch (error) {
        console.error('Message signing failed:', error);
        throw error;
      }
    },
    [currentAccount?.address, signAndExecute]
  );

  /**
   * Execute a transaction on Sui
   */
  const executeTransaction = useCallback(
    async (transaction: Transaction) => {
      if (!isConnected) {
        throw new Error('Wallet not connected');
      }

      return signAndExecute({
        transaction,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });
    },
    [isConnected, signAndExecute]
  );

  return {
    currentAccount,
    account: currentAccount,
    address,
    isConnected,
    isSigning,
    signMessage,
    executeTransaction,
  };
}
