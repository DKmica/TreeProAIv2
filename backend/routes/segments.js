const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { v4: uuidv4 } = require('uuid');

const defaultSegments = [
  {
    id: 'seg-high-value',
    name: 'High Value Customers',
    description: 'Customers with lifetime value over $5,000',
    criteria: [
      { id: 'c1', field: 'lifetimeValue', operator: 'gte', value: 5000, label: 'Lifetime value >= $5,000' }
    ],
    audienceCount: 0,
    sampleTags: ['premium', 'repeat']
  },
  {
    id: 'seg-residential',
    name: 'Residential Clients',
    description: 'All residential property owners',
    criteria: [
      { id: 'c2', field: 'clientType', operator: 'equals', value: 'residential', label: 'Client type is Residential' }
    ],
    audienceCount: 0,
    sampleTags: ['homeowner']
  },
  {
    id: 'seg-commercial',
    name: 'Commercial Clients',
    description: 'All commercial and property manager clients',
    criteria: [
      { id: 'c3', field: 'clientType', operator: 'in', value: ['commercial', 'property_manager'], label: 'Client type is Commercial or Property Manager' }
    ],
    audienceCount: 0,
    sampleTags: ['business', 'contract']
  },
  {
    id: 'seg-active',
    name: 'Active Customers',
    description: 'Customers who have had a job in the last 6 months',
    criteria: [
      { id: 'c4', field: 'lastServiceDate', operator: 'after', value: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), label: 'Last service within 6 months' }
    ],
    audienceCount: 0,
    sampleTags: ['active', 'engaged']
  },
  {
    id: 'seg-dormant',
    name: 'Dormant Customers',
    description: 'Customers with no activity in over a year',
    criteria: [
      { id: 'c5', field: 'lastServiceDate', operator: 'before', value: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), label: 'No service in 1+ year' }
    ],
    audienceCount: 0,
    sampleTags: ['win-back', 'reactivation']
  }
];

async function calculateAudienceCount(criteria) {
  try {
    let whereConditions = ['c.deleted_at IS NULL'];
    const params = [];
    let paramIndex = 1;

    for (const criterion of criteria) {
      switch (criterion.field) {
        case 'lifetimeValue':
          if (criterion.operator === 'gte') {
            whereConditions.push(`c.lifetime_value >= $${paramIndex}`);
            params.push(criterion.value);
            paramIndex++;
          } else if (criterion.operator === 'lte') {
            whereConditions.push(`c.lifetime_value <= $${paramIndex}`);
            params.push(criterion.value);
            paramIndex++;
          }
          break;
        case 'clientType':
          if (criterion.operator === 'equals') {
            whereConditions.push(`c.client_type = $${paramIndex}`);
            params.push(criterion.value);
            paramIndex++;
          } else if (criterion.operator === 'in' && Array.isArray(criterion.value)) {
            const placeholders = criterion.value.map((_, i) => `$${paramIndex + i}`).join(', ');
            whereConditions.push(`c.client_type IN (${placeholders})`);
            params.push(...criterion.value);
            paramIndex += criterion.value.length;
          }
          break;
        case 'lastServiceDate':
          break;
        default:
          break;
      }
    }

    const sql = `
      SELECT COUNT(DISTINCT c.id) as count
      FROM clients c
      WHERE ${whereConditions.join(' AND ')}
    `;

    const result = await query(sql, params);
    return parseInt(result.rows[0]?.count || 0, 10);
  } catch (err) {
    console.error('Error calculating audience count:', err);
    return 0;
  }
}

router.get('/segments', async (req, res) => {
  try {
    const segmentsWithCounts = await Promise.all(
      defaultSegments.map(async (segment) => {
        const audienceCount = await calculateAudienceCount(segment.criteria);
        return {
          ...segment,
          audienceCount,
          lastRefreshed: new Date().toISOString()
        };
      })
    );

    res.json({ success: true, data: segmentsWithCounts });
  } catch (err) {
    console.error('Error fetching segments:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch segments' });
  }
});

router.get('/segments/:id', async (req, res) => {
  try {
    const segment = defaultSegments.find(s => s.id === req.params.id);
    if (!segment) {
      return res.status(404).json({ success: false, error: 'Segment not found' });
    }

    const audienceCount = await calculateAudienceCount(segment.criteria);
    res.json({
      success: true,
      data: {
        ...segment,
        audienceCount,
        lastRefreshed: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Error fetching segment:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch segment' });
  }
});

router.get('/segments/:id/preview', async (req, res) => {
  try {
    const segment = defaultSegments.find(s => s.id === req.params.id);
    if (!segment) {
      return res.status(404).json({ success: false, error: 'Segment not found' });
    }

    const audienceCount = await calculateAudienceCount(segment.criteria);
    res.json({
      success: true,
      data: {
        audienceCount,
        sampleTags: segment.sampleTags || []
      }
    });
  } catch (err) {
    console.error('Error previewing segment:', err);
    res.status(500).json({ success: false, error: 'Failed to preview segment' });
  }
});

router.get('/segments/:id/clients', async (req, res) => {
  try {
    const segment = defaultSegments.find(s => s.id === req.params.id);
    if (!segment) {
      return res.status(404).json({ success: false, error: 'Segment not found' });
    }

    const result = await query(`
      SELECT id, first_name, last_name, company_name, primary_email, client_type, lifetime_value
      FROM clients
      WHERE deleted_at IS NULL
      LIMIT 100
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error('Error fetching segment clients:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch segment clients' });
  }
});

module.exports = router;
