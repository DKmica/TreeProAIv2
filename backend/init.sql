-- TreePro AI Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leads Table
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    source TEXT,
    status TEXT NOT NULL DEFAULT 'New',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quotes Table
CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Draft',
    line_items JSONB NOT NULL DEFAULT '[]',
    stump_grinding_price NUMERIC DEFAULT 0,
    signature TEXT,
    accepted_at TIMESTAMP WITH TIME ZONE,
    messages JSONB DEFAULT '[]',
    job_location TEXT,
    special_instructions TEXT,
    valid_until TEXT,
    deposit_amount NUMERIC DEFAULT 0,
    payment_terms TEXT DEFAULT 'Net 30',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Jobs Table
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Unscheduled',
    scheduled_date TEXT,
    assigned_crew JSONB DEFAULT '[]',
    stump_grinding_price NUMERIC DEFAULT 0,
    work_started_at TIMESTAMP WITH TIME ZONE,
    work_ended_at TIMESTAMP WITH TIME ZONE,
    photos JSONB DEFAULT '[]',
    clock_in_lat DOUBLE PRECISION,
    clock_in_lon DOUBLE PRECISION,
    clock_out_lat DOUBLE PRECISION,
    clock_out_lon DOUBLE PRECISION,
    jha JSONB,
    costs JSONB,
    messages JSONB DEFAULT '[]',
    job_location TEXT,
    special_instructions TEXT,
    equipment_needed JSONB DEFAULT '[]',
    estimated_hours NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Draft',
    amount NUMERIC NOT NULL,
    line_items JSONB NOT NULL DEFAULT '[]',
    due_date TEXT NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Employees Table
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    ssn TEXT,
    dob TEXT,
    job_title TEXT,
    pay_rate NUMERIC,
    hire_date TEXT,
    certifications TEXT,
    performance_metrics JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Equipment Table
CREATE TABLE IF NOT EXISTS equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    make TEXT,
    model TEXT,
    purchase_date TEXT,
    last_service_date TEXT,
    status TEXT NOT NULL DEFAULT 'Operational',
    assigned_to TEXT,
    maintenance_history JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pay Periods Table
CREATE TABLE IF NOT EXISTS pay_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    period_type TEXT NOT NULL DEFAULT 'bi-weekly',
    status TEXT NOT NULL DEFAULT 'Open',
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Time Entries Table
CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    hours_worked NUMERIC NOT NULL DEFAULT 0,
    hourly_rate NUMERIC NOT NULL,
    overtime_hours NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payroll Records Table
