const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const db = require('./db');
const { v4: uuidv4 } = require('uuid');
const { setupAuth, isAuthenticated, getUser } = require('./replitAuth');
const ragService = require('./services/ragService');
const vectorStore = require('./services/vectorStore');
const jobStateService = require('./services/jobStateService');
const jobTemplateService = require('./services/jobTemplateService');

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

app.use(cors());
app.use(express.json());

const apiRouter = express.Router();

const handleError = (res, err) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
};

const collectionDocIdPrefixes = {
  clients: 'client',
  leads: 'lead',
  quotes: 'quote',
  jobs: 'job',
  employees: 'employee',
  equipment: 'equipment'
};

const reindexDocument = async (tableName, row) => {
  if (!row) return;

  try {
    console.log(`[RAG] Re-indexing document for ${tableName} ID: ${row.id}`);
    switch (tableName) {
      case 'clients':
        await ragService.indexCustomers([row]);
        break;
      case 'leads':
        {
          const { rows: leads } = await db.query(`
            SELECT l.*, 
                   CONCAT(c.first_name, ' ', c.last_name) as customer_name,
                   c.billing_address_line1 as address, 
                   c.primary_phone as phone, 
                   c.primary_email as email
            FROM leads l LEFT JOIN clients c ON l.client_id_new = c.id
            WHERE l.id = $1
          `, [row.id]);
          if (leads.length) {
            await ragService.indexLeads(leads);
          }
        }
        break;
      case 'quotes':
        await ragService.indexQuotes([row]);
        break;
      case 'jobs':
        await ragService.indexJobs([row]);
        break;
      case 'employees':
        await ragService.indexEmployees([row]);
        break;
      case 'equipment':
        await ragService.indexEquipment([row]);
        break;
      default:
        break;
    }
    console.log('[RAG] Re-indexing complete.');
  } catch (err) {
    console.error('[RAG] Failed to re-index document:', err);
  }
};

const removeFromVectorStore = async (tableName, id) => {
  const prefix = collectionDocIdPrefixes[tableName];
  if (!prefix) {
    return;
  }

  try {
    await vectorStore.removeDocument(tableName, `${prefix}_${id}`);
  } catch (err) {
    console.error('[RAG] Error removing document from vector store:', err);
  }
};

