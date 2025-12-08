const { GoogleGenAI } = require('@google/genai');
const db = require('../../modules/core/db');
const ragService = require('../../../services/ragService');

const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
let ai = null;

if (GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
}

async function getJobsForDateRange(startDate, endDate) {
  const result = await db.query(`
    SELECT j.*, 
           COALESCE(j.customer_name, c.first_name || ' ' || c.last_name) as customer_name,
           c.primary_phone as customer_phone,
           p.address_line1 as property_address,
           p.city as property_city
    FROM jobs j
    LEFT JOIN clients c ON j.client_id = c.id
    LEFT JOIN properties p ON j.property_id = p.id
    WHERE j.scheduled_date >= $1 AND j.scheduled_date <= $2
      AND j.status NOT IN ('cancelled', 'completed')
    ORDER BY j.scheduled_date, j.work_start_time
  `, [startDate, endDate]);
  return result.rows;
}

async function getJobsForTomorrow() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  return getJobsForDateRange(tomorrowStr, tomorrowStr);
}

async function getJobsForDate(dateStr) {
  return getJobsForDateRange(dateStr, dateStr);
}

async function getRevenueForPeriod(startDate, endDate) {
  const result = await db.query(`
    SELECT 
      COUNT(*) as job_count,
      SUM(COALESCE(i.grand_total, i.total_amount, i.amount, 0)) as total_revenue,
      SUM(CASE WHEN j.status = 'completed' THEN COALESCE(i.grand_total, i.total_amount, i.amount, 0) ELSE 0 END) as completed_revenue,
      SUM(CASE WHEN j.status IN ('scheduled', 'in_progress') THEN COALESCE(i.grand_total, i.total_amount, i.amount, 0) ELSE 0 END) as pending_revenue
    FROM jobs j
    LEFT JOIN invoices i ON j.invoice_id = i.id
    WHERE j.created_at >= $1 AND j.created_at <= $2
  `, [startDate, endDate]);
  return result.rows[0];
}

async function getRevenueLastMonth() {
  const now = new Date();
  const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  
  const revenue = await getRevenueForPeriod(
    firstDayLastMonth.toISOString().split('T')[0],
    lastDayLastMonth.toISOString().split('T')[0]
  );

  const invoiceResult = await db.query(`
    SELECT 
      COUNT(*) as invoice_count,
      SUM(COALESCE(grand_total, total_amount, amount, 0)) as invoiced_amount,
      SUM(COALESCE(amount_paid, 0)) as paid_amount
    FROM invoices
    WHERE created_at >= $1 AND created_at <= $2
  `, [firstDayLastMonth.toISOString().split('T')[0], lastDayLastMonth.toISOString().split('T')[0]]);

  return {
    ...revenue,
    ...invoiceResult.rows[0],
    period: {
      start: firstDayLastMonth.toISOString().split('T')[0],
      end: lastDayLastMonth.toISOString().split('T')[0]
    }
  };
}

async function getOverdueInvoices(daysOverdue = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOverdue);

  const result = await db.query(`
    SELECT i.id, i.invoice_number, i.status, i.due_date, i.amount_due, i.grand_total, i.total_amount,
           COALESCE(i.customer_name, c.first_name || ' ' || c.last_name) as customer_name,
           COALESCE(i.customer_email, c.primary_email) as customer_email,
           COALESCE(i.customer_phone, c.primary_phone) as customer_phone,
           EXTRACT(DAY FROM NOW() - i.due_date::timestamp) as days_overdue
    FROM invoices i
    LEFT JOIN clients c ON i.client_id = c.id
    WHERE i.status NOT IN ('Paid', 'Cancelled', 'Draft', 'paid', 'cancelled', 'draft')
      AND i.due_date::date < CURRENT_DATE
      AND i.due_date::date <= $1::date
    ORDER BY i.due_date ASC
  `, [cutoffDate.toISOString().split('T')[0]]);

  const summary = await db.query(`
    SELECT 
      COUNT(*) as count,
      SUM(COALESCE(amount_due, grand_total, total_amount, amount, 0)) as total_outstanding
    FROM invoices
    WHERE status NOT IN ('Paid', 'Cancelled', 'Draft', 'paid', 'cancelled', 'draft')
      AND due_date::date < CURRENT_DATE
      AND due_date::date <= $1::date
  `, [cutoffDate.toISOString().split('T')[0]]);

  return {
    invoices: result.rows,
    summary: summary.rows[0]
  };
}

async function getEmployeeAvailability(dateStr) {
  const employees = await db.query(`
    SELECT id, name, job_title, phone
    FROM employees
    ORDER BY name
  `);

  const scheduledJobs = await db.query(`
    SELECT j.assigned_crew, j.scheduled_date, j.work_start_time as start_time, j.work_end_time as end_time,
           j.special_instructions as description, COALESCE(j.customer_name, c.first_name || ' ' || c.last_name) as customer_name
    FROM jobs j
    LEFT JOIN clients c ON j.client_id = c.id
    WHERE j.scheduled_date = $1
      AND j.status NOT IN ('cancelled', 'completed')
  `, [dateStr]);

  const busyEmployees = new Set();
  const employeeSchedules = {};

  for (const job of scheduledJobs.rows) {
    const crew = job.assigned_crew || [];
    for (const memberName of crew) {
      busyEmployees.add(memberName.toLowerCase().trim());
      if (!employeeSchedules[memberName]) {
        employeeSchedules[memberName] = [];
      }
      employeeSchedules[memberName].push({
        time: job.start_time || 'All day',
        description: job.description,
        customer: job.customer_name
      });
    }
  }

  const available = [];
  const busy = [];

  for (const emp of employees.rows) {
    const empName = emp.name.toLowerCase().trim();
    if (busyEmployees.has(empName)) {
      busy.push({
        ...emp,
        schedule: employeeSchedules[emp.name] || []
      });
    } else {
      available.push(emp);
    }
  }

  return { available, busy, date: dateStr };
}

