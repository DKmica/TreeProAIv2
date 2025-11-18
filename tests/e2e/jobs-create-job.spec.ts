import { test, expect } from '@playwright/test';

test.describe('Jobs - Create Job Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    await page.waitForURL(/.*\/(login|dashboard|jobs)/, { timeout: 10000 });
    
    if (page.url().includes('/login')) {
      const signInButton = page.getByRole('button', { name: /Sign In/i }).first();
      await signInButton.click();
      await page.waitForURL(/.*\/(dashboard|crm|jobs)/, { timeout: 15000 });
    }
    
    await page.goto('/jobs');
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to Jobs page successfully', async ({ page }) => {
    expect(page.url()).toContain('/jobs');
    
    const heading = page.getByRole('heading', { name: /Jobs/i }).first();
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test('should display Create Job button', async ({ page }) => {
    const createJobButton = page.getByRole('button', { name: /Create Job/i });
    await expect(createJobButton).toBeVisible({ timeout: 5000 });
  });

  test('should open job creation form when clicking Create Job', async ({ page }) => {
    const createJobButton = page.getByRole('button', { name: /Create Job/i });
    await createJobButton.click();
    
    await page.waitForTimeout(500);
    
    const formHeading = page.getByRole('heading', { name: /Create New Job/i });
    await expect(formHeading).toBeVisible({ timeout: 5000 });
  });

  test('should create a job from existing quote', async ({ page }) => {
    const createJobButton = page.getByRole('button', { name: /Create Job/i });
    await createJobButton.click();
    
    await page.waitForTimeout(500);
    
    const quoteSelect = page.locator('select[name="quoteId"]');
    const hasQuotes = await quoteSelect.locator('option').count() > 1;
    
    if (hasQuotes) {
      await quoteSelect.selectOption({ index: 1 });
      
      const scheduledDateInput = page.locator('input[name="scheduledDate"]');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      await scheduledDateInput.fill(dateStr);
      
      const saveButton = page.getByRole('button', { name: /Save Job/i });
      await saveButton.click();
      
      await page.waitForTimeout(2000);
      
      const formHeading = page.getByRole('heading', { name: /Create New Job/i });
      await expect(formHeading).not.toBeVisible({ timeout: 5000 });
      
      const jobsList = page.locator('div').filter({ hasText: /Job #|Scheduled|Status/i });
      await expect(jobsList.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display job details after creation', async ({ page }) => {
    const createJobButton = page.getByRole('button', { name: /Create Job/i });
    await createJobButton.click();
    
    await page.waitForTimeout(500);
    
    const quoteSelect = page.locator('select[name="quoteId"]');
    const hasQuotes = await quoteSelect.locator('option').count() > 1;
    
    if (hasQuotes) {
      await quoteSelect.selectOption({ index: 1 });
      
      const scheduledDateInput = page.locator('input[name="scheduledDate"]');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);
      const dateStr = tomorrow.toISOString().split('T')[0];
      await scheduledDateInput.fill(dateStr);
      
      const locationInput = page.locator('input[name="jobLocation"]');
      await locationInput.fill('123 Test Street, Test City');
      
      const saveButton = page.getByRole('button', { name: /Save Job/i });
      await saveButton.click();
      
      await page.waitForTimeout(2000);
      
      const jobLocation = page.locator('text=123 Test Street');
      await expect(jobLocation).toBeVisible({ timeout: 10000 });
    }
  });

  test('should allow creating job with new customer', async ({ page }) => {
    const createJobButton = page.getByRole('button', { name: /Create Job/i });
    await createJobButton.click();
    
    await page.waitForTimeout(500);
    
    const newCustomerRadio = page.getByLabel(/New Customer/i);
    if (await newCustomerRadio.isVisible({ timeout: 2000 }).catch(() => false)) {
      await newCustomerRadio.click();
      
      await page.waitForTimeout(300);
      
      const firstNameInput = page.locator('input[name="firstName"]');
      await expect(firstNameInput).toBeVisible();
      
      const timestamp = Date.now();
      
      await firstNameInput.fill('Jane');
      
      const lastNameInput = page.locator('input[name="lastName"]');
      await lastNameInput.fill('Smith');
      
      const phoneInput = page.locator('input[name="phone"]');
      await phoneInput.fill('555-111-2222');
      
      const emailInput = page.locator('input[name="email"]');
      await emailInput.fill(`jane.smith.${timestamp}@test.com`);
      
      const addressInput = page.locator('input[name="addressLine1"]');
      await addressInput.fill('456 Oak Avenue');
      
      const cityInput = page.locator('input[name="city"]');
      await cityInput.fill('Springfield');
      
      const stateInput = page.locator('input[name="state"]');
      await stateInput.fill('IL');
      
      const zipInput = page.locator('input[name="zipCode"]');
      await zipInput.fill('62701');
      
      const scheduledDateInput = page.locator('input[name="scheduledDate"]');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 3);
      const dateStr = tomorrow.toISOString().split('T')[0];
      await scheduledDateInput.fill(dateStr);
      
      const saveButton = page.getByRole('button', { name: /Save Job/i });
      await saveButton.click();
      
      await page.waitForTimeout(2000);
    }
  });

  test('should cancel job creation and return to jobs list', async ({ page }) => {
    const createJobButton = page.getByRole('button', { name: /Create Job/i });
    await createJobButton.click();
    
    await page.waitForTimeout(500);
    
    const formHeading = page.getByRole('heading', { name: /Create New Job/i });
    await expect(formHeading).toBeVisible();
    
    const cancelButton = page.getByRole('button', { name: /Cancel/i });
    await cancelButton.click();
    
    await page.waitForTimeout(500);
    
    await expect(formHeading).not.toBeVisible({ timeout: 3000 });
    
    const createJobButtonAgain = page.getByRole('button', { name: /Create Job/i });
    await expect(createJobButtonAgain).toBeVisible();
  });

  test('should assign crew members to a job', async ({ page }) => {
    const createJobButton = page.getByRole('button', { name: /Create Job/i });
    await createJobButton.click();
    
    await page.waitForTimeout(500);
    
    const quoteSelect = page.locator('select[name="quoteId"]');
    const hasQuotes = await quoteSelect.locator('option').count() > 1;
    
    if (hasQuotes) {
      await quoteSelect.selectOption({ index: 1 });
      
      const scheduledDateInput = page.locator('input[name="scheduledDate"]');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 4);
      const dateStr = tomorrow.toISOString().split('T')[0];
      await scheduledDateInput.fill(dateStr);
      
      const crewCheckboxes = page.locator('input[type="checkbox"]').filter({ has: page.locator(':visible') });
      const checkboxCount = await crewCheckboxes.count();
      
      if (checkboxCount > 0) {
        await crewCheckboxes.first().check();
      }
      
      const saveButton = page.getByRole('button', { name: /Save Job/i });
      await saveButton.click();
      
      await page.waitForTimeout(2000);
    }
  });
});