const scheduleFinancialReminders = () => {
  const ONE_DAY = 24 * 60 * 60 * 1000;

  const parseDate = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const run = async () => {
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const { rows: invoices } = await db.query('SELECT * FROM invoices');
      invoices.forEach(invoice => {
        const dueDate = parseDate(invoice.due_date);
        if (!dueDate) return;

        const diffDays = Math.floor((dueDate.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0 || diffDays === 3 || diffDays === -7) {
          const statusLabel = diffDays === 0 ? 'due today' : diffDays === 3 ? 'due in 3 days' : '7 days overdue';
          console.log(`📬 [Invoice Reminder] Invoice ${invoice.id} for ${invoice.customer_name} is ${statusLabel}. Amount: $${invoice.amount}.`);
        }
      });

      const { rows: quotes } = await db.query("SELECT * FROM quotes WHERE status = 'Sent'");
      quotes.forEach(quote => {
        const createdAt = parseDate(quote.created_at);
        if (!createdAt) return;

        const ageDays = Math.floor((startOfToday.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        if (ageDays >= 14) {
          console.log(`📧 [Quote Follow-up] Quote ${quote.id} for ${quote.customer_name} has been open for ${ageDays} days. Consider a polite follow-up.`);
        }
      });
    } catch (error) {
      console.error('Automated reminder check failed:', error);
    }
  };

  run();
  setInterval(run, ONE_DAY);
};

// Helper function to transform database row to API format
const transformRow = (row, tableName) => {
  if (!row) return null;
  
  const transformed = { ...row };
  
  // Handle coordinate fields
  if (tableName === 'clients' || tableName === 'employees') {
    if (row.lat !== undefined && row.lon !== undefined) {
      transformed.coordinates = { lat: row.lat, lng: row.lon };
      delete transformed.lat;
      delete transformed.lon;
    }
  }
  
  // Transform employees fields
  if (tableName === 'employees') {
    if (row.job_title !== undefined) {
      transformed.jobTitle = row.job_title;
      delete transformed.job_title;
    }
    if (row.pay_rate !== undefined) {
      transformed.payRate = (row.pay_rate !== null && row.pay_rate !== '') ? parseFloat(row.pay_rate) : row.pay_rate;
      delete transformed.pay_rate;
    }
    if (row.hire_date !== undefined) {
      transformed.hireDate = row.hire_date;
      delete transformed.hire_date;
    }
    if (row.performance_metrics !== undefined) {
      transformed.performanceMetrics = row.performance_metrics;
      delete transformed.performance_metrics;
    }
  }
  
  // Transform equipment fields
  if (tableName === 'equipment') {
    if (row.purchase_date !== undefined) {
      transformed.purchaseDate = row.purchase_date;
      delete transformed.purchase_date;
    }
    if (row.last_service_date !== undefined) {
      transformed.lastServiceDate = row.last_service_date;
      delete transformed.last_service_date;
    }
    if (row.assigned_to !== undefined) {
      transformed.assignedTo = row.assigned_to;
      delete transformed.assigned_to;
    }
    if (row.maintenance_history !== undefined) {
      transformed.maintenanceHistory = row.maintenance_history;
      delete transformed.maintenance_history;
    }
  }
  
  // Transform quotes fields
  if (tableName === 'quotes') {
    if (row.lead_id !== undefined) {
      transformed.leadId = row.lead_id;
      delete transformed.lead_id;
    }
    if (row.client_id !== undefined) {
      transformed.clientId = row.client_id;
      delete transformed.client_id;
    }
    if (row.property_id !== undefined) {
      transformed.propertyId = row.property_id;
      delete transformed.property_id;
    }
    if (row.quote_number !== undefined) {
      transformed.quoteNumber = row.quote_number;
      delete transformed.quote_number;
    }
    if (row.approval_status !== undefined) {
      transformed.approvalStatus = row.approval_status;
      delete transformed.approval_status;
    }
    if (row.approved_by !== undefined) {
      transformed.approvedBy = row.approved_by;
      delete transformed.approved_by;
    }
    if (row.approved_at !== undefined) {
      transformed.approvedAt = row.approved_at;
      delete transformed.approved_at;
    }
    if (row.terms_and_conditions !== undefined) {
      transformed.termsAndConditions = row.terms_and_conditions;
      delete transformed.terms_and_conditions;
    }
    if (row.internal_notes !== undefined) {
      transformed.internalNotes = row.internal_notes;
      delete transformed.internal_notes;
    }
    if (row.total_amount !== undefined) {
      transformed.totalAmount = (row.total_amount !== null && row.total_amount !== '') ? parseFloat(row.total_amount) : row.total_amount;
      delete transformed.total_amount;
    }
    if (row.discount_amount !== undefined) {
      transformed.discountAmount = (row.discount_amount !== null && row.discount_amount !== '') ? parseFloat(row.discount_amount) : row.discount_amount;
      delete transformed.discount_amount;
    }
    if (row.discount_percentage !== undefined) {
      transformed.discountPercentage = (row.discount_percentage !== null && row.discount_percentage !== '') ? parseFloat(row.discount_percentage) : row.discount_percentage;
      delete transformed.discount_percentage;
    }
    if (row.tax_rate !== undefined) {
      transformed.taxRate = (row.tax_rate !== null && row.tax_rate !== '') ? parseFloat(row.tax_rate) : row.tax_rate;
      delete transformed.tax_rate;
    }
    if (row.tax_amount !== undefined) {
      transformed.taxAmount = (row.tax_amount !== null && row.tax_amount !== '') ? parseFloat(row.tax_amount) : row.tax_amount;
      delete transformed.tax_amount;
    }
    if (row.grand_total !== undefined) {
      transformed.grandTotal = (row.grand_total !== null && row.grand_total !== '') ? parseFloat(row.grand_total) : row.grand_total;
      delete transformed.grand_total;
    }
    if (row.updated_at !== undefined) {
      transformed.updatedAt = row.updated_at;
      delete transformed.updated_at;
    }
    if (row.deleted_at !== undefined) {
      transformed.deletedAt = row.deleted_at;
      delete transformed.deleted_at;
    }
    if (row.customer_name !== undefined) {
      transformed.customerName = row.customer_name;
      delete transformed.customer_name;
    }
    if (row.line_items !== undefined) {
      transformed.lineItems = row.line_items;
      delete transformed.line_items;
    }
    if (row.stump_grinding_price !== undefined) {
      transformed.stumpGrindingPrice = (row.stump_grinding_price !== null && row.stump_grinding_price !== '') ? parseFloat(row.stump_grinding_price) : row.stump_grinding_price;
      delete transformed.stump_grinding_price;
    }
    if (row.accepted_at !== undefined) {
      transformed.acceptedAt = row.accepted_at;
      delete transformed.accepted_at;
    }
    if (row.job_location !== undefined) {
      transformed.jobLocation = row.job_location;
      delete transformed.job_location;
    }
    if (row.special_instructions !== undefined) {
      transformed.specialInstructions = row.special_instructions;
      delete transformed.special_instructions;
    }
    if (row.valid_until !== undefined) {
      transformed.validUntil = row.valid_until;
      delete transformed.valid_until;
    }
    if (row.deposit_amount !== undefined) {
      transformed.depositAmount = (row.deposit_amount !== null && row.deposit_amount !== '') ? parseFloat(row.deposit_amount) : row.deposit_amount;
      delete transformed.deposit_amount;
    }
    if (row.payment_terms !== undefined) {
      transformed.paymentTerms = row.payment_terms;
      delete transformed.payment_terms;
    }
    if (row.customer_uploads !== undefined) {
      transformed.customerUploads = row.customer_uploads;
      delete transformed.customer_uploads;
    }
  }

  // Transform leads fields
  if (tableName === 'leads') {
    if (row.customer_id !== undefined) {
      transformed.customerId = row.customer_id;
      delete transformed.customer_id;
    }
    if (row.customer_uploads !== undefined) {
      transformed.customerUploads = row.customer_uploads;
      delete transformed.customer_uploads;
    }
  }

  if (tableName === 'jobs') {
    if (row.clock_in_lat !== undefined && row.clock_in_lon !== undefined) {
      transformed.clockInCoordinates = { lat: row.clock_in_lat, lng: row.clock_in_lon };
      delete transformed.clock_in_lat;
      delete transformed.clock_in_lon;
    }
    if (row.clock_out_lat !== undefined && row.clock_out_lon !== undefined) {
      transformed.clockOutCoordinates = { lat: row.clock_out_lat, lng: row.clock_out_lon };
      delete transformed.clock_out_lat;
      delete transformed.clock_out_lon;
    }
    // Transform snake_case to camelCase for job fields
    if (row.work_started_at !== undefined) {
      transformed.workStartedAt = row.work_started_at;
      delete transformed.work_started_at;
    }
    if (row.work_ended_at !== undefined) {
      transformed.workEndedAt = row.work_ended_at;
      delete transformed.work_ended_at;
    }
    if (row.assigned_crew !== undefined) {
      transformed.assignedCrew = row.assigned_crew;
      delete transformed.assigned_crew;
    }
    if (row.stump_grinding_price !== undefined) {
      transformed.stumpGrindingPrice = (row.stump_grinding_price !== null && row.stump_grinding_price !== '') ? parseFloat(row.stump_grinding_price) : row.stump_grinding_price;
      delete transformed.stump_grinding_price;
    }
    if (row.quote_id !== undefined) {
      transformed.quoteId = row.quote_id;
      delete transformed.quote_id;
    }
    if (row.customer_name !== undefined) {
      transformed.customerName = row.customer_name;
      delete transformed.customer_name;
    }
    if (row.scheduled_date !== undefined) {
      transformed.scheduledDate = row.scheduled_date;
      delete transformed.scheduled_date;
    }
    if (row.job_location !== undefined) {
      transformed.jobLocation = row.job_location;
      delete transformed.job_location;
    }
    if (row.special_instructions !== undefined) {
      transformed.specialInstructions = row.special_instructions;
      delete transformed.special_instructions;
    }
    if (row.equipment_needed !== undefined) {
      transformed.equipmentNeeded = row.equipment_needed;
      delete transformed.equipment_needed;
    }
    if (row.estimated_hours !== undefined) {
      transformed.estimatedHours = (row.estimated_hours !== null && row.estimated_hours !== '') ? parseFloat(row.estimated_hours) : row.estimated_hours;
      delete transformed.estimated_hours;
    }
    if (row.jha_acknowledged_at !== undefined) {
      transformed.jhaAcknowledgedAt = row.jha_acknowledged_at;
      delete transformed.jha_acknowledged_at;
    }
    if (row.risk_level !== undefined) {
      transformed.riskLevel = row.risk_level;
      delete transformed.risk_level;
    }
    if (row.jha_required !== undefined) {
      transformed.jhaRequired = row.jha_required;
      delete transformed.jha_required;
    }
  }
  
  // Transform pay_periods fields
  if (tableName === 'pay_periods') {
    if (row.start_date !== undefined) {
      transformed.startDate = row.start_date;
      delete transformed.start_date;
    }
    if (row.end_date !== undefined) {
      transformed.endDate = row.end_date;
      delete transformed.end_date;
    }
    if (row.period_type !== undefined) {
      transformed.periodType = row.period_type;
      delete transformed.period_type;
    }
    if (row.processed_at !== undefined) {
      transformed.processedAt = row.processed_at;
      delete transformed.processed_at;
    }
  }
  
  // Transform time_entries fields
  if (tableName === 'time_entries') {
    if (row.employee_id !== undefined) {
      transformed.employeeId = row.employee_id;
      delete transformed.employee_id;
    }
    if (row.job_id !== undefined) {
      transformed.jobId = row.job_id;
      delete transformed.job_id;
    }
    if (row.hours_worked !== undefined) {
      transformed.hoursWorked = (row.hours_worked !== null && row.hours_worked !== '') ? parseFloat(row.hours_worked) : row.hours_worked;
      delete transformed.hours_worked;
    }
    if (row.hourly_rate !== undefined) {
      transformed.hourlyRate = (row.hourly_rate !== null && row.hourly_rate !== '') ? parseFloat(row.hourly_rate) : row.hourly_rate;
      delete transformed.hourly_rate;
    }
    if (row.overtime_hours !== undefined) {
      transformed.overtimeHours = (row.overtime_hours !== null && row.overtime_hours !== '') ? parseFloat(row.overtime_hours) : row.overtime_hours;
      delete transformed.overtime_hours;
    }
  }
  
  // Transform payroll_records fields
  if (tableName === 'payroll_records') {
    if (row.employee_id !== undefined) {
      transformed.employeeId = row.employee_id;
      delete transformed.employee_id;
    }
    if (row.pay_period_id !== undefined) {
      transformed.payPeriodId = row.pay_period_id;
      delete transformed.pay_period_id;
    }
    if (row.regular_hours !== undefined) {
      transformed.regularHours = (row.regular_hours !== null && row.regular_hours !== '') ? parseFloat(row.regular_hours) : row.regular_hours;
      delete transformed.regular_hours;
    }
    if (row.overtime_hours !== undefined) {
      transformed.overtimeHours = (row.overtime_hours !== null && row.overtime_hours !== '') ? parseFloat(row.overtime_hours) : row.overtime_hours;
      delete transformed.overtime_hours;
    }
    if (row.hourly_rate !== undefined) {
      transformed.hourlyRate = (row.hourly_rate !== null && row.hourly_rate !== '') ? parseFloat(row.hourly_rate) : row.hourly_rate;
      delete transformed.hourly_rate;
    }
    if (row.regular_pay !== undefined) {
      transformed.regularPay = (row.regular_pay !== null && row.regular_pay !== '') ? parseFloat(row.regular_pay) : row.regular_pay;
      delete transformed.regular_pay;
    }
    if (row.overtime_pay !== undefined) {
      transformed.overtimePay = (row.overtime_pay !== null && row.overtime_pay !== '') ? parseFloat(row.overtime_pay) : row.overtime_pay;
      delete transformed.overtime_pay;
    }
    if (row.total_deductions !== undefined) {
      transformed.totalDeductions = (row.total_deductions !== null && row.total_deductions !== '') ? parseFloat(row.total_deductions) : row.total_deductions;
      delete transformed.total_deductions;
    }
    if (row.gross_pay !== undefined) {
      transformed.grossPay = (row.gross_pay !== null && row.gross_pay !== '') ? parseFloat(row.gross_pay) : row.gross_pay;
      delete transformed.gross_pay;
    }
    if (row.net_pay !== undefined) {
      transformed.netPay = (row.net_pay !== null && row.net_pay !== '') ? parseFloat(row.net_pay) : row.net_pay;
      delete transformed.net_pay;
    }
    if (row.paid_at !== undefined) {
      transformed.paidAt = row.paid_at;
      delete transformed.paid_at;
    }
    if (row.payment_method !== undefined) {
      transformed.paymentMethod = row.payment_method;
      delete transformed.payment_method;
    }
  }
  
  // Transform company_profile fields
  if (tableName === 'company_profile') {
    if (row.company_name !== undefined) {
      transformed.companyName = row.company_name;
      delete transformed.company_name;
    }
    if (row.phone_number !== undefined) {
      transformed.phoneNumber = row.phone_number;
      delete transformed.phone_number;
    }
    if (row.tax_ein !== undefined) {
      transformed.taxEin = row.tax_ein;
      delete transformed.tax_ein;
    }
    if (row.zip_code !== undefined) {
      transformed.zipCode = row.zip_code;
      delete transformed.zip_code;
    }
    if (row.logo_url !== undefined) {
      transformed.logoUrl = row.logo_url;
      delete transformed.logo_url;
    }
    if (row.business_hours !== undefined) {
      transformed.businessHours = row.business_hours;
      delete transformed.business_hours;
    }
    if (row.license_number !== undefined) {
      transformed.licenseNumber = row.license_number;
      delete transformed.license_number;
    }
    if (row.insurance_policy_number !== undefined) {
      transformed.insurancePolicyNumber = row.insurance_policy_number;
      delete transformed.insurance_policy_number;
    }
    if (row.updated_at !== undefined) {
      transformed.updatedAt = row.updated_at;
      delete transformed.updated_at;
    }
  }
  
  // Transform estimate_feedback fields
  if (tableName === 'estimate_feedback') {
    if (row.quote_id !== undefined) {
      transformed.quoteId = row.quote_id;
      delete transformed.quote_id;
    }
    if (row.ai_estimate_data !== undefined) {
      transformed.aiEstimateData = row.ai_estimate_data;
      delete transformed.ai_estimate_data;
    }
    if (row.ai_suggested_price_min !== undefined) {
      transformed.aiSuggestedPriceMin = (row.ai_suggested_price_min !== null && row.ai_suggested_price_min !== '') ? parseFloat(row.ai_suggested_price_min) : row.ai_suggested_price_min;
      delete transformed.ai_suggested_price_min;
    }
    if (row.ai_suggested_price_max !== undefined) {
      transformed.aiSuggestedPriceMax = (row.ai_suggested_price_max !== null && row.ai_suggested_price_max !== '') ? parseFloat(row.ai_suggested_price_max) : row.ai_suggested_price_max;
      delete transformed.ai_suggested_price_max;
    }
    if (row.actual_price_quoted !== undefined) {
      transformed.actualPriceQuoted = (row.actual_price_quoted !== null && row.actual_price_quoted !== '') ? parseFloat(row.actual_price_quoted) : row.actual_price_quoted;
      delete transformed.actual_price_quoted;
    }
    if (row.feedback_rating !== undefined) {
      transformed.feedbackRating = row.feedback_rating;
      delete transformed.feedback_rating;
    }
    if (row.correction_reasons !== undefined) {
      transformed.correctionReasons = row.correction_reasons;
      delete transformed.correction_reasons;
    }
    if (row.user_notes !== undefined) {
      transformed.userNotes = row.user_notes;
      delete transformed.user_notes;
    }
    if (row.tree_species !== undefined) {
      transformed.treeSpecies = row.tree_species;
      delete transformed.tree_species;
    }
    if (row.tree_height !== undefined) {
      transformed.treeHeight = (row.tree_height !== null && row.tree_height !== '') ? parseFloat(row.tree_height) : row.tree_height;
      delete transformed.tree_height;
    }
    if (row.trunk_diameter !== undefined) {
      transformed.trunkDiameter = (row.trunk_diameter !== null && row.trunk_diameter !== '') ? parseFloat(row.trunk_diameter) : row.trunk_diameter;
      delete transformed.trunk_diameter;
    }
    if (row.job_location !== undefined) {
      transformed.jobLocation = row.job_location;
      delete transformed.job_location;
    }
    if (row.customer_name !== undefined) {
      transformed.customerName = row.customer_name;
      delete transformed.customer_name;
    }
  }
  
  // Transform crews fields
  if (tableName === 'crews') {
    if (row.is_active !== undefined) {
      transformed.isActive = row.is_active;
      delete transformed.is_active;
    }
    if (row.default_start_time !== undefined) {
      transformed.defaultStartTime = row.default_start_time;
      delete transformed.default_start_time;
    }
    if (row.default_end_time !== undefined) {
      transformed.defaultEndTime = row.default_end_time;
      delete transformed.default_end_time;
    }
    if (row.updated_at !== undefined) {
      transformed.updatedAt = row.updated_at;
      delete transformed.updated_at;
    }
    if (row.deleted_at !== undefined) {
      transformed.deletedAt = row.deleted_at;
      delete transformed.deleted_at;
    }
    if (row.member_count !== undefined) {
      transformed.memberCount = parseInt(row.member_count) || 0;
      delete transformed.member_count;
    }
  }
  
  // Transform crew_members fields
  if (tableName === 'crew_members') {
    if (row.crew_id !== undefined) {
      transformed.crewId = row.crew_id;
      delete transformed.crew_id;
    }
    if (row.employee_id !== undefined) {
      transformed.employeeId = row.employee_id;
      delete transformed.employee_id;
    }
    if (row.joined_at !== undefined) {
      transformed.joinedAt = row.joined_at;
      delete transformed.joined_at;
    }
    if (row.left_at !== undefined) {
      transformed.leftAt = row.left_at;
      delete transformed.left_at;
    }
    if (row.employee_name !== undefined) {
      transformed.employeeName = row.employee_name;
      delete transformed.employee_name;
    }
    if (row.job_title !== undefined) {
      transformed.jobTitle = row.job_title;
      delete transformed.job_title;
    }
  }
  
  // Transform crew_assignments fields
  if (tableName === 'crew_assignments') {
    if (row.job_id !== undefined) {
      transformed.jobId = row.job_id;
      delete transformed.job_id;
    }
    if (row.crew_id !== undefined) {
      transformed.crewId = row.crew_id;
      delete transformed.crew_id;
    }
    if (row.assigned_date !== undefined) {
      transformed.assignedDate = row.assigned_date;
      delete transformed.assigned_date;
    }
    if (row.assigned_by !== undefined) {
      transformed.assignedBy = row.assigned_by;
      delete transformed.assigned_by;
    }
    if (row.created_at !== undefined) {
      transformed.createdAt = row.created_at;
      delete transformed.created_at;
    }
    if (row.crew_name !== undefined) {
      transformed.crewName = row.crew_name;
      delete transformed.crew_name;
    }
    if (row.job_title !== undefined) {
      transformed.jobTitle = row.job_title;
      delete transformed.job_title;
    }
    if (row.customer_name !== undefined) {
      transformed.customerName = row.customer_name;
      delete transformed.customer_name;
    }
    if (row.scheduled_date !== undefined) {
      transformed.scheduledDate = row.scheduled_date;
      delete transformed.scheduled_date;
    }
  }
  
  // Transform form_templates fields
  if (tableName === 'form_templates') {
    if (row.form_type !== undefined) {
      transformed.formType = row.form_type;
      delete transformed.form_type;
    }
    if (row.is_active !== undefined) {
      transformed.isActive = row.is_active;
      delete transformed.is_active;
    }
    if (row.require_signature !== undefined) {
      transformed.requireSignature = row.require_signature;
      delete transformed.require_signature;
    }
    if (row.require_photos !== undefined) {
      transformed.requirePhotos = row.require_photos;
      delete transformed.require_photos;
    }
    if (row.min_photos !== undefined) {
      transformed.minPhotos = row.min_photos;
      delete transformed.min_photos;
    }
    if (row.created_by !== undefined) {
      transformed.createdBy = row.created_by;
      delete transformed.created_by;
    }
    if (row.updated_at !== undefined) {
      transformed.updatedAt = row.updated_at;
      delete transformed.updated_at;
    }
    if (row.deleted_at !== undefined) {
      transformed.deletedAt = row.deleted_at;
      delete transformed.deleted_at;
    }
  }
  
  // Transform job_forms fields
  if (tableName === 'job_forms') {
    if (row.job_id !== undefined) {
      transformed.jobId = row.job_id;
      delete transformed.job_id;
    }
    if (row.form_template_id !== undefined) {
      transformed.formTemplateId = row.form_template_id;
      delete transformed.form_template_id;
    }
    if (row.form_data !== undefined) {
      transformed.formData = row.form_data;
      delete transformed.form_data;
    }
    if (row.completed_at !== undefined) {
      transformed.completedAt = row.completed_at;
      delete transformed.completed_at;
    }
    if (row.completed_by !== undefined) {
      transformed.completedBy = row.completed_by;
      delete transformed.completed_by;
    }
    if (row.updated_at !== undefined) {
      transformed.updatedAt = row.updated_at;
      delete transformed.updated_at;
    }
  }
  
  // Transform other snake_case fields
  if (row.created_at !== undefined) {
    transformed.createdAt = row.created_at;
    delete transformed.created_at;
  }
  
  return transformed;
};

// Helper function to transform API data to database format
const transformToDb = (data, tableName) => {
  const transformed = { ...data };
  
  // Handle coordinate fields
  if ((tableName === 'clients' || tableName === 'employees') && data.coordinates) {
    transformed.lat = data.coordinates.lat;
    transformed.lon = data.coordinates.lng;
    delete transformed.coordinates;
  }
  
  // Transform employees fields
  if (tableName === 'employees') {
    if (data.jobTitle !== undefined) {
      transformed.job_title = data.jobTitle;
      delete transformed.jobTitle;
    }
    if (data.payRate !== undefined) {
      transformed.pay_rate = data.payRate;
      delete transformed.payRate;
    }
    if (data.hireDate !== undefined) {
      transformed.hire_date = data.hireDate;
      delete transformed.hireDate;
    }
    if (data.performanceMetrics !== undefined) {
      transformed.performance_metrics = data.performanceMetrics;
      delete transformed.performanceMetrics;
    }
  }
  
  // Transform equipment fields
  if (tableName === 'equipment') {
    if (data.purchaseDate !== undefined) {
      transformed.purchase_date = data.purchaseDate;
      delete transformed.purchaseDate;
    }
    if (data.lastServiceDate !== undefined) {
      transformed.last_service_date = data.lastServiceDate;
      delete transformed.lastServiceDate;
    }
    if (data.assignedTo !== undefined) {
      transformed.assigned_to = data.assignedTo;
      delete transformed.assignedTo;
    }
    if (data.maintenanceHistory !== undefined) {
      transformed.maintenance_history = data.maintenanceHistory;
      delete transformed.maintenanceHistory;
    }
  }
  
  // Transform quotes fields
  if (tableName === 'quotes') {
    if (data.leadId !== undefined) {
      transformed.lead_id = data.leadId;
      delete transformed.leadId;
    }
    if (data.clientId !== undefined) {
      transformed.client_id = data.clientId;
      delete transformed.clientId;
    }
    if (data.propertyId !== undefined) {
      transformed.property_id = data.propertyId;
      delete transformed.propertyId;
    }
    if (data.quoteNumber !== undefined) {
      transformed.quote_number = data.quoteNumber;
      delete transformed.quoteNumber;
    }
    if (data.approvalStatus !== undefined) {
      transformed.approval_status = data.approvalStatus;
      delete transformed.approvalStatus;
    }
    if (data.approvedBy !== undefined) {
      transformed.approved_by = data.approvedBy;
      delete transformed.approvedBy;
    }
    if (data.approvedAt !== undefined) {
      transformed.approved_at = data.approvedAt;
      delete transformed.approvedAt;
    }
    if (data.termsAndConditions !== undefined) {
      transformed.terms_and_conditions = data.termsAndConditions;
      delete transformed.termsAndConditions;
    }
    if (data.internalNotes !== undefined) {
      transformed.internal_notes = data.internalNotes;
      delete transformed.internalNotes;
    }
    if (data.totalAmount !== undefined) {
      transformed.total_amount = data.totalAmount;
      delete transformed.totalAmount;
    }
    if (data.discountAmount !== undefined) {
      transformed.discount_amount = data.discountAmount;
      delete transformed.discountAmount;
    }
    if (data.discountPercentage !== undefined) {
      transformed.discount_percentage = data.discountPercentage;
      delete transformed.discountPercentage;
    }
    if (data.taxRate !== undefined) {
      transformed.tax_rate = data.taxRate;
      delete transformed.taxRate;
    }
    if (data.taxAmount !== undefined) {
      transformed.tax_amount = data.taxAmount;
      delete transformed.taxAmount;
    }
    if (data.grandTotal !== undefined) {
      transformed.grand_total = data.grandTotal;
      delete transformed.grandTotal;
    }
    if (data.updatedAt !== undefined) {
      transformed.updated_at = data.updatedAt;
      delete transformed.updatedAt;
    }
    if (data.deletedAt !== undefined) {
      transformed.deleted_at = data.deletedAt;
      delete transformed.deletedAt;
    }
    if (data.customerName !== undefined) {
      transformed.customer_name = data.customerName;
      delete transformed.customerName;
    }
    if (data.lineItems !== undefined) {
      transformed.line_items = data.lineItems;
      delete transformed.lineItems;
    }
    if (data.stumpGrindingPrice !== undefined) {
      transformed.stump_grinding_price = data.stumpGrindingPrice;
      delete transformed.stumpGrindingPrice;
    }
    if (data.acceptedAt !== undefined) {
      transformed.accepted_at = data.acceptedAt;
      delete transformed.acceptedAt;
    }
    if (data.jobLocation !== undefined) {
      transformed.job_location = data.jobLocation;
      delete transformed.jobLocation;
    }
    if (data.specialInstructions !== undefined) {
      transformed.special_instructions = data.specialInstructions;
      delete transformed.specialInstructions;
    }
    if (data.validUntil !== undefined) {
      transformed.valid_until = data.validUntil;
      delete transformed.validUntil;
    }
    if (data.depositAmount !== undefined) {
      transformed.deposit_amount = data.depositAmount;
      delete transformed.depositAmount;
    }
    if (data.paymentTerms !== undefined) {
      transformed.payment_terms = data.paymentTerms;
      delete transformed.paymentTerms;
    }
    if (data.customerUploads !== undefined) {
      transformed.customer_uploads = data.customerUploads;
      delete transformed.customerUploads;
    }
  }

  // Transform leads fields
  if (tableName === 'leads') {
    if (data.customerId !== undefined) {
      transformed.customer_id = data.customerId;
      delete transformed.customerId;
    }
    if (data.customerUploads !== undefined) {
      transformed.customer_uploads = data.customerUploads;
      delete transformed.customerUploads;
    }
  }

  if (tableName === 'jobs') {
    if (data.clockInCoordinates) {
      transformed.clock_in_lat = data.clockInCoordinates.lat;
      transformed.clock_in_lon = data.clockInCoordinates.lng;
      delete transformed.clockInCoordinates;
    }
    if (data.clockOutCoordinates) {
      transformed.clock_out_lat = data.clockOutCoordinates.lat;
      transformed.clock_out_lon = data.clockOutCoordinates.lng;
      delete transformed.clockOutCoordinates;
    }
    // Transform camelCase to snake_case
    if (data.workStartedAt !== undefined) {
      transformed.work_started_at = data.workStartedAt;
      delete transformed.workStartedAt;
    }
    if (data.workEndedAt !== undefined) {
      transformed.work_ended_at = data.workEndedAt;
      delete transformed.workEndedAt;
    }
    if (data.assignedCrew !== undefined) {
      transformed.assigned_crew = data.assignedCrew;
      delete transformed.assignedCrew;
    }
    if (data.stumpGrindingPrice !== undefined) {
      transformed.stump_grinding_price = data.stumpGrindingPrice;
      delete transformed.stumpGrindingPrice;
    }
    if (data.quoteId !== undefined) {
      transformed.quote_id = data.quoteId;
      delete transformed.quoteId;
    }
    if (data.customerName !== undefined) {
      transformed.customer_name = data.customerName;
      delete transformed.customerName;
    }
    if (data.scheduledDate !== undefined) {
      transformed.scheduled_date = data.scheduledDate;
      delete transformed.scheduledDate;
    }
    if (data.jobLocation !== undefined) {
      transformed.job_location = data.jobLocation;
      delete transformed.jobLocation;
    }
    if (data.specialInstructions !== undefined) {
      transformed.special_instructions = data.specialInstructions;
      delete transformed.specialInstructions;
    }
    if (data.equipmentNeeded !== undefined) {
      transformed.equipment_needed = data.equipmentNeeded;
      delete transformed.equipmentNeeded;
    }
    if (data.estimatedHours !== undefined) {
      transformed.estimated_hours = data.estimatedHours;
      delete transformed.estimatedHours;
    }
    if (data.jhaAcknowledgedAt !== undefined) {
      transformed.jha_acknowledged_at = data.jhaAcknowledgedAt;
      delete transformed.jhaAcknowledgedAt;
    }
    if (data.riskLevel !== undefined) {
      transformed.risk_level = data.riskLevel;
      delete transformed.riskLevel;
    }
    if (data.jhaRequired !== undefined) {
      transformed.jha_required = data.jhaRequired;
      delete transformed.jhaRequired;
    }
  }
  
  // Transform pay_periods fields
  if (tableName === 'pay_periods') {
    if (data.startDate !== undefined) {
      transformed.start_date = data.startDate;
      delete transformed.startDate;
    }
    if (data.endDate !== undefined) {
      transformed.end_date = data.endDate;
      delete transformed.endDate;
    }
    if (data.periodType !== undefined) {
      transformed.period_type = data.periodType;
      delete transformed.periodType;
    }
    if (data.processedAt !== undefined) {
      transformed.processed_at = data.processedAt;
      delete transformed.processedAt;
    }
  }
  
  // Transform time_entries fields
  if (tableName === 'time_entries') {
    if (data.employeeId !== undefined) {
      transformed.employee_id = data.employeeId;
      delete transformed.employeeId;
    }
    if (data.jobId !== undefined) {
      transformed.job_id = data.jobId;
      delete transformed.jobId;
    }
    if (data.hoursWorked !== undefined) {
      transformed.hours_worked = data.hoursWorked;
      delete transformed.hoursWorked;
    }
    if (data.hourlyRate !== undefined) {
      transformed.hourly_rate = data.hourlyRate;
      delete transformed.hourlyRate;
    }
    if (data.overtimeHours !== undefined) {
      transformed.overtime_hours = data.overtimeHours;
      delete transformed.overtimeHours;
    }
  }
  
  // Transform payroll_records fields
  if (tableName === 'payroll_records') {
    if (data.employeeId !== undefined) {
      transformed.employee_id = data.employeeId;
      delete transformed.employeeId;
    }
    if (data.payPeriodId !== undefined) {
      transformed.pay_period_id = data.payPeriodId;
      delete transformed.payPeriodId;
    }
    if (data.regularHours !== undefined) {
      transformed.regular_hours = data.regularHours;
      delete transformed.regularHours;
    }
    if (data.overtimeHours !== undefined) {
      transformed.overtime_hours = data.overtimeHours;
      delete transformed.overtimeHours;
    }
    if (data.hourlyRate !== undefined) {
      transformed.hourly_rate = data.hourlyRate;
      delete transformed.hourlyRate;
    }
    if (data.regularPay !== undefined) {
      transformed.regular_pay = data.regularPay;
      delete transformed.regularPay;
    }
    if (data.overtimePay !== undefined) {
      transformed.overtime_pay = data.overtimePay;
      delete transformed.overtimePay;
    }
    if (data.totalDeductions !== undefined) {
      transformed.total_deductions = data.totalDeductions;
      delete transformed.totalDeductions;
    }
    if (data.grossPay !== undefined) {
      transformed.gross_pay = data.grossPay;
      delete transformed.grossPay;
    }
    if (data.netPay !== undefined) {
      transformed.net_pay = data.netPay;
      delete transformed.netPay;
    }
    if (data.paidAt !== undefined) {
      transformed.paid_at = data.paidAt;
      delete transformed.paidAt;
    }
    if (data.paymentMethod !== undefined) {
      transformed.payment_method = data.paymentMethod;
      delete transformed.paymentMethod;
    }
  }
  
  // Transform company_profile fields
  if (tableName === 'company_profile') {
    if (data.companyName !== undefined) {
      transformed.company_name = data.companyName;
      delete transformed.companyName;
    }
    if (data.phoneNumber !== undefined) {
      transformed.phone_number = data.phoneNumber;
      delete transformed.phoneNumber;
    }
    if (data.taxEin !== undefined) {
      transformed.tax_ein = data.taxEin;
      delete transformed.taxEin;
    }
    if (data.zipCode !== undefined) {
      transformed.zip_code = data.zipCode;
      delete transformed.zipCode;
    }
    if (data.logoUrl !== undefined) {
      transformed.logo_url = data.logoUrl;
      delete transformed.logoUrl;
    }
    if (data.businessHours !== undefined) {
      transformed.business_hours = data.businessHours;
      delete transformed.businessHours;
    }
    if (data.licenseNumber !== undefined) {
      transformed.license_number = data.licenseNumber;
      delete transformed.licenseNumber;
    }
    if (data.insurancePolicyNumber !== undefined) {
      transformed.insurance_policy_number = data.insurancePolicyNumber;
      delete transformed.insurancePolicyNumber;
    }
    if (data.updatedAt !== undefined) {
      transformed.updated_at = data.updatedAt;
      delete transformed.updatedAt;
    }
  }
  
  // Transform estimate_feedback fields
  if (tableName === 'estimate_feedback') {
    if (data.quoteId !== undefined) {
      transformed.quote_id = data.quoteId;
      delete transformed.quoteId;
    }
    if (data.aiEstimateData !== undefined) {
      transformed.ai_estimate_data = data.aiEstimateData;
      delete transformed.aiEstimateData;
    }
    if (data.aiSuggestedPriceMin !== undefined) {
      transformed.ai_suggested_price_min = data.aiSuggestedPriceMin;
      delete transformed.aiSuggestedPriceMin;
    }
    if (data.aiSuggestedPriceMax !== undefined) {
      transformed.ai_suggested_price_max = data.aiSuggestedPriceMax;
      delete transformed.aiSuggestedPriceMax;
    }
    if (data.actualPriceQuoted !== undefined) {
      transformed.actual_price_quoted = data.actualPriceQuoted;
      delete transformed.actualPriceQuoted;
    }
    if (data.feedbackRating !== undefined) {
      transformed.feedback_rating = data.feedbackRating;
      delete transformed.feedbackRating;
    }
    if (data.correctionReasons !== undefined) {
      transformed.correction_reasons = data.correctionReasons;
      delete transformed.correctionReasons;
    }
    if (data.userNotes !== undefined) {
      transformed.user_notes = data.userNotes;
      delete transformed.userNotes;
    }
    if (data.treeSpecies !== undefined) {
      transformed.tree_species = data.treeSpecies;
      delete transformed.treeSpecies;
    }
    if (data.treeHeight !== undefined) {
      transformed.tree_height = data.treeHeight;
      delete transformed.treeHeight;
    }
    if (data.trunkDiameter !== undefined) {
      transformed.trunk_diameter = data.trunkDiameter;
      delete transformed.trunkDiameter;
    }
    if (data.jobLocation !== undefined) {
      transformed.job_location = data.jobLocation;
      delete transformed.jobLocation;
    }
    if (data.customerName !== undefined) {
      transformed.customer_name = data.customerName;
      delete transformed.customerName;
    }
  }
  
  if (data.createdAt !== undefined) {
    transformed.created_at = data.createdAt;
    delete transformed.createdAt;
  }
  
  // JSON.stringify JSONB fields to prevent "invalid input syntax for type json" errors
  // This ensures objects and arrays are properly serialized before database insertion
  
  // Jobs table JSONB fields
  if (tableName === 'jobs') {
    if (transformed.assigned_crew !== undefined && typeof transformed.assigned_crew === 'object') {
      transformed.assigned_crew = JSON.stringify(transformed.assigned_crew);
    }
    if (transformed.completion_checklist !== undefined && typeof transformed.completion_checklist === 'object') {
      transformed.completion_checklist = JSON.stringify(transformed.completion_checklist);
    }
    if (transformed.permit_details !== undefined && typeof transformed.permit_details === 'object') {
      transformed.permit_details = JSON.stringify(transformed.permit_details);
    }
  }
  
  // Quotes table JSONB fields
  if (tableName === 'quotes') {
    if (transformed.line_items !== undefined && typeof transformed.line_items === 'object') {
      transformed.line_items = JSON.stringify(transformed.line_items);
    }
  }
  
  // Employees table JSONB fields
  if (tableName === 'employees') {
    if (transformed.performance_metrics !== undefined && typeof transformed.performance_metrics === 'object') {
      transformed.performance_metrics = JSON.stringify(transformed.performance_metrics);
    }
  }
  
  // Equipment table JSONB fields
  if (tableName === 'equipment') {
    if (transformed.maintenance_history !== undefined && typeof transformed.maintenance_history === 'object') {
      transformed.maintenance_history = JSON.stringify(transformed.maintenance_history);
    }
  }
  
  return transformed;
};

const setupCrudEndpoints = (router, tableName) => {
  // GET all
  router.get(`/${tableName}`, async (req, res) => {
    try {
      const { rows } = await db.query(`SELECT * FROM ${tableName}`);
      const transformed = rows.map(row => transformRow(row, tableName));
      res.json(transformed);
    } catch (err) {
      handleError(res, err);
    }
  });

  // GET by ID
  router.get(`/${tableName}/:id`, async (req, res) => {
    try {
      const { rows } = await db.query(`SELECT * FROM ${tableName} WHERE id = $1`, [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(transformRow(rows[0], tableName));
    } catch (err) {
      handleError(res, err);
    }
  });

  // POST new
  router.post(`/${tableName}`, async (req, res) => {
    try {
      const data = transformToDb(req.body, tableName);
      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = columns.map((_, i) => `$${i + 2}`).join(', ');
      const newId = uuidv4();

      const queryText = `INSERT INTO ${tableName} (id, ${columns.join(', ')}) VALUES ($1, ${placeholders}) RETURNING *`;
      const { rows } = await db.query(queryText, [newId, ...values]);
      const result = transformRow(rows[0], tableName);
      res.status(201).json(result);

      reindexDocument(tableName, rows[0]);
    } catch (err) {
      handleError(res, err);
    }
  });

  // PUT update by ID
  router.put(`/${tableName}/:id`, async (req, res) => {
    try {
      const data = transformToDb(req.body, tableName);
      const columns = Object.keys(data);
      const values = Object.values(data);
      const setString = columns.map((col, i) => `${col} = $${i + 2}`).join(', ');

      const queryText = `UPDATE ${tableName} SET ${setString} WHERE id = $1 RETURNING *`;
      const { rows } = await db.query(queryText, [req.params.id, ...values]);

      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      const result = transformRow(rows[0], tableName);
      res.json(result);

      reindexDocument(tableName, rows[0]);
    } catch (err) {
      handleError(res, err);
    }
  });

  // DELETE by ID
  router.delete(`/${tableName}/:id`, async (req, res) => {
    try {
      const result = await db.query(`DELETE FROM ${tableName} WHERE id = $1`, [req.params.id]);
      if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
      res.status(204).send();

      removeFromVectorStore(tableName, req.params.id);
      console.log(`[RAG] Document ${req.params.id} deleted from ${tableName}.`);
    } catch (err) {
      handleError(res, err);
    }
  });
};

apiRouter.get('/leads', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT l.*, 
             c.id as customer_id, 
             CONCAT(c.first_name, ' ', c.last_name) as customer_name, 
             c.primary_email as customer_email, 
             c.primary_phone as customer_phone, 
             c.billing_address_line1 as customer_address
      FROM leads l
      LEFT JOIN clients c ON l.client_id_new = c.id
    `);
    
    const transformed = rows.map(row => {
      const lead = transformRow(row, 'leads');
      lead.customer = {
        id: row.customer_id,
        name: row.customer_name,
        email: row.customer_email,
        phone: row.customer_phone,
        address: row.customer_address
      };
      delete lead.customer_id;
      delete lead.customer_name;
      delete lead.customer_email;
      delete lead.customer_phone;
      delete lead.customer_address;
      return lead;
    });
    
    res.json(transformed);
  } catch (err) {
    handleError(res, err);
  }
});

// POST /api/leads - Create new lead
apiRouter.post('/leads', async (req, res) => {
  try {
    const leadData = req.body;
    const leadId = uuidv4();
    
    const insertQuery = `
      INSERT INTO leads (
        id, client_id_new, property_id, source, status, priority,
        lead_score, assigned_to, estimated_value, expected_close_date,
        next_followup_date, description, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
      ) RETURNING *
    `;
    
    const { rows } = await db.query(insertQuery, [
      leadId,
      leadData.clientId || null,
      leadData.propertyId || null,
      leadData.source || null,
      leadData.status || 'New',
      leadData.priority || 'medium',
      leadData.leadScore || 50,
      leadData.assignedTo || null,
      leadData.estimatedValue || null,
      leadData.expectedCloseDate || null,
      leadData.nextFollowupDate || null,
      leadData.description || null
    ]);
    
    const lead = transformRow(rows[0], 'leads');
    res.status(201).json(lead);
    
    reindexDocument('leads', rows[0]);
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/leads/:id - Get lead by ID
apiRouter.get('/leads/:id', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT l.*, 
             c.id as customer_id, 
             CONCAT(c.first_name, ' ', c.last_name) as customer_name, 
             c.primary_email as customer_email, 
             c.primary_phone as customer_phone, 
             c.billing_address_line1 as customer_address
      FROM leads l
      LEFT JOIN clients c ON l.client_id_new = c.id
      WHERE l.id = $1
    `, [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    const lead = transformRow(rows[0], 'leads');
    lead.customer = {
      id: rows[0].customer_id,
      name: rows[0].customer_name,
      email: rows[0].customer_email,
      phone: rows[0].customer_phone,
      address: rows[0].customer_address
    };
    
    res.json(lead);
  } catch (err) {
    handleError(res, err);
  }
});

// PUT /api/leads/:id - Update lead
apiRouter.put('/leads/:id', async (req, res) => {
  try {
    const leadData = req.body;
    const { id } = req.params;
    
    const updateQuery = `
      UPDATE leads SET
        client_id_new = COALESCE($1, client_id_new),
        property_id = COALESCE($2, property_id),
        source = COALESCE($3, source),
        status = COALESCE($4, status),
        priority = COALESCE($5, priority),
        lead_score = COALESCE($6, lead_score),
        assigned_to = COALESCE($7, assigned_to),
        estimated_value = COALESCE($8, estimated_value),
        expected_close_date = COALESCE($9, expected_close_date),
        next_followup_date = COALESCE($10, next_followup_date),
        description = COALESCE($11, description),
        updated_at = NOW()
      WHERE id = $12
      RETURNING *
    `;
    
    const { rows } = await db.query(updateQuery, [
      leadData.clientId,
      leadData.propertyId,
      leadData.source,
      leadData.status,
      leadData.priority,
      leadData.leadScore,
      leadData.assignedTo,
      leadData.estimatedValue,
      leadData.expectedCloseDate,
      leadData.nextFollowupDate,
      leadData.description,
      id
    ]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    const lead = transformRow(rows[0], 'leads');
    res.json(lead);
    
    reindexDocument('leads', rows[0]);
  } catch (err) {
    handleError(res, err);
  }
});

// DELETE /api/leads/:id - Delete lead
apiRouter.delete('/leads/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM leads WHERE id = $1', [req.params.id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    res.status(204).send();
    
    removeFromVectorStore('leads', req.params.id);
  } catch (err) {
    handleError(res, err);
  }
});

apiRouter.post('/pay_periods/:id/process', async (req, res) => {
  try {
    const { rows: payPeriodRows } = await db.query(
      'SELECT * FROM pay_periods WHERE id = $1',
      [req.params.id]
    );
    
    if (payPeriodRows.length === 0) {
      return res.status(404).json({ error: 'Pay period not found' });
    }
    
    const payPeriod = payPeriodRows[0];
    
    if (payPeriod.status === 'Closed') {
      return res.status(400).json({ error: 'Pay period already processed' });
    }
    
    const { rows: timeEntries } = await db.query(
      `SELECT * FROM time_entries 
       WHERE date >= $1 AND date <= $2`,
      [payPeriod.start_date, payPeriod.end_date]
    );
    
    const employeeEntries = {};
    for (const entry of timeEntries) {
      if (!employeeEntries[entry.employee_id]) {
        employeeEntries[entry.employee_id] = [];
      }
      employeeEntries[entry.employee_id].push(entry);
    }
    
    const payrollRecords = [];
    let totalGrossPay = 0;
    let totalNetPay = 0;
    
    for (const employeeId in employeeEntries) {
      const entries = employeeEntries[employeeId];
      
      const { rows: employeeRows } = await db.query(
        'SELECT * FROM employees WHERE id = $1',
        [employeeId]
      );
      
      if (employeeRows.length === 0) {
        continue;
      }
      
      const employee = employeeRows[0];
      const hourlyRate = parseFloat(employee.pay_rate || 0);
      
      let totalHoursWorked = 0;
      let totalOvertimeHours = 0;
      
      for (const entry of entries) {
        totalHoursWorked += parseFloat(entry.hours_worked || 0);
        totalOvertimeHours += parseFloat(entry.overtime_hours || 0);
      }
      
      const regularHours = Math.max(totalHoursWorked - totalOvertimeHours, 0);
      const overtimeHours = totalOvertimeHours;
      
      const regularPay = regularHours * hourlyRate;
      const overtimePay = overtimeHours * (hourlyRate * 1.5);
      const bonuses = 0;
      const grossPay = regularPay + overtimePay + bonuses;
      
      const federalTax = grossPay * 0.15;
      const stateTax = grossPay * 0.05;
      const socialSecurity = grossPay * 0.062;
      const medicare = grossPay * 0.0145;
      
      const deductions = [
        { type: 'Federal Tax', amount: federalTax, percentage: 15 },
        { type: 'State Tax', amount: stateTax, percentage: 5 },
        { type: 'Social Security', amount: socialSecurity, percentage: 6.2 },
        { type: 'Medicare', amount: medicare, percentage: 1.45 }
      ];
      
      const totalDeductions = federalTax + stateTax + socialSecurity + medicare;
      const netPay = grossPay - totalDeductions;
      
      const payrollId = uuidv4();
      const { rows: payrollRows } = await db.query(
        `INSERT INTO payroll_records (
          id, employee_id, pay_period_id, regular_hours, overtime_hours,
          hourly_rate, regular_pay, overtime_pay, bonuses, deductions,
          total_deductions, gross_pay, net_pay, payment_method
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          payrollId, employeeId, req.params.id, regularHours, overtimeHours,
          hourlyRate, regularPay, overtimePay, bonuses, JSON.stringify(deductions),
          totalDeductions, grossPay, netPay, 'Direct Deposit'
        ]
      );
      
      payrollRecords.push(transformRow(payrollRows[0], 'payroll_records'));
      totalGrossPay += grossPay;
      totalNetPay += netPay;
    }
    
    const now = new Date().toISOString();
    const { rows: updatedPayPeriodRows } = await db.query(
      `UPDATE pay_periods SET status = $1, processed_at = $2 WHERE id = $3 RETURNING *`,
      ['Closed', now, req.params.id]
    );
    
    res.json({
      payPeriod: transformRow(updatedPayPeriodRows[0], 'pay_periods'),
      payrollRecords: payrollRecords,
      summary: {
        totalEmployees: payrollRecords.length,
        totalGrossPay: totalGrossPay,
        totalNetPay: totalNetPay
      }
    });
  } catch (err) {
    handleError(res, err);
  }
});

// Company Profile Endpoints (singleton pattern)
apiRouter.get('/company-profile', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM company_profile LIMIT 1');
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Company profile not found' });
    }
    res.json(transformRow(rows[0], 'company_profile'));
  } catch (err) {
    handleError(res, err);
  }
});

apiRouter.put('/company-profile', async (req, res) => {
  try {
    const { rows: existingRows } = await db.query('SELECT * FROM company_profile LIMIT 1');
    if (existingRows.length === 0) {
      return res.status(404).json({ error: 'Company profile not found' });
    }
    
    const data = transformToDb(req.body, 'company_profile');
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setString = columns.map((col, i) => `${col} = $${i + 2}`).join(', ');
    
    const queryText = `UPDATE company_profile SET ${setString}, updated_at = NOW() WHERE id = $1 RETURNING *`;
    const { rows } = await db.query(queryText, [existingRows[0].id, ...values]);
    
    res.json(transformRow(rows[0], 'company_profile'));
  } catch (err) {
    handleError(res, err);
  }
});

// Angi Ads Webhook Endpoint
apiRouter.post('/webhooks/angi', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const expectedApiKey = process.env.ANGI_ADS_WEBHOOK_SECRET;

    if (!apiKey || apiKey !== expectedApiKey) {
      console.log('Angi Ads webhook: Invalid or missing API key');
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or missing API key' });
    }

    const { name, phone, email, comments, description, address, location, timestamp, leadId } = req.body;

    if (!name || !phone || !email) {
      console.log('Angi Ads webhook: Missing required fields');
      return res.status(400).json({ error: 'Bad Request', message: 'Missing required fields: name, phone, email' });
    }

    console.log(`Angi Ads webhook: Received lead from Angi Ads - ${name} (${email})`);

    const customerAddress = address || location || '';
    const leadDescription = comments || description || '';
    let clientId;
    let customerName = name;

    const { rows: existingClients } = await db.query(
      `SELECT * FROM clients WHERE primary_email = $1 OR primary_phone = $2 LIMIT 1`,
      [email, phone]
    );

    if (existingClients.length > 0) {
      clientId = existingClients[0].id;
      customerName = existingClients[0].first_name && existingClients[0].last_name 
        ? `${existingClients[0].first_name} ${existingClients[0].last_name}`.trim()
        : existingClients[0].first_name || existingClients[0].last_name || existingClients[0].company_name || name;
      console.log(`Angi Ads webhook: Found existing client ${clientId}`);
    } else {
      clientId = uuidv4();
      const nameParts = name.trim().split(' ');
      const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : null;
      const lastName = nameParts.length > 0 ? nameParts[nameParts.length - 1] : null;
      
      const { rows: newClientRows } = await db.query(
        `INSERT INTO clients (id, first_name, last_name, primary_email, primary_phone, billing_address_line1, status, client_type) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [clientId, firstName, lastName, email, phone, customerAddress, 'active', 'residential']
      );
      console.log(`Angi Ads webhook: Created new client ${clientId}`);
    }

    const newLeadId = uuidv4();
    const leadDescriptionWithAngiId = leadDescription 
      ? `${leadDescription}\n\nAngi Lead ID: ${leadId || 'N/A'}` 
      : `Angi Lead ID: ${leadId || 'N/A'}`;

    const { rows: newLeadRows } = await db.query(
      `INSERT INTO leads (id, client_id_new, source, status, description, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [newLeadId, clientId, 'Angi Ads', 'New', leadDescriptionWithAngiId, new Date().toISOString()]
    );

    console.log(`Angi Ads webhook: Created new lead ${newLeadId} for client ${clientId}`);

    res.status(200).json({
      success: true,
      leadId: newLeadId,
      clientId: clientId
    });

  } catch (err) {
    console.error('Angi Ads webhook error:', err);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: err.message 
    });
  }
});


apiRouter.post('/rag/search', async (req, res) => {
  try {
    const { query, collections, limit } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const results = await ragService.search(query, { collections, limit });
    res.json({ results });
  } catch (err) {
    handleError(res, err);
  }
});

apiRouter.post('/rag/context', async (req, res) => {
  try {
    const { query, maxResults } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const context = await ragService.getContextForQuery(query, maxResults);
    res.json({ context });
  } catch (err) {
    handleError(res, err);
  }
});

apiRouter.post('/rag/build', async (req, res) => {
  try {
    console.log('🔄 Starting vector database build...');
    const stats = await ragService.buildVectorDatabase();
    res.json({ 
      success: true, 
      message: 'Vector database built successfully',
      stats 
    });
  } catch (err) {
    handleError(res, err);
  }
});

apiRouter.get('/rag/stats', async (req, res) => {
  try {
    const vectorStore = require('./services/vectorStore');
    const stats = await vectorStore.getCollectionStats();
    res.json({ stats });
  } catch (err) {
    handleError(res, err);
  }
});

// Estimate Feedback Analytics endpoint
apiRouter.get('/estimate_feedback/stats', async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM estimate_feedback ORDER BY created_at DESC`);
    
    if (rows.length === 0) {
      return res.json({
        totalFeedback: 0,
        accurateCount: 0,
        tooLowCount: 0,
        tooHighCount: 0,
        accuracyRate: 0,
        averagePriceDifference: 0,
        commonCorrectionReasons: [],
        feedbackByTreeSize: {
          small: { count: 0, avgDifference: 0 },
          medium: { count: 0, avgDifference: 0 },
          large: { count: 0, avgDifference: 0 },
          extraLarge: { count: 0, avgDifference: 0 }
        }
      });
    }

    const totalFeedback = rows.length;
    const accurateCount = rows.filter(r => r.feedback_rating === 'accurate').length;
    const tooLowCount = rows.filter(r => r.feedback_rating === 'too_low').length;
    const tooHighCount = rows.filter(r => r.feedback_rating === 'too_high').length;
    const accuracyRate = (accurateCount / totalFeedback) * 100;

    // Calculate average price difference
    const feedbackWithActual = rows.filter(r => r.actual_price_quoted !== null);
    const avgDiff = feedbackWithActual.length > 0
      ? feedbackWithActual.reduce((sum, r) => {
          const aiMid = (parseFloat(r.ai_suggested_price_min) + parseFloat(r.ai_suggested_price_max)) / 2;
          return sum + Math.abs(parseFloat(r.actual_price_quoted) - aiMid);
        }, 0) / feedbackWithActual.length
      : 0;

    // Count correction reasons
    const reasonCounts = {};
    rows.forEach(r => {
      if (r.correction_reasons && Array.isArray(r.correction_reasons)) {
        r.correction_reasons.forEach(reason => {
          reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
        });
      }
    });
    const commonCorrectionReasons = Object.entries(reasonCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Group by tree size
    const feedbackByTreeSize = {
      small: { count: 0, totalDiff: 0, avgDifference: 0 },
      medium: { count: 0, totalDiff: 0, avgDifference: 0 },
      large: { count: 0, totalDiff: 0, avgDifference: 0 },
      extraLarge: { count: 0, totalDiff: 0, avgDifference: 0 }
    };

    feedbackWithActual.forEach(r => {
      const height = parseFloat(r.tree_height) || 0;
      const aiMid = (parseFloat(r.ai_suggested_price_min) + parseFloat(r.ai_suggested_price_max)) / 2;
      const diff = Math.abs(parseFloat(r.actual_price_quoted) - aiMid);
      
      let sizeCategory;
      if (height < 30) sizeCategory = 'small';
      else if (height < 60) sizeCategory = 'medium';
      else if (height < 80) sizeCategory = 'large';
      else sizeCategory = 'extraLarge';

      feedbackByTreeSize[sizeCategory].count++;
      feedbackByTreeSize[sizeCategory].totalDiff += diff;
    });

    // Calculate averages
    Object.keys(feedbackByTreeSize).forEach(size => {
      const data = feedbackByTreeSize[size];
      data.avgDifference = data.count > 0 ? data.totalDiff / data.count : 0;
      delete data.totalDiff;
    });

    res.json({
      totalFeedback,
      accurateCount,
      tooLowCount,
      tooHighCount,
      accuracyRate: Math.round(accuracyRate * 10) / 10,
      averagePriceDifference: Math.round(avgDiff * 100) / 100,
      commonCorrectionReasons,
      feedbackByTreeSize
    });
  } catch (err) {
    handleError(res, err);
  }
});

// ============================================================================
// CLIENT CRUD API ENDPOINTS
// ============================================================================

// Helper function: Convert snake_case object keys to camelCase recursively
const snakeToCamel = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(snakeToCamel);
  if (typeof obj !== 'object') return obj;
  
  const camelObj = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    camelObj[camelKey] = (value && typeof value === 'object') ? snakeToCamel(value) : value;
  }
  return camelObj;
};

// Helper function: Convert camelCase object keys to snake_case recursively
const camelToSnake = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(camelToSnake);
  if (typeof obj !== 'object') return obj;
  
  const snakeObj = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    snakeObj[snakeKey] = (value && typeof value === 'object') ? camelToSnake(value) : value;
  }
  return snakeObj;
};

