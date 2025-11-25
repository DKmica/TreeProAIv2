-- ============================================================================
-- 017: Observability Telemetry Storage
-- ----------------------------------------------------------------------------
-- Adds a durable telemetry_events table to capture client-side error, metric,
-- and event streams for debugging, reliability, and performance tracking.
-- ============================================================================

CREATE TABLE IF NOT EXISTS telemetry_events (
    id UUID PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('error', 'metric', 'event')),
    name TEXT NOT NULL,
    message TEXT,
    stack TEXT,
    value NUMERIC,
    unit TEXT,
    tags TEXT[],
    data JSONB,
    context TEXT,
    severity TEXT,
    url TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_events_created_at ON telemetry_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_type ON telemetry_events (type);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_severity ON telemetry_events (severity);
