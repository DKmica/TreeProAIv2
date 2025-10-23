import { Invoice } from '../types';

/**
 * Simulates syncing an invoice to QuickBooks.
 * In a real app, this would make an API call to the QuickBooks API.
 * @param invoice - The invoice object to sync.
 * @returns A promise that resolves with a mock success response.
 */
export const syncInvoiceToQuickBooks = async (invoice: Invoice): Promise<{ success: true, qbInvoiceId: string }> => {
    console.log(`Syncing invoice ${invoice.id} to QuickBooks...`);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500)); 
    console.log(`Successfully synced invoice ${invoice.id}. QuickBooks ID: QB-${invoice.id}`);
    return { success: true, qbInvoiceId: `QB-${invoice.id}` };
};
