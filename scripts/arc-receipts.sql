-- Additive migration. Run against the database used by the Arc analysis service.
CREATE TABLE IF NOT EXISTS arc_intelligence_receipts (
  transaction_hash text PRIMARY KEY CHECK (transaction_hash ~ '^0x[0-9a-f]{64}$'),
  invoice_id uuid NOT NULL UNIQUE,
  document jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
