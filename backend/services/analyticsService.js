const db = require('../db');

class AnalyticsService {
  async getSalesFunnelMetrics(startDate, endDate) {
    const dateFilter = this.buildDateFilter(startDate, endDate, 'created_at');
    
    const query = `
      WITH lead_stats AS (
        SELECT 
          COUNT(*) as total_leads,
          COUNT(*) FILTER (WHERE status = 'Qualified') as qualified_leads,
          COUNT(*) FILTER (WHERE status = 'Won') as won_leads,
          COUNT(*) FILTER (WHERE status = 'Lost') as lost_leads
        FROM leads
        WHERE deleted_at IS NULL
        ${dateFilter}
      ),
      quote_stats AS (
        SELECT 
          COUNT(*) as total_quotes,
          COUNT(*) FILTER (WHERE status = 'Sent' OR status = 'Accepted' OR status = 'Converted') as sent_quotes,
          COUNT(*) FILTER (WHERE status = 'Accepted' OR status = 'Converted') as accepted_quotes,
          COUNT(*) FILTER (WHERE status = 'Converted') as converted_quotes,
          COALESCE(SUM(CASE WHEN status IN ('Accepted', 'Converted') THEN total_amount END), 0) as accepted_value
        FROM quotes
        WHERE deleted_at IS NULL
        ${dateFilter}
      ),
      job_stats AS (
        SELECT 
          COUNT(*) as total_jobs,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
          COUNT(*) FILTER (WHERE status IN ('scheduled', 'en_route', 'on_site', 'in_progress')) as active_jobs
        FROM jobs
        ${dateFilter}
      )
      SELECT 
        ls.total_leads,
        ls.qualified_leads,
        ls.won_leads,
        ls.lost_leads,
        qs.total_quotes,
        qs.sent_quotes,
        qs.accepted_quotes,
        qs.converted_quotes,
        qs.accepted_value,
        js.total_jobs,
        js.completed_jobs,
        js.active_jobs,
        CASE WHEN ls.total_leads > 0 
          THEN ROUND((ls.qualified_leads::decimal / ls.total_leads) * 100, 1)
          ELSE 0 
        END as lead_qualification_rate,
        CASE WHEN qs.sent_quotes > 0 
          THEN ROUND((qs.accepted_quotes::decimal / qs.sent_quotes) * 100, 1)
          ELSE 0 
        END as quote_acceptance_rate,
        CASE WHEN qs.accepted_quotes > 0 
          THEN ROUND((qs.converted_quotes::decimal / qs.accepted_quotes) * 100, 1)
          ELSE 0 
        END as quote_conversion_rate
      FROM lead_stats ls, quote_stats qs, job_stats js
    `;
    
    const { rows } = await db.query(query);
    return this.transformRow(rows[0]);
  }

  async getJobProfitability(startDate, endDate) {
    const dateFilter = this.buildDateFilter(startDate, endDate, 'j.completed_at');
    
    const query = `
      SELECT 
        j.id,
        j.job_number,
        j.customer_name,
        j.status,
        j.completed_at,
        q.total_amount as quote_amount,
        COALESCE((j.costs->>'labor')::decimal, 0) as labor_cost,
        COALESCE((j.costs->>'equipment')::decimal, 0) as equipment_cost,
        COALESCE((j.costs->>'materials')::decimal, 0) as materials_cost,
        COALESCE((j.costs->>'disposal')::decimal, 0) as disposal_cost,
        COALESCE((j.costs->>'total')::decimal, 0) as total_cost
      FROM jobs j
      LEFT JOIN quotes q ON j.quote_id = q.id
      WHERE j.status = 'completed'
      AND j.costs IS NOT NULL
      ${dateFilter}
      ORDER BY j.completed_at DESC
      LIMIT 100
    `;
    
    const { rows } = await db.query(query);
    
    const jobs = rows.map(row => {
      const quoteAmount = parseFloat(row.quote_amount) || 0;
      const totalCost = parseFloat(row.total_cost) || 0;
      const profit = quoteAmount - totalCost;
      const profitMargin = quoteAmount > 0 ? (profit / quoteAmount) * 100 : 0;
      
      return {
        id: row.id,
        jobNumber: row.job_number,
        customerName: row.customer_name,
        completedAt: row.completed_at,
        quoteAmount,
        laborCost: parseFloat(row.labor_cost) || 0,
        equipmentCost: parseFloat(row.equipment_cost) || 0,
        materialsCost: parseFloat(row.materials_cost) || 0,
        disposalCost: parseFloat(row.disposal_cost) || 0,
        totalCost,
        profit,
        profitMargin: Math.round(profitMargin * 10) / 10
      };
    });
    
    const totalRevenue = jobs.reduce((sum, j) => sum + j.quoteAmount, 0);
    const totalCosts = jobs.reduce((sum, j) => sum + j.totalCost, 0);
    const totalProfit = totalRevenue - totalCosts;
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    
    return {
      jobs,
      summary: {
        totalJobs: jobs.length,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCosts: Math.round(totalCosts * 100) / 100,
        totalProfit: Math.round(totalProfit * 100) / 100,
        avgProfitMargin: Math.round(avgMargin * 10) / 10
      }
    };
  }

