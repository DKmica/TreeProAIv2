const { v4: uuidv4 } = require('uuid');

const deepClone = (value) => JSON.parse(JSON.stringify(value));

const jsonColumns = new Set([
  'line_items',
  'messages',
  'assigned_crew',
  'photos',
  'jha',
  'costs',
  'equipment_needed',
  'maintenance_history',
  'performance_metrics',
  'business_hours',
  'deductions',
  'ai_estimate_data',
  'correction_reasons',
  'property_features',
]);

const parseColumnValue = (column, value) => {
  if (!jsonColumns.has(column) || value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (err) {
      return value;
    }
  }

  return value;
};

const toIsoDate = (date) => {
  if (!date) return date;
  if (date instanceof Date) return date.toISOString();
  return new Date(date).toISOString();
};

function seedData() {
  const now = new Date();
  const todayIso = now.toISOString().split('T')[0];
  const createdAt = now.toISOString();

  const customers = [
    {
      id: uuidv4(),
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '555-1234',
      address: '123 Oak St, Los Angeles, CA',
      lat: 34.0522,
      lon: -118.2437,
      created_at: createdAt,
    },
    {
      id: uuidv4(),
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      phone: '555-5678',
      address: '456 Pine Ave, Pasadena, CA',
      lat: 34.1478,
      lon: -118.1445,
      created_at: createdAt,
    },
    {
      id: uuidv4(),
      name: 'Michael Brown',
      email: 'michael.brown@example.com',
      phone: '555-9012',
      address: '789 Maple Dr, Burbank, CA',
      lat: 34.1808,
      lon: -118.3089,
      created_at: createdAt,
    },
    {
      id: uuidv4(),
      name: 'Sarah Wilson',
      email: 'sarah.wilson@example.com',
      phone: '555-3456',
      address: '321 Birch Ln, Santa Monica, CA',
      lat: 34.0195,
      lon: -118.4912,
      created_at: createdAt,
    },
  ];

  const clients = [
    {
      id: uuidv4(),
      title: 'Mr',
      first_name: 'John',
      last_name: 'Doe',
      primary_email: 'john.doe@example.com',
      primary_phone: '555-1234',
      client_type: 'residential',
      status: 'active',
      lead_source: 'Website',
      payment_terms: 'Net 30',
      credit_limit: 5000,
      tax_exempt: false,
      billing_address_line1: '123 Oak St',
      billing_city: 'Los Angeles',
      billing_state: 'CA',
      billing_zip_code: '90001',
      billing_country: 'USA',
      notes: 'Prefers morning appointments',
      internal_notes: 'High upsell potential',
      referral_source: 'Neighborhood Facebook group',
      lifetime_value: 6200,
      created_at: createdAt,
      updated_at: createdAt,
      created_by: 'system',
      deleted_at: null,
    },
    {
      id: uuidv4(),
      title: 'Ms',
      first_name: 'Jane',
      last_name: 'Smith',
      primary_email: 'jane.smith@example.com',
      primary_phone: '555-5678',
      client_type: 'commercial',
      status: 'active',
      lead_source: 'Referral',
      payment_terms: 'Net 45',
      credit_limit: 15000,
      tax_exempt: false,
      billing_address_line1: '456 Pine Ave',
      billing_city: 'Pasadena',
      billing_state: 'CA',
      billing_zip_code: '91101',
      billing_country: 'USA',
      notes: 'Requires certificate of insurance on file',
      internal_notes: 'Handles AP through centralized office',
      referral_source: 'General Contractor Partner',
      lifetime_value: 18200,
      created_at: createdAt,
      updated_at: createdAt,
      created_by: 'system',
      deleted_at: null,
    },
    {
      id: uuidv4(),
      company_name: 'Sunset Villas HOA',
      primary_email: 'board@sunsetvillas.com',
      primary_phone: '555-9012',
      client_type: 'property_manager',
      status: 'active',
      lead_source: 'Conference',
      payment_terms: 'Net 30',
      credit_limit: 25000,
      tax_exempt: false,
      billing_address_line1: '789 Maple Dr',
      billing_city: 'Burbank',
      billing_state: 'CA',
      billing_zip_code: '91501',
      billing_country: 'USA',
      notes: 'Quarterly walkthroughs scheduled with facilities director',
      internal_notes: 'Prefers consolidated monthly invoicing',
      referral_source: 'Existing client',
      lifetime_value: 25400,
      created_at: createdAt,
      updated_at: createdAt,
      created_by: 'system',
      deleted_at: null,
    },
  ];

  const properties = [
    {
      id: uuidv4(),
      client_id: clients[0].id,
      property_name: 'Doe Residence',
      address_line1: '123 Oak St',
      city: 'Los Angeles',
      state: 'CA',
      zip_code: '90001',
      country: 'USA',
      lat: 34.0522,
      lon: -118.2437,
      property_type: 'residential_single_family',
      lot_size: 0.25,
      is_primary: true,
      property_features: ['Mature maple', 'Driveway access'],
      created_at: createdAt,
      updated_at: createdAt,
    },
    {
      id: uuidv4(),
      client_id: clients[1].id,
      property_name: 'Smith Commercial Complex',
      address_line1: '456 Pine Ave',
      city: 'Pasadena',
      state: 'CA',
      zip: '91101',
      country: 'USA',
      lat: 34.1478,
      lon: -118.1445,
      property_type: 'commercial',
      lot_size: 1.5,
      is_primary: true,
      property_features: ['Parking lot perimeter', 'Loading dock access'],
      created_at: createdAt,
      updated_at: createdAt,
    },
    {
      id: uuidv4(),
      client_id: clients[2].id,
      property_name: 'Sunset Villas - Main Grounds',
      address_line1: '789 Maple Dr',
      city: 'Burbank',
      state: 'CA',
      zip: '91501',
      country: 'USA',
      lat: 34.1808,
      lon: -118.3089,
      property_type: 'multi_family',
      lot_size: 6.2,
      is_primary: true,
      property_features: ['Shared courtyard', 'Irrigation system'],
      created_at: createdAt,
      updated_at: createdAt,
    },
  ];

  const employees = [
    {
      id: uuidv4(),
      name: 'Mike Miller',
      phone: '555-8765',
      address: '789 Maple Dr, Los Angeles, CA',
      lat: 34.055,
      lon: -118.245,
      ssn: 'XXX-XX-1234',
      dob: '1985-05-15',
      job_title: 'Crew Leader',
      pay_rate: 35,
      hire_date: '2020-03-01',
      certifications: 'ISA Certified Arborist, First Aid/CPR',
      performance_metrics: {
        jobsCompleted: 152,
        safetyIncidents: 0,
        customerRating: 4.9,
      },
      created_at: createdAt,
    },
    {
      id: uuidv4(),
      name: 'Carlos Ray',
      phone: '555-4321',
      address: '321 Birch Ln, Los Angeles, CA',
      lat: 34.062,
      lon: -118.29,
      ssn: 'XXX-XX-5678',
      dob: '1992-11-20',
      job_title: 'Groundsman',
      pay_rate: 22,
      hire_date: '2022-06-15',
      certifications: 'Chainsaw Safety',
      performance_metrics: {
        jobsCompleted: 88,
        safetyIncidents: 1,
        customerRating: 4.6,
      },
      created_at: createdAt,
    },
    {
      id: uuidv4(),
      name: 'David Chen',
      phone: '555-9999',
      address: '555 Willow Way, Pasadena, CA',
      lat: 34.15,
      lon: -118.14,
      ssn: 'XXX-XX-9999',
      dob: '1995-01-30',
      job_title: 'Arborist Climber',
      pay_rate: 28,
      hire_date: '2021-08-01',
      certifications: 'ISA Certified Tree Worker, Aerial Rescue',
      performance_metrics: {
        jobsCompleted: 115,
        safetyIncidents: 0,
        customerRating: 4.8,
      },
      created_at: createdAt,
    },
  ];

  const leads = [
    {
      id: uuidv4(),
      customer_id: customers[0].id,
      client_id: clients[0].id,
      source: 'Website',
      status: 'New',
      description: 'Request for trimming a large maple tree.',
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: uuidv4(),
      customer_id: customers[1].id,
      client_id: clients[1].id,
      source: 'Referral',
      status: 'Qualified',
      description: 'Oak tree removal near house.',
      created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: uuidv4(),
      customer_id: customers[2].id,
      client_id: clients[2].id,
      source: 'Emergency Call',
      status: 'Contacted',
      description: 'Storm damage cleanup for multiple trees.',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: uuidv4(),
      customer_id: customers[3].id,
      client_id: clients[0].id,
      source: 'Google Ads',
      status: 'New',
      description: 'Palm tree maintenance and fertilization.',
      created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const quotes = [
    {
      id: uuidv4(),
      lead_id: leads[0].id,
      customer_name: customers[0].name,
      status: 'Accepted',
      line_items: [
        { description: 'Trim and shape maple tree canopy', price: 950, selected: true },
        { description: 'Remove dead branches and cleanup', price: 250, selected: true },
      ],
      stump_grinding_price: 0,
      signature: null,
      accepted_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      messages: [],
      job_location: customers[0].address,
      special_instructions: 'Use plywood to protect driveway.',
      valid_until: todayIso,
      deposit_amount: 200,
      payment_terms: 'Net 30',
      created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: uuidv4(),
      lead_id: leads[1].id,
      customer_name: customers[1].name,
      status: 'Sent',
      line_items: [
        { description: 'Remove 40ft oak tree', price: 1400, selected: true },
        { description: 'Stump grinding', price: 300, selected: true },
      ],
      stump_grinding_price: 300,
      signature: null,
      accepted_at: null,
      messages: [
        {
          sender: 'customer',
          text: 'Can we schedule this for next Friday?',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
      job_location: customers[1].address,
      special_instructions: 'Check for underground sprinklers.',
      valid_until: todayIso,
      deposit_amount: 250,
      payment_terms: 'Net 30',
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: uuidv4(),
      lead_id: leads[2].id,
      customer_name: customers[2].name,
      status: 'Accepted',
      line_items: [
        { description: 'Emergency branch removal', price: 2100, selected: true },
        { description: 'Debris hauling', price: 450, selected: true },
      ],
      stump_grinding_price: 0,
      signature: null,
      accepted_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      messages: [
        {
          sender: 'customer',
          text: 'Please prioritize the limb over the garage.',
          timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        },
      ],
      job_location: customers[2].address,
      special_instructions: 'Access via side gate.',
      valid_until: todayIso,
      deposit_amount: 500,
      payment_terms: 'Due on receipt',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const jobs = [
    {
      id: uuidv4(),
      quote_id: quotes[0].id,
      customer_name: customers[0].name,
      status: 'Completed',
      scheduled_date: todayIso,
      assigned_crew: [employees[0].id, employees[1].id],
      stump_grinding_price: 0,
      work_started_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      work_ended_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      photos: [],
      clock_in_lat: 34.0524,
      clock_in_lon: -118.244,
      clock_out_lat: 34.0525,
      clock_out_lon: -118.243,
      jha: { hazards: ['Power lines'], mitigations: ['Use insulated tools'] },
      costs: { labor: 560, equipment: 120, materials: 45, disposal: 60, total: 785 },
      messages: [
        {
          sender: 'customer',
          text: 'Thanks for the great work! The tree looks fantastic.',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        },
      ],
      job_location: customers[0].address,
      special_instructions: 'Blow all debris off driveway.',
      equipment_needed: ['Chipper', 'Climbing gear'],
      estimated_hours: 6,
      created_at: createdAt,
    },
    {
      id: uuidv4(),
      quote_id: quotes[1].id,
      customer_name: customers[1].name,
      status: 'Scheduled',
      scheduled_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      assigned_crew: [employees[0].id, employees[2].id],
      stump_grinding_price: 300,
      work_started_at: null,
      work_ended_at: null,
      photos: [],
      clock_in_lat: null,
      clock_in_lon: null,
      clock_out_lat: null,
      clock_out_lon: null,
      jha: null,
      costs: null,
      messages: [],
      job_location: customers[1].address,
      special_instructions: 'Coordinate with neighbor for driveway access.',
      equipment_needed: ['Stump grinder', 'Bucket truck'],
      estimated_hours: 8,
      created_at: createdAt,
    },
    {
      id: uuidv4(),
      quote_id: quotes[2].id,
      customer_name: customers[2].name,
      status: 'In Progress',
      scheduled_date: todayIso,
      assigned_crew: [employees[1].id, employees[2].id],
      stump_grinding_price: 0,
      work_started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      work_ended_at: null,
      photos: [],
      clock_in_lat: 34.181,
      clock_in_lon: -118.3092,
      clock_out_lat: null,
      clock_out_lon: null,
      jha: { hazards: ['Steep slope'], mitigations: ['Use harness tie-offs'] },
      costs: { labor: 300, equipment: 90, materials: 30, disposal: 50, total: 470 },
      messages: [],
      job_location: customers[2].address,
      special_instructions: 'Secure loose shingles near garage.',
      equipment_needed: ['Chipper'],
      estimated_hours: 7,
      created_at: createdAt,
    },
  ];

  const crews = [
    {
      id: uuidv4(),
      name: 'Climbers Alpha',
      description: 'Lead climbers and rigging specialists',
      is_active: true,
      default_start_time: '08:00',
      default_end_time: '17:00',
      capacity: 10,
      created_at: createdAt,
      updated_at: createdAt,
      deleted_at: null,
    },
    {
      id: uuidv4(),
      name: 'Ground Crew Bravo',
      description: 'Support crew for chipping and hauling',
      is_active: true,
      default_start_time: '07:30',
      default_end_time: '16:30',
      capacity: 8,
      created_at: createdAt,
      updated_at: createdAt,
      deleted_at: null,
    },
  ];

  const crew_members = [
    {
      id: uuidv4(),
      crew_id: crews[0].id,
      employee_id: employees[0].id,
      role: 'Crew Lead',
      joined_at: new Date('2023-01-15T08:00:00Z').toISOString(),
      left_at: null,
      created_at: createdAt,
    },
    {
      id: uuidv4(),
      crew_id: crews[0].id,
      employee_id: employees[2].id,
      role: 'Climber',
      joined_at: new Date('2023-05-01T08:00:00Z').toISOString(),
      left_at: null,
      created_at: createdAt,
    },
    {
      id: uuidv4(),
      crew_id: crews[1].id,
      employee_id: employees[1].id,
      role: 'Ground Tech',
      joined_at: new Date('2024-02-10T08:00:00Z').toISOString(),
      left_at: null,
      created_at: createdAt,
    },
  ];

  const crew_assignments = [
    {
      id: uuidv4(),
      job_id: jobs[0].id,
      crew_id: crews[0].id,
      assigned_date: jobs[0].scheduled_date,
      assigned_by: 'dispatcher@treepro.ai',
      notes: 'Completed ahead of schedule',
      created_at: createdAt,
    },
    {
      id: uuidv4(),
      job_id: jobs[1].id,
      crew_id: crews[0].id,
      assigned_date: jobs[1].scheduled_date,
      assigned_by: 'dispatcher@treepro.ai',
      notes: 'Requires bucket truck on site',
      created_at: createdAt,
    },
    {
      id: uuidv4(),
      job_id: jobs[2].id,
      crew_id: crews[1].id,
      assigned_date: jobs[2].scheduled_date,
      assigned_by: 'dispatcher@treepro.ai',
      notes: 'Monitor slope stability',
      created_at: createdAt,
    },
  ];

  const job_series = [
    {
      id: uuidv4(),
      client_id: clients[0].id,
      property_id: properties[0].id,
      series_name: 'Monthly Maple Maintenance',
      description: 'Routine canopy inspections and shaping',
      service_type: 'Maintenance',
      recurrence_pattern: 'monthly',
      recurrence_interval: 1,
      recurrence_day_of_week: null,
      recurrence_day_of_month: 15,
      recurrence_month: null,
      start_date: todayIso,
      end_date: null,
      is_active: true,
      job_template_id: null,
      default_crew_id: crews[0].id,
      estimated_duration_hours: 4,
      notes: 'Focus on front yard specimen tree',
      created_at: createdAt,
      updated_at: createdAt,
    },
    {
      id: uuidv4(),
      client_id: clients[2].id,
      property_id: properties[2].id,
      series_name: 'Weekly HOA Grounds Walkthrough',
      description: 'Inspect common areas and clear hazards',
      service_type: 'Inspection',
      recurrence_pattern: 'weekly',
      recurrence_interval: 1,
      recurrence_day_of_week: 1,
      recurrence_day_of_month: null,
      recurrence_month: null,
      start_date: todayIso,
      end_date: null,
      is_active: true,
      job_template_id: null,
      default_crew_id: crews[1].id,
      estimated_duration_hours: 3,
      notes: 'Report findings to HOA manager',
      created_at: createdAt,
      updated_at: createdAt,
    },
  ];

  const recurring_job_instances = [
    {
      id: uuidv4(),
      job_series_id: job_series[0].id,
      job_id: null,
      scheduled_date: todayIso,
      status: 'scheduled',
      created_at: createdAt,
    },
    {
      id: uuidv4(),
      job_series_id: job_series[0].id,
      job_id: null,
      scheduled_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'scheduled',
      created_at: createdAt,
    },
    {
      id: uuidv4(),
      job_series_id: job_series[1].id,
      job_id: jobs[2].id,
      scheduled_date: jobs[2].scheduled_date,
      status: 'created',
      created_at: createdAt,
    },
    {
      id: uuidv4(),
      job_series_id: job_series[1].id,
      job_id: null,
      scheduled_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'scheduled',
      created_at: createdAt,
    },
  ];

  const invoices = [
    {
      id: uuidv4(),
      job_id: jobs[0].id,
      customer_name: customers[0].name,
      status: 'Paid',
      amount: 1200,
      line_items: quotes[0].line_items,
      due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      paid_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: createdAt,
    },
    {
      id: uuidv4(),
      job_id: jobs[1].id,
      customer_name: customers[1].name,
      status: 'Sent',
      amount: 1700,
      line_items: quotes[1].line_items,
      due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      paid_at: null,
      created_at: createdAt,
    },
  ];

  const equipment = [
    {
      id: uuidv4(),
      name: 'Stump Grinder',
      make: 'Vermeer',
      model: 'SC30TX',
      purchase_date: '2021-02-10',
      last_service_date: '2023-11-15',
      status: 'Operational',
      assigned_to: employees[0].name,
      maintenance_history: [
        { id: uuidv4(), date: '2023-11-15', description: 'Replaced grinder teeth and changed oil.', cost: 450 },
        { id: uuidv4(), date: '2023-05-01', description: 'Hydraulic system inspection.', cost: 180 },
      ],
      created_at: createdAt,
    },
    {
      id: uuidv4(),
      name: 'Wood Chipper',
      make: 'Bandit',
      model: '15XP',
      purchase_date: '2020-08-22',
      last_service_date: '2023-10-05',
      status: 'Needs Maintenance',
      assigned_to: 'Crew 2',
      maintenance_history: [
        { id: uuidv4(), date: '2023-06-12', description: 'Sharpened blades and replaced belts.', cost: 320 },
      ],
      created_at: createdAt,
    },
    {
      id: uuidv4(),
      name: 'Bucket Truck',
      make: 'Altec',
      model: 'LRV-55',
      purchase_date: '2019-04-18',
      last_service_date: '2023-09-30',
      status: 'Operational',
      assigned_to: employees[0].name,
      maintenance_history: [
        { id: uuidv4(), date: '2023-09-30', description: 'Annual DOT inspection and hydraulic check.', cost: 750 },
      ],
      created_at: createdAt,
    },
  ];

  const payPeriodClosedId = uuidv4();
  const payPeriodOpenId = uuidv4();

  const pay_periods = [
    {
      id: payPeriodClosedId,
      start_date: '2025-01-01',
      end_date: '2025-01-15',
      period_type: 'bi-weekly',
      status: 'Closed',
      processed_at: new Date('2025-01-16T18:30:00Z').toISOString(),
      created_at: new Date('2024-12-15T12:00:00Z').toISOString(),
    },
    {
      id: payPeriodOpenId,
      start_date: '2025-02-01',
      end_date: '2025-02-14',
      period_type: 'bi-weekly',
      status: 'Open',
      processed_at: null,
      created_at: createdAt,
    },
  ];

  const time_entries = [
    {
      id: uuidv4(),
      employee_id: employees[0].id,
      job_id: jobs[0].id,
      date: '2025-02-03',
      hours_worked: 8,
      hourly_rate: employees[0].pay_rate,
      overtime_hours: 1,
      notes: 'Extra cleanup requested by customer.',
      created_at: createdAt,
    },
    {
      id: uuidv4(),
      employee_id: employees[1].id,
      job_id: jobs[2].id,
      date: '2025-02-04',
      hours_worked: 7.5,
      hourly_rate: employees[1].pay_rate,
      overtime_hours: 0,
      notes: 'Emergency response.',
      created_at: createdAt,
    },
  ];

  const payroll_records = [
    {
      id: uuidv4(),
      employee_id: employees[0].id,
      pay_period_id: payPeriodClosedId,
      regular_hours: 70,
      overtime_hours: 4,
      hourly_rate: employees[0].pay_rate,
      regular_pay: 2450,
      overtime_pay: 210,
      bonuses: 150,
      deductions: [
        { type: 'Federal Tax', amount: 435, percentage: 15 },
        { type: 'State Tax', amount: 145, percentage: 5 },
      ],
      total_deductions: 580,
      gross_pay: 2810,
      net_pay: 2230,
      payment_method: 'Direct Deposit',
      paid_at: new Date('2025-01-16T19:00:00Z').toISOString(),
      created_at: createdAt,
    },
  ];

  const company_profile = [
    {
      id: uuidv4(),
      company_name: 'TreePro AI Arborists',
      legal_name: 'TreePro AI LLC',
      phone_number: '555-0000',
      email: 'office@treepro.ai',
      address: '100 Arbor Way',
      city: 'Los Angeles',
      state: 'CA',
      zip_code: '90012',
      website: 'https://treepro.ai',
      logo_url: '',
      business_hours: {
        monday: '8am - 5pm',
        tuesday: '8am - 5pm',
        wednesday: '8am - 5pm',
        thursday: '8am - 5pm',
        friday: '8am - 5pm',
        saturday: 'Emergency Only',
        sunday: 'Closed',
      },
      license_number: 'ARB-102938',
      insurance_policy_number: 'POL-458293',
      tax_ein: '12-3456789',
      about: 'Full-service tree care specialists serving Southern California with AI-assisted workflows.',
      services: 'Tree removal, pruning, stump grinding, emergency response, plant health care',
      created_at: createdAt,
      updated_at: createdAt,
    },
  ];

  const estimate_feedback = [
    {
      id: uuidv4(),
      quote_id: quotes[0].id,
      ai_estimate_data: { diameterInches: 18, treeType: 'Maple' },
      ai_suggested_price_min: 900,
      ai_suggested_price_max: 1200,
      actual_price_quoted: 1150,
      feedback_rating: 'accurate',
      correction_reasons: ['Included additional cleanup'],
      user_notes: 'Pricing matched the scope exactly.',
      tree_species: 'Maple',
      tree_height: '45',
      trunk_diameter: '18',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: uuidv4(),
      quote_id: quotes[2].id,
      ai_estimate_data: { diameterInches: 28, treeType: 'Pine' },
      ai_suggested_price_min: 1500,
      ai_suggested_price_max: 1900,
      actual_price_quoted: 2100,
      feedback_rating: 'too_low',
      correction_reasons: ['Emergency mobilization needed', 'Additional debris removal'],
      user_notes: 'AI estimate did not account for emergency conditions.',
      tree_species: 'Pine',
      tree_height: '60',
      trunk_diameter: '22',
      created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    },
  ];

  return {
    customers,
    clients,
    properties,
    leads,
    quotes,
    jobs,
    crews,
    crew_members,
    crew_assignments,
    job_series,
    recurring_job_instances,
    invoices,
    employees,
    equipment,
    pay_periods,
    time_entries,
    payroll_records,
    company_profile,
    estimate_feedback,
  };
}

class InMemoryDatabase {
  constructor() {
    this.tables = seedData();
  }

  getTable(name) {
    const table = this.tables[name];
    if (!table) {
      throw new Error(`Unknown table: ${name}`);
    }
    return table;
  }

  selectAll(name) {
    return this.getTable(name).map((row) => deepClone(row));
  }

  selectById(name, id) {
    const row = this.getTable(name).find((entry) => entry.id === id);
    return row ? deepClone(row) : null;
  }

  insert(name, row) {
    const table = this.getTable(name);
    table.push(row);
    return deepClone(row);
  }

  update(name, id, updates) {
    const table = this.getTable(name);
    const index = table.findIndex((entry) => entry.id === id);
    if (index === -1) {
      return null;
    }
    table[index] = { ...table[index], ...updates };
    return deepClone(table[index]);
  }

  delete(name, id) {
    const table = this.getTable(name);
    const index = table.findIndex((entry) => entry.id === id);
    if (index === -1) {
      return 0;
    }
    table.splice(index, 1);
    return 1;
  }

  async query(text, params = []) {
    const normalized = text.replace(/\s+/g, ' ').trim();
    const lower = normalized.toLowerCase();
    let match;

    // Leads with customer join
    if (lower.startsWith('select l.*') && lower.includes('from leads l left join customers c on l.customer_id = c.id')) {
      const rows = this.getTable('leads').map((lead) => {
        const customer = this.getTable('customers').find((c) => c.id === lead.customer_id) || {};
        return {
          ...deepClone(lead),
          customer_id: customer.id || null,
          customer_name: customer.name || null,
          customer_email: customer.email || null,
          customer_phone: customer.phone || null,
          customer_address: customer.address || null,
        };
      });
      return { rows, rowCount: rows.length };
    }

    // Time entries within range
    if (lower.startsWith('select * from time_entries where date >= $1 and date <= $2')) {
      const [startDate, endDate] = params;
      const rows = this.getTable('time_entries').filter((entry) => entry.date >= startDate && entry.date <= endDate).map(deepClone);
      return { rows, rowCount: rows.length };
    }

    // Employees by id
    if (lower.startsWith('select * from employees where id = $1')) {
      const [id] = params;
      const row = this.selectById('employees', id);
      return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
    }

    // Customers lookup by email or phone
    if (lower.startsWith('select * from customers where email = $1 or phone = $2 limit 1')) {
      const [email, phone] = params;
      const table = this.getTable('customers');
      const match = table.find((customer) => customer.email === email || customer.phone === phone);
      const row = match ? deepClone(match) : null;
      return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
    }

    if (lower === 'select lead_id, job_location from quotes where id = $1') {
      const [id] = params;
      const row = this.selectById('quotes', id);
      if (!row) {
        return { rows: [], rowCount: 0 };
      }
      const result = {
        lead_id: row.lead_id || null,
        job_location: row.job_location || null,
      };
      return { rows: [result], rowCount: 1 };
    }

    if (lower === 'select customer_id from leads where id = $1') {
      const [id] = params;
      const row = this.selectById('leads', id);
      if (!row) {
        return { rows: [], rowCount: 0 };
      }
      return { rows: [{ customer_id: row.customer_id || null }], rowCount: 1 };
    }

    if (lower === 'select lat, lon, address from customers where id = $1') {
      const [id] = params;
      const row = this.selectById('customers', id);
      if (!row) {
        return { rows: [], rowCount: 0 };
      }
      return {
        rows: [
          {
            lat: row.lat || null,
            lon: row.lon || null,
            address: row.address || null,
          },
        ],
        rowCount: 1,
      };
    }

    if (lower === 'select lat, lon, address from customers where lower(name) = lower($1) limit 1') {
      const [name] = params;
      const table = this.getTable('customers');
      const match = table.find((customer) => customer.name && customer.name.toLowerCase() === String(name || '').toLowerCase());
      if (!match) {
        return { rows: [], rowCount: 0 };
      }
      return {
        rows: [
          {
            lat: match.lat || null,
            lon: match.lon || null,
            address: match.address || null,
          },
        ],
        rowCount: 1,
      };
    }

    if (lower === 'select name from crews where id = $1') {
      const [id] = params;
      const row = this.selectById('crews', id);
      return { rows: row ? [{ name: row.name }] : [], rowCount: row ? 1 : 0 };
    }

    if (lower === 'select * from recurring_job_instances where job_series_id = $1 order by scheduled_date asc') {
      const [seriesId] = params;
      const rows = this
        .selectAll('recurring_job_instances')
        .filter((row) => row.job_series_id === seriesId)
        .sort((a, b) => (a.scheduled_date || '').localeCompare(b.scheduled_date || ''));
      return { rows, rowCount: rows.length };
    }

    if (lower === 'select * from recurring_job_instances where job_series_id = $1') {
      const [seriesId] = params;
      const rows = this.selectAll('recurring_job_instances').filter((row) => row.job_series_id === seriesId);
      return { rows, rowCount: rows.length };
    }

    if (lower === 'select * from recurring_job_instances where id = $1 and job_series_id = $2') {
      const [id, seriesId] = params;
      const rows = this
        .selectAll('recurring_job_instances')
        .filter((row) => row.id === id && row.job_series_id === seriesId);
      return { rows, rowCount: rows.length };
    }

    if (lower === 'select first_name, last_name, company_name, billing_address_line1 from clients where id = $1') {
      const [id] = params;
      const row = this.selectById('clients', id);
      if (!row) {
        return { rows: [], rowCount: 0 };
      }
      return {
        rows: [
          {
            first_name: row.first_name || null,
            last_name: row.last_name || null,
            company_name: row.company_name || null,
            billing_address_line1: row.billing_address_line1 || null,
          },
        ],
        rowCount: 1,
      };
    }

    if (lower === 'select address_line1, city, state, zip_code from properties where id = $1') {
      const [id] = params;
      const row = this.selectById('properties', id);
      if (!row) {
        return { rows: [], rowCount: 0 };
      }
      return {
        rows: [
          {
            address_line1: row.address_line1 || null,
            city: row.city || null,
            state: row.state || null,
            zip_code: row.zip_code || null,
          },
        ],
        rowCount: 1,
      };
    }

    if (lower === 'select employee_id from crew_members where crew_id = $1 and left_at is null') {
      const [crewId] = params;
      const rows = this
        .selectAll('crew_members')
        .filter((row) => row.crew_id === crewId && (row.left_at === null || row.left_at === undefined));
      return {
        rows: rows.map((row) => ({ employee_id: row.employee_id })),
        rowCount: rows.length,
      };
    }

    // Company profile singleton
    if (lower.startsWith('select * from company_profile limit 1')) {
      const rows = this.selectAll('company_profile').slice(0, 1);
      return { rows, rowCount: rows.length };
    }

    if (lower.startsWith('select * from estimate_feedback order by created_at desc')) {
      const rows = this.selectAll('estimate_feedback').sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      return { rows, rowCount: rows.length };
    }

    // SELECT * FROM table WHERE column = 'literal'
    match = normalized.match(/^SELECT \* FROM (\w+) WHERE (\w+) = '([^']+)'$/i);
    if (match) {
      const tableName = match[1];
      const column = match[2];
      const value = match[3];
      const rows = this
        .selectAll(tableName)
        .filter((row) => {
          const current = row[column];
          if (current === undefined || current === null) {
            return false;
          }
          return current.toString().toLowerCase() === value.toLowerCase();
        });
      return { rows, rowCount: rows.length };
    }

    // General SELECT * FROM table WHERE id = $n
    match = lower.match(/^select \* from (\w+) where id = \$(\d+)$/);
    if (match) {
      const tableName = match[1];
      const paramIndex = parseInt(match[2], 10) - 1;
      const id = params[paramIndex];
      const row = this.selectById(tableName, id);
      return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
    }

    // SELECT * FROM table
    match = lower.match(/^select \* from (\w+)$/);
    if (match) {
      const tableName = match[1];
      const rows = this.selectAll(tableName);
      return { rows, rowCount: rows.length };
    }

    // SELECT * FROM table ORDER BY column DESC
    match = lower.match(/^select \* from (\w+) order by (\w+) desc$/);
    if (match) {
      const tableName = match[1];
      const column = match[2];
      const rows = this.selectAll(tableName).sort((a, b) => {
        const aVal = a[column] || '';
        const bVal = b[column] || '';
        return (bVal || '').toString().localeCompare((aVal || '').toString());
      });
      return { rows, rowCount: rows.length };
    }

    // INSERT INTO ... RETURNING *
    match = normalized.match(/^INSERT INTO (\w+) \(([^)]+)\) VALUES \(([^)]+)\)(?: RETURNING \*)?$/i);
    if (match) {
      const tableName = match[1];
      const columns = match[2].split(',').map((col) => col.trim());
      const row = {};
      columns.forEach((column, index) => {
        row[column] = parseColumnValue(column, params[index]);
      });
      if (!row.id) {
        row.id = uuidv4();
      }
      if ('created_at' in row && !row.created_at) {
        row.created_at = toIsoDate(new Date());
      }
      const inserted = this.insert(tableName, row);
      return { rows: [inserted], rowCount: 1 };
    }

    // UPDATE table SET ... WHERE id = $n RETURNING *
    match = normalized.match(/^UPDATE recurring_job_instances SET status = \$(\d+) WHERE id = \$(\d+) AND job_series_id = \$(\d+) RETURNING \*$/i);
    if (match) {
      const statusIndex = parseInt(match[1], 10) - 1;
      const idIndex = parseInt(match[2], 10) - 1;
      const seriesIndex = parseInt(match[3], 10) - 1;
      const status = params[statusIndex];
      const id = params[idIndex];
      const seriesId = params[seriesIndex];
      const table = this.getTable('recurring_job_instances');
      const row = table.find((entry) => entry.id === id && entry.job_series_id === seriesId);
      if (!row) {
        return { rows: [], rowCount: 0 };
      }
      row.status = status;
      return { rows: [deepClone(row)], rowCount: 1 };
    }

    match = normalized.match(/^UPDATE (\w+) SET (.+) WHERE id = \$(\d+) RETURNING \*$/i);
    if (match) {
      const tableName = match[1];
      const setClause = match[2];
      const idParamIndex = parseInt(match[3], 10) - 1;
      const id = params[idParamIndex];
      const assignments = setClause.split(',').map((part) => part.trim());
      const updates = {};

      assignments.forEach((assignment) => {
        const [column, value] = assignment.split('=').map((str) => str.trim());
        const valueLower = value.toLowerCase();
        if (valueLower === 'now()') {
          updates[column] = new Date().toISOString();
        } else if (valueLower.startsWith('$')) {
          const index = parseInt(valueLower.slice(1), 10) - 1;
          updates[column] = parseColumnValue(column, params[index]);
        } else if (valueLower === 'null') {
          updates[column] = null;
        } else {
          updates[column] = value.replace(/^'(.*)'$/, '$1');
        }
      });

      const updated = this.update(tableName, id, updates);
      return { rows: updated ? [updated] : [], rowCount: updated ? 1 : 0 };
    }

    // DELETE FROM table WHERE id = $n
    match = normalized.match(/^DELETE FROM (\w+) WHERE id = \$(\d+)$/i);
    if (match) {
      const tableName = match[1];
      const paramIndex = parseInt(match[2], 10) - 1;
      const id = params[paramIndex];
      const rowCount = this.delete(tableName, id);
      return { rows: [], rowCount };
    }

    throw new Error(`Query not supported by in-memory database: ${text}`);
  }
}

function createInMemoryDatabase() {
  return new InMemoryDatabase();
}

module.exports = { createInMemoryDatabase };
