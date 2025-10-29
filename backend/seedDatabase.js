const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Realistic data generators
const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Barbara', 'David', 'Elizabeth', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley', 'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle', 'Kenneth', 'Dorothy', 'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Melissa', 'Edward', 'Deborah'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'];

const cities = [
  { name: 'Los Angeles', state: 'CA', lat: 34.0522, lon: -118.2437 },
  { name: 'Phoenix', state: 'AZ', lat: 33.4484, lon: -112.0740 },
  { name: 'San Diego', state: 'CA', lat: 32.7157, lon: -117.1611 },
  { name: 'Dallas', state: 'TX', lat: 32.7767, lon: -96.7970 },
  { name: 'Austin', state: 'TX', lat: 30.2672, lon: -97.7431 },
  { name: 'Houston', state: 'TX', lat: 29.7604, lon: -95.3698 },
  { name: 'Miami', state: 'FL', lat: 25.7617, lon: -80.1918 },
  { name: 'Atlanta', state: 'GA', lat: 33.7490, lon: -84.3880 },
  { name: 'Orlando', state: 'FL', lat: 28.5383, lon: -81.3792 },
  { name: 'Denver', state: 'CO', lat: 39.7392, lon: -104.9903 }
];

const streetNames = ['Oak', 'Maple', 'Pine', 'Cedar', 'Elm', 'Birch', 'Willow', 'Cypress', 'Magnolia', 'Redwood', 'Spruce', 'Sycamore', 'Walnut', 'Cherry', 'Ash'];
const streetTypes = ['St', 'Ave', 'Rd', 'Ln', 'Dr', 'Ct', 'Way', 'Blvd'];

const leadSources = ['Website', 'Referral', 'Google Ads', 'Facebook', 'Yelp', 'Phone Call', 'Walk-in', 'Repeat Customer'];
const leadStatuses = ['New', 'Contacted', 'Qualified', 'Lost'];
const quoteStatuses = ['Draft', 'Sent', 'Accepted', 'Rejected'];
const jobStatuses = ['Scheduled', 'In Progress', 'Completed'];

const treeServices = [
  { desc: 'Large oak tree removal', priceRange: [1500, 3500] },
  { desc: 'Maple tree trimming and pruning', priceRange: [400, 900] },
  { desc: 'Pine tree removal near house', priceRange: [1200, 2800] },
  { desc: 'Emergency storm damage cleanup', priceRange: [800, 2500] },
  { desc: 'Palm tree trimming', priceRange: [200, 600] },
  { desc: 'Stump grinding and removal', priceRange: [150, 500] },
  { desc: 'Tree health assessment', priceRange: [100, 300] },
  { desc: 'Hedge trimming and shaping', priceRange: [250, 700] },
  { desc: 'Dead tree removal', priceRange: [600, 1800] },
  { desc: 'Mulch tree branches', priceRange: [300, 800] },
  { desc: 'Crown reduction on large elm', priceRange: [800, 1600] },
  { desc: 'Tree cabling and bracing', priceRange: [400, 1200] },
];

const employeePositions = [
  { title: 'Crew Leader', payRate: 35 },
  { title: 'Arborist Climber', payRate: 30 },
  { title: 'Arborist Climber', payRate: 28 },
  { title: 'Equipment Operator', payRate: 26 },
  { title: 'Groundsman', payRate: 22 },
  { title: 'Groundsman', payRate: 20 },
];

