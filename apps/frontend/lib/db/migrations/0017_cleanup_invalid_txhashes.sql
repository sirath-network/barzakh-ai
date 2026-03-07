-- Migration: Clean up invalid transaction hashes
-- Removes X402Transaction records where transactionHash doesn't match valid blockchain hash format (0x + 64 hex chars)
DELETE FROM "X402Transaction"
WHERE "transactionHash" NOT SIMILAR TO '0x[0-9a-fA-F]{64}';
