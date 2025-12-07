-- Migration: Add AI Estimate Logs Table for Training Data
-- Phase 9: AI Enhancements

CREATE TABLE IF NOT EXISTS ai_estimate_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Input data
    image_count INTEGER NOT NULL DEFAULT 1,
    tree_species VARCHAR(255),
    tree_height_feet NUMERIC(6,2),
    trunk_diameter_inches NUMERIC(6,2),
    canopy_width_feet NUMERIC(6,2),
    hazards TEXT[],
    location_description TEXT,
    
    -- AI Output
    ai_suggested_price_min NUMERIC(12,2),
    ai_suggested_price_max NUMERIC(12,2),
    suggested_services JSONB,
    health_assessment TEXT,
    detailed_assessment TEXT,
    required_equipment TEXT[],
    required_manpower INTEGER,
    estimated_duration_hours NUMERIC(6,2),
    
    -- User Feedback & Final Pricing
    final_approved_price NUMERIC(12,2),
    feedback_rating VARCHAR(20) CHECK (feedback_rating IN ('accurate', 'too_high', 'too_low')),
    feedback_notes TEXT,
    
    -- Linking
    quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    created_by VARCHAR(100),
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_estimate_logs_created_at ON ai_estimate_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_estimate_logs_feedback ON ai_estimate_logs(feedback_rating) WHERE feedback_rating IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_estimate_logs_tree_species ON ai_estimate_logs(tree_species);
CREATE INDEX IF NOT EXISTS idx_ai_estimate_logs_quote ON ai_estimate_logs(quote_id) WHERE quote_id IS NOT NULL;

COMMENT ON TABLE ai_estimate_logs IS 'Stores AI tree estimation data for model retraining and accuracy analysis';
COMMENT ON COLUMN ai_estimate_logs.feedback_rating IS 'User feedback on AI pricing accuracy';
COMMENT ON COLUMN ai_estimate_logs.final_approved_price IS 'The actual price approved/quoted after AI suggestion';

-- Add scheduling prediction table for AI scheduling helper
CREATE TABLE IF NOT EXISTS job_duration_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    
    -- Job characteristics for prediction
    tree_species VARCHAR(255),
    tree_count INTEGER DEFAULT 1,
    service_type VARCHAR(100),
    tree_height_range VARCHAR(50),
    trunk_diameter_range VARCHAR(50),
    hazard_level VARCHAR(20) CHECK (hazard_level IN ('Low', 'Medium', 'High', 'Critical')),
    crew_size INTEGER,
    
    -- Timing data
    estimated_duration_hours NUMERIC(6,2),
    actual_duration_hours NUMERIC(6,2),
    
    -- Metadata
    weather_conditions VARCHAR(100),
    access_difficulty VARCHAR(50),
    notes TEXT,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_duration_service_type ON job_duration_history(service_type);
CREATE INDEX IF NOT EXISTS idx_job_duration_crew_size ON job_duration_history(crew_size);

COMMENT ON TABLE job_duration_history IS 'Historical job duration data for AI scheduling predictions';