const certifications = [
  'ISA Certified Arborist',
  'ISA Certified Tree Worker',
  'TCIA CTSP Certification',
  'Chainsaw Safety Certified',
  'First Aid/CPR',
  'Aerial Rescue Certified',
  'CDL Class B License'
];

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement(arr) {
  return arr[random(0, arr.length - 1)];
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateName() {
  return `${randomElement(firstNames)} ${randomElement(lastNames)}`;
}

function generatePhone() {
  return `(${random(200, 999)}) ${random(200, 999)}-${random(1000, 9999)}`;
}

function generateEmail(name) {
  const domain = randomElement(['gmail.com', 'yahoo.com', 'outlook.com', 'icloud.com', 'hotmail.com']);
  const cleaned = name.toLowerCase().replace(/\s+/g, '.');
  return `${cleaned}@${domain}`;
}

function generateAddress() {
  const city = randomElement(cities);
  const streetNum = random(100, 9999);
  const streetName = randomElement(streetNames);
  const streetType = randomElement(streetTypes);
  const address = `${streetNum} ${streetName} ${streetType}, ${city.name}, ${city.state}`;
  
  // Add slight randomness to lat/lon
  const lat = city.lat + (Math.random() - 0.5) * 0.2;
  const lon = city.lon + (Math.random() - 0.5) * 0.2;
  
  return { address, lat, lon };
}

async function clearDatabase() {
  console.log('🗑️  Clearing existing data...');
  
  const tables = [
    'payroll_records',
    'time_entries',
    'pay_periods',
    'invoices',
    'jobs',
    'quotes',
    'leads',
    'customers',
    'employees',
    'equipment'
  ];
  
  for (const table of tables) {
    await pool.query(`DELETE FROM ${table}`);
  }
  
  console.log('✅ Database cleared');
}

async function seedCustomers() {
  console.log('👥 Seeding 300 customers...');
  const customers = [];
  
  for (let i = 0; i < 300; i++) {
    const name = generateName();
    const email = generateEmail(name);
    const phone = generatePhone();
    const { address, lat, lon } = generateAddress();
    const id = uuidv4();
    
    await pool.query(
      `INSERT INTO customers (id, name, email, phone, address, lat, lon, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, name, email, phone, address, lat, lon, randomDate(new Date('2023-01-01'), new Date())]
    );
    
    customers.push({ id, name, email, phone, address });
  }
  
  console.log(`✅ Created ${customers.length} customers`);
  return customers;
}

async function seedEmployees() {
  console.log('👷 Seeding 30 employees in 5 crews...');
  const employees = [];
  
  // Create 5 crews with 6 employees each
  for (let crew = 1; crew <= 5; crew++) {
    for (let position = 0; position < 6; position++) {
      const name = generateName();
      const phone = generatePhone();
      const { address, lat, lon } = generateAddress();
      const id = uuidv4();
      const jobInfo = employeePositions[position];
      
      const empCertifications = [];
      const numCerts = random(2, 4);
      for (let i = 0; i < numCerts; i++) {
        const cert = randomElement(certifications);
        if (!empCertifications.includes(cert)) {
          empCertifications.push(cert);
        }
      }
      
      const performanceMetrics = {
        jobsCompleted: random(20, 200),
        safetyIncidents: Math.random() > 0.8 ? random(1, 3) : 0,
        customerRating: (4.0 + Math.random()).toFixed(1),
      };
      
      await pool.query(
        `INSERT INTO employees (id, name, phone, address, lat, lon, ssn, dob, job_title, pay_rate, hire_date, certifications, performance_metrics) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          id,
          name,
          phone,
          address,
          lat,
          lon,
          `XXX-XX-${random(1000, 9999)}`,
          `${random(1970, 2000)}-${String(random(1, 12)).padStart(2, '0')}-${String(random(1, 28)).padStart(2, '0')}`,
          jobInfo.title,
          jobInfo.payRate,
          `${random(2018, 2023)}-${String(random(1, 12)).padStart(2, '0')}-01`,
          empCertifications.join(', '),
          JSON.stringify(performanceMetrics)
        ]
      );
      
      employees.push({ id, name, crew, position: jobInfo.title });
    }
  }
  
  console.log(`✅ Created ${employees.length} employees in 5 crews`);
  return employees;
}

