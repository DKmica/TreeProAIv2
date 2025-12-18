# Database Migrations

## ⚠️ Important: Fresh Installations Use `backend/init.sql`

For **fresh database installations** (e.g., deployment to production), use:
```bash
psql $DATABASE_URL -f backend/init.sql
```

The `init.sql` file contains the **complete, consolidated schema** with all 38 tables needed for the application.

## Migration Files (Historical Reference Only)

The migration files in this directory document the **evolution of the schema** during development:

1. `001_phase1_crm_tables.sql` - CRM hierarchy (clients, properties, contacts), enhanced quotes
2. `002_job_state_machine.sql` - Job state machine with 10 states and transitions
3. `002_migrate_customers_to_clients.sql` - Data migration from old customers to new clients
4. `003_job_templates.sql` - Reusable job templates system
5. `004_phase2b_operations.sql` - Crew management, time tracking, forms, recurring jobs
6. `005_job_forms_table.sql` - Job forms table
7. `006_seed_form_templates.sql` - Seed data for form templates
8. `007_client_category.sql` - Client category field
9. `008_stripe_customer_id.sql` - Stripe customer ID integration

**These migration files are NOT executed on deployment.** They are kept for:
- Historical reference
- Understanding schema evolution
- Development environment updates (when applying incremental changes)

## Schema Consolidation

All table definitions from these migrations have been consolidated into `backend/init.sql` for deployment purposes. This ensures:
- ✅ Single source of truth for fresh installations
- ✅ No missing tables or foreign key conflicts
- ✅ Consistent schema across all environments
- ✅ Simplified deployment process

## Development Workflow

**For fresh database setup:**
```bash
psql $DATABASE_URL -f backend/init.sql
```

**For incremental schema changes during development:**
1. Modify the table definitions in `backend/init.sql`
2. Create a new migration file if you need to transform existing data
3. Test locally before deploying