  async getCrewProductivity(startDate, endDate) {
    const dateFilter = this.buildDateFilter(startDate, endDate, 'te.clock_in');
    
    const query = `
      SELECT 
        e.id as employee_id,
        e.name as employee_name,
        e.role,
        COUNT(DISTINCT te.id) as total_entries,
        COALESCE(SUM(
          EXTRACT(EPOCH FROM (te.clock_out - te.clock_in)) / 3600
        ), 0) as total_hours,
        COUNT(DISTINCT j.id) as jobs_worked,
        COUNT(DISTINCT j.id) FILTER (WHERE j.status = 'completed') as jobs_completed
      FROM employees e
      LEFT JOIN time_entries te ON e.id = te.employee_id AND te.clock_out IS NOT NULL
      LEFT JOIN jobs j ON te.job_id = j.id
      WHERE 1=1
      ${dateFilter}
      GROUP BY e.id, e.name, e.role
      HAVING COUNT(te.id) > 0
      ORDER BY total_hours DESC
    `;
    
    const { rows } = await db.query(query);
    
    const employees = rows.map(row => ({
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      role: row.role,
      totalEntries: parseInt(row.total_entries) || 0,
      totalHours: Math.round(parseFloat(row.total_hours) * 10) / 10,
      jobsWorked: parseInt(row.jobs_worked) || 0,
      jobsCompleted: parseInt(row.jobs_completed) || 0,
      avgHoursPerJob: row.jobs_worked > 0 
        ? Math.round((parseFloat(row.total_hours) / parseInt(row.jobs_worked)) * 10) / 10 
        : 0
    }));
    
    const totalHours = employees.reduce((sum, e) => sum + e.totalHours, 0);
    const totalJobs = employees.reduce((sum, e) => sum + e.jobsCompleted, 0);
    
    return {
      employees,
      summary: {
        totalEmployees: employees.length,
        totalHours: Math.round(totalHours * 10) / 10,
        totalJobsCompleted: totalJobs,
        avgHoursPerEmployee: employees.length > 0 
          ? Math.round((totalHours / employees.length) * 10) / 10 
          : 0
      }
    };
  }

  async getEquipmentUtilization(startDate, endDate) {
    const dateFilter = this.buildDateFilter(startDate, endDate, 'eu.usage_date');
    
    const query = `
      SELECT 
        eq.id as equipment_id,
        eq.name as equipment_name,
        eq.equipment_type,
        eq.status,
        COUNT(eu.id) as usage_count,
        COALESCE(SUM(eu.hours_used), 0) as total_hours_used,
        COUNT(DISTINCT eu.job_id) as jobs_used_on,
        MAX(eu.usage_date) as last_used
      FROM equipment eq
      LEFT JOIN equipment_usage eu ON eq.id = eu.equipment_id
      ${startDate || endDate ? 'AND ' + dateFilter.replace('AND ', '') : ''}
      GROUP BY eq.id, eq.name, eq.equipment_type, eq.status
      ORDER BY total_hours_used DESC
    `;
    
    const { rows } = await db.query(query);
    
    const equipment = rows.map(row => ({
      equipmentId: row.equipment_id,
      equipmentName: row.equipment_name,
      equipmentType: row.equipment_type,
      status: row.status,
      usageCount: parseInt(row.usage_count) || 0,
      totalHoursUsed: Math.round(parseFloat(row.total_hours_used || 0) * 10) / 10,
      jobsUsedOn: parseInt(row.jobs_used_on) || 0,
      lastUsed: row.last_used
    }));
    
    const activeEquipment = equipment.filter(e => e.usageCount > 0);
    const totalHours = equipment.reduce((sum, e) => sum + e.totalHoursUsed, 0);
    
    return {
      equipment,
      summary: {
        totalEquipment: equipment.length,
        activeEquipment: activeEquipment.length,
        utilizationRate: equipment.length > 0 
          ? Math.round((activeEquipment.length / equipment.length) * 100) 
          : 0,
        totalHoursUsed: Math.round(totalHours * 10) / 10
      }
    };
  }

  async getRevenueByServiceType(startDate, endDate) {
    const dateFilter = this.buildDateFilter(startDate, endDate, 'i.created_at');
    
    const query = `
      SELECT 
        COALESCE(j.service_type, 'Unspecified') as service_type,
        COUNT(DISTINCT i.id) as invoice_count,
        COALESCE(SUM(i.total_amount), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN i.status = 'Paid' THEN i.amount_paid ELSE 0 END), 0) as collected_revenue
      FROM invoices i
      LEFT JOIN jobs j ON i.job_id = j.id
      WHERE i.status != 'Void'
      ${dateFilter}
      GROUP BY COALESCE(j.service_type, 'Unspecified')
      ORDER BY total_revenue DESC
    `;
    
    const { rows } = await db.query(query);
    
    const services = rows.map(row => ({
      serviceType: row.service_type,
      invoiceCount: parseInt(row.invoice_count) || 0,
      totalRevenue: Math.round(parseFloat(row.total_revenue) * 100) / 100,
      collectedRevenue: Math.round(parseFloat(row.collected_revenue) * 100) / 100,
      collectionRate: row.total_revenue > 0 
        ? Math.round((parseFloat(row.collected_revenue) / parseFloat(row.total_revenue)) * 100) 
        : 0
    }));
    
    const totalRevenue = services.reduce((sum, s) => sum + s.totalRevenue, 0);
    const totalCollected = services.reduce((sum, s) => sum + s.collectedRevenue, 0);
    
    return {
      services,
      summary: {
        totalServiceTypes: services.length,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCollected: Math.round(totalCollected * 100) / 100,
        overallCollectionRate: totalRevenue > 0 
          ? Math.round((totalCollected / totalRevenue) * 100) 
          : 0
      }
    };
  }