async function seedEquipment(employees) {
  console.log('🚛 Seeding equipment (6 items per crew x 5 crews = 30 pieces)...');
  
  const equipmentTypes = [
    { name: 'Chip Truck', make: 'Ford', models: ['F-550', 'F-650', 'F-750'] },
    { name: 'Wood Chipper', make: 'Bandit', models: ['15XP', '18XP', '21XP'] },
    { name: 'Wood Truck', make: 'International', models: ['DuraStar', 'WorkStar'] },
    { name: 'Equipment Trailer', make: 'PJ Trailers', models: ['20ft Flatbed', '24ft Gooseneck'] },
    { name: 'Mini Skid Steer', make: 'Toro', models: ['TX 427', 'TX 525'] },
    { name: 'Bucket Truck', make: 'Altec', models: ['AT37G', 'AT40G', 'LRV56'] }
  ];
  
  const equipment = [];
  
  for (let crew = 1; crew <= 5; crew++) {
    // Get crew leader for assignment
    const crewLeader = employees.find(e => e.crew === crew && e.position === 'Crew Leader');
    
    for (const equipType of equipmentTypes) {
      const id = uuidv4();
      const model = randomElement(equipType.models);
      const purchaseDate = randomDate(new Date('2018-01-01'), new Date('2023-01-01'));
      const lastService = randomDate(purchaseDate, new Date());
      
      const maintenanceHistory = [];
      const numServices = random(2, 8);
      for (let i = 0; i < numServices; i++) {
        maintenanceHistory.push({
          id: uuidv4(),
          date: randomDate(purchaseDate, new Date()).toISOString().split('T')[0],
          description: randomElement([
            'Oil change and filter replacement',
            'Annual inspection',
            'Brake service',
            'Tire replacement',
            'Hydraulic system service',
            'Engine tune-up',
            'Transmission service'
          ]),
          cost: random(100, 800)
        });
      }
      
      await pool.query(
        `INSERT INTO equipment (id, name, make, model, purchase_date, last_service_date, status, assigned_to, maintenance_history) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          id,
          `${equipType.name} - Crew ${crew}`,
          equipType.make,
          model,
          purchaseDate.toISOString().split('T')[0],
          lastService.toISOString().split('T')[0],
          Math.random() > 0.9 ? 'Needs Maintenance' : 'Operational',
          `Crew ${crew}`,
          JSON.stringify(maintenanceHistory)
        ]
      );
      
      equipment.push({ id, name: equipType.name, crew });
    }
  }
  
  console.log(`✅ Created ${equipment.length} pieces of equipment`);
  return equipment;
}

async function seedLeadsQuotesJobs(customers, employees) {
  console.log('📋 Seeding leads, quotes, and jobs...');
  
  let leadsCount = 0;
  let quotesCount = 0;
  let jobsCount = 0;
  
  // Shuffle customers for distribution
  const shuffled = [...customers].sort(() => Math.random() - 0.5);
  
  // Split: ~100 leads only, ~100 with quotes, ~100 with jobs
  const leadsOnlyCustomers = shuffled.slice(0, 100);
  const quotesCustomers = shuffled.slice(100, 200);
  const jobsCustomers = shuffled.slice(200, 300);
  
  // Create leads only (no quotes yet)
  for (const customer of leadsOnlyCustomers) {
    const leadId = uuidv4();
    const status = randomElement(leadStatuses);
    const source = randomElement(leadSources);
    const createdAt = randomDate(new Date('2023-06-01'), new Date());
    
    await pool.query(
      `INSERT INTO leads (id, customer_id, source, status, description, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        leadId,
        customer.id,
        source,
        status,
        `Customer interested in ${randomElement(treeServices).desc.toLowerCase()}`,
        createdAt
      ]
    );
    
    leadsCount++;
  }
  
  // Create leads with quotes
  for (const customer of quotesCustomers) {
    const leadId = uuidv4();
    const createdAt = randomDate(new Date('2023-03-01'), new Date());
    
    await pool.query(
      `INSERT INTO leads (id, customer_id, source, status, description, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        leadId,
        customer.id,
        randomElement(leadSources),
        'Qualified',
        `Quote requested for tree services`,
        createdAt
      ]
    );
    
    leadsCount++;
    
    // Create quote for this lead
    const quoteId = uuidv4();
    const status = randomElement(quoteStatuses);
    const service = randomElement(treeServices);
    const price = random(service.priceRange[0], service.priceRange[1]);
    const lineItems = [{ description: service.desc, price, selected: true }];
    
    await pool.query(
      `INSERT INTO quotes (id, lead_id, customer_name, status, line_items, stump_grinding_price, job_location, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        quoteId,
        leadId,
        customer.name,
        status,
        JSON.stringify(lineItems),
        Math.random() > 0.7 ? random(150, 500) : 0,
        customer.address,
        randomDate(createdAt, new Date())
      ]
    );
    
    quotesCount++;
  }
  
  // Create leads with quotes AND jobs
  for (const customer of jobsCustomers) {
    const leadId = uuidv4();
    const leadCreatedAt = randomDate(new Date('2023-01-01'), new Date('2023-11-01'));
    
    await pool.query(
      `INSERT INTO leads (id, customer_id, source, status, description, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        leadId,
        customer.id,
        randomElement(leadSources),
        'Converted',
        `Job completed`,
        leadCreatedAt
      ]
    );
    
    leadsCount++;
    
    // Create accepted quote
    const quoteId = uuidv4();
    const service = randomElement(treeServices);
    const price = random(service.priceRange[0], service.priceRange[1]);
    const lineItems = [{ description: service.desc, price, selected: true }];
    
    await pool.query(
      `INSERT INTO quotes (id, lead_id, customer_name, status, line_items, stump_grinding_price, job_location, accepted_at, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        quoteId,
        leadId,
        customer.name,
        'Accepted',
        JSON.stringify(lineItems),
        Math.random() > 0.7 ? random(150, 500) : 0,
        customer.address,
        randomDate(leadCreatedAt, new Date()),
        randomDate(leadCreatedAt, new Date())
      ]
    );
    
    quotesCount++;
    
    // Create job - distribute across statuses
    const jobId = uuidv4();
    const jobStatus = randomElement(jobStatuses);
    const crew = random(1, 5);
    const crewEmployees = employees.filter(e => e.crew === crew);
    const assignedCrew = crewEmployees.slice(0, random(2, 4)).map(e => e.id);
    
    let scheduledDate, workStartedAt, workEndedAt, costs, invoiceCreated = false;
    
    if (jobStatus === 'Scheduled') {
      // Future scheduled job
      scheduledDate = randomDate(new Date(), new Date('2024-03-01')).toISOString().split('T')[0];
    } else if (jobStatus === 'In Progress') {
      // Started today or recently
      scheduledDate = randomDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()).toISOString().split('T')[0];
      workStartedAt = new Date();
      workStartedAt.setHours(8, 0, 0);
    } else {
      // Completed job
      const completedDate = randomDate(new Date('2023-01-01'), new Date());
      scheduledDate = completedDate.toISOString().split('T')[0];
      workStartedAt = new Date(completedDate);
      workStartedAt.setHours(8, 0, 0);
      workEndedAt = new Date(completedDate);
      workEndedAt.setHours(8 + random(4, 10), 0, 0);
      
      // Calculate costs
      const hoursWorked = (workEndedAt - workStartedAt) / (1000 * 60 * 60);
      const labor = Math.round(hoursWorked * assignedCrew.length * random(25, 35));
      const equipment = random(80, 300);
      const materials = random(20, 150);
      const disposal = random(50, 200);
      
      costs = {
        labor,
        equipment,
        materials,
        disposal,
        total: labor + equipment + materials + disposal
      };
      
      invoiceCreated = true;
    }
    
    await pool.query(
      `INSERT INTO jobs (id, quote_id, customer_name, status, scheduled_date, assigned_crew, work_started_at, work_ended_at, job_location, costs, equipment_needed, estimated_hours) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        jobId,
        quoteId,
        customer.name,
        jobStatus,
        scheduledDate,
        JSON.stringify(assignedCrew),
        workStartedAt,
        workEndedAt,
        customer.address,
        costs ? JSON.stringify(costs) : null,
        JSON.stringify([`Crew ${crew} Equipment`]),
        random(4, 12)
      ]
    );
    
    jobsCount++;
    
    // Create invoice for completed jobs
    if (invoiceCreated) {
      const invoiceId = uuidv4();
      const isPaid = Math.random() > 0.3; // 70% paid
      
      await pool.query(
        `INSERT INTO invoices (id, job_id, customer_name, status, amount, line_items, due_date, paid_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          invoiceId,
          jobId,
          customer.name,
          isPaid ? 'Paid' : 'Sent',
          price,
          JSON.stringify(lineItems),
          randomDate(workEndedAt, new Date('2024-02-01')).toISOString().split('T')[0],
          isPaid ? randomDate(workEndedAt, new Date()) : null
        ]
      );
    }
  }
  
  console.log(`✅ Created ${leadsCount} leads, ${quotesCount} quotes, ${jobsCount} jobs`);
}