CREATE TABLE IF NOT EXISTS payroll_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    pay_period_id UUID REFERENCES pay_periods(id) ON DELETE CASCADE,
    regular_hours NUMERIC NOT NULL DEFAULT 0,
    overtime_hours NUMERIC DEFAULT 0,
    hourly_rate NUMERIC NOT NULL,
    regular_pay NUMERIC NOT NULL DEFAULT 0,
    overtime_pay NUMERIC DEFAULT 0,
    bonuses NUMERIC DEFAULT 0,
    deductions JSONB DEFAULT '[]',
    total_deductions NUMERIC DEFAULT 0,
    gross_pay NUMERIC NOT NULL DEFAULT 0,
    net_pay NUMERIC NOT NULL DEFAULT 0,
    paid_at TIMESTAMP WITH TIME ZONE,
    payment_method TEXT DEFAULT 'Check',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_leads_customer_id ON leads(customer_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_quotes_lead_id ON quotes(lead_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_jobs_quote_id ON jobs(quote_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_invoices_job_id ON invoices(job_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_pay_periods_status ON pay_periods(status);
CREATE INDEX IF NOT EXISTS idx_time_entries_employee_id ON time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_job_id ON time_entries(job_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);
CREATE INDEX IF NOT EXISTS idx_payroll_records_employee_id ON payroll_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_pay_period_id ON payroll_records(pay_period_id);

-- Insert sample data for development
INSERT INTO customers (id, name, email, phone, address, lat, lon) VALUES
    ('cust1', 'John Doe', 'john.doe@example.com', '555-1234', '123 Oak St, Los Angeles, CA', 34.0522, -118.2437),
    ('cust2', 'Jane Smith', 'jane.smith@example.com', '555-5678', '456 Pine Ave, New York, NY', 40.7128, -74.0060),
    ('cust3', 'Sarah Wilson', 'sarah.w@example.com', '555-8888', '789 Birch Rd, Chicago, IL', 41.8781, -87.6298),
    ('cust4', 'Michael Brown', 'michael.b@example.com', '555-4444', '101 Maple Ln, Miami, FL', 25.7617, -80.1918)
ON CONFLICT (id) DO NOTHING;

INSERT INTO leads (id, customer_id, source, status, description, created_at) VALUES
    ('lead1', 'cust1', 'Website', 'New', 'Wants a quote for trimming a large maple tree.', '2023-10-26'),
    ('lead2', 'cust2', 'Referral', 'Contacted', NULL, '2023-10-25'),
    ('lead3', 'cust3', 'Emergency Call', 'New', 'A large branch has fallen on my garage. Need it removed ASAP!', NOW()),
    ('lead4', 'cust4', 'Website', 'Qualified', 'Request for quote for various services.', '2023-10-28')
ON CONFLICT (id) DO NOTHING;

INSERT INTO quotes (id, lead_id, customer_name, status, line_items, stump_grinding_price, signature, accepted_at, created_at) VALUES
    ('quote1', 'lead1', 'John Doe', 'Accepted', '[{"description": "Trimming large maple tree", "price": 1200, "selected": true}]', 0, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', '2023-10-27T10:00:00Z', '2023-10-26'),
    ('quote2', 'lead2', 'Jane Smith', 'Accepted', '[{"description": "Oak tree removal", "price": 850, "selected": true}]', 0, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', '2023-10-26T11:30:00Z', '2023-10-25'),
    ('quote3', 'lead3', 'Sarah Wilson', 'Accepted', '[{"description": "Emergency branch removal from garage", "price": 2100, "selected": true}]', 400, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', NOW(), NOW()),
    ('quote4', 'lead4', 'Michael Brown', 'Sent', '[{"description": "Remove large pine tree near house", "price": 1800, "selected": true}, {"description": "Prune two front yard oak trees", "price": 650, "selected": true}, {"description": "Fertilization treatment for all trees", "price": 250, "selected": false}]', 350, NULL, NULL, '2023-10-28')
ON CONFLICT (id) DO NOTHING;

INSERT INTO jobs (id, quote_id, customer_name, status, scheduled_date, assigned_crew, work_started_at, work_ended_at, clock_in_lat, clock_in_lon, clock_out_lat, clock_out_lon, costs) VALUES
    ('job1', 'quote2', 'Jane Smith', 'Completed', '2023-11-05', '["emp2", "emp3"]', '2023-11-05T08:00:00Z', '2023-11-05T16:00:00Z', 40.7128, -74.0060, 40.7130, -74.0062, '{"labor": 448, "equipment": 100, "materials": 20, "disposal": 80, "total": 648}'),
    ('job2', 'quote1', 'John Doe', 'In Progress', NOW()::date::text, '["emp1"]', NOW() - INTERVAL '2 hours', NULL, 34.0522, -118.2437, NULL, NULL, NULL),
    ('job3', 'quote3', 'Sarah Wilson', 'Unscheduled', '', '["emp1", "emp3"]', NULL, NULL, NULL, NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO invoices (id, job_id, customer_name, status, amount, line_items, due_date, paid_at) VALUES
    ('inv1', 'job1', 'Jane Smith', 'Paid', 850, '[{"description": "Oak tree removal", "price": 850, "selected": true}]', '2023-11-20', '2023-11-15T14:25:00Z'),
    ('inv2', 'job2', 'John Doe', 'Sent', 1200, '[{"description": "Trimming large maple tree", "price": 1200, "selected": true}]', '2024-01-15', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO employees (id, name, phone, address, lat, lon, ssn, dob, job_title, pay_rate, hire_date, certifications, performance_metrics) VALUES
    ('emp1', 'Mike Miller', '555-8765', '789 Maple Dr, Los Angeles, CA', 34.0550, -118.2450, 'XXX-XX-1234', '1985-05-15', 'Crew Leader', 35, '2020-03-01', 'ISA Certified Arborist, First Aid/CPR', '{"jobsCompleted": 152, "safetyIncidents": 0, "customerRating": 4.9}'),
    ('emp2', 'Carlos Ray', '555-4321', '321 Birch Ln, New York, NY', 40.7150, -74.0080, 'XXX-XX-5678', '1992-11-20', 'Groundsman', 22, '2022-06-15', 'Chainsaw Safety', '{"jobsCompleted": 88, "safetyIncidents": 1, "customerRating": 4.6}'),
    ('emp3', 'David Chen', '555-9999', '555 Willow Way, Chicago, IL', 41.8800, -87.6300, 'XXX-XX-9999', '1995-01-30', 'Arborist Climber', 28, '2021-08-01', 'ISA Certified Tree Worker, Aerial Rescue', '{"jobsCompleted": 115, "safetyIncidents": 0, "customerRating": 4.8}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO equipment (id, name, make, model, purchase_date, last_service_date, status, assigned_to, maintenance_history) VALUES
    ('equip1', 'Stump Grinder', 'Vermeer', 'SC30TX', '2021-02-10', '2023-05-15', 'Operational', 'Mike Miller', '[{"id": "maint1", "date": "2023-05-15", "description": "Replaced grinder teeth and changed oil.", "cost": 450}, {"id": "maint2", "date": "2022-11-01", "description": "Annual engine service.", "cost": 220}]'),
    ('equip2', 'Wood Chipper', 'Bandit', '15XP', '2020-01-15', '2023-08-15', 'Needs Maintenance', 'Crew 1', '[{"id": "maint3", "date": "2023-08-15", "description": "Sharpened blades.", "cost": 300}, {"id": "maint4", "date": "2023-02-20", "description": "Replaced hydraulic fluid.", "cost": 150}]'),
    ('equip3', 'Chainsaw', 'Stihl', 'MS 462', '2023-03-20', '2023-10-10', 'Operational', NULL, '[]')
ON CONFLICT (id) DO NOTHING;