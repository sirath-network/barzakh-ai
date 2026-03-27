'use client';

import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
    rabbyWallet,
    metaMaskWallet,
    baseAccount,
    walletConnectWallet,
    rainbowWallet,
    injectedWallet,
    phantomWallet,
    trustWallet,
    ledgerWallet,
    okxWallet,
    bitgetWallet,
    zerionWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { supportedChains, projectId } from './wagmi';

// Custom wrapper to rename 'Browser Wallet' to 'Installed Wallet'
const installedWallet = () => {
    // @ts-ignore
    const wallet = injectedWallet();
    return {
        ...wallet,
        name: 'Installed Wallet',
        shortName: 'Installed',
    };
};

// Client-only connector setup
export const connectors = typeof window !== 'undefined' ? connectorsForWallets(
    [
        {
            groupName: 'Popular',
            wallets: [
                rabbyWallet,
                phantomWallet,
                rainbowWallet,
                baseAccount,
                installedWallet
            ]
        },
        {
            groupName: 'More',
            wallets: [
                metaMaskWallet,
                trustWallet,
                ledgerWallet,
                okxWallet,
                bitgetWallet,
                zerionWallet,
                walletConnectWallet,
            ],
        },
    ],
    {
        appName: 'Barzakh AI',
        projectId,
    }
) : [];

export { supportedChains, projectId };