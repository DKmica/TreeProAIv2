/**
 * Global Search Service
 * Searches across all entity types (leads, quotes, jobs, invoices, clients)
 */

const db = require('../db');

async function globalSearch(query, options = {}) {
  if (!query || query.length < 2) {
    return { results: [], total: 0 };
  }

  const searchTerm = `%${query}%`;
  const results = [];
  
  try {
    // Search Leads
    const leads = await db.query(
      `SELECT id, 'lead' as type, name, description, status, created_at
       FROM leads
       WHERE (name ILIKE $1 OR description ILIKE $1 OR source ILIKE $1)
       AND deleted_at IS NULL
       LIMIT 10`,
      [searchTerm]
    );
    
    // Search Quotes
    const quotes = await db.query(
      `SELECT id, 'quote' as type, quote_number as name, customer_name as description, status, created_at
       FROM quotes
       WHERE (quote_number ILIKE $1 OR customer_name ILIKE $1)
       AND deleted_at IS NULL
       LIMIT 10`,
      [searchTerm]
    );
    
    // Search Jobs
    const jobs = await db.query(
      `SELECT id, 'job' as type, job_number as name, customer_name as description, status, created_at
       FROM jobs
       WHERE (job_number ILIKE $1 OR customer_name ILIKE $1)
       AND deleted_at IS NULL
       LIMIT 10`,
      [searchTerm]
    );
    
    // Search Invoices
    const invoices = await db.query(
      `SELECT id, 'invoice' as type, invoice_number as name, customer_name as description, status, created_at
       FROM invoices
       WHERE (invoice_number ILIKE $1 OR customer_name ILIKE $1)
       AND deleted_at IS NULL
       LIMIT 10`,
      [searchTerm]
    );
    
    // Search Clients
    const clients = await db.query(
      `SELECT id, 'client' as type, company_name as name, (first_name || ' ' || last_name) as description, status, created_at
       FROM clients
       WHERE (company_name ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1 OR primary_email ILIKE $1)
       AND deleted_at IS NULL
       LIMIT 10`,
      [searchTerm]
    );
    
    return {
      results: [
        ...leads.rows.map(r => ({ ...r, category: 'Sales' })),
        ...quotes.rows.map(r => ({ ...r, category: 'Sales' })),
        ...jobs.rows.map(r => ({ ...r, category: 'Operations' })),
        ...invoices.rows.map(r => ({ ...r, category: 'Finance' })),
        ...clients.rows.map(r => ({ ...r, category: 'CRM' }))
      ],
      total: leads.rows.length + quotes.rows.length + jobs.rows.length + invoices.rows.length + clients.rows.length
    };
  } catch (error) {
    console.error('Global search error:', error);
    throw error;
  }
}

module.exports = { globalSearch };
