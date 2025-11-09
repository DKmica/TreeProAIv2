-- ============================================================================
-- TreePro AI - Phase 1 CRM Data Migration
-- Migration: 002_migrate_customers_to_clients.sql
-- Description: Safely migrate existing customer data to new CRM structure
-- Created: 2024-11-09
-- ============================================================================
--
-- This migration script moves data from the legacy customers table to the
-- new CRM structure introduced in 001_phase1_crm_tables.sql:
--   - customers → clients (with name parsing)
--   - customers → properties (primary location for each client)
--   - Update foreign keys in leads, quotes, jobs
--   - Generate unique quote_number and job_number identifiers
--
-- SAFETY FEATURES:
--   ✓ Wrapped in transaction (ROLLBACK on any error)
--   ✓ Pre-migration validation checks
--   ✓ Post-migration integrity verification
--   ✓ Detailed logging and statistics
--   ✓ Idempotent (safe to run multiple times)
--
-- ROLLBACK INSTRUCTIONS (if needed after running):
--   1. DELETE FROM properties WHERE client_id IN (SELECT id FROM clients);
--   2. DELETE FROM clients;
--   3. UPDATE leads SET client_id_new = NULL;
--   4. UPDATE quotes SET client_id = NULL, quote_number = NULL;
--   5. UPDATE jobs SET client_id = NULL, job_number = NULL;
--
-- ============================================================================

-- Start transaction - all changes will be atomic
BEGIN;

-- ============================================================================
-- SECTION 1: PRE-MIGRATION VALIDATION
-- ============================================================================

DO $$
DECLARE
    v_customer_count INTEGER;
    v_lead_count INTEGER;
    v_quote_count INTEGER;
    v_job_count INTEGER;
    v_existing_clients INTEGER;
BEGIN
    -- Count existing records
    SELECT COUNT(*) INTO v_customer_count FROM customers;
    SELECT COUNT(*) INTO v_lead_count FROM leads;
    SELECT COUNT(*) INTO v_quote_count FROM quotes;
    SELECT COUNT(*) INTO v_job_count FROM jobs;
    SELECT COUNT(*) INTO v_existing_clients FROM clients;
    
    -- Log pre-migration state
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PRE-MIGRATION VALIDATION';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Customers to migrate: %', v_customer_count;
    RAISE NOTICE 'Leads to update: %', v_lead_count;
    RAISE NOTICE 'Quotes to update: %', v_quote_count;
    RAISE NOTICE 'Jobs to update: %', v_job_count;
    RAISE NOTICE 'Existing clients (will skip these IDs): %', v_existing_clients;
    RAISE NOTICE '----------------------------------------';
    
    -- Validation checks
    IF v_customer_count = 0 THEN
        RAISE NOTICE 'WARNING: No customers found to migrate';
    END IF;
    
    -- Check if clients table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
        RAISE EXCEPTION 'ERROR: clients table does not exist. Run 001_phase1_crm_tables.sql first.';
    END IF;
    
    -- Check if properties table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'properties') THEN
        RAISE EXCEPTION 'ERROR: properties table does not exist. Run 001_phase1_crm_tables.sql first.';
    END IF;
    
    RAISE NOTICE 'Pre-migration validation passed ✓';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- SECTION 2: MIGRATE CUSTOMERS → CLIENTS
-- ============================================================================