async function seedPayrollData(employees) {
  console.log('💰 Seeding payroll and time entries...');
  
  // Create pay periods for last 6 months
  const payPeriods = [];
  const today = new Date();
  
  for (let i = 0; i < 12; i++) {
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() - (i * 14));
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 13);
    
    const periodId = uuidv4();
    const status = i === 0 ? 'Open' : 'Processed';
    
    await pool.query(
      `INSERT INTO pay_periods (id, start_date, end_date, period_type, status, processed_at) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        periodId,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0],
        'bi-weekly',
        status,
        status === 'Processed' ? endDate : null
      ]
    );
    
    payPeriods.push({ id: periodId, startDate, endDate, status });
  }
  
  // Create time entries and payroll records for each employee
  for (const employee of employees) {
    const empData = await pool.query('SELECT pay_rate FROM employees WHERE id = $1', [employee.id]);
    const payRate = empData.rows[0].pay_rate;
    
    for (const period of payPeriods.slice(1)) { // Skip current open period
      // Generate 10 work days of time entries
      let totalRegularHours = 0;
      let totalOvertimeHours = 0;
      
      for (let day = 0; day < 10; day++) {
        const workDate = new Date(period.startDate);
        workDate.setDate(workDate.getDate() + day);
        
        const regularHours = random(7, 9);
        const overtimeHours = Math.random() > 0.7 ? random(1, 3) : 0;
        
        totalRegularHours += regularHours;
        totalOvertimeHours += overtimeHours;
        
        await pool.query(
          `INSERT INTO time_entries (id, employee_id, date, hours_worked, hourly_rate, overtime_hours) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            uuidv4(),
            employee.id,
            workDate.toISOString().split('T')[0],
            regularHours,
            payRate,
            overtimeHours
          ]
        );
      }
      
      // Create payroll record
      const regularPay = totalRegularHours * payRate;
      const overtimePay = totalOvertimeHours * payRate * 1.5;
      const bonuses = Math.random() > 0.8 ? random(100, 500) : 0;
      const deductions = [
        { type: 'Federal Tax', amount: Math.round(regularPay * 0.15) },
        { type: 'State Tax', amount: Math.round(regularPay * 0.05) },
        { type: 'FICA', amount: Math.round(regularPay * 0.0765) }
      ];
      const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
      const grossPay = regularPay + overtimePay + bonuses;
      const netPay = grossPay - totalDeductions;
      
      await pool.query(
        `INSERT INTO payroll_records (id, employee_id, pay_period_id, regular_hours, overtime_hours, hourly_rate, regular_pay, overtime_pay, bonuses, deductions, total_deductions, gross_pay, net_pay, paid_at, payment_method) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          uuidv4(),
          employee.id,
          period.id,
          totalRegularHours,
          totalOvertimeHours,
          payRate,
          regularPay,
          overtimePay,
          bonuses,
          JSON.stringify(deductions),
          totalDeductions,
          grossPay,
          netPay,
          period.endDate,
          'Direct Deposit'
        ]
      );
    }
  }
  
  console.log('✅ Created pay periods, time entries, and payroll records');
}

async function main() {
  try {
    console.log('🌳 TreePro AI Database Seeding Script\n');
    console.log('📊 Generating comprehensive realistic data:\n');
    console.log('   - 300 Customers');
    console.log('   - ~100 Leads (various statuses)');
    console.log('   - ~200 Quotes (Draft, Sent, Accepted)');
    console.log('   - ~100 Jobs (Scheduled, In Progress, Completed)');
    console.log('   - 30 Employees (5 crews of 6)');
    console.log('   - 30 Equipment items (6 per crew)');
    console.log('   - Payroll & Time Entries\n');
    
    await clearDatabase();
    
    const customers = await seedCustomers();
    const employees = await seedEmployees();
    const equipment = await seedEquipment(employees);
    await seedLeadsQuotesJobs(customers, employees);
    await seedPayrollData(employees);
    
    console.log('\n🎉 Database seeding complete!\n');
    console.log('Summary:');
    console.log(`   ✅ 300 customers`);
    console.log(`   ✅ ~300 leads distributed across pipeline`);
    console.log(`   ✅ ~200 quotes`);
    console.log(`   ✅ ~100 jobs (Scheduled/Active/Completed)`);
    console.log(`   ✅ 30 employees in 5 crews`);
    console.log(`   ✅ 30 equipment items`);
    console.log(`   ✅ Payroll data for 6 months\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

main();