// Helper function: Build client stats
const buildClientStats = async (clientId) => {
  try {
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM quotes WHERE customer_name IN (
          SELECT CONCAT(first_name, ' ', last_name) FROM clients WHERE id = $1
        )) as total_quotes,
        (SELECT COUNT(*) FROM jobs WHERE customer_name IN (
          SELECT CONCAT(first_name, ' ', last_name) FROM clients WHERE id = $1
        )) as total_jobs,
        (SELECT COUNT(*) FROM invoices WHERE customer_name IN (
          SELECT CONCAT(first_name, ' ', last_name) FROM clients WHERE id = $1
        )) as total_invoices,
        (SELECT COALESCE(SUM(amount::numeric), 0) FROM invoices WHERE customer_name IN (
          SELECT CONCAT(first_name, ' ', last_name) FROM clients WHERE id = $1
        ) AND status = 'Paid') as lifetime_value,
        (SELECT MAX(scheduled_date) FROM jobs WHERE customer_name IN (
          SELECT CONCAT(first_name, ' ', last_name) FROM clients WHERE id = $1
        )) as last_job_date
    `;
    
    const { rows } = await db.query(statsQuery, [clientId]);
    return {
      totalQuotes: parseInt(rows[0]?.total_quotes || 0),
      totalJobs: parseInt(rows[0]?.total_jobs || 0),
      totalInvoices: parseInt(rows[0]?.total_invoices || 0),
      lifetimeValue: parseFloat(rows[0]?.lifetime_value || 0),
      lastJobDate: rows[0]?.last_job_date || null
    };
  } catch (err) {
    console.error('Error building client stats:', err);
    return {
      totalQuotes: 0,
      totalJobs: 0,
      totalInvoices: 0,
      lifetimeValue: 0,
      lastJobDate: null
    };
  }
};

// Helper function: Validate client input
const validateClientInput = (data) => {
  const errors = [];
  
  if (data.primaryEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.primaryEmail)) {
      errors.push('Invalid email format');
    }
  }
  
  if (!data.firstName && !data.companyName) {
    errors.push('Either firstName or companyName is required');
  }
  
  return errors;
};

// POST /api/clients - Create new client
apiRouter.post('/clients', async (req, res) => {
  try {
    const clientData = req.body;
    
    // Validate input
    const validationErrors = validateClientInput(clientData);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Validation failed', 
        details: validationErrors 
      });
    }
    
    // Start transaction
    await db.query('BEGIN');
    
    try {
      // Convert camelCase to snake_case for database
      const dbData = camelToSnake(clientData);
      
      // Extract nested data
      const properties = clientData.properties || [];
      const contacts = clientData.contacts || [];
      const tags = clientData.tags || [];
      
      // Remove nested arrays from main data
      delete dbData.properties;
      delete dbData.contacts;
      delete dbData.tags;
      
      // Generate UUID and set defaults
      const clientId = uuidv4();
      dbData.id = clientId;
      dbData.status = dbData.status || 'active';
      dbData.client_type = dbData.client_type || 'residential';
      
      // Insert client
      const clientColumns = Object.keys(dbData).filter(k => k !== 'id');
      const clientValues = clientColumns.map(k => dbData[k]);
      const clientPlaceholders = clientColumns.map((_, i) => `$${i + 2}`).join(', ');
      
      const clientQuery = `
        INSERT INTO clients (id, ${clientColumns.join(', ')}) 
        VALUES ($1, ${clientPlaceholders}) 
        RETURNING *
      `;
      
      const { rows: clientRows } = await db.query(clientQuery, [clientId, ...clientValues]);
      const createdClient = clientRows[0];
      
      // Insert properties
      const createdProperties = [];
      for (const property of properties) {
        const propertyId = uuidv4();
        const propData = camelToSnake(property);
        propData.id = propertyId;
        propData.client_id = clientId;
        
        const propColumns = Object.keys(propData).filter(k => k !== 'id');
        const propValues = propColumns.map(k => propData[k]);
        const propPlaceholders = propColumns.map((_, i) => `$${i + 2}`).join(', ');
        
        const propQuery = `
          INSERT INTO properties (id, ${propColumns.join(', ')}) 
          VALUES ($1, ${propPlaceholders}) 
          RETURNING *
        `;
        
        const { rows: propRows } = await db.query(propQuery, [propertyId, ...propValues]);
        createdProperties.push(propRows[0]);
      }
      
      // Insert contacts
      const createdContacts = [];
      for (const contact of contacts) {
        const contactId = uuidv4();
        const contactData = camelToSnake(contact);
        contactData.id = contactId;
        contactData.client_id = clientId;
        
        // Extract channels
        const channels = contact.channels || [];
        delete contactData.channels;
        
        const contactColumns = Object.keys(contactData).filter(k => k !== 'id');
        const contactValues = contactColumns.map(k => contactData[k]);
        const contactPlaceholders = contactColumns.map((_, i) => `$${i + 2}`).join(', ');
        
        const contactQuery = `
          INSERT INTO contacts (id, ${contactColumns.join(', ')}) 
          VALUES ($1, ${contactPlaceholders}) 
          RETURNING *
        `;
        
        const { rows: contactRows } = await db.query(contactQuery, [contactId, ...contactValues]);
        const createdContact = contactRows[0];
        
        // Insert contact channels
        const createdChannels = [];
        for (const channel of channels) {
          const channelId = uuidv4();
          const channelData = camelToSnake(channel);
          channelData.id = channelId;
          channelData.contact_id = contactId;
          
          const channelQuery = `
            INSERT INTO contact_channels (id, contact_id, channel_type, channel_value, label, is_primary, is_verified)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
          `;
          
          const { rows: channelRows } = await db.query(channelQuery, [
            channelId,
            contactId,
            channelData.channel_type,
            channelData.channel_value,
            channelData.label || null,
            channelData.is_primary || false,
            channelData.is_verified || false
          ]);
          createdChannels.push(channelRows[0]);
        }
        
        createdContact.channels = createdChannels;
        createdContacts.push(createdContact);
      }
      
      // Insert tags
      const createdTags = [];
      for (const tagName of tags) {
        // Find or create tag
        let tagId;
        const { rows: existingTags } = await db.query(
          'SELECT id FROM tags WHERE name = $1',
          [tagName]
        );
        
        if (existingTags.length > 0) {
          tagId = existingTags[0].id;
        } else {
          tagId = uuidv4();
          await db.query(
            'INSERT INTO tags (id, name, category) VALUES ($1, $2, $3)',
            [tagId, tagName, 'client']
          );
        }
        
        // Link tag to client
        await db.query(
          'INSERT INTO entity_tags (id, tag_id, entity_type, entity_id) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
          [uuidv4(), tagId, 'client', clientId]
        );
        
        createdTags.push({ id: tagId, name: tagName });
      }
      
      // Commit transaction
      await db.query('COMMIT');
      
      // Build response with nested data
      const response = snakeToCamel(createdClient);
      response.properties = createdProperties.map(snakeToCamel);
      response.contacts = createdContacts.map(snakeToCamel);
      response.tags = createdTags;
      
      res.status(201).json({ success: true, data: response });
      
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
    
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/clients - List clients with filtering and pagination
apiRouter.get('/clients', async (req, res) => {
  try {
    const {
      status,
      clientType,
      search,
      tags,
      page = 1,
      limit = 50,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ['deleted_at IS NULL'];
    const params = [];
    let paramIndex = 1;
    
    // Status filter
    if (status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }
    
    // Client type filter
    if (clientType) {
      conditions.push(`client_type = $${paramIndex}`);
      params.push(clientType);
      paramIndex++;
    }
    
    // Full-text search
    if (search) {
      conditions.push(`(
        to_tsvector('english', 
          coalesce(first_name, '') || ' ' || 
          coalesce(last_name, '') || ' ' || 
          coalesce(company_name, '') || ' ' || 
          coalesce(primary_email, '')
        ) @@ plainto_tsquery('english', $${paramIndex})
        OR first_name ILIKE $${paramIndex + 1}
        OR last_name ILIKE $${paramIndex + 1}
        OR company_name ILIKE $${paramIndex + 1}
        OR primary_email ILIKE $${paramIndex + 1}
      )`);
      params.push(search, `%${search}%`);
      paramIndex += 2;
    }
    
    // Tag filter
    if (tags) {
      const tagArray = tags.split(',');
      conditions.push(`id IN (
        SELECT entity_id FROM entity_tags 
        WHERE entity_type = 'client' 
        AND tag_id IN (SELECT id FROM tags WHERE name = ANY($${paramIndex}))
      )`);
      params.push(tagArray);
      paramIndex++;
    }
    
    // Build WHERE clause
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Validate sortBy to prevent SQL injection
    const validSortColumns = ['created_at', 'updated_at', 'first_name', 'last_name', 'company_name', 'lifetime_value'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const sortDirection = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    
    // Get total count
    const countQuery = `SELECT COUNT(*) FROM clients ${whereClause}`;
    const { rows: countRows } = await db.query(countQuery, params);
    const totalCount = parseInt(countRows[0].count);
    
    // Get clients with basic stats
    const clientsQuery = `
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM quotes q WHERE q.customer_name = CONCAT(c.first_name, ' ', c.last_name)) as job_count,
        (SELECT COUNT(*) FROM quotes WHERE customer_name = CONCAT(c.first_name, ' ', c.last_name)) as quote_count,
        (SELECT COALESCE(SUM(amount::numeric), 0) FROM invoices WHERE customer_name = CONCAT(c.first_name, ' ', c.last_name) AND status = 'Paid') as calculated_lifetime_value
      FROM clients c
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const { rows: clients } = await db.query(clientsQuery, [...params, parseInt(limit), offset]);
    
    // Transform to camelCase and add stats
    const transformedClients = clients.map(client => {
      const transformed = snakeToCamel(client);
      transformed.stats = {
        jobCount: parseInt(client.job_count || 0),
        quoteCount: parseInt(client.quote_count || 0),
        lifetimeValue: parseFloat(client.calculated_lifetime_value || client.lifetime_value || 0)
      };
      delete transformed.jobCount;
      delete transformed.quoteCount;
      delete transformed.calculatedLifetimeValue;
      return transformed;
    });
    
    res.json({
      success: true,
      data: transformedClients,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });
    
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/clients/:id - Get single client with full details
apiRouter.get('/clients/:id', async (req, res) => {
  try {
    const clientId = req.params.id;
    
    // Get client
    const { rows: clientRows } = await db.query(
      'SELECT * FROM clients WHERE id = $1 AND deleted_at IS NULL',
      [clientId]
    );
    
    if (clientRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Client not found' 
      });
    }
    
    const client = snakeToCamel(clientRows[0]);
    
    // Get properties
    const { rows: propertyRows } = await db.query(
      'SELECT * FROM properties WHERE client_id = $1 AND deleted_at IS NULL',
      [clientId]
    );
    client.properties = propertyRows.map(snakeToCamel);
    
    // Get contacts with channels
    const { rows: contactRows } = await db.query(
      'SELECT * FROM contacts WHERE client_id = $1 AND deleted_at IS NULL',
      [clientId]
    );
    
    const contacts = [];
    for (const contact of contactRows) {
      const transformedContact = snakeToCamel(contact);
      
      // Get channels for this contact
      const { rows: channelRows } = await db.query(
        'SELECT * FROM contact_channels WHERE contact_id = $1',
        [contact.id]
      );
      transformedContact.channels = channelRows.map(snakeToCamel);
      
      contacts.push(transformedContact);
    }
    client.contacts = contacts;
    
    // Get tags
    const { rows: tagRows } = await db.query(`
      SELECT t.id, t.name, t.color, t.category
      FROM tags t
      INNER JOIN entity_tags et ON t.id = et.tag_id
      WHERE et.entity_type = 'client' AND et.entity_id = $1
    `, [clientId]);
    client.tags = tagRows.map(snakeToCamel);
    
    // Get custom field values
    const { rows: customFieldRows } = await db.query(`
      SELECT 
        cfv.id,
        cfv.field_value,
        cfd.field_name,
        cfd.field_label,
        cfd.field_type
      FROM custom_field_values cfv
      INNER JOIN custom_field_definitions cfd ON cfv.field_definition_id = cfd.id
      WHERE cfv.entity_type = 'client' AND cfv.entity_id = $1
    `, [clientId]);
    client.customFields = customFieldRows.map(snakeToCamel);
    
    // Get stats
    client.stats = await buildClientStats(clientId);
    
    res.json({ success: true, data: client });
    
  } catch (err) {
    handleError(res, err);
  }
});