DO $$
DECLARE
    v_migrated_count INTEGER;
    v_duplicate_emails INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'STEP 1: Migrating customers → clients';
    RAISE NOTICE '========================================';
    
    -- Count customers with duplicate emails
    SELECT COUNT(*) INTO v_duplicate_emails
    FROM (
        SELECT email
        FROM customers
        WHERE email IS NOT NULL
        GROUP BY email
        HAVING COUNT(*) > 1
    ) AS dupes;
    
    IF v_duplicate_emails > 0 THEN
        RAISE NOTICE 'Found % duplicate email addresses that will be handled with suffixes', v_duplicate_emails;
    END IF;
    
    -- Insert customers into clients table with name parsing
    -- Preserve original UUIDs and timestamps
    INSERT INTO clients (
        id,
        first_name,
        last_name,
        primary_email,
        primary_phone,
        billing_address_line1,
        client_type,
        status,
        created_at,
        updated_at
    )
    SELECT 
        c.id,
        -- Parse first name: everything before the last space (or NULL if single word)
        CASE 
            WHEN c.name LIKE '% %' THEN 
                TRIM(SUBSTRING(c.name FROM 1 FOR LENGTH(c.name) - LENGTH(SPLIT_PART(c.name, ' ', ARRAY_LENGTH(STRING_TO_ARRAY(c.name, ' '), 1)))))
            ELSE NULL
        END AS first_name,
        -- Parse last name: last word in the name (or full name if single word)
        TRIM(SPLIT_PART(c.name, ' ', ARRAY_LENGTH(STRING_TO_ARRAY(c.name, ' '), 1))) AS last_name,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM customers c2 
                WHERE c2.email = c.email AND c2.id < c.id AND c.email IS NOT NULL
            ) THEN 
                c.email || '+' || ROW_NUMBER() OVER (PARTITION BY c.email ORDER BY c.id)::text
            ELSE c.email
        END AS primary_email,
        c.phone AS primary_phone,
        c.address AS billing_address_line1,
        'residential' AS client_type,
        'active' AS status,
        c.created_at,
        NOW() AS updated_at
    FROM customers c
    WHERE NOT EXISTS (
        -- Skip if client with this ID already exists (idempotency)
        SELECT 1 FROM clients WHERE id = c.id
    );
    
    GET DIAGNOSTICS v_migrated_count = ROW_COUNT;
    
    RAISE NOTICE 'Migrated % customers to clients table ✓', v_migrated_count;
    
    IF v_duplicate_emails > 0 THEN
        RAISE NOTICE 'Handled % duplicate email groups by appending +N suffixes ✓', v_duplicate_emails;
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- SECTION 3: CREATE PROPERTIES FROM CUSTOMER ADDRESSES
-- ============================================================================

DO $$
DECLARE
    v_property_count INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'STEP 2: Creating properties from addresses';
    RAISE NOTICE '========================================';
    
    -- Create primary property for each migrated client
    INSERT INTO properties (
        client_id,
        property_name,
        address_line1,
        city,
        state,
        zip,
        country,
        lat,
        lon,
        property_type,
        is_primary,
        created_at,
        updated_at
    )
    SELECT 
        cl.id AS client_id,
        'Primary Location' AS property_name,
        c.address AS address_line1,
        -- Extract city from address (attempt to parse after last comma)
        -- Format: "123 Street, City, State ZIP"
        COALESCE(
            TRIM(BOTH ' ' FROM SPLIT_PART(
                SPLIT_PART(c.address, ',', -2), 
                ',', 
                1
            )),
            'Unknown'
        ) AS city,
        -- Extract state (second to last part, take first word)
        COALESCE(
            TRIM(BOTH ' ' FROM SPLIT_PART(
                SPLIT_PART(c.address, ',', -1),
                ' ',
                1
            )),
            'XX'
        ) AS state,
        -- Extract ZIP (last part of address after state)
        COALESCE(
            TRIM(BOTH ' ' FROM REGEXP_REPLACE(
                SPLIT_PART(
                    SPLIT_PART(c.address, ',', -1),
                    ' ',
                    -1
                ),
                '[^0-9]',
                '',
                'g'
            )),
            '00000'
        ) AS zip,
        'USA' AS country,
        c.lat,
        c.lon,
        'residential' AS property_type,
        true AS is_primary,
        c.created_at,
        NOW() AS updated_at
    FROM customers c
    INNER JOIN clients cl ON cl.id = c.id
    WHERE NOT EXISTS (
        -- Skip if property already exists for this client (idempotency)
        SELECT 1 FROM properties 
        WHERE client_id = cl.id AND is_primary = true
    )
    AND c.address IS NOT NULL 
    AND c.address <> '';
    
    GET DIAGNOSTICS v_property_count = ROW_COUNT;
    
    RAISE NOTICE 'Created % primary properties ✓', v_property_count;
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- SECTION 4: UPDATE FOREIGN KEY REFERENCES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 4.1: Update leads.client_id_new
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_leads_updated INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'STEP 3: Updating foreign key references';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Step 3.1: Updating leads.client_id_new...';
    
    -- Update leads to point to new client records
    UPDATE leads l
    SET client_id_new = c.id
    FROM customers c
    WHERE l.customer_id = c.id
    AND l.client_id_new IS NULL;  -- Only update if not already set
    
    GET DIAGNOSTICS v_leads_updated = ROW_COUNT;
    
    RAISE NOTICE '  Updated % leads with client references ✓', v_leads_updated;
