# E2E Tests for TreePro AI

This directory contains end-to-end (E2E) tests for TreePro AI using Playwright. These tests simulate real user interactions in a browser to validate critical user journeys.

## Test Files

### 1. `login-dashboard.spec.ts`
Tests the login flow and dashboard access:
- Navigation to login page when not authenticated
- Login button functionality
- Dashboard metrics and key elements visibility
- Navigation between main sections

### 2. `crm-create-client.spec.ts`
Tests the CRM client creation flow:
- Opening the Add Client modal
- Creating individual clients
- Creating company clients
- Form validation
- Client visibility in CRM list after creation

### 3. `jobs-create-job.spec.ts`
Tests the job creation flow:
- Opening the Create Job form
- Creating jobs from existing quotes
- Creating jobs with new customers
- Assigning crew members
- Job visibility in jobs list after creation

## Running the Tests

### Prerequisites

Make sure you have:
1. Node.js installed
2. Dependencies installed: `npm install`
3. Playwright browsers installed: `npx playwright install chromium`
4. Both frontend and backend servers running on port 5000 and the backend port

### Run All E2E Tests

```bash
npm run test:e2e
```

### Run Tests in UI Mode (Recommended for Development)

```bash
npm run test:e2e:ui
```

This opens Playwright's interactive UI where you can:
- See tests run in real-time
- Inspect each step
- Time-travel through test execution
- Debug failures easily

### Run Tests in Headed Mode (Visible Browser)

```bash
npm run test:e2e:headed
```

### Debug a Specific Test

```bash
npm run test:e2e:debug
```

Or debug a specific file:

```bash
npx playwright test tests/e2e/login-dashboard.spec.ts --debug
```

### View Test Report

After running tests, view the HTML report:

```bash
npm run test:e2e:report
```

## Test Configuration

The test configuration is in `playwright.config.ts` at the project root. Key settings:

- **baseURL**: `http://localhost:5000` - Frontend server
- **timeout**: 60 seconds per test
- **actionTimeout**: 15 seconds for individual actions
- **workers**: 1 (tests run sequentially)
- **retries**: 2 in CI, 0 locally
- **screenshots**: Captured on failure
- **videos**: Retained on failure
- **trace**: Captured on first retry

## Writing New Tests

When writing new E2E tests:

1. **Use semantic locators**: Prefer `getByRole`, `getByLabel`, `getByText` over CSS selectors
2. **Handle authentication**: All tests should handle login state
3. **Use appropriate waits**: `waitForURL`, `waitForLoadState('networkidle')`
4. **Add timeouts**: Allow sufficient time for network requests
5. **Generate unique data**: Use timestamps for unique emails, names, etc.
6. **Verify success**: Always check that the action was successful (UI updates, messages)
7. **Clean up**: Tests should be independent and not rely on previous test state

### Example Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate and login
    await page.goto('/');
    // Handle authentication...
  });

  test('should perform action successfully', async ({ page }) => {
    // Arrange
    const timestamp = Date.now();
    
    // Act
    await page.getByRole('button', { name: /Create/i }).click();
    await page.getByLabel(/Name/i).fill(`Test ${timestamp}`);
    await page.getByRole('button', { name: /Save/i }).click();
    
    // Assert
    await expect(page.locator(`text=Test ${timestamp}`)).toBeVisible();
  });
});
```

## Authentication Handling

TreePro AI uses Replit Auth. The tests handle authentication by:

1. Checking if redirected to `/login`
2. Clicking the "Sign In" button if on login page
3. Waiting for redirect to dashboard or main app
4. Verifying authenticated state by checking for header/sidebar

## Troubleshooting

### Tests Timeout

- Ensure both frontend (port 5000) and backend servers are running
- Check that the database is properly initialized
- Increase timeout in `playwright.config.ts` if needed

### Element Not Found

- Use Playwright Inspector: `npm run test:e2e:debug`
- Check if element is in an iframe
- Verify the selector matches the actual DOM
- Add appropriate waits before interacting with elements

### Flaky Tests

- Add explicit waits: `await page.waitForLoadState('networkidle')`
- Use `waitForTimeout` sparingly (only when necessary)
- Check for race conditions
- Ensure unique test data (timestamps, UUIDs)

### Browser Not Installed

If you see "Executable doesn't exist" error:

```bash
npx playwright install chromium
```

## CI/CD Integration

In CI environments:

- Tests run with 2 retries automatically
- Use headless mode (default)
- Browsers install automatically via Playwright
- Set `CI=true` environment variable

## Best Practices

1. **Keep tests focused**: One feature/flow per test
2. **Use descriptive names**: Test names should explain what they verify
3. **Avoid hard-coded waits**: Use dynamic waits when possible
4. **Test user journeys**: Focus on critical paths users take
5. **Handle errors gracefully**: Add error handling for better debugging
6. **Keep tests maintainable**: Use page objects for complex flows
7. **Run regularly**: Integrate into your development workflow

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright Locators Guide](https://playwright.dev/docs/locators)
- [Playwright Test API](https://playwright.dev/docs/api/class-test)