// PUT /api/clients/:id - Update client
apiRouter.put('/clients/:id', async (req, res) => {
  try {
    const clientId = req.params.id;
    const clientData = req.body;
    
    // Validate input
    const validationErrors = validateClientInput(clientData);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Validation failed', 
        details: validationErrors 
      });
    }
    
    // Check if client exists
    const { rows: existingRows } = await db.query(
      'SELECT * FROM clients WHERE id = $1 AND deleted_at IS NULL',
      [clientId]
    );
    
    if (existingRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Client not found' 
      });
    }
    
    // Check email uniqueness if email is being changed
    if (clientData.primaryEmail && clientData.primaryEmail !== existingRows[0].primary_email) {
      const { rows: emailCheckRows } = await db.query(
        'SELECT id FROM clients WHERE primary_email = $1 AND id != $2 AND deleted_at IS NULL',
        [clientData.primaryEmail, clientId]
      );
      
      if (emailCheckRows.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Email already exists for another client' 
        });
      }
    }
    
    // Convert to snake_case and remove nested data
    const dbData = camelToSnake(clientData);
    delete dbData.properties;
    delete dbData.contacts;
    delete dbData.tags;
    delete dbData.customFields;
    delete dbData.stats;
    delete dbData.id;
    delete dbData.created_at;
    delete dbData.deleted_at;
    
    // Build update query
    const columns = Object.keys(dbData);
    const values = columns.map(k => dbData[k]);
    const setString = columns.map((col, i) => `${col} = $${i + 2}`).join(', ');
    
    const updateQuery = `
      UPDATE clients 
      SET ${setString}, updated_at = NOW() 
      WHERE id = $1 
      RETURNING *
    `;
    
    const { rows: updatedRows } = await db.query(updateQuery, [clientId, ...values]);
    
    // Get full client details to return
    const response = await db.query(
      'SELECT * FROM clients WHERE id = $1',
      [clientId]
    );
    
    const client = snakeToCamel(response.rows[0]);
    
    // Get nested data
    const { rows: propertyRows } = await db.query(
      'SELECT * FROM properties WHERE client_id = $1 AND deleted_at IS NULL',
      [clientId]
    );
    client.properties = propertyRows.map(snakeToCamel);
    
    const { rows: contactRows } = await db.query(
      'SELECT * FROM contacts WHERE client_id = $1 AND deleted_at IS NULL',
      [clientId]
    );
    
    const contacts = [];
    for (const contact of contactRows) {
      const transformedContact = snakeToCamel(contact);
      const { rows: channelRows } = await db.query(
        'SELECT * FROM contact_channels WHERE contact_id = $1',
        [contact.id]
      );
      transformedContact.channels = channelRows.map(snakeToCamel);
      contacts.push(transformedContact);
    }
    client.contacts = contacts;
    
    const { rows: tagRows } = await db.query(`
      SELECT t.id, t.name, t.color, t.category
      FROM tags t
      INNER JOIN entity_tags et ON t.id = et.tag_id
      WHERE et.entity_type = 'client' AND et.entity_id = $1
    `, [clientId]);
    client.tags = tagRows.map(snakeToCamel);
    
    res.json({ success: true, data: client });
    
  } catch (err) {
    handleError(res, err);
  }
});

// DELETE /api/clients/:id - Soft delete client
apiRouter.delete('/clients/:id', async (req, res) => {
  try {
    const clientId = req.params.id;
    
    // Check if client exists
    const { rows: clientRows } = await db.query(
      'SELECT * FROM clients WHERE id = $1 AND deleted_at IS NULL',
      [clientId]
    );
    
    if (clientRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Client not found' 
      });
    }
    
    // Check if client has jobs
    const clientName = `${clientRows[0].first_name} ${clientRows[0].last_name}`.trim() || clientRows[0].company_name;
    const { rows: jobRows } = await db.query(
      'SELECT COUNT(*) as count FROM jobs WHERE customer_name = $1',
      [clientName]
    );
    
    if (parseInt(jobRows[0].count) > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot delete client with existing jobs' 
      });
    }
    
    // Soft delete client
    await db.query(
      'UPDATE clients SET deleted_at = NOW() WHERE id = $1',
      [clientId]
    );
    
    // Soft delete related properties
    await db.query(
      'UPDATE properties SET deleted_at = NOW() WHERE client_id = $1',
      [clientId]
    );
    
    res.status(204).send();
    
  } catch (err) {
    handleError(res, err);
  }
});

// ============================================================================
// PROPERTY CRUD API ENDPOINTS
// ============================================================================

// POST /api/clients/:clientId/properties - Add property to client
apiRouter.post('/clients/:clientId/properties', async (req, res) => {
  try {
    const { clientId } = req.params;
    const propertyData = req.body;
    
    // Validate client exists
    const { rows: clientRows } = await db.query(
      'SELECT * FROM clients WHERE id = $1 AND deleted_at IS NULL',
      [clientId]
    );
    
    if (clientRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Client not found' 
      });
    }
    
    await db.query('BEGIN');
    
    try {
      // Convert camelCase to snake_case
      const dbData = camelToSnake(propertyData);
      const propertyId = uuidv4();
      dbData.id = propertyId;
      dbData.client_id = clientId;
      
      // Handle isPrimary logic
      if (dbData.is_primary === true) {
        // Unset any existing primary property for this client
        await db.query(
          'UPDATE properties SET is_primary = false WHERE client_id = $1 AND deleted_at IS NULL',
          [clientId]
        );
      }
      
      // Build insert query
      const columns = Object.keys(dbData).filter(k => k !== 'id');
      const values = columns.map(k => dbData[k]);
      const placeholders = columns.map((_, i) => `$${i + 2}`).join(', ');
      
      const insertQuery = `
        INSERT INTO properties (id, ${columns.join(', ')}) 
        VALUES ($1, ${placeholders}) 
        RETURNING *
      `;
      
      const { rows: propertyRows } = await db.query(insertQuery, [propertyId, ...values]);
      
      await db.query('COMMIT');
      
      const response = snakeToCamel(propertyRows[0]);
      res.status(201).json({ success: true, data: response });
      
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
    
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/properties/:id - Get property details
apiRouter.get('/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get property
    const { rows: propertyRows } = await db.query(
      'SELECT * FROM properties WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    if (propertyRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Property not found' 
      });
    }
    
    const property = snakeToCamel(propertyRows[0]);
    
    // Get client information
    const { rows: clientRows } = await db.query(
      'SELECT * FROM clients WHERE id = $1 AND deleted_at IS NULL',
      [propertyRows[0].client_id]
    );
    
    if (clientRows.length > 0) {
      property.client = snakeToCamel(clientRows[0]);
    }
    
    // Get contacts linked to this property
    const { rows: contactRows } = await db.query(
      'SELECT * FROM contacts WHERE property_id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    const contacts = [];
    for (const contact of contactRows) {
      const transformedContact = snakeToCamel(contact);
      
      // Get channels for this contact
      const { rows: channelRows } = await db.query(
        'SELECT * FROM contact_channels WHERE contact_id = $1',
        [contact.id]
      );
      transformedContact.channels = channelRows.map(snakeToCamel);
      
      contacts.push(transformedContact);
    }
    property.contacts = contacts;
    
    res.json({ success: true, data: property });
    
  } catch (err) {
    handleError(res, err);
  }
});

// PUT /api/properties/:id - Update property
apiRouter.put('/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const propertyData = req.body;
    
    // Check if property exists
    const { rows: existingRows } = await db.query(
      'SELECT * FROM properties WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    if (existingRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Property not found' 
      });
    }
    
    await db.query('BEGIN');
    
    try {
      const existingProperty = existingRows[0];
      
      // Handle isPrimary logic
      if (propertyData.isPrimary === true) {
        // Unset other primary properties for this client
        await db.query(
          'UPDATE properties SET is_primary = false WHERE client_id = $1 AND id != $2 AND deleted_at IS NULL',
          [existingProperty.client_id, id]
        );
      }
      
      // Convert to snake_case and remove fields that shouldn't be updated
      const dbData = camelToSnake(propertyData);
      delete dbData.id;
      delete dbData.client_id;
      delete dbData.created_at;
      delete dbData.deleted_at;
      delete dbData.client;
      delete dbData.contacts;
      
      // Build update query
      const columns = Object.keys(dbData);
      const values = columns.map(k => dbData[k]);
      const setString = columns.map((col, i) => `${col} = $${i + 2}`).join(', ');
      
      const updateQuery = `
        UPDATE properties 
        SET ${setString}, updated_at = NOW() 
        WHERE id = $1 
        RETURNING *
      `;
      
      const { rows: updatedRows } = await db.query(updateQuery, [id, ...values]);
      
      await db.query('COMMIT');
      
      const response = snakeToCamel(updatedRows[0]);
      res.json({ success: true, data: response });
      
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
    
  } catch (err) {
    handleError(res, err);
  }
});

// DELETE /api/properties/:id - Soft delete property
apiRouter.delete('/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if property exists
    const { rows: propertyRows } = await db.query(
      'SELECT * FROM properties WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    if (propertyRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Property not found' 
      });
    }
    
    const property = propertyRows[0];
    
    // Check if this is the only property for the client
    const { rows: clientPropertyRows } = await db.query(
      'SELECT COUNT(*) as count FROM properties WHERE client_id = $1 AND deleted_at IS NULL',
      [property.client_id]
    );
    
    if (parseInt(clientPropertyRows[0].count) <= 1) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot delete the only property for a client' 
      });
    }
    
    // Check if property is linked to any jobs (via property address matching)
    // Note: This is a simplified check. In production, you'd want a proper FK relationship
    const propertyAddress = `${property.address_line1}, ${property.city}, ${property.state}`;
    const { rows: jobRows } = await db.query(
      'SELECT COUNT(*) as count FROM jobs WHERE job_location ILIKE $1',
      [`%${property.address_line1}%`]
    );
    
    if (parseInt(jobRows[0].count) > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot delete property that is linked to existing jobs' 
      });
    }
    
    // Soft delete property
    await db.query(
      'UPDATE properties SET deleted_at = NOW() WHERE id = $1',
      [id]
    );
    
    res.status(204).send();
    
  } catch (err) {
    handleError(res, err);
  }
});

// ============================================================================
// CONTACT CRUD API ENDPOINTS
// ============================================================================

// POST /api/clients/:clientId/contacts - Add contact to client
apiRouter.post('/clients/:clientId/contacts', async (req, res) => {
  try {
    const { clientId } = req.params;
    const contactData = req.body;
    
    // Validate client exists
    const { rows: clientRows } = await db.query(
      'SELECT * FROM clients WHERE id = $1 AND deleted_at IS NULL',
      [clientId]
    );
    
    if (clientRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Client not found' 
      });
    }
    
    // Validate property if provided
    if (contactData.propertyId) {
      const { rows: propertyRows } = await db.query(
        'SELECT * FROM properties WHERE id = $1 AND client_id = $2 AND deleted_at IS NULL',
        [contactData.propertyId, clientId]
      );
      
      if (propertyRows.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Property not found or does not belong to this client' 
        });
      }
    }
    
    await db.query('BEGIN');
    
    try {
      // Extract channels
      const channels = contactData.channels || [];
      
      // Convert camelCase to snake_case
      const dbData = camelToSnake(contactData);
      delete dbData.channels;
      
      const contactId = uuidv4();
      dbData.id = contactId;
      dbData.client_id = clientId;
      
      // Build insert query for contact
      const columns = Object.keys(dbData).filter(k => k !== 'id');
      const values = columns.map(k => dbData[k]);
      const placeholders = columns.map((_, i) => `$${i + 2}`).join(', ');
      
      const contactQuery = `
        INSERT INTO contacts (id, ${columns.join(', ')}) 
        VALUES ($1, ${placeholders}) 
        RETURNING *
      `;
      
      const { rows: contactRows } = await db.query(contactQuery, [contactId, ...values]);
      const createdContact = contactRows[0];
      
      // Insert contact channels
      const createdChannels = [];
      for (const channel of channels) {
        const channelId = uuidv4();
        const channelData = camelToSnake(channel);
        
        const channelQuery = `
          INSERT INTO contact_channels (id, contact_id, channel_type, channel_value, label, is_primary, is_verified)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `;
        
        const { rows: channelRows } = await db.query(channelQuery, [
          channelId,
          contactId,
          channelData.channel_type,
          channelData.channel_value,
          channelData.label || null,
          channelData.is_primary || false,
          channelData.is_verified || false
        ]);
        createdChannels.push(channelRows[0]);
      }
      
      await db.query('COMMIT');
      
      // Build response
      const response = snakeToCamel(createdContact);
      response.channels = createdChannels.map(snakeToCamel);
      
      res.status(201).json({ success: true, data: response });
      
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
    
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/contacts/:id - Get contact details
apiRouter.get('/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get contact
    const { rows: contactRows } = await db.query(
      'SELECT * FROM contacts WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    if (contactRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Contact not found' 
      });
    }
    
    const contact = snakeToCamel(contactRows[0]);
    
    // Get all communication channels
    const { rows: channelRows } = await db.query(
      'SELECT * FROM contact_channels WHERE contact_id = $1',
      [id]
    );
    contact.channels = channelRows.map(snakeToCamel);
    
    // Get linked client info
    const { rows: clientRows } = await db.query(
      'SELECT * FROM clients WHERE id = $1 AND deleted_at IS NULL',
      [contactRows[0].client_id]
    );
    
    if (clientRows.length > 0) {
      contact.client = snakeToCamel(clientRows[0]);
    }
    
    // Get linked property info if exists
    if (contactRows[0].property_id) {
      const { rows: propertyRows } = await db.query(
        'SELECT * FROM properties WHERE id = $1 AND deleted_at IS NULL',
        [contactRows[0].property_id]
      );
      
      if (propertyRows.length > 0) {
        contact.property = snakeToCamel(propertyRows[0]);
      }
    }
    
    res.json({ success: true, data: contact });
    
  } catch (err) {
    handleError(res, err);
  }
});

// PUT /api/contacts/:id - Update contact
apiRouter.put('/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const contactData = req.body;
    
    // Check if contact exists
    const { rows: existingRows } = await db.query(
      'SELECT * FROM contacts WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    if (existingRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Contact not found' 
      });
    }
    
    await db.query('BEGIN');
    
    try {
      // Extract channels if provided
      const channels = contactData.channels;
      
      // Convert to snake_case and remove fields that shouldn't be updated
      const dbData = camelToSnake(contactData);
      delete dbData.id;
      delete dbData.client_id;
      delete dbData.created_at;
      delete dbData.deleted_at;
      delete dbData.channels;
      delete dbData.client;
      delete dbData.property;
      
      // Build update query for contact
      const columns = Object.keys(dbData);
      const values = columns.map(k => dbData[k]);
      const setString = columns.map((col, i) => `${col} = $${i + 2}`).join(', ');
      
      const updateQuery = `
        UPDATE contacts 
        SET ${setString}, updated_at = NOW() 
        WHERE id = $1 
        RETURNING *
      `;
      
      const { rows: updatedRows } = await db.query(updateQuery, [id, ...values]);
      
      // Update channels if provided
      if (channels && Array.isArray(channels)) {
        // Delete old channels
        await db.query('DELETE FROM contact_channels WHERE contact_id = $1', [id]);
        
        // Insert new channels
        for (const channel of channels) {
          const channelId = uuidv4();
          const channelData = camelToSnake(channel);
          
          const channelQuery = `
            INSERT INTO contact_channels (id, contact_id, channel_type, channel_value, label, is_primary, is_verified)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
          `;
          
          await db.query(channelQuery, [
            channelId,
            id,
            channelData.channel_type,
            channelData.channel_value,
            channelData.label || null,
            channelData.is_primary || false,
            channelData.is_verified || false
          ]);
        }
      }
      
      await db.query('COMMIT');
      
      // Get updated contact with channels
      const { rows: finalContactRows } = await db.query(
        'SELECT * FROM contacts WHERE id = $1',
        [id]
      );
      
      const response = snakeToCamel(finalContactRows[0]);
      
      const { rows: channelRows } = await db.query(
        'SELECT * FROM contact_channels WHERE contact_id = $1',
        [id]
      );
      response.channels = channelRows.map(snakeToCamel);
      
      res.json({ success: true, data: response });
      
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
    
  } catch (err) {
    handleError(res, err);
  }
});

// DELETE /api/contacts/:id - Soft delete contact
apiRouter.delete('/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if contact exists
    const { rows: contactRows } = await db.query(
      'SELECT * FROM contacts WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    if (contactRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Contact not found' 
      });
    }
    
    await db.query('BEGIN');
    
    try {
      // Soft delete contact
      await db.query(
        'UPDATE contacts SET deleted_at = NOW() WHERE id = $1',
        [id]
      );
      
      // Hard delete associated channels (cascade)
      await db.query(
        'DELETE FROM contact_channels WHERE contact_id = $1',
        [id]
      );
      
      await db.query('COMMIT');
      
      res.status(204).send();
      
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
    
  } catch (err) {
    handleError(res, err);
  }
});

// ============================================================================
// CONTACT CHANNELS ENDPOINTS
// ============================================================================

// POST /api/contacts/:contactId/channels - Add communication channel
apiRouter.post('/contacts/:contactId/channels', async (req, res) => {
  try {
    const { contactId } = req.params;
    const channelData = req.body;
    
    // Validate contact exists
    const { rows: contactRows } = await db.query(
      'SELECT * FROM contacts WHERE id = $1 AND deleted_at IS NULL',
      [contactId]
    );
    
    if (contactRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Contact not found' 
      });
    }
    
    await db.query('BEGIN');
    
    try {
      const dbData = camelToSnake(channelData);
      
      // Handle isPrimary logic
      if (dbData.is_primary === true && dbData.channel_type) {
        // Unset other primary channels of the same type
        await db.query(
          'UPDATE contact_channels SET is_primary = false WHERE contact_id = $1 AND channel_type = $2',
          [contactId, dbData.channel_type]
        );
      }
      
      const channelId = uuidv4();
      
      const channelQuery = `
        INSERT INTO contact_channels (id, contact_id, channel_type, channel_value, label, is_primary, is_verified)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      const { rows: channelRows } = await db.query(channelQuery, [
        channelId,
        contactId,
        dbData.channel_type,
        dbData.channel_value,
        dbData.label || null,
        dbData.is_primary || false,
        dbData.is_verified || false
      ]);
      
      await db.query('COMMIT');
      
      const response = snakeToCamel(channelRows[0]);
      res.status(201).json({ success: true, data: response });
      
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
    
  } catch (err) {
    handleError(res, err);
  }
});

// DELETE /api/contact-channels/:id - Delete channel
apiRouter.delete('/contact-channels/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if channel exists
    const { rows: channelRows } = await db.query(
      'SELECT * FROM contact_channels WHERE id = $1',
      [id]
    );
    
    if (channelRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Channel not found' 
      });
    }
    
    // Hard delete channel
    await db.query(
      'DELETE FROM contact_channels WHERE id = $1',
      [id]
    );
    
    res.status(204).send();
    
  } catch (err) {
    handleError(res, err);
  }
});

// ============================================================================
// TAG MANAGEMENT API ENDPOINTS
// ============================================================================

// Helper function: Calculate usage count for a tag
const calculateTagUsageCount = async (tagId) => {
  try {
    const { rows } = await db.query(
      'SELECT COUNT(*) as count FROM entity_tags WHERE tag_id = $1',
      [tagId]
    );
    return parseInt(rows[0]?.count || 0);
  } catch (err) {
    console.error('Error calculating tag usage count:', err);
    return 0;
  }
};

// Helper function: Get or create tag by name
const getOrCreateTagByName = async (name, category = null) => {
  try {
    const { rows: existingTags } = await db.query(
      'SELECT * FROM tags WHERE LOWER(name) = LOWER($1)',
      [name]
    );
    
    if (existingTags.length > 0) {
      return snakeToCamel(existingTags[0]);
    }
    
    const tagId = uuidv4();
    const { rows: newTagRows } = await db.query(
      `INSERT INTO tags (id, name, color, category) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [tagId, name, '#00c2ff', category]
    );
    
    return snakeToCamel(newTagRows[0]);
  } catch (err) {
    console.error('Error in getOrCreateTagByName:', err);
    throw err;
  }
};

// Helper function: Validate entity type
const validateEntityType = (entityType) => {
  const validTypes = ['client', 'property', 'quote', 'job', 'lead'];
  return validTypes.includes(entityType);
};

// Helper function: Get table name for entity type
const getTableNameForEntityType = (entityType) => {
  const tableMap = {
    'client': 'clients',
    'property': 'properties',
    'quote': 'quotes',
    'job': 'jobs',
    'lead': 'leads'
  };
  return tableMap[entityType];
};

// Helper function: Validate entity exists
const validateEntityExists = async (entityType, entityId) => {
  const tableName = getTableNameForEntityType(entityType);
  if (!tableName) return false;
  
  try {
    const { rows } = await db.query(
      `SELECT id FROM ${tableName} WHERE id = $1`,
      [entityId]
    );
    return rows.length > 0;
  } catch (err) {
    console.error('Error validating entity existence:', err);
    return false;
  }
};

// GET /api/tags - List all tags
apiRouter.get('/tags', async (req, res) => {
  try {
    const { category } = req.query;
    
    let queryText = `
      SELECT t.*, 
             (SELECT COUNT(*) FROM entity_tags et WHERE et.tag_id = t.id) as usage_count
      FROM tags t
    `;
    
    const queryParams = [];
    
    if (category) {
      queryText += ' WHERE t.category = $1';
      queryParams.push(category);
    }
    
    queryText += ' ORDER BY t.name ASC';
    
    const { rows } = await db.query(queryText, queryParams);
    
    const tags = rows.map(row => ({
      ...snakeToCamel(row),
      usageCount: parseInt(row.usage_count || 0)
    }));
    
    res.json({ success: true, data: tags });
    
  } catch (err) {
    handleError(res, err);
  }
});