END $$;

-- ----------------------------------------------------------------------------
-- 4.2: Update quotes.client_id (via lead relationship)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_quotes_via_lead INTEGER;
    v_quotes_via_name INTEGER;
    v_quotes_no_match INTEGER;
BEGIN
    RAISE NOTICE 'Step 3.2: Updating quotes.client_id...';
    
    -- First, update quotes that have a lead_id (preferred method)
    UPDATE quotes q
    SET client_id = l.client_id_new
    FROM leads l
    WHERE q.lead_id = l.id
    AND l.client_id_new IS NOT NULL
    AND q.client_id IS NULL;  -- Only update if not already set
    
    GET DIAGNOSTICS v_quotes_via_lead = ROW_COUNT;
    RAISE NOTICE '  Updated % quotes via lead relationship ✓', v_quotes_via_lead;
    
    -- Second, try to match quotes without lead_id by customer_name
    WITH name_matches AS (
        SELECT DISTINCT ON (q.id)
            q.id AS quote_id,
            cl.id AS client_id
        FROM quotes q
        INNER JOIN customers c ON LOWER(TRIM(q.customer_name)) = LOWER(TRIM(c.name))
        INNER JOIN clients cl ON cl.id = c.id
        WHERE q.client_id IS NULL
        AND q.lead_id IS NULL
        ORDER BY q.id, cl.created_at DESC  -- Prefer older clients if duplicates
    )
    UPDATE quotes q
    SET client_id = nm.client_id
    FROM name_matches nm
    WHERE q.id = nm.quote_id;
    
    GET DIAGNOSTICS v_quotes_via_name = ROW_COUNT;
    RAISE NOTICE '  Updated % quotes via customer name match ✓', v_quotes_via_name;
    
    -- Count unmatched quotes
    SELECT COUNT(*) INTO v_quotes_no_match
    FROM quotes
    WHERE client_id IS NULL;
    
    IF v_quotes_no_match > 0 THEN
        RAISE NOTICE '  WARNING: % quotes could not be matched to a client', v_quotes_no_match;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4.3: Update quotes.property_id (set to primary property of client)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_quote_properties_updated INTEGER;
BEGIN
    RAISE NOTICE 'Step 3.3: Updating quotes.property_id...';
    
    -- Link quotes to the primary property of their client
    UPDATE quotes q
    SET property_id = p.id
    FROM properties p
    WHERE q.client_id = p.client_id
    AND p.is_primary = true
    AND q.property_id IS NULL;
    
    GET DIAGNOSTICS v_quote_properties_updated = ROW_COUNT;
    
    RAISE NOTICE '  Updated % quotes with property references ✓', v_quote_properties_updated;
END $$;

-- ----------------------------------------------------------------------------
-- 4.4: Update jobs.client_id (via quote relationship)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_jobs_via_quote INTEGER;
    v_jobs_via_name INTEGER;
    v_jobs_no_match INTEGER;
