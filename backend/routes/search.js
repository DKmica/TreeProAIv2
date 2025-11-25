const express = require('express');
const router = express.Router();
const db = require('../db');

function escapeLikePattern(str) {
  return str.replace(/[!%_]/g, (match) => '!' + match);
}

router.get('/', async (req, res) => {
  try {
    const { q: searchQuery } = req.query;
    
    if (!searchQuery || searchQuery.length < 2) {
      return res.json({ results: [] });
    }

    const escapedQuery = escapeLikePattern(searchQuery.toLowerCase());
    const searchTerm = `%${escapedQuery}%`;
    const results = [];

    const clientsQuery = `
      SELECT 
        id, 
        COALESCE(company_name, first_name || ' ' || last_name) as name,
        primary_email as subtitle,
        status,
        'client' as type
      FROM clients
      WHERE 
        LOWER(COALESCE(company_name, '')) LIKE $1 ESCAPE '!'
        OR LOWER(COALESCE(first_name, '')) LIKE $1 ESCAPE '!'
        OR LOWER(COALESCE(last_name, '')) LIKE $1 ESCAPE '!'
        OR LOWER(COALESCE(primary_email, '')) LIKE $1 ESCAPE '!'
        OR LOWER(COALESCE(primary_phone, '')) LIKE $1 ESCAPE '!'
      LIMIT 5
    `;

    const leadsQuery = `
      SELECT 
        id,
        name,
        email as subtitle,
        status,
        'lead' as type
      FROM leads
      WHERE 
        LOWER(COALESCE(name, '')) LIKE $1 ESCAPE '!'
        OR LOWER(COALESCE(email, '')) LIKE $1 ESCAPE '!'
        OR LOWER(COALESCE(phone, '')) LIKE $1 ESCAPE '!'
        OR LOWER(COALESCE(address, '')) LIKE $1 ESCAPE '!'
      LIMIT 5
    `;

    const quotesQuery = `
      SELECT 
        q.id,
        COALESCE(c.company_name, c.first_name || ' ' || c.last_name, l.name, 'Quote #' || SUBSTRING(q.id::text, 1, 8)) as name,
        '$' || COALESCE(q.total, 0)::text as subtitle,
        q.status,
        'quote' as type
      FROM quotes q
      LEFT JOIN clients c ON q.customer_id = c.id
      LEFT JOIN leads l ON q.lead_id = l.id
      WHERE 
        LOWER(COALESCE(c.company_name, '')) LIKE $1 ESCAPE '!'
        OR LOWER(COALESCE(c.first_name, '')) LIKE $1 ESCAPE '!'
        OR LOWER(COALESCE(c.last_name, '')) LIKE $1 ESCAPE '!'
        OR LOWER(COALESCE(l.name, '')) LIKE $1 ESCAPE '!'
        OR q.id::text LIKE $1 ESCAPE '!'
      LIMIT 5
    `;

    const jobsQuery = `
      SELECT 
        j.id,
        COALESCE(c.company_name, c.first_name || ' ' || c.last_name, 'Job #' || SUBSTRING(j.id::text, 1, 8)) as name,
        j.title as subtitle,
        j.status,
        'job' as type
      FROM jobs j
      LEFT JOIN clients c ON j.customer_id = c.id
      WHERE 
        LOWER(COALESCE(j.title, '')) LIKE $1 ESCAPE '!'
        OR LOWER(COALESCE(j.description, '')) LIKE $1 ESCAPE '!'
        OR LOWER(COALESCE(c.company_name, '')) LIKE $1 ESCAPE '!'
        OR LOWER(COALESCE(c.first_name, '')) LIKE $1 ESCAPE '!'
        OR j.id::text LIKE $1 ESCAPE '!'
      LIMIT 5
    `;

    const invoicesQuery = `
      SELECT 
        i.id,
        COALESCE('INV-' || i.invoice_number, 'Invoice #' || SUBSTRING(i.id::text, 1, 8)) as name,
        '$' || COALESCE(i.total, 0)::text as subtitle,
        i.status,
        'invoice' as type
      FROM invoices i
      LEFT JOIN clients c ON i.customer_id = c.id
      WHERE 
        LOWER(COALESCE(i.invoice_number, '')) LIKE $1 ESCAPE '!'
        OR LOWER(COALESCE(c.company_name, '')) LIKE $1 ESCAPE '!'
        OR i.id::text LIKE $1 ESCAPE '!'
      LIMIT 5
    `;

    const employeesQuery = `
      SELECT 
        id,
        name,
        role as subtitle,
        status,
        'employee' as type
      FROM employees
      WHERE 
        LOWER(COALESCE(name, '')) LIKE $1 ESCAPE '!'
        OR LOWER(COALESCE(email, '')) LIKE $1 ESCAPE '!'
        OR LOWER(COALESCE(role, '')) LIKE $1 ESCAPE '!'
      LIMIT 5
    `;

    const equipmentQuery = `
      SELECT 
        id,
        name,
        type as subtitle,
        status,
        'equipment' as type
      FROM equipment
      WHERE 
        LOWER(COALESCE(name, '')) LIKE $1 ESCAPE '!'
        OR LOWER(COALESCE(type, '')) LIKE $1 ESCAPE '!'
        OR LOWER(COALESCE(serial_number, '')) LIKE $1 ESCAPE '!'
      LIMIT 5
    `;

    const [
      clientsResult,
      leadsResult,
      quotesResult,
      jobsResult,
      invoicesResult,
      employeesResult,
      equipmentResult
    ] = await Promise.all([
      db.query(clientsQuery, [searchTerm]).catch(() => ({ rows: [] })),
      db.query(leadsQuery, [searchTerm]).catch(() => ({ rows: [] })),
      db.query(quotesQuery, [searchTerm]).catch(() => ({ rows: [] })),
      db.query(jobsQuery, [searchTerm]).catch(() => ({ rows: [] })),
      db.query(invoicesQuery, [searchTerm]).catch(() => ({ rows: [] })),
      db.query(employeesQuery, [searchTerm]).catch(() => ({ rows: [] })),
      db.query(equipmentQuery, [searchTerm]).catch(() => ({ rows: [] }))
    ]);

    results.push(...clientsResult.rows);
    results.push(...leadsResult.rows);
    results.push(...quotesResult.rows);
    results.push(...jobsResult.rows);
    results.push(...invoicesResult.rows);
    results.push(...employeesResult.rows);
    results.push(...equipmentResult.rows);

    const sortedResults = results.sort((a, b) => {
      const aMatch = a.name?.toLowerCase().startsWith(searchQuery.toLowerCase()) ? 0 : 1;
      const bMatch = b.name?.toLowerCase().startsWith(searchQuery.toLowerCase()) ? 0 : 1;
      return aMatch - bMatch;
    }).slice(0, 20);

    res.json({ results: sortedResults });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed', message: error.message });
  }
});

module.exports = router;