// POST /api/tags - Create new tag
apiRouter.post('/tags', async (req, res) => {
  try {
    const { name, color = '#00c2ff', description, category } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        error: 'Tag name is required' 
      });
    }
    
    const { rows: existingTags } = await db.query(
      'SELECT * FROM tags WHERE LOWER(name) = LOWER($1)',
      [name.trim()]
    );
    
    if (existingTags.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Tag name must be unique (case-insensitive)' 
      });
    }
    
    const tagId = uuidv4();
    const { rows: newTagRows } = await db.query(
      `INSERT INTO tags (id, name, color, description, category) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [tagId, name.trim(), color, description || null, category || null]
    );
    
    const tag = snakeToCamel(newTagRows[0]);
    tag.usageCount = 0;
    
    res.status(201).json({ success: true, data: tag });
    
  } catch (err) {
    handleError(res, err);
  }
});

// PUT /api/tags/:id - Update tag
apiRouter.put('/tags/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, description, category } = req.body;
    
    const { rows: existingTagRows } = await db.query(
      'SELECT * FROM tags WHERE id = $1',
      [id]
    );
    
    if (existingTagRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Tag not found' 
      });
    }
    
    if (name && name.trim() !== '') {
      const { rows: duplicateTagRows } = await db.query(
        'SELECT * FROM tags WHERE LOWER(name) = LOWER($1) AND id != $2',
        [name.trim(), id]
      );
      
      if (duplicateTagRows.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Tag name must be unique (case-insensitive)' 
        });
      }
    }
    
    const updates = [];
    const values = [id];
    let paramIndex = 2;
    
    if (name !== undefined && name.trim() !== '') {
      updates.push(`name = $${paramIndex}`);
      values.push(name.trim());
      paramIndex++;
    }
    
    if (color !== undefined) {
      updates.push(`color = $${paramIndex}`);
      values.push(color);
      paramIndex++;
    }
    
    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(description);
      paramIndex++;
    }
    
    if (category !== undefined) {
      updates.push(`category = $${paramIndex}`);
      values.push(category);
      paramIndex++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No valid fields to update' 
      });
    }
    
    const queryText = `
      UPDATE tags 
      SET ${updates.join(', ')} 
      WHERE id = $1 
      RETURNING *
    `;
    
    const { rows: updatedTagRows } = await db.query(queryText, values);
    
    const tag = snakeToCamel(updatedTagRows[0]);
    tag.usageCount = await calculateTagUsageCount(id);
    
    res.json({ success: true, data: tag });
    
  } catch (err) {
    handleError(res, err);
  }
});

// DELETE /api/tags/:id - Delete tag
apiRouter.delete('/tags/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows: existingTagRows } = await db.query(
      'SELECT * FROM tags WHERE id = $1',
      [id]
    );
    
    if (existingTagRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Tag not found' 
      });
    }
    
    await db.query('DELETE FROM entity_tags WHERE tag_id = $1', [id]);
    
    await db.query('DELETE FROM tags WHERE id = $1', [id]);
    
    res.status(204).send();
    
  } catch (err) {
    handleError(res, err);
  }
});

// ============================================================================
// ENTITY TAGGING API ENDPOINTS
// ============================================================================

// POST /api/entities/:entityType/:entityId/tags - Add tags to entity
apiRouter.post('/entities/:entityType/:entityId/tags', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { tagIds, tagNames } = req.body;
    
    if (!validateEntityType(entityType)) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid entity type. Must be one of: client, property, quote, job, lead` 
      });
    }
    
    const entityExists = await validateEntityExists(entityType, entityId);
    if (!entityExists) {
      return res.status(404).json({ 
        success: false, 
        error: `${entityType} not found` 
      });
    }
    
    const tagsToAdd = [];
    
    if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
      for (const tagId of tagIds) {
        const { rows: tagRows } = await db.query(
          'SELECT * FROM tags WHERE id = $1',
          [tagId]
        );
        
        if (tagRows.length > 0) {
          tagsToAdd.push(tagRows[0]);
        }
      }
    }
    
    if (tagNames && Array.isArray(tagNames) && tagNames.length > 0) {
      for (const tagName of tagNames) {
        if (tagName && tagName.trim() !== '') {
          const tag = await getOrCreateTagByName(tagName.trim(), entityType);
          const tagSnake = camelToSnake(tag);
          tagsToAdd.push(tagSnake);
        }
      }
    }
    
    for (const tag of tagsToAdd) {
      const entityTagId = uuidv4();
      await db.query(
        `INSERT INTO entity_tags (id, tag_id, entity_type, entity_id, tagged_by) 
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT ON CONSTRAINT unique_entity_tag DO NOTHING`,
        [entityTagId, tag.id, entityType, entityId, 'system']
      );
    }
    
    const { rows: allEntityTagRows } = await db.query(
      `SELECT t.* 
       FROM tags t
       INNER JOIN entity_tags et ON et.tag_id = t.id
       WHERE et.entity_type = $1 AND et.entity_id = $2
       ORDER BY t.name ASC`,
      [entityType, entityId]
    );
    
    const tags = allEntityTagRows.map(row => snakeToCamel(row));
    
    res.json({ success: true, data: tags });
    
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/entities/:entityType/:entityId/tags - Get tags for entity
apiRouter.get('/entities/:entityType/:entityId/tags', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    
    if (!validateEntityType(entityType)) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid entity type. Must be one of: client, property, quote, job, lead` 
      });
    }
    
    const entityExists = await validateEntityExists(entityType, entityId);
    if (!entityExists) {
      return res.status(404).json({ 
        success: false, 
        error: `${entityType} not found` 
      });
    }
    
    const { rows: tagRows } = await db.query(
      `SELECT t.* 
       FROM tags t
       INNER JOIN entity_tags et ON et.tag_id = t.id
       WHERE et.entity_type = $1 AND et.entity_id = $2
       ORDER BY t.name ASC`,
      [entityType, entityId]
    );
    
    const tags = tagRows.map(row => snakeToCamel(row));
    
    res.json({ success: true, data: tags });
    
  } catch (err) {
    handleError(res, err);
  }
});

// DELETE /api/entities/:entityType/:entityId/tags/:tagId - Remove tag from entity
apiRouter.delete('/entities/:entityType/:entityId/tags/:tagId', async (req, res) => {
  try {
    const { entityType, entityId, tagId } = req.params;
    
    if (!validateEntityType(entityType)) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid entity type. Must be one of: client, property, quote, job, lead` 
      });
    }
    
    const entityExists = await validateEntityExists(entityType, entityId);
    if (!entityExists) {
      return res.status(404).json({ 
        success: false, 
        error: `${entityType} not found` 
      });
    }
    
    const { rows: entityTagRows } = await db.query(
      `SELECT * FROM entity_tags 
       WHERE tag_id = $1 AND entity_type = $2 AND entity_id = $3`,
      [tagId, entityType, entityId]
    );
    
    if (entityTagRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Tag association not found' 
      });
    }
    
    await db.query(
      `DELETE FROM entity_tags 
       WHERE tag_id = $1 AND entity_type = $2 AND entity_id = $3`,
      [tagId, entityType, entityId]
    );
    
    res.status(204).send();
    
  } catch (err) {
    handleError(res, err);
  }
});

// ============================================================================
// CUSTOM FIELDS MANAGEMENT API ENDPOINTS
// ============================================================================

// Helper function: Validate field type
const validateFieldType = (fieldType) => {
  const validTypes = ['text', 'number', 'date', 'dropdown', 'checkbox', 'textarea'];
  return validTypes.includes(fieldType);
};

// Helper function: Generate field name from label
const generateFieldName = (label) => {
  if (!label) return '';
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_');
};

// Helper function: Apply validation rules
const applyValidationRules = (value, rules, fieldType) => {
  if (!rules || typeof rules !== 'object') {
    return { valid: true };
  }

  if (fieldType === 'number') {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return { valid: false, error: 'Value must be a valid number' };
    }
    
    if (rules.min !== undefined && numValue < rules.min) {
      return { valid: false, error: `Value must be at least ${rules.min}` };
    }
    
    if (rules.max !== undefined && numValue > rules.max) {
      return { valid: false, error: `Value must be at most ${rules.max}` };
    }
  }

  if (fieldType === 'text' || fieldType === 'textarea') {
    if (rules.pattern) {
      try {
        const regex = new RegExp(rules.pattern);
        if (!regex.test(value)) {
          return { valid: false, error: `Value does not match required pattern` };
        }
      } catch (err) {
        console.error('Invalid regex pattern:', err);
      }
    }
    
    if (rules.minLength !== undefined && value.length < rules.minLength) {
      return { valid: false, error: `Value must be at least ${rules.minLength} characters` };
    }
    
    if (rules.maxLength !== undefined && value.length > rules.maxLength) {
      return { valid: false, error: `Value must be at most ${rules.maxLength} characters` };
    }
  }

  return { valid: true };
};

// Helper function: Validate field value against field definition
const validateFieldValue = (value, fieldDefinition) => {
  if (!value && fieldDefinition.is_required) {
    return { valid: false, error: `${fieldDefinition.field_label} is required` };
  }

  if (!value) {
    return { valid: true };
  }

  const fieldType = fieldDefinition.field_type;

  if (fieldType === 'date') {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return { valid: false, error: 'Invalid date format' };
    }
  }

  if (fieldType === 'checkbox') {
    if (value !== 'true' && value !== 'false') {
      return { valid: false, error: 'Checkbox value must be true or false' };
    }
  }

  if (fieldType === 'dropdown') {
    const options = fieldDefinition.options || [];
    if (!options.includes(value)) {
      return { valid: false, error: `Value must be one of: ${options.join(', ')}` };
    }
  }

  if (fieldDefinition.validation_rules) {
    return applyValidationRules(value, fieldDefinition.validation_rules, fieldType);
  }

  return { valid: true };
};

// GET /api/custom-fields/:entityType - Get field definitions for entity type
apiRouter.get('/custom-fields/:entityType', async (req, res) => {
  try {
    const { entityType } = req.params;
    const { includeInactive } = req.query;
    
    if (!validateEntityType(entityType)) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid entity type. Must be one of: client, property, quote, job, lead` 
      });
    }
    
    let queryText = `
      SELECT * FROM custom_field_definitions 
      WHERE entity_type = $1
    `;
    
    if (includeInactive !== 'true') {
      queryText += ' AND is_active = true';
    }
    
    queryText += ' ORDER BY display_order ASC, field_label ASC';
    
    const { rows } = await db.query(queryText, [entityType]);
    
    const fieldDefinitions = rows.map(row => snakeToCamel(row));
    
    res.json({ success: true, data: fieldDefinitions });
    
  } catch (err) {
    handleError(res, err);
  }
});

// POST /api/custom-fields - Create new field definition
apiRouter.post('/custom-fields', async (req, res) => {
  try {
    const { 
      entityType, 
      fieldName, 
      fieldLabel, 
      fieldType, 
      isRequired = false, 
      defaultValue, 
      options, 
      validationRules, 
      displayOrder = 0, 
      helpText 
    } = req.body;
    
    if (!entityType || !fieldLabel || !fieldType) {
      return res.status(400).json({ 
        success: false, 
        error: 'entityType, fieldLabel, and fieldType are required' 
      });
    }
    
    if (!validateEntityType(entityType)) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid entity type. Must be one of: client, property, quote, job, lead` 
      });
    }
    
    if (!validateFieldType(fieldType)) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid field type. Must be one of: text, number, date, dropdown, checkbox, textarea` 
      });
    }
    
    const finalFieldName = fieldName || generateFieldName(fieldLabel);
    
    if (!finalFieldName) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid field name generated from label' 
      });
    }
    
    const { rows: existingFields } = await db.query(
      'SELECT * FROM custom_field_definitions WHERE entity_type = $1 AND LOWER(field_name) = LOWER($2)',
      [entityType, finalFieldName]
    );
    
    if (existingFields.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Field name must be unique for this entity type (case-insensitive)' 
      });
    }
    
    if (fieldType === 'dropdown') {
      if (!options || !Array.isArray(options) || options.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Dropdown fields must have options array' 
        });
      }
    }
    
    const fieldId = uuidv4();
    const { rows: newFieldRows } = await db.query(
      `INSERT INTO custom_field_definitions (
        id, entity_type, field_name, field_label, field_type, 
        is_required, default_value, options, validation_rules, 
        display_order, help_text, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
      RETURNING *`,
      [
        fieldId, 
        entityType, 
        finalFieldName, 
        fieldLabel, 
        fieldType, 
        isRequired, 
        defaultValue || null, 
        options ? JSON.stringify(options) : null, 
        validationRules ? JSON.stringify(validationRules) : null, 
        displayOrder, 
        helpText || null, 
        true
      ]
    );
    
    const fieldDefinition = snakeToCamel(newFieldRows[0]);
    
    res.status(201).json({ success: true, data: fieldDefinition });
    
  } catch (err) {
    handleError(res, err);
  }
});

// PUT /api/custom-fields/:id - Update field definition
apiRouter.put('/custom-fields/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      fieldLabel, 
      fieldType, 
      isRequired, 
      defaultValue, 
      options, 
      validationRules, 
      displayOrder, 
      helpText,
      isActive
    } = req.body;
    
    const { rows: existingFieldRows } = await db.query(
      'SELECT * FROM custom_field_definitions WHERE id = $1',
      [id]
    );
    
    if (existingFieldRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Field definition not found' 
      });
    }
    
    if (fieldType !== undefined && !validateFieldType(fieldType)) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid field type. Must be one of: text, number, date, dropdown, checkbox, textarea` 
      });
    }
    
    if (fieldType === 'dropdown' && options) {
      if (!Array.isArray(options) || options.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Dropdown fields must have options array' 
        });
      }
    }
    
    const updates = [];
    const values = [id];
    let paramIndex = 2;
    
    if (fieldLabel !== undefined) {
      updates.push(`field_label = $${paramIndex}`);
      values.push(fieldLabel);
      paramIndex++;
    }
    
    if (fieldType !== undefined) {
      updates.push(`field_type = $${paramIndex}`);
      values.push(fieldType);
      paramIndex++;
    }
    
    if (isRequired !== undefined) {
      updates.push(`is_required = $${paramIndex}`);
      values.push(isRequired);
      paramIndex++;
    }
    
    if (defaultValue !== undefined) {
      updates.push(`default_value = $${paramIndex}`);
      values.push(defaultValue);
      paramIndex++;
    }
    
    if (options !== undefined) {
      updates.push(`options = $${paramIndex}`);
      values.push(options ? JSON.stringify(options) : null);
      paramIndex++;
    }
    
    if (validationRules !== undefined) {
      updates.push(`validation_rules = $${paramIndex}`);
      values.push(validationRules ? JSON.stringify(validationRules) : null);
      paramIndex++;
    }
    
    if (displayOrder !== undefined) {
      updates.push(`display_order = $${paramIndex}`);
      values.push(displayOrder);
      paramIndex++;
    }
    
    if (helpText !== undefined) {
      updates.push(`help_text = $${paramIndex}`);
      values.push(helpText);
      paramIndex++;
    }
    
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      values.push(isActive);
      paramIndex++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No fields to update' 
      });
    }
    
    updates.push(`updated_at = NOW()`);
    
    const queryText = `
      UPDATE custom_field_definitions 
      SET ${updates.join(', ')} 
      WHERE id = $1 
      RETURNING *
    `;
    
    const { rows: updatedFieldRows } = await db.query(queryText, values);
    
    const fieldDefinition = snakeToCamel(updatedFieldRows[0]);
    
    res.json({ success: true, data: fieldDefinition });
    
  } catch (err) {
    handleError(res, err);
  }
});

// DELETE /api/custom-fields/:id - Soft delete field definition
apiRouter.delete('/custom-fields/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows: existingFieldRows } = await db.query(
      'SELECT * FROM custom_field_definitions WHERE id = $1',
      [id]
    );
    
    if (existingFieldRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Field definition not found' 
      });
    }
    
    await db.query(
      'UPDATE custom_field_definitions SET is_active = false, updated_at = NOW() WHERE id = $1',
      [id]
    );
    
    res.status(204).send();
    
  } catch (err) {
    handleError(res, err);
  }
});

// ============================================================================
// CUSTOM FIELD VALUES API ENDPOINTS
// ============================================================================

// POST /api/entities/:entityType/:entityId/custom-fields - Set custom field values
apiRouter.post('/entities/:entityType/:entityId/custom-fields', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { fieldValues } = req.body;
    
    if (!validateEntityType(entityType)) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid entity type. Must be one of: client, property, quote, job, lead` 
      });
    }
    
    const entityExists = await validateEntityExists(entityType, entityId);
    if (!entityExists) {
      return res.status(404).json({ 
        success: false, 
        error: `${entityType} not found` 
      });
    }
    
    if (!fieldValues || typeof fieldValues !== 'object') {
      return res.status(400).json({ 
        success: false, 
        error: 'fieldValues object is required' 
      });
    }
    
    const { rows: fieldDefinitions } = await db.query(
      'SELECT * FROM custom_field_definitions WHERE entity_type = $1 AND is_active = true',
      [entityType]
    );
    
    const fieldDefMap = {};
    fieldDefinitions.forEach(fd => {
      fieldDefMap[fd.field_name.toLowerCase()] = fd;
    });
    
    for (const fieldName of Object.keys(fieldValues)) {
      const fieldDef = fieldDefMap[fieldName.toLowerCase()];
      if (!fieldDef) {
        return res.status(400).json({ 
          success: false, 
          error: `Unknown field: ${fieldName}` 
        });
      }
      
      const validation = validateFieldValue(fieldValues[fieldName], fieldDef);
      if (!validation.valid) {
        return res.status(400).json({ 
          success: false, 
          error: validation.error 
        });
      }
    }
    
    for (const fieldDef of fieldDefinitions) {
      if (fieldDef.is_required) {
        const fieldValue = fieldValues[fieldDef.field_name];
        if (!fieldValue) {
          return res.status(400).json({ 
            success: false, 
            error: `Required field missing: ${fieldDef.field_label}` 
          });
        }
      }
    }
    
    const savedValues = {};
    
    for (const [fieldName, fieldValue] of Object.entries(fieldValues)) {
      const fieldDef = fieldDefMap[fieldName.toLowerCase()];
      
      if (fieldValue !== null && fieldValue !== undefined && fieldValue !== '') {
        await db.query(
          `INSERT INTO custom_field_values (id, field_definition_id, entity_type, entity_id, field_value, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
           ON CONFLICT (field_definition_id, entity_type, entity_id) 
           DO UPDATE SET field_value = $5, updated_at = NOW()`,
          [uuidv4(), fieldDef.id, entityType, entityId, String(fieldValue)]
        );
        savedValues[fieldName] = fieldValue;
      }
    }
    
    res.json({ success: true, data: savedValues });
    
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/entities/:entityType/:entityId/custom-fields - Get custom field values
apiRouter.get('/entities/:entityType/:entityId/custom-fields', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    
    if (!validateEntityType(entityType)) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid entity type. Must be one of: client, property, quote, job, lead` 
      });
    }
    
    const entityExists = await validateEntityExists(entityType, entityId);
    if (!entityExists) {
      return res.status(404).json({ 
        success: false, 
        error: `${entityType} not found` 
      });
    }
    
    const { rows } = await db.query(
      `SELECT 
        cfd.*,
        cfv.field_value,
        cfv.id as value_id
       FROM custom_field_definitions cfd
       LEFT JOIN custom_field_values cfv 
         ON cfv.field_definition_id = cfd.id 
         AND cfv.entity_type = $1 
         AND cfv.entity_id = $2
       WHERE cfd.entity_type = $1 
         AND cfd.is_active = true
       ORDER BY cfd.display_order ASC, cfd.field_label ASC`,
      [entityType, entityId]
    );
    
    const customFields = rows.map(row => ({
      definition: snakeToCamel({
        id: row.id,
        entityType: row.entity_type,
        fieldName: row.field_name,
        fieldLabel: row.field_label,
        fieldType: row.field_type,
        isRequired: row.is_required,
        defaultValue: row.default_value,
        options: row.options,
        validationRules: row.validation_rules,
        displayOrder: row.display_order,
        helpText: row.help_text,
        isActive: row.is_active
      }),
      value: row.field_value || null,
      valueId: row.value_id || null
    }));
    
    res.json({ success: true, data: customFields });
    
  } catch (err) {
    handleError(res, err);
  }
});

// DELETE /api/entities/:entityType/:entityId/custom-fields/:fieldDefinitionId - Clear custom field value
apiRouter.delete('/entities/:entityType/:entityId/custom-fields/:fieldDefinitionId', async (req, res) => {
  try {
    const { entityType, entityId, fieldDefinitionId } = req.params;
    
    if (!validateEntityType(entityType)) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid entity type. Must be one of: client, property, quote, job, lead` 
      });
    }
    
    const entityExists = await validateEntityExists(entityType, entityId);
    if (!entityExists) {
      return res.status(404).json({ 
        success: false, 
        error: `${entityType} not found` 
      });
    }
    
    const { rows: fieldValueRows } = await db.query(
      `SELECT * FROM custom_field_values 
       WHERE field_definition_id = $1 AND entity_type = $2 AND entity_id = $3`,
      [fieldDefinitionId, entityType, entityId]
    );
    
    if (fieldValueRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Custom field value not found' 
      });
    }
    
    await db.query(
      `DELETE FROM custom_field_values 
       WHERE field_definition_id = $1 AND entity_type = $2 AND entity_id = $3`,
      [fieldDefinitionId, entityType, entityId]
    );
    
    res.status(204).send();
    
  } catch (err) {
    handleError(res, err);
  }
});

// ============================================================================
// QUOTE MANAGEMENT - HELPER FUNCTIONS
// ============================================================================

// Helper: Calculate quote totals (subtotal → discount → tax → grand total)
const calculateQuoteTotals = (lineItems, discountPercentage = 0, discountAmount = 0, taxRate = 0) => {
  const subtotal = lineItems.reduce((sum, item) => {
    const itemTotal = (item.quantity || 0) * (item.unitPrice || 0);
    return sum + itemTotal;
  }, 0);
  
  let finalDiscountAmount = discountAmount;
  if (discountPercentage > 0) {
    finalDiscountAmount = (subtotal * discountPercentage) / 100;
  }
  
  const afterDiscount = subtotal - finalDiscountAmount;
  const taxAmount = (afterDiscount * taxRate) / 100;
  const grandTotal = afterDiscount + taxAmount;
  
  return {
    totalAmount: parseFloat(subtotal.toFixed(2)),
    discountAmount: parseFloat(finalDiscountAmount.toFixed(2)),
    taxAmount: parseFloat(taxAmount.toFixed(2)),
    grandTotal: parseFloat(grandTotal.toFixed(2))
  };
};

// Helper: Generate quote number (Q-YYYYMM-####)
const generateQuoteNumber = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `Q-${year}${month}`;
  
  const { rows } = await db.query(
    `SELECT quote_number FROM quotes 
     WHERE quote_number LIKE $1 
     ORDER BY quote_number DESC LIMIT 1`,
    [`${prefix}-%`]
  );
  
  let nextNumber = 1;
  if (rows.length > 0 && rows[0].quote_number) {
    const lastNumber = parseInt(rows[0].quote_number.split('-')[2]);
    nextNumber = lastNumber + 1;
  }
  
  return `${prefix}-${String(nextNumber).padStart(4, '0')}`;
};

// Helper: Generate job number (JOB-YYYYMM-####)
const generateJobNumber = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `JOB-${year}${month}`;
  
  const { rows } = await db.query(
    `SELECT job_number FROM jobs 
     WHERE job_number LIKE $1 
     ORDER BY job_number DESC LIMIT 1`,
    [`${prefix}-%`]
  );
  
  let nextNumber = 1;
  if (rows.length > 0 && rows[0].job_number) {
    const lastNumber = parseInt(rows[0].job_number.split('-')[2]);
    nextNumber = lastNumber + 1;
  }
  
  return `${prefix}-${String(nextNumber).padStart(4, '0')}`;
};

// ============================================================================
// ENHANCED QUOTE ENDPOINTS
// ============================================================================

// POST /api/quotes - Create new quote with enhanced CRM features
apiRouter.post('/quotes', async (req, res) => {
  try {
    const quoteData = req.body;
    
    await db.query('BEGIN');
    
    try {
      const quoteId = uuidv4();
      const quoteNumber = await generateQuoteNumber();
      
      const lineItems = quoteData.lineItems || [];
      const discountPercentage = quoteData.discountPercentage || 0;
      const discountAmount = quoteData.discountAmount || 0;
      const taxRate = quoteData.taxRate || 0;
      
      const totals = calculateQuoteTotals(lineItems, discountPercentage, discountAmount, taxRate);
      
      let customerName = 'Unknown';
      if (quoteData.clientId) {
        const { rows: clientRows } = await db.query(
          'SELECT company_name, first_name, last_name FROM clients WHERE id = $1',
          [quoteData.clientId]
        );
        if (clientRows.length > 0) {
          const client = clientRows[0];
          customerName = client.company_name || `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Unknown';
        }
      }
      
      const insertQuery = `
        INSERT INTO quotes (
          id, client_id, property_id, lead_id, customer_name, quote_number, version,
          approval_status, line_items, total_amount, discount_amount,
          discount_percentage, tax_rate, tax_amount, grand_total,
          terms_and_conditions, internal_notes, status, valid_until,
          deposit_amount, payment_terms, special_instructions, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, 1, 'pending', $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19, $20, NOW()
        ) RETURNING *
      `;
      
      const { rows: quoteRows } = await db.query(insertQuery, [
        quoteId,
        quoteData.clientId || null,
        quoteData.propertyId || null,
        quoteData.leadId || null,
        customerName,
        quoteNumber,
        JSON.stringify(lineItems),
        totals.totalAmount,
        totals.discountAmount,
        discountPercentage,
        taxRate,
        totals.taxAmount,
        totals.grandTotal,
        quoteData.termsAndConditions || null,
        quoteData.internalNotes || null,
        quoteData.status || 'Draft',
        quoteData.validUntil || null,
        quoteData.depositAmount || null,
        quoteData.paymentTerms || 'Net 30',
        quoteData.specialInstructions || null
      ]);
      
      const versionId = uuidv4();
      await db.query(
        `INSERT INTO quote_versions (
          id, quote_id, version_number, line_items, total_amount,
          terms, notes, changed_by, change_reason, created_at
        ) VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          versionId,
          quoteId,
          JSON.stringify(lineItems),
          totals.grandTotal,
          quoteData.termsAndConditions || null,
          'Initial version',
          quoteData.createdBy || 'system',
          'Quote created'
        ]
      );
      
      await db.query('COMMIT');
      
      const quote = snakeToCamel(quoteRows[0]);
      res.status(201).json({ success: true, data: quote });
      
      reindexDocument('quotes', quoteRows[0]);
      
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
    
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/quotes - List quotes with filtering and pagination
apiRouter.get('/quotes', async (req, res) => {
  try {
    const { clientId, propertyId, approvalStatus, status, page = 1, limit = 50 } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let queryText = `
      SELECT 
        q.*,
        c.first_name as client_first_name,
        c.last_name as client_last_name,
        c.company_name as client_company_name,
        c.primary_email as client_email,
        c.primary_phone as client_phone,
        p.property_name,
        p.address_line1 as property_address,
        p.city as property_city,
        p.state as property_state
      FROM quotes q
      LEFT JOIN clients c ON q.client_id = c.id
      LEFT JOIN properties p ON q.property_id = p.id
      WHERE q.deleted_at IS NULL
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (clientId) {
      queryText += ` AND q.client_id = $${paramIndex}`;
      params.push(clientId);
      paramIndex++;
    }
    
    if (propertyId) {
      queryText += ` AND q.property_id = $${paramIndex}`;
      params.push(propertyId);
      paramIndex++;
    }
    
    if (approvalStatus) {
      queryText += ` AND q.approval_status = $${paramIndex}`;
      params.push(approvalStatus);
      paramIndex++;
    }
    
    if (status) {
      queryText += ` AND q.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    queryText += ` ORDER BY q.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);
    
    const { rows } = await db.query(queryText, params);
    
    const quotes = rows.map(row => {
      const quote = snakeToCamel(row);
      
      if (row.client_first_name || row.client_last_name || row.client_company_name) {
        quote.client = {
          firstName: row.client_first_name,
          lastName: row.client_last_name,
          companyName: row.client_company_name,
          email: row.client_email,
          phone: row.client_phone
        };
      }
      
      if (row.property_name || row.property_address) {
        quote.property = {
          propertyName: row.property_name,
          address: row.property_address,
          city: row.property_city,
          state: row.property_state
        };
      }
      
      delete quote.clientFirstName;
      delete quote.clientLastName;
      delete quote.clientCompanyName;
      delete quote.clientEmail;
      delete quote.clientPhone;
      delete quote.propertyName;
      delete quote.propertyAddress;
      delete quote.propertyCity;
      delete quote.propertyState;
      
      return quote;
    });
    
    const { rows: countRows } = await db.query(
      'SELECT COUNT(*) FROM quotes WHERE deleted_at IS NULL'
    );
    const total = parseInt(countRows[0].count);
    
    res.json({
      success: true,
      data: quotes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/quotes/:id - Get quote details with full relationships
apiRouter.get('/quotes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows: quoteRows } = await db.query(
      'SELECT * FROM quotes WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    if (quoteRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found'
      });
    }
    
    const quote = snakeToCamel(quoteRows[0]);
    
    if (quote.clientId) {
      const { rows: clientRows } = await db.query(
        'SELECT * FROM clients WHERE id = $1 AND deleted_at IS NULL',
        [quote.clientId]
      );
      if (clientRows.length > 0) {
        quote.client = snakeToCamel(clientRows[0]);
      }
    }
    
    if (quote.propertyId) {
      const { rows: propertyRows } = await db.query(
        'SELECT * FROM properties WHERE id = $1 AND deleted_at IS NULL',
        [quote.propertyId]
      );
      if (propertyRows.length > 0) {
        quote.property = snakeToCamel(propertyRows[0]);
      }
    }
    
    const { rows: versionRows } = await db.query(
      'SELECT * FROM quote_versions WHERE quote_id = $1 ORDER BY version_number DESC',
      [id]
    );
    quote.versions = versionRows.map(snakeToCamel);
    
    const { rows: followupRows } = await db.query(
      'SELECT * FROM quote_followups WHERE quote_id = $1 ORDER BY scheduled_date ASC',
      [id]
    );
    quote.followups = followupRows.map(snakeToCamel);
    
    const { rows: tagRows } = await db.query(
      `SELECT t.* FROM tags t
       INNER JOIN entity_tags et ON et.tag_id = t.id
       WHERE et.entity_type = 'quote' AND et.entity_id = $1`,
      [id]
    );
    quote.tags = tagRows.map(snakeToCamel);
    
    res.json({ success: true, data: quote });
    
  } catch (err) {
    handleError(res, err);
  }
});