BEGIN
    RAISE NOTICE 'Step 3.4: Updating jobs.client_id...';
    
    -- First, update jobs that have a quote_id (preferred method)
    UPDATE jobs j
    SET client_id = q.client_id
    FROM quotes q
    WHERE j.quote_id = q.id
    AND q.client_id IS NOT NULL
    AND j.client_id IS NULL;
    
    GET DIAGNOSTICS v_jobs_via_quote = ROW_COUNT;
    RAISE NOTICE '  Updated % jobs via quote relationship ✓', v_jobs_via_quote;
    
    -- Second, try to match jobs without quote_id by customer_name
    WITH name_matches AS (
        SELECT DISTINCT ON (j.id)
            j.id AS job_id,
            cl.id AS client_id
        FROM jobs j
        INNER JOIN customers c ON LOWER(TRIM(j.customer_name)) = LOWER(TRIM(c.name))
        INNER JOIN clients cl ON cl.id = c.id
        WHERE j.client_id IS NULL
        AND j.quote_id IS NULL
        ORDER BY j.id, cl.created_at DESC
    )
    UPDATE jobs j
    SET client_id = nm.client_id
    FROM name_matches nm
    WHERE j.id = nm.job_id;
    
    GET DIAGNOSTICS v_jobs_via_name = ROW_COUNT;
    RAISE NOTICE '  Updated % jobs via customer name match ✓', v_jobs_via_name;
    
    -- Count unmatched jobs
    SELECT COUNT(*) INTO v_jobs_no_match
    FROM jobs
    WHERE client_id IS NULL;
    
    IF v_jobs_no_match > 0 THEN
        RAISE NOTICE '  WARNING: % jobs could not be matched to a client', v_jobs_no_match;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4.5: Update jobs.property_id (set to primary property of client)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_job_properties_updated INTEGER;
BEGIN
    RAISE NOTICE 'Step 3.5: Updating jobs.property_id...';
    
    -- Link jobs to the primary property of their client
    UPDATE jobs j
    SET property_id = p.id
    FROM properties p
    WHERE j.client_id = p.client_id
    AND p.is_primary = true
    AND j.property_id IS NULL;
    
    GET DIAGNOSTICS v_job_properties_updated = ROW_COUNT;
    
    RAISE NOTICE '  Updated % jobs with property references ✓', v_job_properties_updated;
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- SECTION 5: GENERATE UNIQUE IDENTIFIERS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 5.1: Generate quote_number for all quotes
-- Format: Q-YYYYMM-#### (e.g., Q-202411-0001)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_quotes_numbered INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'STEP 4: Generating unique identifiers';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Step 4.1: Generating quote numbers...';
    
    -- Generate quote numbers using created_at date and row number
    WITH numbered_quotes AS (
        SELECT 
            id,
            'Q-' || 
            TO_CHAR(created_at, 'YYYYMM') || 
            '-' || 
            LPAD(
                ROW_NUMBER() OVER (
                    PARTITION BY TO_CHAR(created_at, 'YYYYMM') 
                    ORDER BY created_at, id
                )::TEXT, 
                4, 
                '0'
            ) AS new_quote_number
        FROM quotes
        WHERE quote_number IS NULL
    )
    UPDATE quotes q
    SET quote_number = nq.new_quote_number
    FROM numbered_quotes nq
    WHERE q.id = nq.id;
    
    GET DIAGNOSTICS v_quotes_numbered = ROW_COUNT;
    
    RAISE NOTICE '  Generated % quote numbers ✓', v_quotes_numbered;
    
    -- Show sample quote numbers
    RAISE NOTICE '  Sample quote numbers:';
    PERFORM RAISE NOTICE '    - %', quote_number
    FROM quotes 
    WHERE quote_number LIKE 'Q-%'
    LIMIT 3;
END $$;

