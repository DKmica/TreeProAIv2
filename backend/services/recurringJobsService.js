const db = require('../db');
const { v4: uuidv4 } = require('uuid');

const DEFAULT_HORIZON_DAYS = 60;
const MAX_GENERATED_OCCURRENCES = 180;

const mapSeriesRow = (row) => ({
  id: row.id,
  clientId: row.client_id,
  propertyId: row.property_id,
  seriesName: row.series_name,
  description: row.description,
  serviceType: row.service_type,
  recurrencePattern: row.recurrence_pattern,
  recurrenceInterval: Number(row.recurrence_interval || 1),
  recurrenceDayOfWeek: row.recurrence_day_of_week,
  recurrenceDayOfMonth: row.recurrence_day_of_month,
  recurrenceMonth: row.recurrence_month,
  startDate: row.start_date,
  endDate: row.end_date,
  isActive: row.is_active,
  jobTemplateId: row.job_template_id,
  defaultCrewId: row.default_crew_id,
  estimatedDurationHours: row.estimated_duration_hours ? Number(row.estimated_duration_hours) : null,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  nextOccurrence: null,
  upcomingInstanceCount: 0
});

const mapInstanceRow = (row) => ({
  id: row.id,
  jobSeriesId: row.job_series_id,
  jobId: row.job_id,
  scheduledDate: row.scheduled_date,
  status: row.status,
  createdAt: row.created_at
});

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const daysInMonth = (date) => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

const prepareSeriesResponse = (seriesRows, instanceRows) => {
  const upcomingMap = new Map();
  const countMap = new Map();
  const today = new Date().toISOString().split('T')[0];

  instanceRows.forEach(row => {
    if (row.status === 'cancelled') return;
    const date = row.scheduled_date;
    if (date < today) return;
    const existing = upcomingMap.get(row.job_series_id);
    if (!existing || date < existing) {
      upcomingMap.set(row.job_series_id, date);
    }
    countMap.set(row.job_series_id, (countMap.get(row.job_series_id) || 0) + 1);
  });

  return seriesRows.map(row => {
    const mapped = mapSeriesRow(row);
    mapped.nextOccurrence = upcomingMap.get(row.id) || null;
    mapped.upcomingInstanceCount = countMap.get(row.id) || 0;
    return mapped;
  });
};

const listSeries = async () => {
  const { rows: seriesRows } = await db.query('SELECT * FROM job_series ORDER BY created_at DESC');
  const { rows: instanceRows } = await db.query('SELECT * FROM recurring_job_instances');
  return prepareSeriesResponse(seriesRows, instanceRows);
};

const getSeriesById = async (id) => {
  const { rows } = await db.query('SELECT * FROM job_series WHERE id = $1', [id]);
  if (!rows.length) {
    throw new Error('Recurring series not found');
  }
  const { rows: instanceRows } = await db.query('SELECT * FROM recurring_job_instances WHERE job_series_id = $1', [id]);
  return prepareSeriesResponse(rows, instanceRows)[0];
};

const createSeries = async (payload) => {
  const id = uuidv4();
  const {
    clientId,
    propertyId,
    seriesName,
    description,
    serviceType,
    recurrencePattern,
    recurrenceInterval = 1,
    recurrenceDayOfWeek,
    recurrenceDayOfMonth,
    recurrenceMonth,
    startDate,
    endDate,
    jobTemplateId,
    defaultCrewId,
    estimatedDurationHours,
    notes
  } = payload;

  const insertQuery = `
    INSERT INTO job_series (
      id,
      client_id,
      property_id,
      series_name,
      description,
      service_type,
      recurrence_pattern,
      recurrence_interval,
      recurrence_day_of_week,
      recurrence_day_of_month,
      recurrence_month,
      start_date,
      end_date,
      is_active,
      job_template_id,
      default_crew_id,
      estimated_duration_hours,
      notes,
      created_at,
      updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,NOW(),NOW()
    )
    RETURNING *
  `;

  const { rows } = await db.query(insertQuery, [
    id,
    clientId,
    propertyId || null,
    seriesName,
    description || null,
    serviceType || null,
    recurrencePattern,
    recurrenceInterval,
    recurrenceDayOfWeek ?? null,
    recurrenceDayOfMonth ?? null,
    recurrenceMonth ?? null,
    startDate,
    endDate || null,
    true,
    jobTemplateId || null,
    defaultCrewId || null,
    estimatedDurationHours ?? null,
    notes || null
  ]);

  return mapSeriesRow(rows[0]);
};

