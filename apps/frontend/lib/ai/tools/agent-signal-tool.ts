import { tool } from 'ai';
import { z } from 'zod';
import { querySignalAgent } from '@/lib/agent/agent-payment-executor';
import { arcTransactionUrl } from '@barzakh/shared/lib/arc/config';

export const createQuerySignalAgentTool = (userId: string) => tool({
  description: `Buy market research from the Signal Agent for 0.002 USDC plus gas on Arc MAINNET using the user's agent wallet. Use only when the user requests paid analysis. Approval mode returns a review link; Autopilot uses the user's existing authorization. The result includes bullish, bearish, and risk perspectives from one model and a verified payment receipt. These are research opinions, not guaranteed outcomes. Always include the receipt link. If a response is paid_pending or payment_pending, retry with its receiptTxHash and invoiceToken; NEVER initiate another payment for that request.`,
  parameters: z.object({
    tokenSymbol: z.string().max(100).describe('Asset symbol or ticker (crypto e.g. BTC, ETH, SOL, or stock/RWA e.g. NVDA, CRCL, TSLA, AAPL), or contract address (0x... / Solana base58)'),
    prompt: z.string().max(1000).optional().describe('Custom research question or specific instructions for the briefing'),
    receiptTxHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/).optional().describe('Resume a payment already made, without paying again'),
    invoiceToken: z.string().max(4096).optional().describe('Signed invoice token returned with a pending payment; required with receiptTxHash'),
  }),
  execute: async ({ tokenSymbol, prompt, receiptTxHash, invoiceToken }) => {
    try {
      if (!!receiptTxHash !== !!invoiceToken) throw new Error('Both receiptTxHash and invoiceToken are required to resume');
      const result = await querySignalAgent(userId, '', tokenSymbol, undefined,
        receiptTxHash && invoiceToken ? { receipt: receiptTxHash, invoiceToken } : undefined, prompt);
      if (!result.success) return {
        ...result,
        ...(result.receipt_id ? { receiptTxHash: result.receipt_id, invoiceToken: result.invoice_token,
          explorerUrl: arcTransactionUrl(result.receipt_id) } : {}),
      };
      return {
        status: 'success', sentimentScore: result.sentiment_score,
        tradingSignal: result.trading_signal, analysis: result.analysis,
        bullCase: result.bull_case, bearCase: result.bear_case, riskCheck: result.risk_check,
        snapshot: result.snapshot,
        paymentDetails: { paidWith: result.paid_with, receiptTxHash: result.receipt_id,
          explorerUrl: arcTransactionUrl(result.receipt_id), receiptUrl: `/arc/receipts/${result.receipt_id}` },
        resultHash: result.proof.resultHash,
      };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : 'Signal Agent request failed' };
    }
  },
});
