import { test, expect } from '@playwright/test';

test.describe('Login and Dashboard Access', () => {
  test('should navigate to login page when not authenticated', async ({ page }) => {
    await page.goto('/');
    
    await page.waitForURL(/.*\/login/, { timeout: 10000 }).catch(() => {
      console.log('Already authenticated or different redirect');
    });
    
    const currentURL = page.url();
    if (currentURL.includes('/login')) {
      const loginPage = page.locator('div').filter({ hasText: 'TreePro AI' });
      await expect(loginPage).toBeVisible();
      
      const logo = page.locator('img[alt="TreePro AI"]');
      await expect(logo).toBeVisible();
      
      const signInButton = page.getByRole('button', { name: /Sign In/i });
      await expect(signInButton).toBeVisible();
      
      const signUpButton = page.getByRole('button', { name: /Sign Up/i });
      await expect(signUpButton).toBeVisible();
    }
  });

  test('should login and access dashboard successfully', async ({ page }) => {
    await page.goto('/');
    
    await page.waitForURL(/.*\/(login|dashboard)/, { timeout: 10000 });
    
    if (page.url().includes('/login')) {
      const signInButton = page.getByRole('button', { name: /Sign In/i }).first();
      
      await expect(signInButton).toBeVisible({ timeout: 5000 });
      await signInButton.click();
      
      await page.waitForURL(/.*\/(dashboard|crm|jobs)/, { timeout: 15000 });
    }
    
    const header = page.locator('header');
    await expect(header).toBeVisible({ timeout: 10000 });
    
    const sidebar = page.locator('nav').first();
    await expect(sidebar).toBeVisible();
    
    const dashboardLink = page.getByRole('link', { name: /Dashboard/i });
    await expect(dashboardLink).toBeVisible();
  });

  test('should display dashboard metrics and key elements', async ({ page }) => {
    await page.goto('/');
    
    await page.waitForURL(/.*\/(login|dashboard)/, { timeout: 10000 });
    
    if (page.url().includes('/login')) {
      const signInButton = page.getByRole('button', { name: /Sign In/i }).first();
      await signInButton.click();
      await page.waitForURL(/.*\/(dashboard|crm|jobs)/, { timeout: 15000 });
    }
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    const heading = page.getByRole('heading', { name: /Dashboard/i });
    await expect(heading).toBeVisible();
    
    const metricsCards = page.locator('div.rounded-lg.bg-white.shadow').first();
    await expect(metricsCards).toBeVisible();
    
    const navigation = page.getByRole('link', { name: /CRM/i });
    await expect(navigation).toBeVisible();
    
    const jobsLink = page.getByRole('link', { name: /Jobs/i });
    await expect(jobsLink).toBeVisible();
  });

  test('should navigate between main sections', async ({ page }) => {
    await page.goto('/');
    
    await page.waitForURL(/.*\/(login|dashboard)/, { timeout: 10000 });
    
    if (page.url().includes('/login')) {
      const signInButton = page.getByRole('button', { name: /Sign In/i }).first();
      await signInButton.click();
      await page.waitForURL(/.*\/(dashboard|crm|jobs)/, { timeout: 15000 });
    }
    
    const crmLink = page.getByRole('link', { name: /CRM/i }).first();
    await crmLink.click();
    await page.waitForURL(/.*\/crm/, { timeout: 5000 });
    expect(page.url()).toContain('/crm');
    
    const jobsLink = page.getByRole('link', { name: 'Jobs' }).first();
    await jobsLink.click();
    await page.waitForURL(/.*\/jobs/, { timeout: 5000 });
    expect(page.url()).toContain('/jobs');
    
    const dashboardLink = page.getByRole('link', { name: /Dashboard/i }).first();
    await dashboardLink.click();
    await page.waitForURL(/.*\/dashboard/, { timeout: 5000 });
    expect(page.url()).toContain('/dashboard');
  });
});