const updateSeries = async (id, payload) => {
  const fields = [];
  const values = [];
  let index = 1;

  const setField = (column, value) => {
    fields.push(`${column} = $${index++}`);
    values.push(value);
  };

  if (payload.seriesName !== undefined) setField('series_name', payload.seriesName);
  if (payload.description !== undefined) setField('description', payload.description);
  if (payload.serviceType !== undefined) setField('service_type', payload.serviceType);
  if (payload.recurrencePattern !== undefined) setField('recurrence_pattern', payload.recurrencePattern);
  if (payload.recurrenceInterval !== undefined) setField('recurrence_interval', payload.recurrenceInterval);
  if (payload.recurrenceDayOfWeek !== undefined) setField('recurrence_day_of_week', payload.recurrenceDayOfWeek);
  if (payload.recurrenceDayOfMonth !== undefined) setField('recurrence_day_of_month', payload.recurrenceDayOfMonth);
  if (payload.recurrenceMonth !== undefined) setField('recurrence_month', payload.recurrenceMonth);
  if (payload.startDate !== undefined) setField('start_date', payload.startDate);
  if (payload.endDate !== undefined) setField('end_date', payload.endDate);
  if (payload.isActive !== undefined) setField('is_active', payload.isActive);
  if (payload.jobTemplateId !== undefined) setField('job_template_id', payload.jobTemplateId);
  if (payload.defaultCrewId !== undefined) setField('default_crew_id', payload.defaultCrewId);
  if (payload.estimatedDurationHours !== undefined) setField('estimated_duration_hours', payload.estimatedDurationHours);
  if (payload.notes !== undefined) setField('notes', payload.notes);

  if (!fields.length) {
    return getSeriesById(id);
  }

  values.push(id);
  const query = `UPDATE job_series SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${index} RETURNING *`;
  const { rows } = await db.query(query, values);
  if (!rows.length) {
    throw new Error('Recurring series not found');
  }
  return mapSeriesRow(rows[0]);
};

const removeSeries = async (id) => {
  await db.query('DELETE FROM job_series WHERE id = $1', [id]);
};

const listInstances = async (seriesId) => {
  const { rows } = await db.query('SELECT * FROM recurring_job_instances WHERE job_series_id = $1 ORDER BY scheduled_date ASC', [seriesId]);
  return rows.map(mapInstanceRow);
};

const determineNextCursor = (series, fromDate) => {
  const base = new Date(fromDate);
  const pattern = series.recurrencePattern;
  const interval = Number(series.recurrenceInterval || 1);

  if (pattern === 'daily') {
    return addDays(base, interval);
  }

  if (pattern === 'weekly') {
    return addDays(base, 7 * interval);
  }

  if (pattern === 'monthly' || pattern === 'quarterly' || pattern === 'yearly') {
    const monthsToAdd = pattern === 'monthly' ? interval : pattern === 'quarterly' ? interval * 3 : interval * 12;
    const next = new Date(base);
    next.setMonth(next.getMonth() + monthsToAdd);
    const targetDay = series.recurrenceDayOfMonth || base.getDate();
    const daysInTargetMonth = daysInMonth(next);
    next.setDate(Math.min(targetDay, daysInTargetMonth));
    return next;
  }

  return addDays(base, interval);
};

const alignStartDate = (series, startDate) => {
  const pattern = series.recurrencePattern;
  const start = new Date(startDate);

  if (pattern === 'weekly') {
    const desired = series.recurrenceDayOfWeek !== null && series.recurrenceDayOfWeek !== undefined
      ? Number(series.recurrenceDayOfWeek)
      : start.getDay();
    while (start.getDay() !== desired) {
      start.setDate(start.getDate() + 1);
    }
  } else if (pattern === 'monthly' || pattern === 'quarterly' || pattern === 'yearly') {
    const desiredDay = series.recurrenceDayOfMonth || start.getDate();
    const daysInTargetMonth = daysInMonth(start);
    if (start.getDate() > desiredDay) {
      start.setMonth(start.getMonth() + 1);
    }
    start.setDate(Math.min(desiredDay, daysInTargetMonth));
  }

  return start;
};

