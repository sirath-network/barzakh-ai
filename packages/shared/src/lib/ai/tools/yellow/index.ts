/**
 * Yellow Network AI Tools Index
 *
 * Exports all Yellow Network tools for state channels, escrow, and configuration.
 * Integration with Nitrolite SDK (ERC-7824) for off-chain matching and on-chain settlement.
 *
 * @see https://github.com/erc7824/nitrolite
 */

// State Channel Tools
export {
    yellowDeposit,
    yellowWithdraw,
    yellowTransfer,
    yellowGetBalance,
    yellowGetChannelStatus,
    yellowStateChannelTools,
} from "./yellow-state-channels";

// Escrow Tools (App Sessions)
export {
    yellowCreateEscrow,
    yellowDepositToEscrow,
    yellowReleaseEscrow,
    yellowGetEscrowStatus,
    yellowEscrowTools,
} from "./yellow-escrow";

// Configuration
export {
    YELLOW_SUPPORTED_ASSETS,
    YELLOW_SUPPORTED_CHAINS,
    YELLOW_CONTRACT_ADDRESSES,
    YELLOW_TOKEN_ADDRESSES,
    CHANNEL_STATUS_LABELS,
    CHANNEL_STATUS_FROM_INT,
    DEFAULT_CHALLENGE_DURATION,
    parseAmount,
    formatAmount,
    type YellowChannelStatus,
} from "./yellow-config";
