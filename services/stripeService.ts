import { Invoice } from '../types';

/**
 * Simulates creating a Stripe payment link for an invoice.
 * In a real app, this would make an API call to your backend, which then calls the Stripe API.
 * @param invoice - The invoice to create a payment link for.
 * @returns A promise that resolves with a mock success response containing a dummy URL.
 */
export const createStripePaymentLink = async (invoice: Invoice): Promise<{ success: true, url: string }> => {
    console.log(`Creating Stripe payment link for invoice ${invoice.id}...`);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1200)); 
    const stripeUrl = `https://checkout.stripe.com/pay/mock_session_for_${invoice.id}`;
    console.log(`Stripe payment link created: ${stripeUrl}`);
    return { success: true, url: stripeUrl };
};