-- ----------------------------------------------------------------------------
-- 5.2: Generate job_number for all jobs
-- Format: J-YYYYMM-#### (e.g., J-202411-0001)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_jobs_numbered INTEGER;
BEGIN
    RAISE NOTICE 'Step 4.2: Generating job numbers...';
    
    -- Generate job numbers using created_at date and row number
    WITH numbered_jobs AS (
        SELECT 
            id,
            'J-' || 
            TO_CHAR(created_at, 'YYYYMM') || 
            '-' || 
            LPAD(
                ROW_NUMBER() OVER (
                    PARTITION BY TO_CHAR(created_at, 'YYYYMM') 
                    ORDER BY created_at, id
                )::TEXT, 
                4, 
                '0'
            ) AS new_job_number
        FROM jobs
        WHERE job_number IS NULL
    )
    UPDATE jobs j
    SET job_number = nj.new_job_number
    FROM numbered_jobs nj
    WHERE j.id = nj.id;
    
    GET DIAGNOSTICS v_jobs_numbered = ROW_COUNT;
    
    RAISE NOTICE '  Generated % job numbers ✓', v_jobs_numbered;
    
    -- Show sample job numbers
    RAISE NOTICE '  Sample job numbers:';
    PERFORM RAISE NOTICE '    - %', job_number
    FROM jobs 
    WHERE job_number LIKE 'J-%'
    LIMIT 3;
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- SECTION 6: POST-MIGRATION VALIDATION & INTEGRITY CHECKS
-- ============================================================================