// PUT /api/quotes/:id - Update quote
apiRouter.put('/quotes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const quoteData = req.body;
    
    const { rows: existingRows } = await db.query(
      'SELECT * FROM quotes WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found'
      });
    }
    
    const updates = [];
    const values = [id];
    let paramIndex = 2;
    
    if (quoteData.status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(quoteData.status);
      paramIndex++;
    }
    
    if (quoteData.lineItems !== undefined) {
      const lineItems = quoteData.lineItems;
      const discountPercentage = quoteData.discountPercentage || 0;
      const discountAmount = quoteData.discountAmount || 0;
      const taxRate = quoteData.taxRate || 0;
      
      const totals = calculateQuoteTotals(lineItems, discountPercentage, discountAmount, taxRate);
      
      updates.push(`line_items = $${paramIndex}`);
      values.push(JSON.stringify(lineItems));
      paramIndex++;
      
      updates.push(`total_amount = $${paramIndex}`);
      values.push(totals.totalAmount);
      paramIndex++;
      
      updates.push(`grand_total = $${paramIndex}`);
      values.push(totals.grandTotal);
      paramIndex++;
    }
    
    if (quoteData.termsAndConditions !== undefined) {
      updates.push(`terms_and_conditions = $${paramIndex}`);
      values.push(quoteData.termsAndConditions);
      paramIndex++;
    }
    
    if (quoteData.internalNotes !== undefined) {
      updates.push(`internal_notes = $${paramIndex}`);
      values.push(quoteData.internalNotes);
      paramIndex++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }
    
    updates.push(`updated_at = NOW()`);
    
    const updateQuery = `
      UPDATE quotes
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING *
    `;
    
    const { rows: updatedRows } = await db.query(updateQuery, values);
    const quote = snakeToCamel(updatedRows[0]);
    
    res.json({ success: true, data: quote });
    
    reindexDocument('quotes', updatedRows[0]);
    
  } catch (err) {
    handleError(res, err);
  }
});

// DELETE /api/quotes/:id - Soft delete quote
apiRouter.delete('/quotes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows } = await db.query(
      'SELECT * FROM quotes WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found'
      });
    }
    
    await db.query(
      'UPDATE quotes SET deleted_at = NOW() WHERE id = $1',
      [id]
    );
    
    res.status(204).send();
    
    removeFromVectorStore('quotes', id);
    
  } catch (err) {
    handleError(res, err);
  }
});

// POST /api/quotes/:id/versions - Create new quote version
apiRouter.post('/quotes/:id/versions', async (req, res) => {
  try {
    const { id } = req.params;
    const { lineItems, changeReason, changedBy } = req.body;
    
    if (!lineItems) {
      return res.status(400).json({
        success: false,
        error: 'lineItems is required'
      });
    }
    
    await db.query('BEGIN');
    
    try {
      const { rows: quoteRows } = await db.query(
        'SELECT * FROM quotes WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );
      
      if (quoteRows.length === 0) {
        await db.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Quote not found'
        });
      }
      
      const quote = quoteRows[0];
      const newVersion = quote.version + 1;
      
      const discountPercentage = quote.discount_percentage || 0;
      const discountAmount = quote.discount_amount || 0;
      const taxRate = quote.tax_rate || 0;
      
      const totals = calculateQuoteTotals(lineItems, discountPercentage, discountAmount, taxRate);
      
      await db.query(
        `UPDATE quotes
         SET version = $1, line_items = $2, total_amount = $3,
             tax_amount = $4, grand_total = $5, updated_at = NOW()
         WHERE id = $6`,
        [newVersion, JSON.stringify(lineItems), totals.totalAmount,
         totals.taxAmount, totals.grandTotal, id]
      );
      
      const versionId = uuidv4();
      await db.query(
        `INSERT INTO quote_versions (
          id, quote_id, version_number, line_items, total_amount,
          terms, notes, changed_by, change_reason, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          versionId,
          id,
          newVersion,
          JSON.stringify(lineItems),
          totals.grandTotal,
          quote.terms_and_conditions || null,
          null,
          changedBy || 'system',
          changeReason || 'Quote updated'
        ]
      );
      
      await db.query('COMMIT');
      
      const { rows: updatedQuoteRows } = await db.query(
        'SELECT * FROM quotes WHERE id = $1',
        [id]
      );
      
      const updatedQuote = snakeToCamel(updatedQuoteRows[0]);
      
      const { rows: versionRows } = await db.query(
        'SELECT * FROM quote_versions WHERE quote_id = $1 ORDER BY version_number DESC',
        [id]
      );
      updatedQuote.versions = versionRows.map(snakeToCamel);
      
      res.json({ success: true, data: updatedQuote });
      
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
    
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/quotes/:id/versions - Get version history
apiRouter.get('/quotes/:id/versions', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows: quoteRows } = await db.query(
      'SELECT id FROM quotes WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    if (quoteRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found'
      });
    }
    
    const { rows: versionRows } = await db.query(
      'SELECT * FROM quote_versions WHERE quote_id = $1 ORDER BY version_number DESC',
      [id]
    );
    
    const versions = versionRows.map(snakeToCamel);
    
    res.json({ success: true, data: versions });
    
  } catch (err) {
    handleError(res, err);
  }
});

// POST /api/quotes/:id/approve - Approve quote
apiRouter.post('/quotes/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy, notes } = req.body;
    
    const { rows: quoteRows } = await db.query(
      'SELECT * FROM quotes WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    if (quoteRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found'
      });
    }
    
    const updateQuery = `
      UPDATE quotes
      SET approval_status = 'approved',
          approved_at = NOW(),
          approved_by = $1,
          internal_notes = COALESCE(internal_notes, '') || $2,
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    
    const approvalNote = notes ? `\n[Approved: ${notes}]` : '\n[Approved]';
    
    const { rows: updatedRows } = await db.query(updateQuery, [
      approvedBy || 'system',
      approvalNote,
      id
    ]);
    
    const quote = snakeToCamel(updatedRows[0]);
    
    res.json({ success: true, data: quote });
    
  } catch (err) {
    handleError(res, err);
  }
});

// POST /api/quotes/:id/reject - Reject quote
apiRouter.post('/quotes/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    
    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        error: 'rejectionReason is required'
      });
    }
    
    const { rows: quoteRows } = await db.query(
      'SELECT * FROM quotes WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    if (quoteRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found'
      });
    }
    
    const updateQuery = `
      UPDATE quotes
      SET approval_status = 'rejected',
          internal_notes = COALESCE(internal_notes, '') || $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    
    const rejectionNote = `\n[Rejected: ${rejectionReason}]`;
    
    const { rows: updatedRows } = await db.query(updateQuery, [
      rejectionNote,
      id
    ]);
    
    const quote = snakeToCamel(updatedRows[0]);
    
    res.json({ success: true, data: quote });
    
  } catch (err) {
    handleError(res, err);
  }
});

// POST /api/quotes/:id/send - Send quote to client
apiRouter.post('/quotes/:id/send', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows: quoteRows } = await db.query(
      'SELECT * FROM quotes WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    if (quoteRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found'
      });
    }
    
    const quote = quoteRows[0];
    
    const updateQuery = `
      UPDATE quotes
      SET status = CASE WHEN status = 'Draft' THEN 'Sent' ELSE status END,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const { rows: updatedRows } = await db.query(updateQuery, [id]);
    
    const updatedQuote = snakeToCamel(updatedRows[0]);
    
    res.json({
      success: true,
      data: updatedQuote,
      message: 'Quote status updated. Email notification would be sent here.'
    });
    
  } catch (err) {
    handleError(res, err);
  }
});

// POST /api/quotes/:id/convert-to-job - Convert quote to job
apiRouter.post('/quotes/:id/convert-to-job', async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.query('BEGIN');
    
    try {
      const { rows: quoteRows } = await db.query(
        'SELECT * FROM quotes WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );
      
      if (quoteRows.length === 0) {
        await db.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Quote not found'
        });
      }
      
      const quote = quoteRows[0];
      
      if (quote.approval_status !== 'approved') {
        await db.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'Quote must be approved before converting to job'
        });
      }
      
      if (quote.status !== 'Accepted' && quote.status !== 'Sent') {
        await db.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'Quote must be accepted by client before converting to job'
        });
      }
      
      const jobId = uuidv4();
      const jobNumber = await generateJobNumber();
      
      const insertJobQuery = `
        INSERT INTO jobs (
          id, client_id, property_id, quote_id, job_number, status,
          customer_name, job_location, special_instructions,
          price, line_items, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, 'Scheduled', $6, $7, $8, $9, $10, NOW()
        ) RETURNING *
      `;
      
      const { rows: jobRows } = await db.query(insertJobQuery, [
        jobId,
        quote.client_id,
        quote.property_id,
        id,
        jobNumber,
        quote.customer_name || 'Unknown',
        quote.job_location || null,
        quote.special_instructions || null,
        quote.grand_total || quote.price || 0,
        quote.line_items || '[]'
      ]);
      
      await db.query(
        `UPDATE quotes SET status = 'Converted', updated_at = NOW() WHERE id = $1`,
        [id]
      );
      
      await db.query('COMMIT');
      
      const job = transformRow(jobRows[0], 'jobs');
      
      res.status(201).json({
        success: true,
        data: job,
        message: 'Quote successfully converted to job'
      });
      
      reindexDocument('jobs', jobRows[0]);
      
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
    
  } catch (err) {
    handleError(res, err);
  }
});

// POST /api/quotes/:id/followups - Schedule follow-up
apiRouter.post('/quotes/:id/followups', async (req, res) => {
  try {
    const { id } = req.params;
    const { followupType, scheduledDate, subject, message } = req.body;
    
    if (!followupType || !scheduledDate) {
      return res.status(400).json({
        success: false,
        error: 'followupType and scheduledDate are required'
      });
    }
    
    const { rows: quoteRows } = await db.query(
      'SELECT id FROM quotes WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    if (quoteRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found'
      });
    }
    
    const followupId = uuidv4();
    
    const insertQuery = `
      INSERT INTO quote_followups (
        id, quote_id, followup_type, scheduled_date, subject,
        message, status, is_automated, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 'scheduled', false, NOW()
      ) RETURNING *
    `;
    
    const { rows: followupRows } = await db.query(insertQuery, [
      followupId,
      id,
      followupType,
      scheduledDate,
      subject || null,
      message || null
    ]);
    
    const followup = snakeToCamel(followupRows[0]);
    
    res.status(201).json({ success: true, data: followup });
    
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/quotes/:id/followups - Get quote follow-ups
apiRouter.get('/quotes/:id/followups', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows: quoteRows } = await db.query(
      'SELECT id FROM quotes WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    if (quoteRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found'
      });
    }
    
    const { rows: followupRows } = await db.query(
      'SELECT * FROM quote_followups WHERE quote_id = $1 ORDER BY scheduled_date ASC',
      [id]
    );
    
    const followups = followupRows.map(snakeToCamel);
    
    res.json({ success: true, data: followups });
    
  } catch (err) {
    handleError(res, err);
  }
});

// PUT /api/quote-followups/:id - Update follow-up
apiRouter.put('/quote-followups/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, completedBy, clientResponse, outcome } = req.body;
    
    const { rows: existingRows } = await db.query(
      'SELECT * FROM quote_followups WHERE id = $1',
      [id]
    );
    
    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Follow-up not found'
      });
    }
    
    const updates = [];
    const values = [id];
    let paramIndex = 2;
    
    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
      
      if (status === 'completed') {
        updates.push(`completed_at = NOW()`);
      }
    }
    
    if (completedBy !== undefined) {
      updates.push(`completed_by = $${paramIndex}`);
      values.push(completedBy);
      paramIndex++;
    }
    
    if (clientResponse !== undefined) {
      updates.push(`client_response = $${paramIndex}`);
      values.push(clientResponse);
      paramIndex++;
    }
    
    if (outcome !== undefined) {
      updates.push(`outcome = $${paramIndex}`);
      values.push(outcome);
      paramIndex++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }
    
    updates.push(`updated_at = NOW()`);
    
    const updateQuery = `
      UPDATE quote_followups
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING *
    `;
    
    const { rows: updatedRows } = await db.query(updateQuery, values);
    const followup = snakeToCamel(updatedRows[0]);
    
    res.json({ success: true, data: followup });
    
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/quotes/pending-followups - Get quotes needing follow-up
apiRouter.get('/quotes/pending-followups', async (req, res) => {
  try {
    const queryText = `
      SELECT 
        qf.*,
        q.quote_number,
        q.status as quote_status,
        q.grand_total,
        c.first_name as client_first_name,
        c.last_name as client_last_name,
        c.company_name as client_company_name,
        c.primary_email as client_email,
        c.primary_phone as client_phone
      FROM quote_followups qf
      INNER JOIN quotes q ON qf.quote_id = q.id
      LEFT JOIN clients c ON q.client_id = c.id
      WHERE qf.status = 'scheduled'
        AND qf.scheduled_date <= CURRENT_DATE
        AND q.deleted_at IS NULL
      ORDER BY qf.scheduled_date ASC
    `;
    
    const { rows } = await db.query(queryText);
    
    const followups = rows.map(row => {
      const followup = snakeToCamel(row);
      
      followup.quote = {
        quoteNumber: row.quote_number,
        status: row.quote_status,
        grandTotal: row.grand_total
      };
      
      if (row.client_first_name || row.client_company_name) {
        followup.client = {
          firstName: row.client_first_name,
          lastName: row.client_last_name,
          companyName: row.client_company_name,
          email: row.client_email,
          phone: row.client_phone
        };
      }
      
      delete followup.quoteNumber;
      delete followup.quoteStatus;
      delete followup.grandTotal;
      delete followup.clientFirstName;
      delete followup.clientLastName;
      delete followup.clientCompanyName;
      delete followup.clientEmail;
      delete followup.clientPhone;
      
      return followup;
    });
    
    res.json({ success: true, data: followups });
    
  } catch (err) {
    handleError(res, err);
  }
});

// ============================================================================
// QUOTE TEMPLATE ENDPOINTS
// ============================================================================

// GET /api/quote-templates - List templates
apiRouter.get('/quote-templates', async (req, res) => {
  try {
    const { serviceCategory } = req.query;
    
    let queryText = 'SELECT * FROM quote_templates WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    if (serviceCategory) {
      queryText += ` AND service_category = $${paramIndex}`;
      params.push(serviceCategory);
      paramIndex++;
    }
    
    queryText += ' ORDER BY use_count DESC, name ASC';
    
    const { rows } = await db.query(queryText, params);
    const templates = rows.map(snakeToCamel);
    
    res.json({ success: true, data: templates });
    
  } catch (err) {
    handleError(res, err);
  }
});

// POST /api/quote-templates - Create template
apiRouter.post('/quote-templates', async (req, res) => {
  try {
    const {
      name,
      description,
      lineItems,
      termsAndConditions,
      serviceCategory,
      validDays,
      depositPercentage,
      paymentTerms,
      createdBy
    } = req.body;
    
    if (!name || !lineItems) {
      return res.status(400).json({
        success: false,
        error: 'name and lineItems are required'
      });
    }
    
    const templateId = uuidv4();
    
    const insertQuery = `
      INSERT INTO quote_templates (
        id, name, description, line_items, terms_and_conditions,
        valid_days, deposit_percentage, payment_terms, service_category,
        is_active, use_count, created_by, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, true, 0, $10, NOW()
      ) RETURNING *
    `;
    
    const { rows } = await db.query(insertQuery, [
      templateId,
      name,
      description || null,
      JSON.stringify(lineItems),
      termsAndConditions || null,
      validDays || 30,
      depositPercentage || 0,
      paymentTerms || 'Net 30',
      serviceCategory || null,
      createdBy || 'system'
    ]);
    
    const template = snakeToCamel(rows[0]);
    
    res.status(201).json({ success: true, data: template });
    
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/quote-templates/:id - Get template details
apiRouter.get('/quote-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows } = await db.query(
      'SELECT * FROM quote_templates WHERE id = $1',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }
    
    const template = snakeToCamel(rows[0]);
    
    res.json({ success: true, data: template });
    
  } catch (err) {
    handleError(res, err);
  }
});