async function getCrewAvailabilityFriday() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
  const friday = new Date(today);
  friday.setDate(today.getDate() + daysUntilFriday);
  const fridayStr = friday.toISOString().split('T')[0];
  
  return getEmployeeAvailability(fridayStr);
}

async function getExceptionQueue() {
  const pendingTimeApprovals = await db.query(`
    SELECT te.id, e.name as employee_name, te.clock_in_time, te.clock_out_time,
           te.approval_status, j.customer_name as job_customer
    FROM time_entries te
    LEFT JOIN employees e ON te.employee_id = e.id
    LEFT JOIN jobs j ON te.job_id = j.id
    WHERE te.approval_status = 'pending'
    ORDER BY te.clock_in_time DESC
    LIMIT 20
  `);

  const overdueInvoicesResult = await db.query(`
    SELECT i.id, i.invoice_number, 
           COALESCE(i.customer_name, c.first_name || ' ' || c.last_name) as customer_name,
           i.due_date, i.amount_due,
           EXTRACT(DAY FROM NOW() - i.due_date::timestamp) as days_overdue
    FROM invoices i
    LEFT JOIN clients c ON i.client_id = c.id
    WHERE i.status NOT IN ('Paid', 'Cancelled', 'Draft', 'paid', 'cancelled', 'draft')
      AND i.due_date::date < CURRENT_DATE
    ORDER BY i.due_date ASC
    LIMIT 10
  `);

  let exceptionItems = [];
  try {
    const exceptionsResult = await db.query(`
      SELECT id, exception_type, entity_type, priority, description, created_at
      FROM exception_queue
      WHERE is_resolved = FALSE
      ORDER BY 
        CASE priority 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          ELSE 4 
        END,
        created_at DESC
      LIMIT 10
    `);
    exceptionItems = exceptionsResult.rows;
  } catch (err) {
    console.warn('Exception queue table not available:', err.message);
  }

  return {
    pendingTimeApprovals: pendingTimeApprovals.rows,
    overdueInvoices: overdueInvoicesResult.rows,
    exceptions: exceptionItems,
    totals: {
      pendingApprovals: pendingTimeApprovals.rows.length,
      overdueInvoices: overdueInvoicesResult.rows.length,
      exceptions: exceptionItems.length
    }
  };
}

async function getTimeTrackingStatus() {
  const today = new Date().toISOString().split('T')[0];
  
  const clockedIn = await db.query(`
    SELECT te.id, e.name as employee_name, e.job_title,
           te.clock_in_time, j.customer_name as current_job,
           te.clock_in_lat, te.clock_in_lon
    FROM time_entries te
    JOIN employees e ON te.employee_id = e.id
    LEFT JOIN jobs j ON te.job_id = j.id
    WHERE te.clock_in_time::date = CURRENT_DATE
      AND te.clock_out_time IS NULL
    ORDER BY te.clock_in_time DESC
  `);

  const pendingApprovals = await db.query(`
    SELECT te.id, e.name as employee_name,
           te.clock_in_time, te.clock_out_time,
           EXTRACT(EPOCH FROM (te.clock_out_time - te.clock_in_time))/3600 as hours_worked,
           j.customer_name as job_customer
    FROM time_entries te
    JOIN employees e ON te.employee_id = e.id
    LEFT JOIN jobs j ON te.job_id = j.id
    WHERE te.approval_status = 'pending'
      AND te.clock_out_time IS NOT NULL
    ORDER BY te.clock_in_time DESC
    LIMIT 20
  `);

  const todaysSummary = await db.query(`
    SELECT 
      COUNT(DISTINCT te.employee_id) as employees_worked,
      SUM(EXTRACT(EPOCH FROM (COALESCE(te.clock_out_time, NOW()) - te.clock_in_time))/3600) as total_hours
    FROM time_entries te
    WHERE te.clock_in_time::date = CURRENT_DATE
  `);

  return {
    clockedIn: clockedIn.rows,
    pendingApprovals: pendingApprovals.rows,
    summary: todaysSummary.rows[0],
    date: today
  };
}

async function getClientProperties(clientName) {
  const clientResult = await db.query(`
    SELECT id, first_name, last_name, company_name, primary_email, primary_phone
    FROM clients
    WHERE deleted_at IS NULL
      AND (
        LOWER(first_name || ' ' || last_name) LIKE LOWER($1)
        OR LOWER(company_name) LIKE LOWER($1)
      )
    ORDER BY created_at DESC
    LIMIT 1
  `, [`%${clientName}%`]);

  if (clientResult.rows.length === 0) {
    return { client: null, properties: [], message: 'Client not found' };
  }

  const client = clientResult.rows[0];
  
  const properties = await db.query(`
    SELECT id, property_name, address_line1, address_line2, city, state, zip_code,
           property_type, is_primary, gate_code, access_instructions, trees_on_property
    FROM properties
    WHERE client_id = $1 AND deleted_at IS NULL
    ORDER BY is_primary DESC, created_at DESC
  `, [client.id]);

  return {
    client,
    properties: properties.rows
  };
}