  async getRevenueTrend(startDate, endDate, groupBy = 'month') {
    let dateFormat, dateTrunc;
    switch (groupBy) {
      case 'day':
        dateFormat = 'YYYY-MM-DD';
        dateTrunc = 'day';
        break;
      case 'week':
        dateFormat = 'IYYY-IW';
        dateTrunc = 'week';
        break;
      case 'month':
      default:
        dateFormat = 'YYYY-MM';
        dateTrunc = 'month';
        break;
    }
    
    const dateFilter = this.buildDateFilter(startDate, endDate, 'i.created_at');
    
    const query = `
      SELECT 
        TO_CHAR(DATE_TRUNC('${dateTrunc}', i.created_at), '${dateFormat}') as period,
        COUNT(*) as invoice_count,
        COALESCE(SUM(i.total_amount), 0) as total_invoiced,
        COALESCE(SUM(CASE WHEN i.status = 'Paid' THEN i.amount_paid ELSE 0 END), 0) as total_paid
      FROM invoices i
      WHERE i.status != 'Void'
      ${dateFilter}
      GROUP BY DATE_TRUNC('${dateTrunc}', i.created_at)
      ORDER BY DATE_TRUNC('${dateTrunc}', i.created_at)
    `;
    
    const { rows } = await db.query(query);
    
    return rows.map(row => ({
      period: row.period,
      invoiceCount: parseInt(row.invoice_count) || 0,
      totalInvoiced: Math.round(parseFloat(row.total_invoiced) * 100) / 100,
      totalPaid: Math.round(parseFloat(row.total_paid) * 100) / 100
    }));
  }

  async getDashboardKPIs(startDate, endDate) {
    const dateFilter = this.buildDateFilter(startDate, endDate, 'created_at');
    
    const query = `
      SELECT
        (SELECT COUNT(*) FROM leads WHERE deleted_at IS NULL ${dateFilter}) as new_leads,
        (SELECT COUNT(*) FROM quotes WHERE deleted_at IS NULL ${dateFilter}) as quotes_created,
        (SELECT COUNT(*) FROM quotes WHERE deleted_at IS NULL AND status IN ('Accepted', 'Converted') ${dateFilter}) as quotes_won,
        (SELECT COUNT(*) FROM jobs ${dateFilter}) as jobs_created,
        (SELECT COUNT(*) FROM jobs WHERE status = 'completed' ${dateFilter}) as jobs_completed,
        (SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE status != 'Void' ${dateFilter}) as total_invoiced,
        (SELECT COALESCE(SUM(amount_paid), 0) FROM invoices WHERE status = 'Paid' ${dateFilter}) as total_collected,
        (SELECT COALESCE(SUM(balance_amount), 0) FROM invoices WHERE status NOT IN ('Paid', 'Void') ${dateFilter}) as outstanding_balance
    `;
    
    const { rows } = await db.query(query);
    const data = rows[0];
    
    return {
      newLeads: parseInt(data.new_leads) || 0,
      quotesCreated: parseInt(data.quotes_created) || 0,
      quotesWon: parseInt(data.quotes_won) || 0,
      jobsCreated: parseInt(data.jobs_created) || 0,
      jobsCompleted: parseInt(data.jobs_completed) || 0,
      totalInvoiced: Math.round(parseFloat(data.total_invoiced) * 100) / 100,
      totalCollected: Math.round(parseFloat(data.total_collected) * 100) / 100,
      outstandingBalance: Math.round(parseFloat(data.outstanding_balance) * 100) / 100,
      winRate: data.quotes_created > 0 
        ? Math.round((parseInt(data.quotes_won) / parseInt(data.quotes_created)) * 100) 
        : 0
    };
  }

  buildDateFilter(startDate, endDate, column) {
    const filters = [];
    if (startDate) {
      filters.push(`${column} >= '${startDate}'`);
    }
    if (endDate) {
      filters.push(`${column} <= '${endDate}'`);
    }
    return filters.length > 0 ? 'AND ' + filters.join(' AND ') : '';
  }

  transformRow(row) {
    if (!row) return null;
    const result = {};
    for (const [key, value] of Object.entries(row)) {
      const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      result[camelKey] = typeof value === 'string' && !isNaN(value) ? parseFloat(value) : value;
    }
    return result;
  }
}

module.exports = new AnalyticsService();