// POST /api/quotes/from-template/:templateId - Create quote from template
apiRouter.post('/quotes/from-template/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    const { clientId, propertyId, leadId } = req.body;
    
    await db.query('BEGIN');
    
    try {
      const { rows: templateRows } = await db.query(
        'SELECT * FROM quote_templates WHERE id = $1 AND is_active = true',
        [templateId]
      );
      
      if (templateRows.length === 0) {
        await db.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Template not found or inactive'
        });
      }
      
      const template = templateRows[0];
      
      const quoteId = uuidv4();
      const quoteNumber = await generateQuoteNumber();
      
      const lineItems = typeof template.line_items === 'string' 
        ? JSON.parse(template.line_items) 
        : template.line_items;
      
      const totals = calculateQuoteTotals(lineItems, 0, 0, 0);
      
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + (template.valid_days || 30));
      
      const insertQuoteQuery = `
        INSERT INTO quotes (
          id, client_id, property_id, lead_id, quote_number, version,
          approval_status, line_items, total_amount, discount_amount,
          discount_percentage, tax_rate, tax_amount, grand_total,
          terms_and_conditions, status, valid_until, deposit_amount,
          payment_terms, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, 1, 'pending', $6, $7, 0, 0, 0, 0, $8,
          $9, 'Draft', $10, $11, $12, NOW()
        ) RETURNING *
      `;
      
      const { rows: quoteRows } = await db.query(insertQuoteQuery, [
        quoteId,
        clientId || null,
        propertyId || null,
        leadId || null,
        quoteNumber,
        JSON.stringify(lineItems),
        totals.totalAmount,
        totals.grandTotal,
        template.terms_and_conditions || null,
        validUntil.toISOString().split('T')[0],
        (totals.grandTotal * (template.deposit_percentage || 0)) / 100,
        template.payment_terms || 'Net 30'
      ]);
      
      const versionId = uuidv4();
      await db.query(
        `INSERT INTO quote_versions (
          id, quote_id, version_number, line_items, total_amount,
          terms, notes, changed_by, change_reason, created_at
        ) VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          versionId,
          quoteId,
          JSON.stringify(lineItems),
          totals.grandTotal,
          template.terms_and_conditions || null,
          `Created from template: ${template.name}`,
          'system',
          'Quote created from template'
        ]
      );
      
      await db.query(
        'UPDATE quote_templates SET use_count = use_count + 1, updated_at = NOW() WHERE id = $1',
        [templateId]
      );
      
      await db.query('COMMIT');
      
      const quote = snakeToCamel(quoteRows[0]);
      
      res.status(201).json({
        success: true,
        data: quote,
        message: `Quote created from template: ${template.name}`
      });
      
      reindexDocument('quotes', quoteRows[0]);
      
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
    
  } catch (err) {
    handleError(res, err);
  }
});

// ============================================================================
// JOB STATE MACHINE ENDPOINTS
// ============================================================================

// GET /api/jobs/:id/state-history - Get state transition history for a job
apiRouter.get('/jobs/:id/state-history', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify job exists
    const job = await jobStateService.getJob(id);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }
    
    // Get complete state transition history
    const history = await jobStateService.getStateHistory(id);
    
    res.json({
      success: true,
      data: {
        jobId: id,
        currentState: job.status,
        currentStateName: jobStateService.STATE_NAMES[job.status],
        history
      }
    });
    
  } catch (err) {
    handleError(res, err);
  }
});

// POST /api/jobs/:id/state-transitions - Transition job to new state
apiRouter.post('/jobs/:id/state-transitions', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      toState, 
      reason, 
      notes,
      changedByRole = 'admin',
      changeSource = 'manual',
      jobUpdates = {}
    } = req.body;
    
    // Use session user ID or null (not hardcoded string)
    const changedBy = req.session?.userId || null;
    
    // Validate required fields
    if (!toState) {
      return res.status(400).json({
        success: false,
        error: 'toState is required'
      });
    }
    
    // Verify job exists
    const job = await jobStateService.getJob(id);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }
    
    // Attempt state transition
    const result = await jobStateService.transitionJobState(id, toState, {
      changedBy,
      changedByRole,
      changeSource,
      reason,
      notes,
      jobUpdates
    });
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.errors
      });
    }
    
    // Re-index job in RAG system after state change
    await reindexDocument('jobs', result.job);
    
    res.json({
      success: true,
      data: {
        job: transformRow(result.job, 'jobs'),
        transition: result.transition
      },
      message: `Job transitioned from '${result.transition.from}' to '${result.transition.to}'`
    });
    
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/jobs/:id/allowed-transitions - Get currently allowed transitions for a job
apiRouter.get('/jobs/:id/allowed-transitions', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get allowed transitions with validation context
    const result = await jobStateService.getAllowedTransitionsForJob(id);
    
    if (result.error) {
      return res.status(404).json({
        success: false,
        error: result.error
      });
    }
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (err) {
    handleError(res, err);
  }
});

// ============================================================================
// JOB TEMPLATES ENDPOINTS
// ============================================================================

// GET /api/job-templates - List all templates with filters
apiRouter.get('/job-templates', async (req, res) => {
  try {
    const { category, search, limit } = req.query;
    
    const filters = {
      category,
      search,
      limit: limit ? parseInt(limit) : undefined
    };
    
    const templates = await jobTemplateService.getAllTemplates(filters);
    
    res.json({
      success: true,
      data: templates
    });
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/job-templates/by-category - Get templates grouped by category
apiRouter.get('/job-templates/by-category', async (req, res) => {
  try {
    const grouped = await jobTemplateService.getTemplatesByCategory();
    
    res.json({
      success: true,
      data: grouped
    });
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/job-templates/usage-stats - Get template usage statistics
apiRouter.get('/job-templates/usage-stats', async (req, res) => {
  try {
    const stats = await jobTemplateService.getUsageStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/job-templates/:id - Get template details
apiRouter.get('/job-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const template = await jobTemplateService.getTemplateById(id);
    
    res.json({
      success: true,
      data: template
    });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: err.message
      });
    }
    handleError(res, err);
  }
});

// POST /api/job-templates - Create new template
apiRouter.post('/job-templates', async (req, res) => {
  try {
    const template = await jobTemplateService.createTemplate(req.body);
    
    res.status(201).json({
      success: true,
      data: template,
      message: 'Template created successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
});

// POST /api/job-templates/from-job/:jobId - Create template from existing job
apiRouter.post('/job-templates/from-job/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const templateData = req.body;
    
    const template = await jobTemplateService.createTemplateFromJob(jobId, templateData);
    
    res.status(201).json({
      success: true,
      data: template,
      message: 'Template created from job successfully'
    });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: err.message
      });
    }
    handleError(res, err);
  }
});

// PUT /api/job-templates/:id - Update template
apiRouter.put('/job-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const template = await jobTemplateService.updateTemplate(id, req.body);
    
    res.json({
      success: true,
      data: template,
      message: 'Template updated successfully'
    });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: err.message
      });
    }
    handleError(res, err);
  }
});

// DELETE /api/job-templates/:id - Soft delete template
apiRouter.delete('/job-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await jobTemplateService.deleteTemplate(id);
    
    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: err.message
      });
    }
    handleError(res, err);
  }
});

// POST /api/job-templates/:id/use - Create job from template
apiRouter.post('/job-templates/:id/use', async (req, res) => {
  try {
    const { id } = req.params;
    const jobData = req.body;
    
    const job = await jobTemplateService.useTemplate(id, jobData);
    
    // Re-index job in RAG system
    await reindexDocument('jobs', job);
    
    res.status(201).json({
      success: true,
      data: transformRow(job, 'jobs'),
      message: 'Job created from template successfully'
    });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: err.message
      });
    }
    handleError(res, err);
  }
});

// ============================================================================
// JOB FORMS ENDPOINTS (Phase 2B)
// ============================================================================

// ----------------------
// FORM TEMPLATES ENDPOINTS
// ----------------------

// GET /api/form-templates - List all form templates with filters
apiRouter.get('/form-templates', async (req, res) => {
  try {
    const { category, search, active } = req.query;
    
    let query = 'SELECT * FROM form_templates WHERE deleted_at IS NULL';
    const params = [];
    let paramCount = 1;
    
    // Filter by category (form_type in the database)
    if (category) {
      query += ` AND form_type = $${paramCount}`;
      params.push(category);
      paramCount++;
    }
    
    // Filter by active status
    if (active !== undefined) {
      query += ` AND is_active = $${paramCount}`;
      params.push(active === 'true');
      paramCount++;
    }
    
    // Search by name or description
    if (search) {
      query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }
    
    query += ' ORDER BY created_at DESC';
    
    const { rows } = await db.query(query, params);
    const templates = rows.map(row => transformRow(row, 'form_templates'));
    
    res.json({
      success: true,
      data: templates
    });
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/form-templates/categories - Get list of unique categories
apiRouter.get('/form-templates/categories', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT DISTINCT form_type as category
      FROM form_templates
      WHERE deleted_at IS NULL AND form_type IS NOT NULL
      ORDER BY form_type
    `);
    
    const categories = rows.map(row => row.category);
    
    res.json({
      success: true,
      data: categories
    });
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/form-templates/:id - Get single template by ID
apiRouter.get('/form-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows } = await db.query(
      'SELECT * FROM form_templates WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Form template not found'
      });
    }
    
    const template = transformRow(rows[0], 'form_templates');
    
    res.json({
      success: true,
      data: template
    });
  } catch (err) {
    handleError(res, err);
  }
});

// POST /api/form-templates - Create new form template
apiRouter.post('/form-templates', async (req, res) => {
  try {
    const {
      name,
      description,
      formType,
      fields,
      requireSignature,
      requirePhotos,
      minPhotos
    } = req.body;
    
    // Validation
    if (!name || !fields) {
      return res.status(400).json({
        success: false,
        error: 'Name and fields are required'
      });
    }
    
    if (!Array.isArray(fields)) {
      return res.status(400).json({
        success: false,
        error: 'Fields must be an array'
      });
    }
    
    // Validate field structure
    for (const field of fields) {
      if (!field.id || !field.type || !field.label) {
        return res.status(400).json({
          success: false,
          error: 'Each field must have id, type, and label'
        });
      }
    }
    
    const { rows } = await db.query(
      `INSERT INTO form_templates (
        name, description, form_type, fields, 
        require_signature, require_photos, min_photos
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        name,
        description || null,
        formType || null,
        JSON.stringify(fields),
        requireSignature || false,
        requirePhotos || false,
        minPhotos || null
      ]
    );
    
    const template = transformRow(rows[0], 'form_templates');
    
    res.status(201).json({
      success: true,
      data: template,
      message: 'Form template created successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
});

// PUT /api/form-templates/:id - Update template
apiRouter.put('/form-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      formType,
      fields,
      isActive,
      requireSignature,
      requirePhotos,
      minPhotos
    } = req.body;
    
    // Check if template exists
    const { rows: existing } = await db.query(
      'SELECT * FROM form_templates WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Form template not found'
      });
    }
    
    // Build update query dynamically
    const updates = [];
    const params = [];
    let paramCount = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      params.push(name);
      paramCount++;
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      params.push(description);
      paramCount++;
    }
    if (formType !== undefined) {
      updates.push(`form_type = $${paramCount}`);
      params.push(formType);
      paramCount++;
    }
    if (fields !== undefined) {
      if (!Array.isArray(fields)) {
        return res.status(400).json({
          success: false,
          error: 'Fields must be an array'
        });
      }
      updates.push(`fields = $${paramCount}`);
      params.push(JSON.stringify(fields));
      paramCount++;
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramCount}`);
      params.push(isActive);
      paramCount++;
    }
    if (requireSignature !== undefined) {
      updates.push(`require_signature = $${paramCount}`);
      params.push(requireSignature);
      paramCount++;
    }
    if (requirePhotos !== undefined) {
      updates.push(`require_photos = $${paramCount}`);
      params.push(requirePhotos);
      paramCount++;
    }
    if (minPhotos !== undefined) {
      updates.push(`min_photos = $${paramCount}`);
      params.push(minPhotos);
      paramCount++;
    }
    
    updates.push(`updated_at = NOW()`);
    params.push(id);
    
    const { rows } = await db.query(
      `UPDATE form_templates SET ${updates.join(', ')}
       WHERE id = $${paramCount} RETURNING *`,
      params
    );
    
    const template = transformRow(rows[0], 'form_templates');
    
    res.json({
      success: true,
      data: template,
      message: 'Form template updated successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
});

// DELETE /api/form-templates/:id - Soft delete template (set is_active = false)
apiRouter.delete('/form-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows } = await db.query(
      `UPDATE form_templates 
       SET is_active = false, deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Form template not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Form template deleted successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
});

// ----------------------
// JOB FORMS ENDPOINTS
// ----------------------

// POST /api/jobs/:jobId/forms - Attach form template to job, creates job_form instance
apiRouter.post('/jobs/:jobId/forms', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { formTemplateId } = req.body;
    
    if (!formTemplateId) {
      return res.status(400).json({
        success: false,
        error: 'formTemplateId is required'
      });
    }
    
    // Verify job exists
    const { rows: jobRows } = await db.query(
      'SELECT id FROM jobs WHERE id = $1',
      [jobId]
    );
    
    if (jobRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }
    
    // Verify form template exists and is active
    const { rows: templateRows } = await db.query(
      'SELECT * FROM form_templates WHERE id = $1 AND deleted_at IS NULL',
      [formTemplateId]
    );
    
    if (templateRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Form template not found'
      });
    }
    
    // Create job form
    const { rows } = await db.query(
      `INSERT INTO job_forms (job_id, form_template_id, status, form_data)
       VALUES ($1, $2, 'pending', '{}')
       RETURNING *`,
      [jobId, formTemplateId]
    );
    
    const jobForm = transformRow(rows[0], 'job_forms');
    
    res.status(201).json({
      success: true,
      data: jobForm,
      message: 'Form attached to job successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/jobs/:jobId/forms - Get all forms attached to a job
apiRouter.get('/jobs/:jobId/forms', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    // Verify job exists
    const { rows: jobRows } = await db.query(
      'SELECT id FROM jobs WHERE id = $1',
      [jobId]
    );
    
    if (jobRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }
    
    // Get all forms for this job with template details
    const { rows } = await db.query(
      `SELECT 
        jf.*,
        ft.name as template_name,
        ft.description as template_description,
        ft.form_type as template_form_type,
        ft.fields as template_fields,
        ft.require_signature,
        ft.require_photos,
        ft.min_photos
       FROM job_forms jf
       JOIN form_templates ft ON jf.form_template_id = ft.id
       WHERE jf.job_id = $1
       ORDER BY jf.created_at DESC`,
      [jobId]
    );
    
    const jobForms = rows.map(row => {
      const jobForm = transformRow(row, 'job_forms');
      jobForm.template = {
        name: row.template_name,
        description: row.template_description,
        formType: row.template_form_type,
        fields: row.template_fields,
        requireSignature: row.require_signature,
        requirePhotos: row.require_photos,
        minPhotos: row.min_photos
      };
      return jobForm;
    });
    
    res.json({
      success: true,
      data: jobForms
    });
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/job-forms/:id - Get single job form with filled data
apiRouter.get('/job-forms/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows } = await db.query(
      `SELECT 
        jf.*,
        ft.name as template_name,
        ft.description as template_description,
        ft.form_type as template_form_type,
        ft.fields as template_fields,
        ft.require_signature,
        ft.require_photos,
        ft.min_photos
       FROM job_forms jf
       JOIN form_templates ft ON jf.form_template_id = ft.id
       WHERE jf.id = $1`,
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Job form not found'
      });
    }
    
    const jobForm = transformRow(rows[0], 'job_forms');
    jobForm.template = {
      name: rows[0].template_name,
      description: rows[0].template_description,
      formType: rows[0].template_form_type,
      fields: rows[0].template_fields,
      requireSignature: rows[0].require_signature,
      requirePhotos: rows[0].require_photos,
      minPhotos: rows[0].min_photos
    };
    
    res.json({
      success: true,
      data: jobForm
    });
  } catch (err) {
    handleError(res, err);
  }
});

// PUT /api/job-forms/:id/submit - Submit/update form data (field values)
apiRouter.put('/job-forms/:id/submit', async (req, res) => {
  try {
    const { id } = req.params;
    const { formData } = req.body;
    
    if (!formData || typeof formData !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'formData is required and must be an object'
      });
    }
    
    // Get job form with template
    const { rows: formRows } = await db.query(
      `SELECT jf.*, ft.fields as template_fields
       FROM job_forms jf
       JOIN form_templates ft ON jf.form_template_id = ft.id
       WHERE jf.id = $1`,
      [id]
    );
    
    if (formRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Job form not found'
      });
    }
    
    // Validate field types match template
    const templateFields = formRows[0].template_fields;
    const errors = [];
    
    for (const field of templateFields) {
      const value = formData[field.id];
      
      if (value !== undefined && value !== null && value !== '') {
        // Type validation
        switch (field.type) {
          case 'number':
            if (isNaN(Number(value))) {
              errors.push(`Field '${field.label}' must be a number`);
            }
            break;
          case 'checkbox':
            if (typeof value !== 'boolean') {
              errors.push(`Field '${field.label}' must be a boolean`);
            }
            break;
          case 'date':
            if (isNaN(Date.parse(value))) {
              errors.push(`Field '${field.label}' must be a valid date`);
            }
            break;
        }
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation errors',
        errors
      });
    }
    
    // Update form data
    const { rows } = await db.query(
      `UPDATE job_forms 
       SET form_data = $1, status = 'in_progress', updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify(formData), id]
    );
    
    const jobForm = transformRow(rows[0], 'job_forms');
    
    res.json({
      success: true,
      data: jobForm,
      message: 'Form data updated successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
});

// PUT /api/job-forms/:id/complete - Mark form as completed
apiRouter.put('/job-forms/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { completedBy } = req.body;
    
    // Get job form with template to validate required fields
    const { rows: formRows } = await db.query(
      `SELECT jf.*, ft.fields as template_fields
       FROM job_forms jf
       JOIN form_templates ft ON jf.form_template_id = ft.id
       WHERE jf.id = $1`,
      [id]
    );
    
    if (formRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Job form not found'
      });
    }
    
    const jobForm = formRows[0];
    const templateFields = jobForm.template_fields;
    const formData = jobForm.form_data || {};
    
    // Validate required fields are filled
    const errors = [];
    for (const field of templateFields) {
      if (field.required) {
        const value = formData[field.id];
        if (value === undefined || value === null || value === '') {
          errors.push(`Required field '${field.label}' is not filled`);
        }
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot complete form: required fields are missing',
        errors
      });
    }
    
    // Mark as completed
    const { rows } = await db.query(
      `UPDATE job_forms 
       SET status = 'completed', 
           completed_at = NOW(), 
           completed_by = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [completedBy || null, id]
    );
    
    const updatedJobForm = transformRow(rows[0], 'job_forms');
    
    res.json({
      success: true,
      data: updatedJobForm,
      message: 'Form marked as completed'
    });
  } catch (err) {
    handleError(res, err);
  }
});

// DELETE /api/job-forms/:id - Remove form from job
apiRouter.delete('/job-forms/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows } = await db.query(
      'DELETE FROM job_forms WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Job form not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Form removed from job successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
});

// ============================================================================
// CREW MANAGEMENT ENDPOINTS
// ============================================================================

// ----------------------
// HELPER ENDPOINTS (must be before parameterized routes)
// ----------------------

// GET /api/crews/available - Get crews available on a specific date
apiRouter.get('/crews/available', async (req, res) => {
  try {
    const { date, exclude_job_id } = req.query;
    
    // Validation
    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'date query parameter is required'
      });
    }
    
    // Get crews that haven't reached capacity for the date
    let query = `
      SELECT 
        c.*,
        COUNT(DISTINCT cm.id) FILTER (WHERE cm.left_at IS NULL) as member_count,
        COUNT(DISTINCT ca.id) FILTER (WHERE ca.assigned_date = $1) as assignments_on_date
      FROM crews c
      LEFT JOIN crew_members cm ON c.id = cm.crew_id AND cm.left_at IS NULL
      LEFT JOIN crew_assignments ca ON c.id = ca.crew_id
      WHERE c.deleted_at IS NULL 
        AND c.is_active = true
      GROUP BY c.id
      HAVING 
        c.capacity IS NULL 
        OR COUNT(DISTINCT ca.id) FILTER (WHERE ca.assigned_date = $1) < c.capacity
      ORDER BY c.name
    `;
    
    const { rows } = await db.query(query, [date]);
    
    // Filter out crew if it's already assigned to the excluded job
    let crews = rows;
    if (exclude_job_id) {
      const excludeQuery = `
        SELECT crew_id FROM crew_assignments 
        WHERE job_id = $1 AND assigned_date = $2
      `;
      const { rows: excludeRows } = await db.query(excludeQuery, [exclude_job_id, date]);
      const excludedCrewIds = excludeRows.map(r => r.crew_id);
      
      crews = rows.filter(crew => !excludedCrewIds.includes(crew.id));
    }
    
    const availableCrews = crews.map(row => transformRow(row, 'crews'));
    
    res.json({
      success: true,
      data: availableCrews
    });
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/employees/unassigned - Get employees not in any crew
apiRouter.get('/employees/unassigned', async (req, res) => {
  try {
    const query = `
      SELECT e.*
      FROM employees e
      LEFT JOIN crew_members cm ON e.id = cm.employee_id AND cm.left_at IS NULL
      WHERE cm.id IS NULL
      ORDER BY e.name
    `;
    
    const { rows } = await db.query(query);
    const employees = rows.map(row => transformRow(row, 'employees'));
    
    res.json({
      success: true,
      data: employees
    });
  } catch (err) {
    handleError(res, err);
  }
});

// ----------------------
// CREW CRUD ENDPOINTS
// ----------------------

// GET /api/crews - List all crews with member counts
apiRouter.get('/crews', async (req, res) => {
  try {
    const includeDeleted = req.query.include_deleted === 'true';
    
    let query = `
      SELECT 
        c.*,
        COUNT(DISTINCT cm.id) FILTER (WHERE cm.left_at IS NULL) as member_count,
        COUNT(DISTINCT ca.id) as active_assignments
      FROM crews c
      LEFT JOIN crew_members cm ON c.id = cm.crew_id AND cm.left_at IS NULL
      LEFT JOIN crew_assignments ca ON c.id = ca.crew_id
      ${includeDeleted ? '' : 'WHERE c.deleted_at IS NULL'}
      GROUP BY c.id
      ORDER BY c.name
    `;
    
    const { rows } = await db.query(query);
    const crews = rows.map(row => transformRow(row, 'crews'));
    
    res.json({
      success: true,
      data: crews
    });
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/crews/:id - Get crew by ID with members and assignments
apiRouter.get('/crews/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get crew basic info
    const crewQuery = `
      SELECT 
        c.*,
        COUNT(DISTINCT cm.id) FILTER (WHERE cm.left_at IS NULL) as member_count
      FROM crews c
      LEFT JOIN crew_members cm ON c.id = cm.crew_id AND cm.left_at IS NULL
      WHERE c.id = $1
      GROUP BY c.id
    `;
    const { rows: crewRows } = await db.query(crewQuery, [id]);
    
    if (crewRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Crew not found'
      });
    }
    
    const crew = transformRow(crewRows[0], 'crews');
    
    // Get crew members with employee details
    const membersQuery = `
      SELECT 
        cm.*,
        e.name as employee_name,
        e.phone,
        e.job_title,
        e.certifications
      FROM crew_members cm
      JOIN employees e ON cm.employee_id = e.id
      WHERE cm.crew_id = $1 AND cm.left_at IS NULL
      ORDER BY cm.role, e.name
    `;
    const { rows: memberRows } = await db.query(membersQuery, [id]);
    crew.members = memberRows.map(row => transformRow(row, 'crew_members'));
    
    // Get current job assignments
    const assignmentsQuery = `
      SELECT 
        ca.*,
        j.customer_name,
        j.status,
        j.scheduled_date,
        j.job_location
      FROM crew_assignments ca
      JOIN jobs j ON ca.job_id = j.id
      WHERE ca.crew_id = $1
      ORDER BY ca.assigned_date DESC
      LIMIT 10
    `;
    const { rows: assignmentRows } = await db.query(assignmentsQuery, [id]);
    crew.currentAssignments = assignmentRows.map(row => transformRow(row, 'crew_assignments'));
    
    res.json({
      success: true,
      data: crew
    });
  } catch (err) {
    handleError(res, err);
  }
});

// POST /api/crews - Create new crew
apiRouter.post('/crews', async (req, res) => {
  try {
    const { name, description, default_start_time, default_end_time, capacity } = req.body;
    
    // Validation
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Crew name is required'
      });
    }
    
    if (capacity !== undefined && capacity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Capacity must be greater than 0'
      });
    }
    
    const query = `
      INSERT INTO crews (name, description, default_start_time, default_end_time, capacity)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const { rows } = await db.query(query, [
      name,
      description || null,
      default_start_time || null,
      default_end_time || null,
      capacity || null
    ]);
    
    const crew = transformRow(rows[0], 'crews');
    
    res.status(201).json({
      success: true,
      data: crew,
      message: 'Crew created successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
});

// PUT /api/crews/:id - Update crew
apiRouter.put('/crews/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, is_active, default_start_time, default_end_time, capacity } = req.body;
    
    // Check if crew exists
    const checkQuery = 'SELECT id FROM crews WHERE id = $1';
    const { rows: checkRows } = await db.query(checkQuery, [id]);
    
    if (checkRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Crew not found'
      });
    }
    
    // Validation
    if (capacity !== undefined && capacity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Capacity must be greater than 0'
      });
    }
    
    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }
    if (default_start_time !== undefined) {
      updates.push(`default_start_time = $${paramCount++}`);
      values.push(default_start_time);
    }
    if (default_end_time !== undefined) {
      updates.push(`default_end_time = $${paramCount++}`);
      values.push(default_end_time);
    }
    if (capacity !== undefined) {
      updates.push(`capacity = $${paramCount++}`);
      values.push(capacity);
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(id);
    
    const query = `
      UPDATE crews
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const { rows } = await db.query(query, values);
    const crew = transformRow(rows[0], 'crews');
    
    res.json({
      success: true,
      data: crew,
      message: 'Crew updated successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
});

// DELETE /api/crews/:id - Soft delete crew
apiRouter.delete('/crews/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if crew has active assignments
    const assignmentQuery = `
      SELECT COUNT(*) as count
      FROM crew_assignments ca
      JOIN jobs j ON ca.job_id = j.id
      WHERE ca.crew_id = $1 AND j.status NOT IN ('completed', 'cancelled')
    `;
    const { rows: assignmentRows } = await db.query(assignmentQuery, [id]);
    
    if (parseInt(assignmentRows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete crew with active job assignments'
      });
    }
    
    // Soft delete the crew
    const query = `
      UPDATE crews
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
    `;
    
    const { rows } = await db.query(query, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Crew not found or already deleted'
      });
    }
    
    res.json({
      success: true,
      message: 'Crew deleted successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
});

// ----------------------
// CREW MEMBER ENDPOINTS
// ----------------------

// POST /api/crews/:id/members - Add member to crew
apiRouter.post('/crews/:id/members', async (req, res) => {
  try {
    const { id } = req.params;
    const { employee_id, role } = req.body;
    
    // Validation
    if (!employee_id) {
      return res.status(400).json({
        success: false,
        error: 'employee_id is required'
      });
    }
    
    const validRoles = ['leader', 'climber', 'groundsman', 'driver'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: `Role must be one of: ${validRoles.join(', ')}`
      });
    }
    
    // Check if crew exists
    const crewQuery = 'SELECT id FROM crews WHERE id = $1 AND deleted_at IS NULL';
    const { rows: crewRows } = await db.query(crewQuery, [id]);
    
    if (crewRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Crew not found'
      });
    }
    
    // Check if employee exists
    const employeeQuery = 'SELECT id FROM employees WHERE id = $1';
    const { rows: employeeRows } = await db.query(employeeQuery, [employee_id]);
    
    if (employeeRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }
    
    // Check if employee is already an active member
    const memberCheckQuery = `
      SELECT id FROM crew_members
      WHERE crew_id = $1 AND employee_id = $2 AND left_at IS NULL
    `;
    const { rows: existingRows } = await db.query(memberCheckQuery, [id, employee_id]);
    
    if (existingRows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Employee is already an active member of this crew'
      });
    }
    
    // Add member to crew
    const insertQuery = `
      INSERT INTO crew_members (crew_id, employee_id, role)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const { rows } = await db.query(insertQuery, [id, employee_id, role || null]);
    const member = transformRow(rows[0], 'crew_members');
    
    res.status(201).json({
      success: true,
      data: member,
      message: 'Member added to crew successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/crews/:id/members - Get all crew members
apiRouter.get('/crews/:id/members', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if crew exists
    const crewQuery = 'SELECT id FROM crews WHERE id = $1';
    const { rows: crewRows } = await db.query(crewQuery, [id]);
    
    if (crewRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Crew not found'
      });
    }
    
    // Get active members with employee details
    const query = `
      SELECT 
        cm.*,
        e.name as employee_name,
        e.phone,
        e.job_title,
        e.certifications
      FROM crew_members cm
      JOIN employees e ON cm.employee_id = e.id
      WHERE cm.crew_id = $1 AND cm.left_at IS NULL
      ORDER BY 
        CASE cm.role
          WHEN 'leader' THEN 1
          WHEN 'climber' THEN 2
          WHEN 'groundsman' THEN 3
          WHEN 'driver' THEN 4
          ELSE 5
        END,
        e.name
    `;
    
    const { rows } = await db.query(query, [id]);
    const members = rows.map(row => transformRow(row, 'crew_members'));
    
    res.json({
      success: true,
      data: members
    });
  } catch (err) {
    handleError(res, err);
  }
});

