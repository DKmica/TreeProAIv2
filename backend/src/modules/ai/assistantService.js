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
           c.first_name || ' ' || c.last_name as customer_name,
           c.primary_phone as customer_phone,
           p.address_line1 as property_address,
           p.city as property_city
    FROM jobs j
    LEFT JOIN clients c ON j.client_id = c.id
    LEFT JOIN properties p ON j.property_id = p.id
    WHERE j.scheduled_date >= $1 AND j.scheduled_date <= $2
      AND j.status NOT IN ('Cancelled', 'Completed')
      AND j.deleted_at IS NULL
    ORDER BY j.scheduled_date, j.start_time
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
      SUM(COALESCE(j.total_cost, 0)) as total_revenue,
      SUM(CASE WHEN j.status = 'Completed' THEN COALESCE(j.total_cost, 0) ELSE 0 END) as completed_revenue,
      SUM(CASE WHEN j.status IN ('Scheduled', 'In Progress') THEN COALESCE(j.total_cost, 0) ELSE 0 END) as pending_revenue
    FROM jobs j
    WHERE j.created_at >= $1 AND j.created_at <= $2
      AND j.deleted_at IS NULL
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
      AND deleted_at IS NULL
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
    SELECT i.*, 
           c.first_name || ' ' || c.last_name as customer_name,
           c.primary_email as customer_email,
           c.primary_phone as customer_phone,
           EXTRACT(DAY FROM NOW() - i.due_date) as days_overdue
    FROM invoices i
    LEFT JOIN clients c ON i.client_id = c.id
    WHERE i.status NOT IN ('Paid', 'Cancelled', 'Draft')
      AND i.due_date < NOW()
      AND i.due_date <= $1
      AND i.deleted_at IS NULL
    ORDER BY i.due_date ASC
  `, [cutoffDate.toISOString()]);

  const summary = await db.query(`
    SELECT 
      COUNT(*) as count,
      SUM(COALESCE(amount_due, grand_total, total_amount, amount, 0)) as total_outstanding
    FROM invoices
    WHERE status NOT IN ('Paid', 'Cancelled', 'Draft')
      AND due_date < NOW()
      AND due_date <= $1
      AND deleted_at IS NULL
  `, [cutoffDate.toISOString()]);

  return {
    invoices: result.rows,
    summary: summary.rows[0]
  };
}

async function getEmployeeAvailability(dateStr) {
  const employees = await db.query(`
    SELECT id, name, job_title, crew, phone, email, status
    FROM employees
    WHERE status = 'Active'
      AND deleted_at IS NULL
    ORDER BY name
  `);

  const scheduledJobs = await db.query(`
    SELECT j.assigned_crew, j.scheduled_date, j.start_time, j.end_time,
           j.description, c.first_name || ' ' || c.last_name as customer_name
    FROM jobs j
    LEFT JOIN clients c ON j.client_id = c.id
    WHERE j.scheduled_date = $1
      AND j.status NOT IN ('Cancelled', 'Completed')
      AND j.deleted_at IS NULL
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

const intentPatterns = {
  jobsTomorrow: /(?:what|which|show|list|get).*jobs.*(?:tomorrow|tmrw)/i,
  jobsDate: /(?:what|which|show|list|get).*jobs.*(?:on|for)\s+(\d{4}-\d{2}-\d{2}|\w+\s+\d+)/i,
  revenueLastMonth: /(?:how much|what's|show|get).*revenue.*(?:last month|previous month)/i,
  revenueThisMonth: /(?:how much|what's|show|get).*revenue.*(?:this month|current month)/i,
  overdueInvoices: /(?:show|get|list|which|what).*(?:overdue|outstanding|unpaid).*invoices?.*(?:over|more than|>\s*)?(\d+)?\s*days?/i,
  availableFriday: /(?:who's|who is|which|show|get).*(?:available|free).*(?:on\s+)?friday/i,
  availableDate: /(?:who's|who is|which|show|get).*(?:available|free).*(?:on|for)\s+(\d{4}-\d{2}-\d{2}|\w+\s+\d+)/i
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
  getCrewAvailabilityFriday
};
