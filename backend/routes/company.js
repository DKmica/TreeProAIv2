const express = require('express');
const router = express.Router();
const db = require('../db');

const handleError = (res, err) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
};

const transformCompanyProfile = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    companyName: row.company_name,
    legalName: row.legal_name,
    phoneNumber: row.phone_number,
    email: row.email,
    address: row.address,
    city: row.city,
    state: row.state,
    zipCode: row.zip_code,
    website: row.website,
    logoUrl: row.logo_url,
    tagline: row.tagline,
    businessHours: row.business_hours,
    licenseNumber: row.license_number,
    insurancePolicyNumber: row.insurance_policy_number,
    taxEin: row.tax_ein,
    about: row.about,
    services: row.services,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const transformToDb = (data) => {
  const result = {};
  const fieldMap = {
    companyName: 'company_name',
    legalName: 'legal_name',
    phoneNumber: 'phone_number',
    email: 'email',
    address: 'address',
    city: 'city',
    state: 'state',
    zipCode: 'zip_code',
    website: 'website',
    logoUrl: 'logo_url',
    tagline: 'tagline',
    businessHours: 'business_hours',
    licenseNumber: 'license_number',
    insurancePolicyNumber: 'insurance_policy_number',
    taxEin: 'tax_ein',
    about: 'about',
    services: 'services'
  };
  
  for (const [key, value] of Object.entries(data)) {
    if (fieldMap[key]) {
      result[fieldMap[key]] = value;
    } else if (Object.values(fieldMap).includes(key)) {
      result[key] = value;
    }
  }
  return result;
};

router.get('/company-profile', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM company_profile LIMIT 1');
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Company profile not found' });
    }
    res.json(transformCompanyProfile(rows[0]));
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/company-profile', async (req, res) => {
  try {
    const { rows: existingRows } = await db.query('SELECT * FROM company_profile LIMIT 1');
    if (existingRows.length === 0) {
      return res.status(404).json({ error: 'Company profile not found' });
    }
    
    const data = transformToDb(req.body);
    
    const allowedColumns = [
      'company_name', 'legal_name', 'phone_number', 'email', 'address', 
      'city', 'state', 'zip_code', 'website', 'logo_url', 'tagline', 
      'business_hours', 'license_number', 'insurance_policy_number', 
      'tax_ein', 'about', 'services', 'updated_at'
    ];
    
    const columns = Object.keys(data).filter(col => allowedColumns.includes(col));
    const values = columns.map(col => data[col]);
    const setString = columns.map((col, i) => `${col} = $${i + 2}`).join(', ');
    
    if (columns.length === 0) {
      return res.json(transformCompanyProfile(existingRows[0]));
    }
    
    const queryText = `UPDATE company_profile SET ${setString}, updated_at = NOW() WHERE id = $1 RETURNING *`;
    const { rows } = await db.query(queryText, [existingRows[0].id, ...values]);
    
    res.json(transformCompanyProfile(rows[0]));
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