// PUT /api/crews/:crew_id/members/:member_id - Update member role
apiRouter.put('/crews/:crew_id/members/:member_id', async (req, res) => {
  try {
    const { crew_id, member_id } = req.params;
    const { role } = req.body;
    
    // Validation
    const validRoles = ['leader', 'climber', 'groundsman', 'driver'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: `Role must be one of: ${validRoles.join(', ')}`
      });
    }
    
    // Update member role
    const query = `
      UPDATE crew_members
      SET role = $1
      WHERE id = $2 AND crew_id = $3 AND left_at IS NULL
      RETURNING *
    `;
    
    const { rows } = await db.query(query, [role || null, member_id, crew_id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Crew member not found or no longer active'
      });
    }
    
    const member = transformRow(rows[0], 'crew_members');
    
    res.json({
      success: true,
      data: member,
      message: 'Member role updated successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
});

// DELETE /api/crews/:crew_id/members/:member_id - Remove member from crew
apiRouter.delete('/crews/:crew_id/members/:member_id', async (req, res) => {
  try {
    const { crew_id, member_id } = req.params;
    
    // Set left_at timestamp
    const query = `
      UPDATE crew_members
      SET left_at = NOW()
      WHERE id = $1 AND crew_id = $2 AND left_at IS NULL
      RETURNING *
    `;
    
    const { rows } = await db.query(query, [member_id, crew_id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Crew member not found or already removed'
      });
    }
    
    res.json({
      success: true,
      message: 'Member removed from crew successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
});

// ----------------------
// CREW ASSIGNMENT ENDPOINTS
// ----------------------

// POST /api/jobs/:job_id/assign-crew - Assign crew to job
apiRouter.post('/jobs/:job_id/assign-crew', async (req, res) => {
  try {
    const { job_id } = req.params;
    const { crew_id, assigned_date, notes } = req.body;
    
    // Validation
    if (!crew_id) {
      return res.status(400).json({
        success: false,
        error: 'crew_id is required'
      });
    }
    
    if (!assigned_date) {
      return res.status(400).json({
        success: false,
        error: 'assigned_date is required'
      });
    }
    
    // Check if job exists
    const jobQuery = 'SELECT id FROM jobs WHERE id = $1';
    const { rows: jobRows } = await db.query(jobQuery, [job_id]);
    
    if (jobRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }
    
    // Check if crew exists and is active
    const crewQuery = 'SELECT id FROM crews WHERE id = $1 AND deleted_at IS NULL AND is_active = true';
    const { rows: crewRows } = await db.query(crewQuery, [crew_id]);
    
    if (crewRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Crew not found or inactive'
      });
    }
    
    // Create assignment
    const insertQuery = `
      INSERT INTO crew_assignments (job_id, crew_id, assigned_date, notes)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const { rows } = await db.query(insertQuery, [job_id, crew_id, assigned_date, notes || null]);
    const assignment = transformRow(rows[0], 'crew_assignments');
    
    res.status(201).json({
      success: true,
      data: assignment,
      message: 'Crew assigned to job successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/crews/:id/assignments - Get crew's assignments
apiRouter.get('/crews/:id/assignments', async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;
    
    // Check if crew exists
    const crewQuery = 'SELECT id FROM crews WHERE id = $1';
    const { rows: crewRows } = await db.query(crewQuery, [id]);
    
    if (crewRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Crew not found'
      });
    }
    
    // Build query with optional date filters
    let query = `
      SELECT 
        ca.*,
        j.customer_name,
        j.status,
        j.scheduled_date,
        j.job_location,
        j.special_instructions as job_description
      FROM crew_assignments ca
      JOIN jobs j ON ca.job_id = j.id
      WHERE ca.crew_id = $1
    `;
    
    const params = [id];
    let paramCount = 2;
    
    if (start_date) {
      query += ` AND ca.assigned_date >= $${paramCount++}`;
      params.push(start_date);
    }
    
    if (end_date) {
      query += ` AND ca.assigned_date <= $${paramCount++}`;
      params.push(end_date);
    }
    
    query += ` ORDER BY ca.assigned_date DESC`;
    
    const { rows } = await db.query(query, params);
    const assignments = rows.map(row => transformRow(row, 'crew_assignments'));
    
    res.json({
      success: true,
      data: assignments
    });
  } catch (err) {
    handleError(res, err);
  }
});

// DELETE /api/crew-assignments/:id - Remove crew assignment
apiRouter.delete('/crew-assignments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Hard delete the assignment
    const query = 'DELETE FROM crew_assignments WHERE id = $1 RETURNING *';
    const { rows } = await db.query(query, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Crew assignment not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Crew assignment removed successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/crew-assignments/schedule - Get all crew assignments in a date range (for calendar)
apiRouter.get('/crew-assignments/schedule', async (req, res) => {
  try {
    const { start_date, end_date, crew_id } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'start_date and end_date are required'
      });
    }
    
    let query = `
      SELECT 
        ca.*,
        c.name as crew_name,
        c.color as crew_color,
        j.id as job_id,
        j.title as job_title,
        j.client_name,
        j.status as job_status,
        j.scheduled_date,
        j.job_location,
        j.special_instructions
      FROM crew_assignments ca
      JOIN crews c ON ca.crew_id = c.id
      JOIN jobs j ON ca.job_id = j.id
      WHERE ca.assigned_date >= $1 AND ca.assigned_date <= $2
        AND c.deleted_at IS NULL
    `;
    
    const params = [start_date, end_date];
    let paramCount = 3;
    
    if (crew_id) {
      query += ` AND ca.crew_id = $${paramCount}`;
      params.push(crew_id);
      paramCount++;
    }
    
    query += ' ORDER BY ca.assigned_date, c.name';
    
    const { rows } = await db.query(query, params);
    
    const assignments = rows.map(row => ({
      ...transformRow(row, 'crew_assignments'),
      crewName: row.crew_name,
      crewColor: row.crew_color,
      jobTitle: row.job_title,
      clientName: row.client_name,
      jobStatus: row.job_status,
      scheduledDate: row.scheduled_date,
      jobLocation: row.job_location,
      specialInstructions: row.special_instructions
    }));
    
    res.json({
      success: true,
      data: assignments
    });
  } catch (err) {
    handleError(res, err);
  }
});

// POST /api/crew-assignments/check-conflicts - Check for scheduling conflicts
apiRouter.post('/crew-assignments/check-conflicts', async (req, res) => {
  try {
    const { crew_id, assigned_date, job_id } = req.body;
    
    if (!crew_id || !assigned_date) {
      return res.status(400).json({
        success: false,
        error: 'crew_id and assigned_date are required'
      });
    }
    
    let query = `
      SELECT 
        ca.*,
        j.title as job_title,
        j.client_name,
        j.job_location
      FROM crew_assignments ca
      JOIN jobs j ON ca.job_id = j.id
      WHERE ca.crew_id = $1 AND ca.assigned_date = $2
    `;
    
    const params = [crew_id, assigned_date];
    
    // Exclude the current job if provided (for editing existing assignments)
    if (job_id) {
      query += ' AND ca.job_id != $3';
      params.push(job_id);
    }
    
    const { rows } = await db.query(query, params);
    
    const hasConflict = rows.length > 0;
    const conflicts = rows.map(row => ({
      assignmentId: row.id,
      jobTitle: row.job_title,
      clientName: row.client_name,
      jobLocation: row.job_location,
      assignedDate: row.assigned_date
    }));
    
    res.json({
      success: true,
      hasConflict,
      conflicts
    });
  } catch (err) {
    handleError(res, err);
  }
});

// POST /api/crew-assignments/bulk-assign - Bulk assign crew to multiple dates
apiRouter.post('/crew-assignments/bulk-assign', async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    const { crew_id, job_id, dates, notes } = req.body;
    
    if (!crew_id || !job_id || !dates || !Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'crew_id, job_id, and dates array are required'
      });
    }
    
    // Start transaction
    await client.query('BEGIN');
    
    // Check if crew and job exist
    const [crewCheck, jobCheck] = await Promise.all([
      client.query('SELECT id FROM crews WHERE id = $1 AND deleted_at IS NULL', [crew_id]),
      client.query('SELECT id FROM jobs WHERE id = $1', [job_id])
    ]);
    
    if (crewCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Crew not found'
      });
    }
    
    if (jobCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }
    
    // Check for conflicts before inserting
    for (const date of dates) {
      const conflictCheck = await client.query(
        'SELECT id FROM crew_assignments WHERE crew_id = $1 AND assigned_date = $2 AND job_id != $3',
        [crew_id, date, job_id]
      );
      
      if (conflictCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          error: `Crew is already assigned on ${date}`
        });
      }
    }
    
    // Insert all assignments in a single batch operation
    const values = dates.map((date, idx) => {
      const offset = idx * 4;
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`;
    }).join(', ');
    
    const params = dates.flatMap(date => [job_id, crew_id, date, notes || null]);
    
    const insertQuery = `
      INSERT INTO crew_assignments (job_id, crew_id, assigned_date, notes)
      VALUES ${values}
      RETURNING *
    `;
    
    const { rows } = await client.query(insertQuery, params);
    
    // Commit transaction
    await client.query('COMMIT');
    
    const assignments = rows.map(row => transformRow(row, 'crew_assignments'));
    
    res.status(201).json({
      success: true,
      data: assignments,
      message: `Successfully created ${assignments.length} crew assignments`
    });
  } catch (err) {
    await client.query('ROLLBACK');
    handleError(res, err);
  } finally {
    client.release();
  }
});

// PUT /api/crew-assignments/:id/reassign - Reassign to different crew or date
apiRouter.put('/crew-assignments/:id/reassign', async (req, res) => {
  try {
    const { id } = req.params;
    const { crew_id, assigned_date, notes } = req.body;
    
    if (!crew_id && !assigned_date) {
      return res.status(400).json({
        success: false,
        error: 'Either crew_id or assigned_date must be provided'
      });
    }
    
    // Get existing assignment
    const existingQuery = 'SELECT * FROM crew_assignments WHERE id = $1';
    const { rows: existingRows } = await db.query(existingQuery, [id]);
    
    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found'
      });
    }
    
    const existing = existingRows[0];
    
    // Build update query
    const updates = [];
    const params = [];
    let paramCount = 1;
    
    if (crew_id) {
      // Verify new crew exists
      const crewCheck = await db.query(
        'SELECT id FROM crews WHERE id = $1 AND deleted_at IS NULL',
        [crew_id]
      );
      if (crewCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'New crew not found'
        });
      }
      updates.push(`crew_id = $${paramCount++}`);
      params.push(crew_id);
    }
    
    if (assigned_date) {
      updates.push(`assigned_date = $${paramCount++}`);
      params.push(assigned_date);
    }
    
    if (notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      params.push(notes);
    }
    
    params.push(id);
    
    const query = `
      UPDATE crew_assignments 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const { rows } = await db.query(query, params);
    
    res.json({
      success: true,
      data: transformRow(rows[0], 'crew_assignments'),
      message: 'Assignment reassigned successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
});

// ============================================================================
// TIME TRACKING ENDPOINTS
// ============================================================================

// POST /api/time-entries/clock-in - Clock in for a job
apiRouter.post('/time-entries/clock-in', async (req, res) => {
  try {
    const { employeeId, jobId, location, notes } = req.body;
    
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        error: 'employeeId is required'
      });
    }
    
    // Check if employee already has an active clock-in
    const activeCheck = await db.query(
      'SELECT id FROM time_entries WHERE employee_id = $1 AND clock_out IS NULL AND status != $2',
      [employeeId, 'rejected']
    );
    
    if (activeCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Employee already has an active clock-in. Please clock out first.'
      });
    }
    
    const id = uuidv4();
    const clockIn = new Date();
    
    // Get employee hourly rate
    const empQuery = await db.query('SELECT hourly_rate FROM employees WHERE id = $1', [employeeId]);
    const hourlyRate = empQuery.rows[0]?.hourly_rate || 0;
    
    const query = `
      INSERT INTO time_entries (
        id, employee_id, job_id, clock_in, clock_in_location, 
        notes, status, hourly_rate
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const { rows } = await db.query(query, [
      id,
      employeeId,
      jobId || null,
      clockIn,
      location ? JSON.stringify(location) : null,
      notes || null,
      'draft',
      hourlyRate
    ]);
    
    res.json({
      success: true,
      data: transformRow(rows[0], 'time_entries'),
      message: 'Clocked in successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
});

// POST /api/time-entries/:id/clock-out - Clock out from a time entry
apiRouter.post('/time-entries/:id/clock-out', async (req, res) => {
  try {
    const { id } = req.params;
    const { location, notes, breakMinutes } = req.body;
    
    // Get the existing entry
    const checkQuery = 'SELECT * FROM time_entries WHERE id = $1';
    const { rows: existingRows } = await db.query(checkQuery, [id]);
    
    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Time entry not found'
      });
    }
    
    const entry = existingRows[0];
    
    if (entry.clock_out) {
      return res.status(400).json({
        success: false,
        error: 'Already clocked out'
      });
    }
    
    const clockOut = new Date();
    const clockIn = new Date(entry.clock_in);
    
    // Calculate hours worked (excluding breaks)
    const totalMinutes = (clockOut - clockIn) / (1000 * 60);
    const workMinutes = totalMinutes - (breakMinutes || 0);
    const hoursWorked = Math.max(0, workMinutes / 60);
    const totalAmount = hoursWorked * (entry.hourly_rate || 0);
    
    const query = `
      UPDATE time_entries 
      SET 
        clock_out = $1,
        clock_out_location = $2,
        notes = COALESCE($3, notes),
        break_minutes = $4,
        hours_worked = $5,
        total_amount = $6,
        status = 'submitted'
      WHERE id = $7
      RETURNING *
    `;
    
    const { rows } = await db.query(query, [
      clockOut,
      location ? JSON.stringify(location) : null,
      notes,
      breakMinutes || 0,
      hoursWorked,
      totalAmount,
      id
    ]);
    
    res.json({
      success: true,
      data: transformRow(rows[0], 'time_entries'),
      message: 'Clocked out successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/time-entries - Get time entries with filters
apiRouter.get('/time-entries', async (req, res) => {
  try {
    const { employeeId, jobId, status, startDate, endDate, limit = 100 } = req.query;
    
    let query = `
      SELECT 
        te.*,
        e.name as employee_name,
        j.title as job_title,
        j.client_name as job_client_name
      FROM time_entries te
      LEFT JOIN employees e ON te.employee_id = e.id
      LEFT JOIN jobs j ON te.job_id = j.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (employeeId) {
      query += ` AND te.employee_id = $${paramCount}`;
      params.push(employeeId);
      paramCount++;
    }
    
    if (jobId) {
      query += ` AND te.job_id = $${paramCount}`;
      params.push(jobId);
      paramCount++;
    }
    
    if (status) {
      query += ` AND te.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    
    if (startDate) {
      query += ` AND te.clock_in >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }
    
    if (endDate) {
      query += ` AND te.clock_in <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }
    
    query += ` ORDER BY te.clock_in DESC LIMIT $${paramCount}`;
    params.push(parseInt(limit));
    
    const { rows } = await db.query(query, params);
    
    const entries = rows.map(row => {
      const entry = transformRow(row, 'time_entries');
      entry.employeeName = row.employee_name;
      entry.jobTitle = row.job_title;
      entry.jobClientName = row.job_client_name;
      return entry;
    });
    
    res.json({
      success: true,
      data: entries
    });
  } catch (err) {
    handleError(res, err);
  }
});

// PUT /api/time-entries/:id/approve - Approve a time entry
apiRouter.put('/time-entries/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body;
    
    if (!approvedBy) {
      return res.status(400).json({
        success: false,
        error: 'approvedBy is required'
      });
    }
    
    const query = `
      UPDATE time_entries 
      SET 
        status = 'approved',
        approved_by = $1,
        approved_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    
    const { rows } = await db.query(query, [approvedBy, id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Time entry not found'
      });
    }
    
    res.json({
      success: true,
      data: transformRow(rows[0], 'time_entries'),
      message: 'Time entry approved'
    });
  } catch (err) {
    handleError(res, err);
  }
});

// PUT /api/time-entries/:id/reject - Reject a time entry
apiRouter.put('/time-entries/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy, rejectionReason } = req.body;
    
    if (!approvedBy) {
      return res.status(400).json({
        success: false,
        error: 'approvedBy is required'
      });
    }
    
    const query = `
      UPDATE time_entries 
      SET 
        status = 'rejected',
        approved_by = $1,
        approved_at = NOW(),
        rejection_reason = $2
      WHERE id = $3
      RETURNING *
    `;
    
    const { rows } = await db.query(query, [approvedBy, rejectionReason || null, id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Time entry not found'
      });
    }
    
    res.json({
      success: true,
      data: transformRow(rows[0], 'time_entries'),
      message: 'Time entry rejected'
    });
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/timesheets - Get timesheets with filters
apiRouter.get('/timesheets', async (req, res) => {
  try {
    const { employeeId, status, startDate, endDate } = req.query;
    
    let query = `
      SELECT 
        ts.*,
        e.name as employee_name,
        approver.name as approver_name
      FROM timesheets ts
      LEFT JOIN employees e ON ts.employee_id = e.id
      LEFT JOIN employees approver ON ts.approved_by = approver.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (employeeId) {
      query += ` AND ts.employee_id = $${paramCount}`;
      params.push(employeeId);
      paramCount++;
    }
    
    if (status) {
      query += ` AND ts.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    
    if (startDate) {
      query += ` AND ts.period_start >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }
    
    if (endDate) {
      query += ` AND ts.period_end <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }
    
    query += ' ORDER BY ts.period_start DESC';
    
    const { rows } = await db.query(query, params);
    
    const timesheets = rows.map(row => {
      const sheet = transformRow(row, 'timesheets');
      sheet.employeeName = row.employee_name;
      sheet.approverName = row.approver_name;
      return sheet;
    });
    
    res.json({
      success: true,
      data: timesheets
    });
  } catch (err) {
    handleError(res, err);
  }
});

// POST /api/timesheets/generate - Generate timesheet for employee and period
apiRouter.post('/timesheets/generate', async (req, res) => {
  try {
    const { employeeId, periodStart, periodEnd } = req.body;
    
    if (!employeeId || !periodStart || !periodEnd) {
      return res.status(400).json({
        success: false,
        error: 'employeeId, periodStart, and periodEnd are required'
      });
    }
    
    // Get all approved time entries in the period
    const entriesQuery = `
      SELECT * FROM time_entries
      WHERE employee_id = $1
        AND clock_in >= $2
        AND clock_in < $3
        AND status = 'approved'
      ORDER BY clock_in
    `;
    
    const { rows: entries } = await db.query(entriesQuery, [employeeId, periodStart, periodEnd]);
    
    // Calculate totals
    let totalHours = 0;
    let regularHours = 0;
    let overtimeHours = 0;
    
    entries.forEach(entry => {
      const hours = entry.hours_worked || 0;
      totalHours += hours;
      
      // Simple overtime calculation: >40 hours per week
      // This is simplified - real payroll would need more complex logic
      if (regularHours < 40) {
        const addRegular = Math.min(hours, 40 - regularHours);
        regularHours += addRegular;
        overtimeHours += Math.max(0, hours - addRegular);
      } else {
        overtimeHours += hours;
      }
    });
    
    const id = uuidv4();
    
    const query = `
      INSERT INTO timesheets (
        id, employee_id, period_start, period_end,
        total_hours, total_regular_hours, total_overtime_hours,
        status, submitted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *
    `;
    
    const { rows } = await db.query(query, [
      id,
      employeeId,
      periodStart,
      periodEnd,
      totalHours,
      regularHours,
      overtimeHours,
      'submitted'
    ]);
    
    res.json({
      success: true,
      data: transformRow(rows[0], 'timesheets'),
      message: `Timesheet generated with ${entries.length} entries`,
      entriesCount: entries.length
    });
  } catch (err) {
    handleError(res, err);
  }
});

// PUT /api/timesheets/:id/approve - Approve a timesheet
apiRouter.put('/timesheets/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy, notes } = req.body;
    
    if (!approvedBy) {
      return res.status(400).json({
        success: false,
        error: 'approvedBy is required'
      });
    }
    
    const query = `
      UPDATE timesheets 
      SET 
        status = 'approved',
        approved_by = $1,
        approved_at = NOW(),
        notes = COALESCE($2, notes)
      WHERE id = $3
      RETURNING *
    `;
    
    const { rows } = await db.query(query, [approvedBy, notes, id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Timesheet not found'
      });
    }
    
    res.json({
      success: true,
      data: transformRow(rows[0], 'timesheets'),
      message: 'Timesheet approved'
    });
  } catch (err) {
    handleError(res, err);
  }
});

// ============================================================================
// GENERIC CRUD ENDPOINTS
// ============================================================================

const resources = ['clients', 'leads', 'jobs', 'invoices', 'employees', 'equipment', 'pay_periods', 'time_entries', 'payroll_records', 'estimate_feedback'];
resources.forEach(resource => {
  setupCrudEndpoints(apiRouter, resource);
});

async function startServer() {
  await setupAuth(app);
  
  apiRouter.get('/auth/user', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  apiRouter.get('/health', (req, res) => {
    res.status(200).send('TreePro AI Backend is running.');
  });

  app.use('/api', apiRouter);
  
  // Frontend is served separately by Vite on port 5000
  // Backend only handles API routes

  app.listen(PORT, HOST, async () => {
    console.log(`Backend server running on http://${HOST}:${PORT}`);

    try {
      await ragService.initialize();
      console.log('🤖 RAG Service ready');
    } catch (error) {
      console.error('⚠️ RAG Service initialization failed:', error);
      console.log('💡 Run POST /api/rag/build to build the vector database');
    }

    scheduleFinancialReminders();
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});