async function getClientContacts(clientName) {
  const clientResult = await db.query(`
    SELECT id, first_name, last_name, company_name, primary_email, primary_phone
    FROM clients
    WHERE deleted_at IS NULL
      AND (
        LOWER(first_name || ' ' || last_name) LIKE LOWER($1)
        OR LOWER(company_name) LIKE LOWER($1)
      )
    ORDER BY created_at DESC
    LIMIT 1
  `, [`%${clientName}%`]);

  if (clientResult.rows.length === 0) {
    return { client: null, contacts: [], message: 'Client not found' };
  }

  const client = clientResult.rows[0];
  
  const contacts = await db.query(`
    SELECT c.id, c.first_name, c.last_name, c.role, c.job_title,
           c.contact_type, c.is_primary, c.preferred_contact_method,
           c.can_approve_quotes, c.can_sign_invoices
    FROM contacts c
    WHERE c.client_id = $1 AND c.deleted_at IS NULL
    ORDER BY c.is_primary DESC, c.created_at DESC
  `, [client.id]);

  const contactChannels = await db.query(`
    SELECT cc.contact_id, cc.channel_type, cc.channel_value, cc.is_primary
    FROM contact_channels cc
    JOIN contacts c ON cc.contact_id = c.id
    WHERE c.client_id = $1 AND c.deleted_at IS NULL
  `, [client.id]);

  const channelsByContact = {};
  for (const channel of contactChannels.rows) {
    if (!channelsByContact[channel.contact_id]) {
      channelsByContact[channel.contact_id] = [];
    }
    channelsByContact[channel.contact_id].push(channel);
  }

  const contactsWithChannels = contacts.rows.map(contact => ({
    ...contact,
    channels: channelsByContact[contact.id] || []
  }));

  return {
    client,
    contacts: contactsWithChannels
  };
}

