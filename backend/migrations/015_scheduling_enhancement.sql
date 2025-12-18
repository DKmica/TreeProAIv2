-- Phase 3: Scheduling 2.0 + Route Optimization
-- Migration 015: Enhanced scheduling with skills, route planning, and real-time coordination

-- ============================================================================
-- SKILLS SYSTEM
-- ============================================================================

-- Skills master table
CREATE TABLE IF NOT EXISTS skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(50), -- 'tree_work', 'equipment', 'certification', 'safety'
    is_certification BOOLEAN DEFAULT false,
    certification_expiry_required BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crew skill profiles (what skills a crew has)
CREATE TABLE IF NOT EXISTS crew_skill_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    proficiency_level INTEGER DEFAULT 3 CHECK (proficiency_level >= 1 AND proficiency_level <= 5),
    certified_until DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(crew_id, skill_id)
);

-- Job skill requirements (what skills a job needs)
CREATE TABLE IF NOT EXISTS job_skill_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    required_proficiency INTEGER DEFAULT 1 CHECK (required_proficiency >= 1 AND required_proficiency <= 5),
    is_mandatory BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(job_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_crew_skill_profiles_crew ON crew_skill_profiles(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_skill_profiles_skill ON crew_skill_profiles(skill_id);
CREATE INDEX IF NOT EXISTS idx_job_skill_requirements_job ON job_skill_requirements(job_id);

-- ============================================================================
-- CREW CAPACITY CALENDAR
-- ============================================================================

-- Override default capacity for specific dates
CREATE TABLE IF NOT EXISTS crew_capacity_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    available_hours NUMERIC(4,2), -- Override default capacity
    is_available BOOLEAN DEFAULT true,
    reason VARCHAR(255), -- 'holiday', 'training', 'maintenance', etc.
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(crew_id, date)
);

CREATE INDEX IF NOT EXISTS idx_crew_capacity_date ON crew_capacity_calendar(date);
CREATE INDEX IF NOT EXISTS idx_crew_capacity_crew_date ON crew_capacity_calendar(crew_id, date);

-- ============================================================================
-- CREW STATUS & LOCATION TRACKING
-- ============================================================================

-- Real-time crew status updates
CREATE TABLE IF NOT EXISTS crew_status_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL, -- 'available', 'en_route', 'on_site', 'on_break', 'off_duty'
    current_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    location_accuracy NUMERIC(6,2),
    heading NUMERIC(5,2),
    speed NUMERIC(6,2),
    battery_level INTEGER,
    updated_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crew_status_crew ON crew_status_updates(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_status_created ON crew_status_updates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crew_status_latest ON crew_status_updates(crew_id, created_at DESC);

-- ============================================================================
-- ROUTE PLANNING
-- ============================================================================

-- Route plans for a crew on a specific date
CREATE TABLE IF NOT EXISTS route_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'optimized', 'published', 'in_progress', 'completed'
    start_location_address TEXT,
    start_location_lat DOUBLE PRECISION,
    start_location_lon DOUBLE PRECISION,
    end_location_address TEXT,
    end_location_lat DOUBLE PRECISION,
    end_location_lon DOUBLE PRECISION,
    total_distance_meters INTEGER,
    total_duration_seconds INTEGER,
    total_drive_time_seconds INTEGER,
    total_work_time_seconds INTEGER,
    optimization_score NUMERIC(5,2),
    optimization_metadata JSONB DEFAULT '{}',
    google_directions_response JSONB,
    published_at TIMESTAMP WITH TIME ZONE,
    published_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(crew_id, date)
);

-- Individual stops in a route plan
CREATE TABLE IF NOT EXISTS route_plan_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_plan_id UUID NOT NULL REFERENCES route_plans(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    stop_order INTEGER NOT NULL,
    scheduled_arrival TIME,
    scheduled_departure TIME,
    estimated_duration_minutes INTEGER,
    travel_time_from_previous_seconds INTEGER,
    travel_distance_from_previous_meters INTEGER,
    actual_arrival_time TIMESTAMP WITH TIME ZONE,
    actual_departure_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'en_route', 'arrived', 'in_progress', 'completed', 'skipped'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_route_plans_crew_date ON route_plans(crew_id, date);
CREATE INDEX IF NOT EXISTS idx_route_plans_date ON route_plans(date);
CREATE INDEX IF NOT EXISTS idx_route_plan_stops_plan ON route_plan_stops(route_plan_id);
CREATE INDEX IF NOT EXISTS idx_route_plan_stops_job ON route_plan_stops(job_id);

-- ============================================================================
-- MESSAGING & NOTIFICATIONS
-- ============================================================================

-- Crew messages (dispatcher <-> crew communication)
CREATE TABLE IF NOT EXISTS crew_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL, -- 'dispatcher', 'crew'
    sender_id VARCHAR(100),
    sender_name VARCHAR(200),
    message TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text', -- 'text', 'location', 'image', 'system'
    metadata JSONB DEFAULT '{}',
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crew notifications
CREATE TABLE IF NOT EXISTS crew_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL, -- 'route_published', 'job_added', 'job_changed', 'message', 'alert'
    title VARCHAR(255) NOT NULL,
    body TEXT,
    data JSONB DEFAULT '{}',
    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    read_at TIMESTAMP WITH TIME ZONE,
    dismissed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer notifications for job updates
CREATE TABLE IF NOT EXISTS customer_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    notification_type VARCHAR(50) NOT NULL, -- 'on_my_way', 'arrived', 'completed', 'delayed', 'rescheduled'
    channel VARCHAR(20) NOT NULL, -- 'sms', 'email', 'push'
    recipient_phone VARCHAR(50),
    recipient_email VARCHAR(255),
    message_content TEXT,
    eta_minutes INTEGER,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,
    external_message_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crew_messages_crew ON crew_messages(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_messages_created ON crew_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crew_notifications_crew ON crew_notifications(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_notifications_unread ON crew_notifications(crew_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_customer_notifications_job ON customer_notifications(job_id);
CREATE INDEX IF NOT EXISTS idx_customer_notifications_client ON customer_notifications(client_id);

-- ============================================================================
-- JOB DURATION HISTORY & PREDICTIONS
-- ============================================================================

-- Historical job duration data for predictions
CREATE TABLE IF NOT EXISTS job_duration_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    estimated_hours NUMERIC(6,2),
    actual_hours NUMERIC(6,2),
    variance_percentage NUMERIC(6,2),
    job_type VARCHAR(100),
    tree_count INTEGER,
    tree_sizes JSONB, -- Array of sizes worked on
    services_performed JSONB, -- Array of services
    weather_conditions JSONB,
    crew_size INTEGER,
    difficulty_rating INTEGER,
    notes TEXT,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Aggregated duration statistics by job characteristics
CREATE TABLE IF NOT EXISTS job_duration_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type VARCHAR(100),
    service_type VARCHAR(100),
    tree_size_category VARCHAR(50), -- 'small', 'medium', 'large', 'xlarge'
    sample_count INTEGER DEFAULT 0,
    avg_duration_hours NUMERIC(6,2),
    min_duration_hours NUMERIC(6,2),
    max_duration_hours NUMERIC(6,2),
    std_dev_hours NUMERIC(6,2),
    avg_variance_percentage NUMERIC(6,2),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(job_type, service_type, tree_size_category)
);

CREATE INDEX IF NOT EXISTS idx_job_duration_history_job ON job_duration_history(job_id);
CREATE INDEX IF NOT EXISTS idx_job_duration_history_type ON job_duration_history(job_type);
CREATE INDEX IF NOT EXISTS idx_job_duration_stats_lookup ON job_duration_stats(job_type, service_type);

-- ============================================================================
-- SEED INITIAL SKILLS
-- ============================================================================

INSERT INTO skills (name, description, category, is_certification, certification_expiry_required) VALUES
    ('Tree Removal', 'Full tree removal including stump', 'tree_work', false, false),
    ('Tree Trimming', 'Crown reduction, shaping, deadwood removal', 'tree_work', false, false),
    ('Stump Grinding', 'Stump removal with grinder', 'tree_work', false, false),
    ('Emergency Response', 'Storm damage and emergency tree work', 'tree_work', false, false),
    ('Crane Operation', 'Certified crane operator', 'equipment', true, true),
    ('Bucket Truck', 'Aerial lift operation', 'equipment', true, true),
    ('Chipper Operation', 'Wood chipper operation', 'equipment', false, false),
    ('Chainsaw Certified', 'Professional chainsaw certification', 'certification', true, true),
    ('ISA Certified Arborist', 'International Society of Arboriculture certified', 'certification', true, true),
    ('First Aid/CPR', 'Current first aid and CPR certification', 'safety', true, true),
    ('Climbing Specialist', 'Advanced tree climbing techniques', 'tree_work', true, true),
    ('Plant Health Care', 'Tree disease diagnosis and treatment', 'tree_work', true, false),
    ('Cabling & Bracing', 'Tree support system installation', 'tree_work', false, false),
    ('Hazard Assessment', 'Tree risk assessment qualified', 'certification', true, true),
    ('Electrical Clearance', 'Work near power lines certified', 'safety', true, true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- ADD GEOCODING COLUMNS TO JOBS IF NOT EXISTS
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'job_lat') THEN
        ALTER TABLE jobs ADD COLUMN job_lat DOUBLE PRECISION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'job_lon') THEN
        ALTER TABLE jobs ADD COLUMN job_lon DOUBLE PRECISION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'predicted_duration_hours') THEN
        ALTER TABLE jobs ADD COLUMN predicted_duration_hours NUMERIC(6,2);
    END IF;
END $$;

-- ============================================================================
-- ADD START LOCATION TO CREWS IF NOT EXISTS
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crews' AND column_name = 'home_base_address') THEN
        ALTER TABLE crews ADD COLUMN home_base_address TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crews' AND column_name = 'home_base_lat') THEN
        ALTER TABLE crews ADD COLUMN home_base_lat DOUBLE PRECISION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crews' AND column_name = 'home_base_lon') THEN
        ALTER TABLE crews ADD COLUMN home_base_lon DOUBLE PRECISION;
    END IF;
END $$;

-- Create view for latest crew status
CREATE OR REPLACE VIEW crew_current_status AS
SELECT DISTINCT ON (crew_id)
    crew_id,
    status,
    current_job_id,
    latitude,
    longitude,
    location_accuracy,
    heading,
    speed,
    battery_level,
    updated_by,
    created_at as status_updated_at
FROM crew_status_updates
ORDER BY crew_id, created_at DESC;