const generateInstances = async (seriesId, options = {}) => {
  const horizonDays = options.horizonDays || DEFAULT_HORIZON_DAYS;
  const { rows: seriesRows } = await db.query('SELECT * FROM job_series WHERE id = $1', [seriesId]);
  if (!seriesRows.length) {
    throw new Error('Recurring series not found');
  }
  const series = mapSeriesRow(seriesRows[0]);

  const { rows: existingRows } = await db.query('SELECT * FROM recurring_job_instances WHERE job_series_id = $1', [seriesId]);
  const existingDates = existingRows.map(row => row.scheduled_date).sort();
  const existingSet = new Set(existingDates);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastScheduled = existingDates.length ? new Date(existingDates[existingDates.length - 1]) : null;
  const initialDate = lastScheduled ? determineNextCursor(series, lastScheduled) : new Date(series.startDate);
  if (initialDate < today) {
    initialDate.setTime(today.getTime());
  }
  const alignedStart = alignStartDate(series, initialDate);
  const endLimit = options.untilDate ? new Date(options.untilDate) : addDays(alignedStart, horizonDays);
  if (series.endDate) {
    const seriesEnd = new Date(series.endDate);
    if (seriesEnd < endLimit) {
      endLimit.setTime(seriesEnd.getTime());
    }
  }

  const newDates = [];
  let cursor = alignedStart;
  let iterations = 0;
  while (cursor <= endLimit && iterations < MAX_GENERATED_OCCURRENCES) {
    const dateString = cursor.toISOString().split('T')[0];
    if (!existingSet.has(dateString)) {
      newDates.push(dateString);
    }
    cursor = determineNextCursor(series, cursor);
    iterations += 1;
  }

  for (const date of newDates) {
    await db.query(
      'INSERT INTO recurring_job_instances (id, job_series_id, scheduled_date, status) VALUES ($1, $2, $3, $4)',
      [uuidv4(), seriesId, date, 'scheduled']
    );
  }

  return listInstances(seriesId);
};

const convertInstanceToJob = async (seriesId, instanceId) => {
  const { rows: instanceRows } = await db.query('SELECT * FROM recurring_job_instances WHERE id = $1 AND job_series_id = $2', [instanceId, seriesId]);
  if (!instanceRows.length) {
    throw new Error('Recurring visit not found');
  }
  const instance = instanceRows[0];
  if (instance.status !== 'scheduled') {
    throw new Error('Only scheduled visits can be converted into jobs');
  }

  const { rows: seriesRows } = await db.query('SELECT * FROM job_series WHERE id = $1', [seriesId]);
  if (!seriesRows.length) {
    throw new Error('Recurring series not found');
  }
  const series = seriesRows[0];

  const clientResult = await db.query('SELECT first_name, last_name, company_name, billing_address_line1 FROM clients WHERE id = $1', [series.client_id]);
  const clientRow = clientResult.rows[0];
  const customerName = clientRow
    ? (clientRow.company_name || `${clientRow.first_name || ''} ${clientRow.last_name || ''}`.trim() || 'Recurring Client')
    : 'Recurring Client';

  let jobLocation = null;
  if (series.property_id) {
    const propertyResult = await db.query('SELECT address_line1, city, state, zip FROM properties WHERE id = $1', [series.property_id]);
    if (propertyResult.rows.length) {
      const property = propertyResult.rows[0];
      jobLocation = `${property.address_line1}, ${property.city}, ${property.state} ${property.zip}`;
    }
  }
  if (!jobLocation && clientRow?.billing_address_line1) {
    jobLocation = clientRow.billing_address_line1;
  }

  let assignedCrew = [];
  if (series.default_crew_id) {
    const crewMembers = await db.query('SELECT employee_id FROM crew_members WHERE crew_id = $1 AND left_at IS NULL', [series.default_crew_id]);
    assignedCrew = crewMembers.rows.map(row => row.employee_id);
  }

  const jobInsert = `
    INSERT INTO jobs (
      quote_id,
      customer_name,
      status,
      scheduled_date,
      assigned_crew,
      job_location,
      special_instructions,
      estimated_hours,
      created_at,
      updated_at
    ) VALUES (
      NULL,
      $1,
      'Scheduled',
      $2,
      $3,
      $4,
      $5,
      $6,
      NOW(),
      NOW()
    )
    RETURNING *
  `;

  const jobValues = [
    customerName,
    instance.scheduled_date,
    JSON.stringify(assignedCrew),
    jobLocation,
    series.notes || null,
    series.estimated_duration_hours || null
  ];

  const { rows: jobRows } = await db.query(jobInsert, jobValues);
  const job = jobRows[0];

  const { rows: updatedInstanceRows } = await db.query(
    'UPDATE recurring_job_instances SET status = $1, job_id = $2 WHERE id = $3 RETURNING *',
    ['created', job.id, instanceId]
  );

  return {
    job,
    instance: updatedInstanceRows[0]
  };
};

const updateInstanceStatus = async (seriesId, instanceId, status) => {
  const allowed = new Set(['scheduled', 'skipped', 'cancelled']);
  if (!allowed.has(status)) {
    throw new Error('Unsupported recurring status update');
  }
  const { rows } = await db.query(
    'UPDATE recurring_job_instances SET status = $1 WHERE id = $2 AND job_series_id = $3 RETURNING *',
    [status, instanceId, seriesId]
  );
  if (!rows.length) {
    throw new Error('Recurring visit not found');
  }
  return mapInstanceRow(rows[0]);
};

module.exports = {
  listSeries,
  getSeriesById,
  createSeries,
  updateSeries,
  removeSeries,
  listInstances,
  generateInstances,
  convertInstanceToJob,
  updateInstanceStatus
};