async function getMarketingCampaignStatus() {
  try {
    const campaigns = await db.query(`
      SELECT id, name, status, type, created_at
      FROM marketing_campaigns
      WHERE status != 'deleted'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    const sequences = await db.query(`
      SELECT es.id, es.subject, es.status, mc.name as campaign_name
      FROM email_sequences es
      JOIN marketing_campaigns mc ON es.campaign_id = mc.id
      WHERE es.status = 'active' OR es.status = 'scheduled'
      ORDER BY es.created_at DESC
      LIMIT 10
    `);

    return {
      campaigns: campaigns.rows,
      sequences: sequences.rows,
      summary: {
        totalCampaigns: campaigns.rows.length,
        activeSequences: sequences.rows.length
      }
    };
  } catch (err) {
    console.warn('Marketing tables not available:', err.message);
    
    const leadsResult = await db.query(`
      SELECT status, COUNT(*) as count
      FROM leads
      WHERE deleted_at IS NULL
      GROUP BY status
      ORDER BY count DESC
    `);

    return {
      campaigns: [],
      sequences: [],
      leadStats: leadsResult.rows,
      message: 'Marketing campaign tables not configured. Showing lead statistics instead.',
      summary: {
        totalCampaigns: 0,
        activeSequences: 0,
        totalLeads: leadsResult.rows.reduce((acc, row) => acc + parseInt(row.count), 0)
      }
    };
  }
}

async function getCrewSchedule(startDate, endDate) {
  const jobs = await db.query(`
    SELECT j.id, j.scheduled_date, j.work_start_time, j.work_end_time,
           j.assigned_crew, j.status, j.description,
           COALESCE(j.customer_name, c.first_name || ' ' || c.last_name) as customer_name,
           p.address_line1 as property_address, p.city as property_city
    FROM jobs j
    LEFT JOIN clients c ON j.client_id = c.id
    LEFT JOIN properties p ON j.property_id = p.id
    WHERE j.scheduled_date >= $1 AND j.scheduled_date <= $2
      AND j.status NOT IN ('cancelled', 'completed')
    ORDER BY j.scheduled_date, j.work_start_time
  `, [startDate, endDate]);

  const crewWorkload = {};
  for (const job of jobs.rows) {
    const crew = job.assigned_crew || [];
    for (const member of crew) {
      if (!crewWorkload[member]) {
        crewWorkload[member] = { jobs: 0, dates: new Set() };
      }
      crewWorkload[member].jobs++;
      crewWorkload[member].dates.add(job.scheduled_date);
    }
  }

  const workloadSummary = Object.entries(crewWorkload).map(([name, data]) => ({
    name,
    totalJobs: data.jobs,
    daysWorking: data.dates.size
  })).sort((a, b) => b.totalJobs - a.totalJobs);

  return {
    jobs: jobs.rows,
    workloadSummary,
    period: { start: startDate, end: endDate },
    totalJobs: jobs.rows.length
  };
}

async function getThisWeekDateRange() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0]
  };
}

async function getEstimatorAccuracyStats() {
  const feedbackStats = await db.query(`
    SELECT 
      feedback_rating,
      COUNT(*) as count,
      AVG(final_approved_price - ai_suggested_price_min) as avg_price_diff_from_min,
      AVG(final_approved_price - ai_suggested_price_max) as avg_price_diff_from_max
    FROM ai_estimate_logs
    WHERE feedback_rating IS NOT NULL
    GROUP BY feedback_rating
    ORDER BY count DESC
  `);

  const recentEstimates = await db.query(`
    SELECT id, tree_species, ai_suggested_price_min, ai_suggested_price_max,
           final_approved_price, feedback_rating, feedback_notes,
           created_at
    FROM ai_estimate_logs
    WHERE feedback_rating IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 10
  `);

  const overallStats = await db.query(`
    SELECT 
      COUNT(*) as total_estimates,
      COUNT(CASE WHEN feedback_rating IS NOT NULL THEN 1 END) as estimates_with_feedback,
      COUNT(CASE WHEN feedback_rating = 'accurate' THEN 1 END) as accurate_count,
      COUNT(CASE WHEN feedback_rating = 'too_high' THEN 1 END) as too_high_count,
      COUNT(CASE WHEN feedback_rating = 'too_low' THEN 1 END) as too_low_count,
      AVG(CASE WHEN final_approved_price IS NOT NULL 
          THEN ABS(final_approved_price - (ai_suggested_price_min + ai_suggested_price_max) / 2) 
          END) as avg_price_deviation
    FROM ai_estimate_logs
  `);

  const overall = overallStats.rows[0];
  const accuracyRate = overall.estimates_with_feedback > 0 
    ? (parseInt(overall.accurate_count) / parseInt(overall.estimates_with_feedback) * 100).toFixed(1)
    : 0;

  return {
    feedbackBreakdown: feedbackStats.rows,
    recentEstimates: recentEstimates.rows,
    overall: {
      ...overall,
      accuracyRate: `${accuracyRate}%`
    }
  };
}

const intentPatterns = {
  jobsTomorrow: /(?:what|which|show|list|get).*jobs.*(?:tomorrow|tmrw)/i,
  jobsDate: /(?:what|which|show|list|get).*jobs.*(?:on|for)\s+(\d{4}-\d{2}-\d{2}|\w+\s+\d+)/i,
  revenueLastMonth: /(?:how much|what's|show|get).*revenue.*(?:last month|previous month)/i,
  revenueThisMonth: /(?:how much|what's|show|get).*revenue.*(?:this month|current month)/i,
  overdueInvoices: /(?:show|get|list|which|what).*(?:overdue|outstanding|unpaid).*invoices?.*(?:over|more than|>\s*)?(\d+)?\s*days?/i,
  availableFriday: /(?:who's|who is|which|show|get).*(?:available|free).*(?:on\s+)?friday/i,
  availableDate: /(?:who's|who is|which|show|get).*(?:available|free).*(?:on|for)\s+(\d{4}-\d{2}-\d{2}|\w+\s+\d+)/i,
  
  exceptionQueue: /(?:what.*needs.*attention|show.*pending.*approvals?|exception.*queue|what'?s.*overdue|attention.*needed|pending.*items|action.*required)/i,
  
  timeTrackingStatus: /(?:who'?s.*clocked.*in|time.*tracking.*today|pending.*time.*approvals?|current.*clock.*status|who.*working.*now)/i,
  
  clientProperties: /(?:properties|locations?|sites?).*(?:for|of)\s+(.+?)(?:\?|$)|(?:show|get|list).*properties.*(?:for|of)\s+(.+?)(?:\?|$)/i,
  clientContacts: /(?:contacts?).*(?:for|of)\s+(.+?)(?:\?|$)|(?:show|get|list).*contacts?.*(?:for|of)\s+(.+?)(?:\?|$)/i,
  clientDetails: /(?:client|customer).*details?.*(?:for|of)\s+(.+?)(?:\?|$)|(?:tell.*about|info.*on|details.*for).*client\s+(.+?)(?:\?|$)/i,
  
  marketingStatus: /(?:marketing.*campaign.*status|email.*campaigns?|lead.*forms?|marketing.*stats|campaign.*performance)/i,
  
  crewScheduleWeek: /(?:crew.*schedule.*this.*week|weekly.*crew.*schedule|who'?s.*working.*this.*week)/i,
  crewWorkingDate: /(?:who'?s.*working.*on|crew.*for)\s+(\d{4}-\d{2}-\d{2}|\w+\s+\d+)|(?:crew.*schedule.*for)\s+(\d{4}-\d{2}-\d{2}|\w+\s+\d+)/i,
  crewWorkload: /(?:crew.*workload|workload.*distribution|who.*has.*most.*jobs|busiest.*crew)/i,
  
  estimatorAccuracy: /(?:estimator.*accuracy|estimate.*feedback|how.*accurate.*estimates?|ai.*pricing.*accuracy|estimation.*stats)/i
};

function detectIntent(message) {
  const lowerMsg = message.toLowerCase();
  
  if (intentPatterns.jobsTomorrow.test(lowerMsg)) {
    return { type: 'jobsTomorrow' };
  }
  
  const jobsDateMatch = lowerMsg.match(intentPatterns.jobsDate);
  if (jobsDateMatch) {
    return { type: 'jobsDate', date: jobsDateMatch[1] };
  }
  
  if (intentPatterns.revenueLastMonth.test(lowerMsg)) {
    return { type: 'revenueLastMonth' };
  }
  
  if (intentPatterns.revenueThisMonth.test(lowerMsg)) {
    return { type: 'revenueThisMonth' };
  }
  
  const overdueMatch = lowerMsg.match(intentPatterns.overdueInvoices);
  if (overdueMatch) {
    const days = overdueMatch[1] ? parseInt(overdueMatch[1]) : 30;
    return { type: 'overdueInvoices', daysOverdue: days };
  }
  
  if (intentPatterns.availableFriday.test(lowerMsg)) {
    return { type: 'availableFriday' };
  }
  
  const availableDateMatch = lowerMsg.match(intentPatterns.availableDate);
  if (availableDateMatch) {
    return { type: 'availableDate', date: availableDateMatch[1] };
  }

  if (intentPatterns.exceptionQueue.test(lowerMsg)) {
    return { type: 'exceptionQueue' };
  }

  if (intentPatterns.timeTrackingStatus.test(lowerMsg)) {
    return { type: 'timeTrackingStatus' };
  }

  const propertiesMatch = message.match(intentPatterns.clientProperties);
  if (propertiesMatch) {
    const clientName = (propertiesMatch[1] || propertiesMatch[2] || '').trim();
    return { type: 'clientProperties', clientName };
  }

  const contactsMatch = message.match(intentPatterns.clientContacts);
  if (contactsMatch) {
    const clientName = (contactsMatch[1] || contactsMatch[2] || '').trim();
    return { type: 'clientContacts', clientName };
  }

  const detailsMatch = message.match(intentPatterns.clientDetails);
  if (detailsMatch) {
    const clientName = (detailsMatch[1] || detailsMatch[2] || '').trim();
    return { type: 'clientDetails', clientName };
  }

  if (intentPatterns.marketingStatus.test(lowerMsg)) {
    return { type: 'marketingStatus' };
  }

  if (intentPatterns.crewScheduleWeek.test(lowerMsg)) {
    return { type: 'crewScheduleWeek' };
  }

  const crewDateMatch = message.match(intentPatterns.crewWorkingDate);
  if (crewDateMatch) {
    const date = (crewDateMatch[1] || crewDateMatch[2] || '').trim();
    return { type: 'crewWorkingDate', date };
  }

  if (intentPatterns.crewWorkload.test(lowerMsg)) {
    return { type: 'crewWorkload' };
  }

  if (intentPatterns.estimatorAccuracy.test(lowerMsg)) {
    return { type: 'estimatorAccuracy' };
  }
  
  return null;
}

async function handleIntent(intent) {
  switch (intent.type) {
    case 'jobsTomorrow': {
      const jobs = await getJobsForTomorrow();
      return {
        type: 'jobsTomorrow',
        data: jobs,
        summary: `Found ${jobs.length} job(s) scheduled for tomorrow.`
      };
    }
    
    case 'jobsDate': {
      const jobs = await getJobsForDate(intent.date);
      return {
        type: 'jobsDate',
        data: jobs,
        date: intent.date,
        summary: `Found ${jobs.length} job(s) scheduled for ${intent.date}.`
      };
    }
    
    case 'revenueLastMonth': {
      const revenue = await getRevenueLastMonth();
      return {
        type: 'revenueLastMonth',
        data: revenue,
        summary: `Last month revenue: $${parseFloat(revenue.total_revenue || 0).toFixed(2)} from ${revenue.job_count} jobs.`
      };
    }
    
    case 'overdueInvoices': {
      const result = await getOverdueInvoices(intent.daysOverdue);
      return {
        type: 'overdueInvoices',
        data: result,
        summary: `Found ${result.summary.count} invoice(s) overdue by more than ${intent.daysOverdue} days, totaling $${parseFloat(result.summary.total_outstanding || 0).toFixed(2)}.`
      };
    }
    
    case 'availableFriday': {
      const availability = await getCrewAvailabilityFriday();
      return {
        type: 'availableFriday',
        data: availability,
        summary: `${availability.available.length} employee(s) available on Friday (${availability.date}), ${availability.busy.length} already scheduled.`
      };
    }
    
    case 'availableDate': {
      const availability = await getEmployeeAvailability(intent.date);
      return {
        type: 'availableDate',
        data: availability,
        summary: `${availability.available.length} employee(s) available on ${intent.date}, ${availability.busy.length} already scheduled.`
      };
    }

    case 'exceptionQueue': {
      const queue = await getExceptionQueue();
      const total = queue.totals.pendingApprovals + queue.totals.overdueInvoices + queue.totals.exceptions;
      return {
        type: 'exceptionQueue',
        data: queue,
        summary: `${total} item(s) need attention: ${queue.totals.pendingApprovals} pending time approvals, ${queue.totals.overdueInvoices} overdue invoices, ${queue.totals.exceptions} exceptions.`
      };
    }

    case 'timeTrackingStatus': {
      const status = await getTimeTrackingStatus();
      return {
        type: 'timeTrackingStatus',
        data: status,
        summary: `${status.clockedIn.length} employee(s) currently clocked in, ${status.pendingApprovals.length} time entries pending approval.`
      };
    }

    case 'clientProperties': {
      const result = await getClientProperties(intent.clientName);
      if (!result.client) {
        return {
          type: 'clientProperties',
          data: result,
          summary: `No client found matching "${intent.clientName}".`
        };
      }
      return {
        type: 'clientProperties',
        data: result,
        summary: `Found ${result.properties.length} property(ies) for ${result.client.first_name} ${result.client.last_name || result.client.company_name || ''}.`
      };
    }

    case 'clientContacts': {
      const result = await getClientContacts(intent.clientName);
      if (!result.client) {
        return {
          type: 'clientContacts',
          data: result,
          summary: `No client found matching "${intent.clientName}".`
        };
      }
      return {
        type: 'clientContacts',
        data: result,
        summary: `Found ${result.contacts.length} contact(s) for ${result.client.first_name} ${result.client.last_name || result.client.company_name || ''}.`
      };
    }

    case 'clientDetails': {
      const [propertiesResult, contactsResult] = await Promise.all([
        getClientProperties(intent.clientName),
        getClientContacts(intent.clientName)
      ]);
      
      if (!propertiesResult.client) {
        return {
          type: 'clientDetails',
          data: { client: null },
          summary: `No client found matching "${intent.clientName}".`
        };
      }
      
      return {
        type: 'clientDetails',
        data: {
          client: propertiesResult.client,
          properties: propertiesResult.properties,
          contacts: contactsResult.contacts
        },
        summary: `Client details for ${propertiesResult.client.first_name} ${propertiesResult.client.last_name || ''}: ${propertiesResult.properties.length} property(ies), ${contactsResult.contacts.length} contact(s).`
      };
    }

    case 'marketingStatus': {
      const status = await getMarketingCampaignStatus();
      return {
        type: 'marketingStatus',
        data: status,
        summary: status.message || `${status.summary.totalCampaigns} campaign(s), ${status.summary.activeSequences} active sequence(s).`
      };
    }

    case 'crewScheduleWeek': {
      const { start, end } = await getThisWeekDateRange();
      const schedule = await getCrewSchedule(start, end);
      return {
        type: 'crewScheduleWeek',
        data: schedule,
        summary: `${schedule.totalJobs} job(s) scheduled this week (${start} to ${end}).`
      };
    }

    case 'crewWorkingDate': {
      const schedule = await getCrewSchedule(intent.date, intent.date);
      const crewMembers = new Set();
      for (const job of schedule.jobs) {
        for (const member of (job.assigned_crew || [])) {
          crewMembers.add(member);
        }
      }
      return {
        type: 'crewWorkingDate',
        data: { ...schedule, uniqueCrewMembers: Array.from(crewMembers) },
        summary: `${crewMembers.size} crew member(s) working on ${intent.date} across ${schedule.totalJobs} job(s).`
      };
    }

    case 'crewWorkload': {
      const { start, end } = await getThisWeekDateRange();
      const schedule = await getCrewSchedule(start, end);
      return {
        type: 'crewWorkload',
        data: schedule,
        summary: `Crew workload this week: ${schedule.workloadSummary.length} crew members assigned across ${schedule.totalJobs} jobs.`
      };
    }

    case 'estimatorAccuracy': {
      const stats = await getEstimatorAccuracyStats();
      return {
        type: 'estimatorAccuracy',
        data: stats,
        summary: `AI Estimator accuracy: ${stats.overall.accuracyRate} (${stats.overall.accurate_count}/${stats.overall.estimates_with_feedback} rated as accurate). ${stats.overall.total_estimates} total estimates.`
      };
    }
    
    default:
      return null;
  }
}

async function chat(message, conversationHistory = []) {
  const intent = detectIntent(message);
  let intentResult = null;
  let enrichedContext = '';

  if (intent) {
    intentResult = await handleIntent(intent);
    enrichedContext = `\n\nBUSINESS DATA QUERY RESULT:\n${intentResult.summary}\n\nDetails:\n${JSON.stringify(intentResult.data, null, 2)}`;
  }

  try {
    const ragContext = await ragService.getContextForQuery(message);
    if (ragContext && ragContext !== 'No relevant business data found for this query.') {
      enrichedContext += `\n\nRAG CONTEXT:\n${ragContext}`;
    }
  } catch (error) {
    console.warn('RAG context injection failed:', error.message);
  }

  if (!ai) {
    if (intentResult) {
      return {
        response: formatIntentResponse(intentResult),
        intentResult
      };
    }
    throw new Error('Gemini API key not configured');
  }

  const systemPrompt = `You are ProBot, an expert arborist and AI assistant for TreePro AI, a tree service business management platform. 

You have access to the business database and can answer questions about:
- Jobs (scheduled, completed, upcoming)
- Customers and their properties
- Invoices (paid, pending, overdue)
- Employees and crew availability
- Equipment and maintenance
- Revenue and business metrics
- Exception queue (items needing attention, pending approvals)
- Time tracking (who's clocked in, pending time approvals)
- Client properties and contacts
- Marketing campaigns and lead status
- Crew schedules and workload distribution
- AI estimator accuracy and feedback statistics

When answering business questions, use the provided data to give accurate, helpful responses.
For arborist questions, draw on your ISA Certified Arborist knowledge.

Be professional, helpful, and concise. Format responses clearly with bullet points when listing multiple items.`;

  const contents = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: 'I understand. I\'m ProBot, ready to help with your tree service business.' }] }
  ];

  for (const msg of conversationHistory.slice(-10)) {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    });
  }

  const userMessage = enrichedContext 
    ? `${message}\n\n[SYSTEM CONTEXT]${enrichedContext}`
    : message;

  contents.push({ role: 'user', parts: [{ text: userMessage }] });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents
    });

    return {
      response: response.text,
      intentResult
    };
  } catch (error) {
    console.error('Assistant chat error:', error);
    throw new Error(`Failed to generate response: ${error.message}`);
  }
}

function formatIntentResponse(intentResult) {
  switch (intentResult.type) {
    case 'jobsTomorrow':
    case 'jobsDate': {
      if (intentResult.data.length === 0) {
        return `No jobs scheduled for ${intentResult.date || 'tomorrow'}.`;
      }
      const jobList = intentResult.data.map(j => 
        `- ${j.customer_name || 'Unknown customer'} at ${j.property_address || 'TBD'} - ${j.description || 'Tree service'}`
      ).join('\n');
      return `**Jobs for ${intentResult.date || 'tomorrow'}:**\n${jobList}`;
    }
    
    case 'revenueLastMonth': {
      const d = intentResult.data;
      return `**Last Month Revenue Summary (${d.period.start} to ${d.period.end}):**\n` +
        `- Total Jobs: ${d.job_count}\n` +
        `- Total Revenue: $${parseFloat(d.total_revenue || 0).toFixed(2)}\n` +
        `- Completed Revenue: $${parseFloat(d.completed_revenue || 0).toFixed(2)}\n` +
        `- Invoiced: $${parseFloat(d.invoiced_amount || 0).toFixed(2)}\n` +
        `- Collected: $${parseFloat(d.paid_amount || 0).toFixed(2)}`;
    }
    
    case 'overdueInvoices': {
      if (intentResult.data.invoices.length === 0) {
        return 'No overdue invoices found.';
      }
      const invoiceList = intentResult.data.invoices.map(i => 
        `- ${i.customer_name}: $${parseFloat(i.amount_due || i.grand_total || 0).toFixed(2)} (${Math.round(i.days_overdue)} days overdue)`
      ).join('\n');
      return `**Overdue Invoices:**\n${invoiceList}\n\n` +
        `Total Outstanding: $${parseFloat(intentResult.data.summary.total_outstanding || 0).toFixed(2)}`;
    }
    
    case 'availableFriday':
    case 'availableDate': {
      const { available, busy, date } = intentResult.data;
      let response = `**Crew Availability for ${date}:**\n\n`;
      
      if (available.length > 0) {
        response += `**Available (${available.length}):**\n`;
        response += available.map(e => `- ${e.name} (${e.job_title || 'Crew'})`).join('\n');
      } else {
        response += '**Available:** None\n';
      }
      
      if (busy.length > 0) {
        response += `\n\n**Already Scheduled (${busy.length}):**\n`;
        response += busy.map(e => {
          const scheduleInfo = e.schedule.length > 0 
            ? ` - ${e.schedule.map(s => s.customer).join(', ')}`
            : '';
          return `- ${e.name}${scheduleInfo}`;
        }).join('\n');
      }
      
      return response;
    }

    case 'exceptionQueue': {
      const { pendingTimeApprovals, overdueInvoices, exceptions, totals } = intentResult.data;
      let response = `**Exception Queue - Items Needing Attention:**\n\n`;
      
      if (pendingTimeApprovals.length > 0) {
        response += `**Pending Time Approvals (${totals.pendingApprovals}):**\n`;
        response += pendingTimeApprovals.slice(0, 5).map(t => 
          `- ${t.employee_name}: ${t.job_customer || 'General'}`
        ).join('\n');
        if (pendingTimeApprovals.length > 5) response += `\n  ...and ${pendingTimeApprovals.length - 5} more`;
        response += '\n\n';
      }
      
      if (overdueInvoices.length > 0) {
        response += `**Overdue Invoices (${totals.overdueInvoices}):**\n`;
        response += overdueInvoices.slice(0, 5).map(i => 
          `- ${i.customer_name}: $${parseFloat(i.amount_due || 0).toFixed(2)} (${Math.round(i.days_overdue)} days)`
        ).join('\n');
        if (overdueInvoices.length > 5) response += `\n  ...and ${overdueInvoices.length - 5} more`;
        response += '\n\n';
      }
      
      if (exceptions.length > 0) {
        response += `**System Exceptions (${totals.exceptions}):**\n`;
        response += exceptions.slice(0, 5).map(e => 
          `- [${e.priority.toUpperCase()}] ${e.exception_type}: ${e.description || 'No description'}`
        ).join('\n');
      }
      
      if (totals.pendingApprovals === 0 && totals.overdueInvoices === 0 && totals.exceptions === 0) {
        response = '**Exception Queue:** All clear! No items need your attention.';
      }
      
      return response;
    }

    case 'timeTrackingStatus': {
      const { clockedIn, pendingApprovals, summary, date } = intentResult.data;
      let response = `**Time Tracking Status for ${date}:**\n\n`;
      
      if (clockedIn.length > 0) {
        response += `**Currently Clocked In (${clockedIn.length}):**\n`;
        response += clockedIn.map(t => {
          const clockInTime = new Date(t.clock_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          return `- ${t.employee_name} (${t.job_title || 'Crew'}) - since ${clockInTime}${t.current_job ? ` on ${t.current_job}` : ''}`;
        }).join('\n');
        response += '\n\n';
      } else {
        response += '**Currently Clocked In:** None\n\n';
      }
      
      if (pendingApprovals.length > 0) {
        response += `**Pending Approvals (${pendingApprovals.length}):**\n`;
        response += pendingApprovals.slice(0, 5).map(t => 
          `- ${t.employee_name}: ${parseFloat(t.hours_worked || 0).toFixed(1)} hrs`
        ).join('\n');
      }
      
      if (summary) {
        response += `\n\n**Today's Summary:** ${summary.employees_worked || 0} employees, ${parseFloat(summary.total_hours || 0).toFixed(1)} total hours`;
      }
      
      return response;
    }

    case 'clientProperties': {
      const { client, properties } = intentResult.data;
      if (!client) {
        return intentResult.summary;
      }
      
      let response = `**Properties for ${client.first_name} ${client.last_name || client.company_name || ''}:**\n\n`;
      
      if (properties.length === 0) {
        response += 'No properties on file.';
      } else {
        response += properties.map(p => {
          const primary = p.is_primary ? ' ★' : '';
          return `- ${p.address_line1}, ${p.city}, ${p.state} ${p.zip_code}${primary}\n  Type: ${p.property_type || 'N/A'}${p.trees_on_property ? `, Trees: ${p.trees_on_property}` : ''}`;
        }).join('\n');
      }
      
      return response;
    }

    case 'clientContacts': {
      const { client, contacts } = intentResult.data;
      if (!client) {
        return intentResult.summary;
      }
      
      let response = `**Contacts for ${client.first_name} ${client.last_name || client.company_name || ''}:**\n\n`;
      
      if (contacts.length === 0) {
        response += 'No additional contacts on file.\n';
        response += `Primary: ${client.primary_email || 'No email'}, ${client.primary_phone || 'No phone'}`;
      } else {
        response += contacts.map(c => {
          const primary = c.is_primary ? ' ★' : '';
          const channels = c.channels.map(ch => `${ch.channel_type}: ${ch.channel_value}`).join(', ');
          return `- ${c.first_name} ${c.last_name}${primary} (${c.role || c.job_title || 'Contact'})\n  ${channels || 'No contact info'}`;
        }).join('\n');
      }
      
      return response;
    }

    case 'clientDetails': {
      const { client, properties, contacts } = intentResult.data;
      if (!client) {
        return intentResult.summary;
      }
      
      let response = `**Client Details: ${client.first_name} ${client.last_name || ''}**\n`;
      if (client.company_name) response += `Company: ${client.company_name}\n`;
      response += `Email: ${client.primary_email || 'N/A'}\n`;
      response += `Phone: ${client.primary_phone || 'N/A'}\n\n`;
      
      response += `**Properties (${properties.length}):**\n`;
      if (properties.length === 0) {
        response += 'None on file\n';
      } else {
        response += properties.slice(0, 3).map(p => 
          `- ${p.address_line1}, ${p.city}${p.is_primary ? ' ★' : ''}`
        ).join('\n');
        if (properties.length > 3) response += `\n  ...and ${properties.length - 3} more`;
      }
      
      response += `\n\n**Contacts (${contacts.length}):**\n`;
      if (contacts.length === 0) {
        response += 'No additional contacts';
      } else {
        response += contacts.slice(0, 3).map(c => 
          `- ${c.first_name} ${c.last_name} (${c.role || 'Contact'})${c.is_primary ? ' ★' : ''}`
        ).join('\n');
        if (contacts.length > 3) response += `\n  ...and ${contacts.length - 3} more`;
      }
      
      return response;
    }

    case 'marketingStatus': {
      const { campaigns, sequences, leadStats, message, summary } = intentResult.data;
      
      if (message) {
        let response = `**Marketing Status:**\n${message}\n\n`;
        if (leadStats && leadStats.length > 0) {
          response += '**Lead Statistics:**\n';
          response += leadStats.map(l => `- ${l.status}: ${l.count}`).join('\n');
        }
        return response;
      }
      
      let response = `**Marketing Campaign Status:**\n\n`;
      
      if (campaigns.length > 0) {
        response += `**Campaigns (${summary.totalCampaigns}):**\n`;
        response += campaigns.slice(0, 5).map(c => 
          `- ${c.name} (${c.status}) - ${c.type || 'General'}`
        ).join('\n');
        response += '\n\n';
      }
      
      if (sequences.length > 0) {
        response += `**Active Email Sequences (${summary.activeSequences}):**\n`;
        response += sequences.slice(0, 5).map(s => 
          `- ${s.subject} (${s.campaign_name})`
        ).join('\n');
      }
      
      return response;
    }

    case 'crewScheduleWeek':
    case 'crewWorkingDate': {
      const { jobs, workloadSummary, period, totalJobs, uniqueCrewMembers } = intentResult.data;
      
      let response = `**Crew Schedule (${period.start}${period.start !== period.end ? ` to ${period.end}` : ''}):**\n\n`;
      
      if (jobs.length === 0) {
        response += 'No jobs scheduled for this period.';
        return response;
      }
      
      if (uniqueCrewMembers) {
        response += `**Crew Working (${uniqueCrewMembers.length}):**\n`;
        response += uniqueCrewMembers.map(m => `- ${m}`).join('\n');
        response += '\n\n';
      }
      
      response += `**Jobs (${totalJobs}):**\n`;
      response += jobs.slice(0, 8).map(j => {
        const crew = (j.assigned_crew || []).join(', ') || 'Unassigned';
        return `- ${j.scheduled_date}: ${j.customer_name} at ${j.property_address || 'TBD'}\n  Crew: ${crew}`;
      }).join('\n');
      
      if (jobs.length > 8) {
        response += `\n  ...and ${jobs.length - 8} more jobs`;
      }
      
      return response;
    }

    case 'crewWorkload': {
      const { workloadSummary, period, totalJobs } = intentResult.data;
      
      let response = `**Crew Workload Distribution (${period.start} to ${period.end}):**\n\n`;
      
      if (workloadSummary.length === 0) {
        response += 'No crew assignments found for this period.';
        return response;
      }
      
      response += `Total Jobs: ${totalJobs}\n\n`;
      response += workloadSummary.map(w => 
        `- ${w.name}: ${w.totalJobs} job(s) across ${w.daysWorking} day(s)`
      ).join('\n');
      
      return response;
    }

    case 'estimatorAccuracy': {
      const { feedbackBreakdown, recentEstimates, overall } = intentResult.data;
      
      let response = `**AI Estimator Accuracy Statistics:**\n\n`;
      
      response += `**Overall Performance:**\n`;
      response += `- Total Estimates: ${overall.total_estimates || 0}\n`;
      response += `- With Feedback: ${overall.estimates_with_feedback || 0}\n`;
      response += `- Accuracy Rate: ${overall.accuracyRate}\n`;
      response += `- Too High: ${overall.too_high_count || 0}\n`;
      response += `- Too Low: ${overall.too_low_count || 0}\n`;
      
      if (overall.avg_price_deviation) {
        response += `- Avg Price Deviation: $${parseFloat(overall.avg_price_deviation).toFixed(2)}\n`;
      }
      
      if (recentEstimates.length > 0) {
        response += `\n**Recent Feedback:**\n`;
        response += recentEstimates.slice(0, 5).map(e => {
          const rating = e.feedback_rating === 'accurate' ? '✓' : e.feedback_rating === 'too_high' ? '↑' : '↓';
          return `- ${rating} ${e.tree_species || 'Unknown species'}: Est $${e.ai_suggested_price_min}-$${e.ai_suggested_price_max}, Final $${e.final_approved_price || 'N/A'}`;
        }).join('\n');
      }
      
      return response;
    }
    
    default:
      return intentResult.summary;
  }
}

module.exports = {
  chat,
  detectIntent,
  handleIntent,
  getJobsForTomorrow,
  getJobsForDate,
  getRevenueLastMonth,
  getOverdueInvoices,
  getEmployeeAvailability,
  getCrewAvailabilityFriday,
  getExceptionQueue,
  getTimeTrackingStatus,
  getClientProperties,
  getClientContacts,
  getMarketingCampaignStatus,
  getCrewSchedule,
  getEstimatorAccuracyStats
};
