-- ============================================================================
-- Migration 019: PHC Materials Tracking
-- ============================================================================
-- Adds compliance-friendly tracking for Plant Health Care (PHC) jobs.
-- Tracks materials/chemicals used, EPA registration numbers, application methods.
-- ============================================================================

-- Job Materials table for PHC tracking
CREATE TABLE IF NOT EXISTS job_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    
    -- Material Information
    material_name VARCHAR(255) NOT NULL,
    quantity_used NUMERIC(10,2),
    unit VARCHAR(50),
    
    -- EPA Compliance
    epa_reg_number VARCHAR(100),
    application_method VARCHAR(100),
    application_rate VARCHAR(100),
    target_pest_or_condition VARCHAR(255),
    
    -- Application Details
    applied_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    applied_at TIMESTAMP WITH TIME ZONE,
    weather_conditions VARCHAR(255),
    wind_speed_mph NUMERIC(5,2),
    temperature_f NUMERIC(5,1),
    
    -- Safety
    ppe_used TEXT[],
    rei_hours INTEGER,
    
    -- Notes
    notes TEXT,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID
);

-- Indexes for job_materials
CREATE INDEX IF NOT EXISTS idx_job_materials_job ON job_materials(job_id);
CREATE INDEX IF NOT EXISTS idx_job_materials_epa ON job_materials(epa_reg_number);
CREATE INDEX IF NOT EXISTS idx_job_materials_applied_by ON job_materials(applied_by);
CREATE INDEX IF NOT EXISTS idx_job_materials_material_name ON job_materials(material_name);
CREATE INDEX IF NOT EXISTS idx_job_materials_applied_at ON job_materials(applied_at);

COMMENT ON TABLE job_materials IS 'PHC material/chemical usage tracking for compliance';
COMMENT ON COLUMN job_materials.epa_reg_number IS 'EPA Registration Number for regulated products';
COMMENT ON COLUMN job_materials.rei_hours IS 'Restricted Entry Interval in hours';
COMMENT ON COLUMN job_materials.ppe_used IS 'Array of PPE items used during application';

-- Material inventory table for autocomplete and tracking
CREATE TABLE IF NOT EXISTS material_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Product Information
    material_name VARCHAR(255) NOT NULL UNIQUE,
    manufacturer VARCHAR(255),
    epa_reg_number VARCHAR(100),
    active_ingredient VARCHAR(255),
    formulation_type VARCHAR(100),
    
    -- Default Values
    default_unit VARCHAR(50),
    default_application_method VARCHAR(100),
    default_application_rate VARCHAR(100),
    
    -- Safety Information
    signal_word VARCHAR(50),
    required_ppe TEXT[],
    default_rei_hours INTEGER,
    storage_requirements TEXT,
    disposal_instructions TEXT,
    
    -- Inventory
    current_quantity NUMERIC(10,2),
    minimum_quantity NUMERIC(10,2),
    unit_cost NUMERIC(10,2),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for material_inventory
CREATE INDEX IF NOT EXISTS idx_material_inventory_name ON material_inventory(material_name);
CREATE INDEX IF NOT EXISTS idx_material_inventory_epa ON material_inventory(epa_reg_number);
CREATE INDEX IF NOT EXISTS idx_material_inventory_active ON material_inventory(is_active) WHERE is_active = true;

COMMENT ON TABLE material_inventory IS 'Master list of materials/chemicals for autocomplete and inventory tracking';
COMMENT ON COLUMN material_inventory.signal_word IS 'EPA signal word: Caution, Warning, or Danger';