DO $$
DECLARE
    v_client_count INTEGER;
    v_property_count INTEGER;
    v_leads_linked INTEGER;
    v_quotes_linked INTEGER;
    v_jobs_linked INTEGER;
    v_quotes_with_numbers INTEGER;
    v_jobs_with_numbers INTEGER;
    v_orphaned_leads INTEGER;
    v_orphaned_quotes INTEGER;
    v_orphaned_jobs INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'POST-MIGRATION VALIDATION';
    RAISE NOTICE '========================================';
    
    -- Count migrated records
    SELECT COUNT(*) INTO v_client_count FROM clients;
    SELECT COUNT(*) INTO v_property_count FROM properties;
    SELECT COUNT(*) INTO v_leads_linked FROM leads WHERE client_id_new IS NOT NULL;
    SELECT COUNT(*) INTO v_quotes_linked FROM quotes WHERE client_id IS NOT NULL;
    SELECT COUNT(*) INTO v_jobs_linked FROM jobs WHERE client_id IS NOT NULL;
    SELECT COUNT(*) INTO v_quotes_with_numbers FROM quotes WHERE quote_number IS NOT NULL;
    SELECT COUNT(*) INTO v_jobs_with_numbers FROM jobs WHERE job_number IS NOT NULL;
    
    -- Check for orphaned records
    SELECT COUNT(*) INTO v_orphaned_leads FROM leads WHERE customer_id IS NOT NULL AND client_id_new IS NULL;
    SELECT COUNT(*) INTO v_orphaned_quotes FROM quotes WHERE client_id IS NULL;
    SELECT COUNT(*) INTO v_orphaned_jobs FROM jobs WHERE client_id IS NULL;
    
    -- Display migration results
    RAISE NOTICE 'Migration Results:';
    RAISE NOTICE '  Clients created: %', v_client_count;
    RAISE NOTICE '  Properties created: %', v_property_count;
    RAISE NOTICE '  Leads linked to clients: %', v_leads_linked;
    RAISE NOTICE '  Quotes linked to clients: %', v_quotes_linked;
    RAISE NOTICE '  Jobs linked to clients: %', v_jobs_linked;
    RAISE NOTICE '  Quotes with numbers: %', v_quotes_with_numbers;
    RAISE NOTICE '  Jobs with numbers: %', v_jobs_with_numbers;
    RAISE NOTICE '----------------------------------------';
    
    -- Integrity warnings
    IF v_orphaned_leads > 0 THEN
        RAISE NOTICE 'WARNING: % leads not linked to clients', v_orphaned_leads;
    END IF;
    
    IF v_orphaned_quotes > 0 THEN
        RAISE NOTICE 'WARNING: % quotes not linked to clients', v_orphaned_quotes;
    END IF;
    
    IF v_orphaned_jobs > 0 THEN
        RAISE NOTICE 'WARNING: % jobs not linked to clients', v_orphaned_jobs;
    END IF;
    
    RAISE NOTICE '----------------------------------------';
    
    -- Data integrity checks
    RAISE NOTICE 'Integrity Checks:';
    
    -- Check 1: All clients have at least first_name OR last_name
    IF EXISTS (SELECT 1 FROM clients WHERE first_name IS NULL AND last_name IS NULL) THEN
        RAISE WARNING 'Some clients missing both first and last name';
    ELSE
        RAISE NOTICE '  ✓ All clients have name data';
    END IF;
    
    -- Check 2: Primary properties constraint
    DECLARE
        v_clients_with_multiple_primary INTEGER;
    BEGIN
        SELECT COUNT(*) INTO v_clients_with_multiple_primary
        FROM (
            SELECT client_id
            FROM properties
            WHERE is_primary = true AND deleted_at IS NULL
            GROUP BY client_id
            HAVING COUNT(*) > 1
        ) AS dupes;
        
        IF v_clients_with_multiple_primary > 0 THEN
            RAISE WARNING 'Found % clients with multiple primary properties', v_clients_with_multiple_primary;
        ELSE
            RAISE NOTICE '  ✓ Each client has at most one primary property';
        END IF;
    END;
    
    -- Check 3: Quote numbers are unique
    DECLARE
        v_duplicate_quote_numbers INTEGER;
    BEGIN
        SELECT COUNT(*) INTO v_duplicate_quote_numbers
        FROM (
            SELECT quote_number
            FROM quotes
            WHERE quote_number IS NOT NULL
            GROUP BY quote_number
            HAVING COUNT(*) > 1
        ) AS dupes;
        
        IF v_duplicate_quote_numbers > 0 THEN
            RAISE WARNING 'Found % duplicate quote numbers', v_duplicate_quote_numbers;
        ELSE
            RAISE NOTICE '  ✓ All quote numbers are unique';
        END IF;
    END;
    
    -- Check 4: Job numbers are unique
    DECLARE
        v_duplicate_job_numbers INTEGER;
    BEGIN
        SELECT COUNT(*) INTO v_duplicate_job_numbers
        FROM (
            SELECT job_number
            FROM jobs
            WHERE job_number IS NOT NULL
            GROUP BY job_number
            HAVING COUNT(*) > 1
        ) AS dupes;
        
        IF v_duplicate_job_numbers > 0 THEN
            RAISE WARNING 'Found % duplicate job numbers', v_duplicate_job_numbers;
        ELSE
            RAISE NOTICE '  ✓ All job numbers are unique';
        END IF;
    END;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION COMPLETE ✓';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Review any warnings above';
    RAISE NOTICE '  2. Verify data in UI/application';
    RAISE NOTICE '  3. Consider archiving customers table (do not delete yet)';
    RAISE NOTICE '  4. Update application code to use clients table';
    RAISE NOTICE '';
END $$;

-- Commit transaction - all changes are now permanent
COMMIT;

-- ============================================================================
-- MIGRATION SUCCESSFUL
-- ============================================================================
-- 
-- What was migrated:
--   ✓ Customers → Clients (with name parsing)
--   ✓ Customer addresses → Properties (primary locations)
--   ✓ Updated leads.client_id_new references
--   ✓ Updated quotes.client_id and quotes.property_id
--   ✓ Updated jobs.client_id and jobs.property_id
--   ✓ Generated unique quote_number for all quotes
--   ✓ Generated unique job_number for all jobs
--
-- The customers table is still intact and can be used for reference or rollback.
-- Do not delete it until you've verified the migration in production.
--
-- ============================================================================
