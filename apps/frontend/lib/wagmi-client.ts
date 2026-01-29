'use client';

import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
    rabbyWallet,
    metaMaskWallet,
    baseAccount,
    walletConnectWallet,
    rainbowWallet,
    injectedWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { supportedChains, projectId } from './wagmi';

// Client-only connector setup
export const connectors = typeof window !== 'undefined' ? connectorsForWallets(
    [
        {
            groupName: 'Popular',
            wallets: [rabbyWallet, injectedWallet]
        },
        {
            groupName: 'Recommended',
            wallets: [rainbowWallet, baseAccount, walletConnectWallet, metaMaskWallet],
        },
    ],
    {
        appName: 'Barzakh AI',
        projectId,
    }
) : [];

export { supportedChains, projectId };