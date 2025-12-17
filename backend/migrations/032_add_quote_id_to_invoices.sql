-- Ensure invoices can reference their source quote for automation and lineage
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'invoices' AND column_name = 'quote_id'
    ) THEN
        ALTER TABLE invoices ADD COLUMN quote_id UUID;
    END IF;
END $$;

-- Add FK constraint if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'invoices' AND c.conname = 'invoices_quote_id_fkey'
    ) THEN
        ALTER TABLE invoices
        ADD CONSTRAINT invoices_quote_id_fkey
        FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Index for quick quote → invoice lookups
CREATE INDEX IF NOT EXISTS idx_invoices_quote_id ON invoices(quote_id);

-- Backfill quote linkage from jobs where possible
UPDATE invoices i
SET quote_id = j.quote_id
FROM jobs j
WHERE i.job_id = j.id
  AND i.quote_id IS NULL
  AND j.quote_id IS NOT NULL;
