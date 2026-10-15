// The standalone agent and the app share the exact same Arc payment verifier (Mainnet or Testnet via .env).
export { handleAnalysisRequest as POST } from '@barzakh/shared/lib/arc/server';
export const runtime = 'nodejs';
export const maxDuration = 90;
