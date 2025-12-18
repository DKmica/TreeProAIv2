import { test, expect } from '@playwright/test';

test.describe('CRM - Create Client Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    await page.waitForURL(/.*\/(login|dashboard|crm)/, { timeout: 10000 });
    
    if (page.url().includes('/login')) {
      const signInButton = page.getByRole('button', { name: /Sign In/i }).first();
      await signInButton.click();
      await page.waitForURL(/.*\/(dashboard|crm|jobs)/, { timeout: 15000 });
    }
    
    await page.goto('/crm');
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to CRM page and see clients tab', async ({ page }) => {
    expect(page.url()).toContain('/crm');
    
    const heading = page.getByRole('heading', { name: /CRM/i }).first();
    await expect(heading).toBeVisible({ timeout: 5000 });
    
    const clientsTab = page.locator('button', { hasText: 'Clients' }).first();
    await expect(clientsTab).toBeVisible();
  });

  test('should open Add Client modal when clicking Add Client button', async ({ page }) => {
    const addClientButton = page.getByRole('button', { name: /Add Client/i });
    await expect(addClientButton).toBeVisible({ timeout: 5000 });
    
    await addClientButton.click();
    
    await page.waitForTimeout(500);
    
    const modalHeading = page.getByRole('heading', { name: /Add Client/i });
    await expect(modalHeading).toBeVisible({ timeout: 5000 });
    
    const firstNameInput = page.getByLabel(/First Name/i);
    await expect(firstNameInput).toBeVisible();
    
    const emailInput = page.getByLabel(/Email/i);
    await expect(emailInput).toBeVisible();
  });

  test('should create a new individual client successfully', async ({ page }) => {
    const addClientButton = page.getByRole('button', { name: /Add Client/i });
    await addClientButton.click();
    
    await page.waitForTimeout(500);
    
    const timestamp = Date.now();
    const testEmail = `test.client.${timestamp}@treepro.test`;
    
    const firstNameInput = page.getByLabel(/First Name/i);
    await firstNameInput.fill('John');
    
    const lastNameInput = page.getByLabel(/Last Name/i);
    await lastNameInput.fill('Doe');
    
    const emailInput = page.getByLabel(/Email/i);
    await emailInput.fill(testEmail);
    
    const phoneInput = page.getByLabel(/Phone/i);
    await phoneInput.fill('555-123-4567');
    
    const saveButton = page.getByRole('button', { name: /Save/i });
    await expect(saveButton).toBeVisible();
    await saveButton.click();
    
    await page.waitForTimeout(2000);
    
    const modalHeading = page.getByRole('heading', { name: /Add Client/i });
    await expect(modalHeading).not.toBeVisible({ timeout: 5000 });
    
    await page.waitForTimeout(1000);
    
    const clientEmail = page.locator(`text=${testEmail}`);
    await expect(clientEmail).toBeVisible({ timeout: 10000 });
  });

  test('should create a new company client successfully', async ({ page }) => {
    const addClientButton = page.getByRole('button', { name: /Add Client/i });
    await addClientButton.click();
    
    await page.waitForTimeout(500);
    
    const timestamp = Date.now();
    const testEmail = `company.${timestamp}@treepro.test`;
    
    const companyCheckbox = page.getByLabel(/This is a company/i);
    await companyCheckbox.check();
    
    await page.waitForTimeout(300);
    
    const companyNameInput = page.getByLabel(/Company Name/i);
    await companyNameInput.fill('Test Tree Services Inc');
    
    const emailInput = page.getByLabel(/Email/i);
    await emailInput.fill(testEmail);
    
    const phoneInput = page.getByLabel(/Phone/i);
    await phoneInput.fill('555-987-6543');
    
    const saveButton = page.getByRole('button', { name: /Save/i });
    await saveButton.click();
    
    await page.waitForTimeout(2000);
    
    const modalHeading = page.getByRole('heading', { name: /Add Client/i });
    await expect(modalHeading).not.toBeVisible({ timeout: 5000 });
    
    await page.waitForTimeout(1000);
    
    const companyName = page.locator('text=Test Tree Services Inc');
    await expect(companyName).toBeVisible({ timeout: 10000 });
  });

  test('should show validation errors for incomplete client form', async ({ page }) => {
    const addClientButton = page.getByRole('button', { name: /Add Client/i });
    await addClientButton.click();
    
    await page.waitForTimeout(500);
    
    const saveButton = page.getByRole('button', { name: /Save/i });
    await saveButton.click();
    
    await page.waitForTimeout(500);
    
    const errorMessages = page.locator('text=/required|Invalid/i');
    await expect(errorMessages.first()).toBeVisible({ timeout: 3000 });
  });

  test('should close client modal when clicking cancel or close', async ({ page }) => {
    const addClientButton = page.getByRole('button', { name: /Add Client/i });
    await addClientButton.click();
    
    await page.waitForTimeout(500);
    
    const modalHeading = page.getByRole('heading', { name: /Add Client/i });
    await expect(modalHeading).toBeVisible();
    
    const cancelButton = page.getByRole('button', { name: /Cancel/i });
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
    } else {
      const closeButton = page.locator('button').filter({ has: page.locator('svg') }).first();
      await closeButton.click();
    }
    
    await page.waitForTimeout(500);
    
    await expect(modalHeading).not.toBeVisible({ timeout: 3000 });
  });
});
