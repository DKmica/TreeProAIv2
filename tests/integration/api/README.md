# Backend API Integration Tests

This directory contains comprehensive integration tests for the TreePro AI backend API.

## Test Coverage

**Total: 70 integration tests** covering 5 main API modules:

- **clients.test.ts** (17 tests) - Client management, properties, and contacts
- **leads.test.ts** (9 tests) - Lead tracking and management
- **quotes.test.ts** (14 tests) - Quote creation, approval, and job conversion
- **jobs.test.ts** (14 tests) - Job management and state transitions
- **invoices.test.ts** (16 tests) - Invoice creation and payment processing

## Prerequisites

1. **Backend server must be running** on port 3001
   ```bash
   npm run dev:backend
   ```

2. **PostgreSQL database** must be accessible (via DATABASE_URL env variable)

3. **Test dependencies** must be installed
   ```bash
   npm install
   ```

## Running Tests

### Run all integration tests
```bash
npm run test:integration:api
```

### Run specific test file
```bash
npx vitest run tests/integration/api/clients.test.ts
npx vitest run tests/integration/api/leads.test.ts
npx vitest run tests/integration/api/quotes.test.ts
npx vitest run tests/integration/api/jobs.test.ts
npx vitest run tests/integration/api/invoices.test.ts
```

### Run tests in watch mode
```bash
npm run test:watch tests/integration/api
```

### Run tests with UI
```bash
npm run test:ui
```

### Run tests with coverage
```bash
npm run test:coverage
```

## Test Structure

Each test file follows this pattern:

1. **Setup** - Create test data
2. **Success cases** - Test valid API operations (200, 201, 204 responses)
3. **Error cases** - Test validation and error handling (400, 404 responses)
4. **Cleanup** - Delete test data

## API Endpoint Coverage

### Clients API
✅ GET /api/clients - List all clients  
✅ POST /api/clients - Create new client  
✅ GET /api/clients/:id - Get single client  
✅ PUT /api/clients/:id - Update client  
✅ DELETE /api/clients/:id - Soft delete client  
✅ GET /api/clients/:clientId/properties - Get client properties  
✅ POST /api/clients/:clientId/properties - Add property  
✅ GET /api/clients/:clientId/contacts - Get client contacts  
✅ POST /api/clients/:clientId/contacts - Add contact  

### Leads API
✅ GET /api/leads - List all leads with customer info  
✅ POST /api/leads - Create new lead  
✅ GET /api/leads/:id - Get single lead  
✅ PUT /api/leads/:id - Update lead  
✅ DELETE /api/leads/:id - Delete lead  

### Quotes API
✅ GET /api/quotes - List all quotes  
✅ POST /api/quotes - Create quote with line items  
✅ GET /api/quotes/:id - Get single quote  
✅ PUT /api/quotes/:id - Update quote  
✅ DELETE /api/quotes/:id - Soft delete quote  
✅ POST /api/quotes/:id/approve - Approve quote  
✅ POST /api/quotes/:id/convert-to-job - Convert to job  

### Jobs API
✅ GET /api/jobs - List all jobs  
✅ POST /api/jobs - Create new job  
✅ GET /api/jobs/:id - Get single job  
✅ PUT /api/jobs/:id - Update job  
✅ DELETE /api/jobs/:id - Delete job  
✅ GET /api/jobs/:id/allowed-transitions - Get allowed transitions  
✅ POST /api/jobs/:id/state-transitions - Transition job state  

### Invoices API
✅ GET /api/invoices - List all invoices  
✅ POST /api/invoices - Create invoice with line items  
✅ GET /api/invoices/:id - Get single invoice  
✅ PUT /api/invoices/:id - Update invoice  
✅ POST /api/invoices/:id/payments - Record payment  
✅ GET /api/invoices/:id/payments - Get payment history  
✅ DELETE /api/invoices/:id - Void invoice  

## Important Notes

- **Backend Port**: Tests connect to `http://localhost:3001` (configured in each test file)
- **Data Transformation**: Backend transforms snake_case (database) to camelCase (API responses)
- **Soft Deletes**: Some endpoints (clients, quotes) use soft delete with `deleted_at` field
- **Test Data**: Tests create and clean up their own test data using realistic values
- **Database**: Tests interact with the actual database configured in DATABASE_URL

## Troubleshooting

### Backend not running
```
Error: connect ECONNREFUSED ::1:3001
```
**Solution**: Start the backend server with `npm run dev:backend`

### Database connection error
```
Error: DATABASE_URL not configured
```
**Solution**: Ensure DATABASE_URL environment variable is set in backend/.env

### Tests failing
1. Check backend server logs for errors
2. Verify database is accessible
3. Ensure all dependencies are installed
4. Check test data isn't conflicting with existing data

## Next Steps

To extend these tests:
1. Add authentication/authorization tests
2. Add tests for edge cases and boundary conditions
3. Add performance/load testing
4. Add integration tests for file uploads
5. Add tests for concurrent operations
