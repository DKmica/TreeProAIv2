const { v4: uuidv4 } = require('uuid');

// Helper to generate random dates
const randomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();
};

const randomPastDate = (daysAgo) => {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date.toISOString().split('T')[0];
};

// Los Angeles area coordinates for realistic tree service locations
const LACoordinates = [
  { lat: 34.0522, lng: -118.2437 }, // Downtown LA
  { lat: 34.1014, lng: -118.3413 }, // Beverly Hills
  { lat: 34.0689, lng: -118.4452 }, // Santa Monica
  { lat: 34.1478, lng: -118.1445 }, // Pasadena
  { lat: 33.9850, lng: -118.4695 }, // Manhattan Beach
  { lat: 34.1808, lng: -118.3089 }, // Burbank
  { lat: 34.1962, lng: -118.5419 }, // Woodland Hills
  { lat: 34.0928, lng: -118.3287 }, // West Hollywood
  { lat: 33.9425, lng: -118.4081 }, // El Segundo
  { lat: 34.0394, lng: -118.2563 }, // Arts District
];

// Sample names for variety
const firstNames = ['Michael', 'Sarah', 'David', 'Jennifer', 'James', 'Maria', 'Robert', 'Linda', 'William', 'Patricia', 
  'Richard', 'Elizabeth', 'Joseph', 'Susan', 'Thomas', 'Jessica', 'Charles', 'Karen', 'Christopher', 'Nancy',
  'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
  'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle', 'Kenneth', 'Carol',
  'Kevin', 'Amanda', 'Brian', 'Dorothy', 'George', 'Melissa', 'Timothy', 'Deborah', 'Ronald', 'Stephanie'];

const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'];

const streets = ['Oak', 'Maple', 'Pine', 'Cedar', 'Elm', 'Birch', 'Willow', 'Sycamore', 'Ash', 'Walnut',
  'Cherry', 'Palm', 'Magnolia', 'Cypress', 'Redwood', 'Spruce', 'Poplar', 'Hickory', 'Cottonwood', 'Juniper'];

const streetTypes = ['St', 'Ave', 'Blvd', 'Dr', 'Ln', 'Rd', 'Ct', 'Way', 'Pl', 'Ter'];

const generateName = () => {
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${first} ${last}`;
};

const generateAddress = () => {
  const number = Math.floor(Math.random() * 9000) + 1000;
  const street = streets[Math.floor(Math.random() * streets.length)];
  const type = streetTypes[Math.floor(Math.random() * streetTypes.length)];
  return `${number} ${street} ${type}, Los Angeles, CA`;
};

const generateCoordinates = () => {
  const base = LACoordinates[Math.floor(Math.random() * LACoordinates.length)];
  return {
    lat: base.lat + (Math.random() - 0.5) * 0.1,
    lng: base.lng + (Math.random() - 0.5) * 0.1
  };
};

async function seedDatabase(db) {
  if (!db || typeof db.query !== 'function') {
    throw new Error('A database instance with a query method is required to seed data');
  }

  console.log('🌱 Starting database seed...');

  try {
    // 1. Seed Employees (10 employees)
    console.log('👥 Seeding employees...');
    const employees = [];
    const jobTitles = [
      { title: 'Crew Leader', rate: 35 },
      { title: 'Arborist Climber', rate: 28 },
      { title: 'Groundsman', rate: 22 },
      { title: 'Equipment Operator', rate: 25 },
      { title: 'Tree Care Specialist', rate: 30 }
    ];

    const certifications = [
      'ISA Certified Arborist',
      'Tree Worker Climber Specialist',
      'Aerial Rescue Certified',
      'Chainsaw Safety',
      'First Aid/CPR',
      'OSHA 10-Hour',
      'Pesticide Applicator License',
      'Rigging Specialist'
    ];

    for (let i = 0; i < 10; i++) {
      const name = generateName();
      const coords = generateCoordinates();
      const jobInfo = jobTitles[Math.floor(Math.random() * jobTitles.length)];
      const numCerts = Math.floor(Math.random() * 3) + 1;
      const employeeCerts = [];
      for (let j = 0; j < numCerts; j++) {
        const cert = certifications[Math.floor(Math.random() * certifications.length)];
        if (!employeeCerts.includes(cert)) employeeCerts.push(cert);
      }

      const employee = {
        id: uuidv4(),
        name,
        phone: `555-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
        address: generateAddress(),
        lat: coords.lat,
        lon: coords.lng,
        ssn: `XXX-XX-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
        dob: `19${60 + Math.floor(Math.random() * 30)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
        job_title: jobInfo.title,
        pay_rate: jobInfo.rate,
        hire_date: randomPastDate(1500),
        certifications: employeeCerts.join(', '),
        performance_metrics: JSON.stringify({
          jobsCompleted: Math.floor(Math.random() * 200) + 20,
          safetyIncidents: Math.random() < 0.7 ? 0 : Math.floor(Math.random() * 3),
          customerRating: (4 + Math.random()).toFixed(1)
        })
      };

      employees.push(employee);

      await db.query(
        `INSERT INTO employees (id, name, phone, address, lat, lon, ssn, dob, job_title, pay_rate, hire_date, certifications, performance_metrics)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [employee.id, employee.name, employee.phone, employee.address, employee.lat, employee.lon,
          employee.ssn, employee.dob, employee.job_title, employee.pay_rate, employee.hire_date,
          employee.certifications, employee.performance_metrics]
      );
    }
    console.log(`✅ Added ${employees.length} employees`);

    // 2. Seed Equipment (15 items)
    console.log('🔧 Seeding equipment...');
    const equipmentTypes = [
      { name: 'Stump Grinder', make: 'Vermeer', models: ['SC30TX', 'SC60TX', 'SC70TX'] },
      { name: 'Wood Chipper', make: 'Bandit', models: ['12XP', '15XP', '18XP'] },
      { name: 'Chainsaw', make: 'Stihl', models: ['MS 462', 'MS 500i', 'MS 661'] },
      { name: 'Bucket Truck', make: 'Altec', models: ['LRV-55', 'LRV-60', 'LRV-70'] },
      { name: 'Aerial Lift', make: 'Genie', models: ['S-65', 'S-80', 'S-85'] },
      { name: 'Log Loader', make: 'Prentice', models: ['2432', '2842', '3242'] },
      { name: 'Pole Saw', make: 'Echo', models: ['PPT-266', 'PPT-300', 'PPT-310'] },
      { name: 'Brush Cutter', make: 'Husqvarna', models: ['545FX', '555FXT', '555RXT'] }
    ];

    const statuses = ['Operational', 'Operational', 'Operational', 'Needs Maintenance', 'Operational'];

    for (let i = 0; i < 15; i++) {
      const equipType = equipmentTypes[Math.floor(Math.random() * equipmentTypes.length)];
      const model = equipType.models[Math.floor(Math.random() * equipType.models.length)];
      const assignedEmployee = Math.random() < 0.6 ? employees[Math.floor(Math.random() * employees.length)].name : null;
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      const maintenanceHistory = [];
      const numMaintenances = Math.floor(Math.random() * 5);
      for (let j = 0; j < numMaintenances; j++) {
        maintenanceHistory.push({
          id: uuidv4(),
          date: randomPastDate(365),
          description: ['Oil change and filter replacement', 'Blade sharpening', 'Hydraulic system check', 
            'Engine tune-up', 'Safety inspection', 'Belt replacement', 'Tire rotation'][Math.floor(Math.random() * 7)],
          cost: Math.floor(Math.random() * 500) + 50
        });
      }

      await db.query(
        `INSERT INTO equipment (id, name, make, model, purchase_date, last_service_date, status, assigned_to, maintenance_history)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          uuidv4(),
          equipType.name,
          equipType.make,
          model,
          randomPastDate(1800),
          randomPastDate(90),
          status,
          assignedEmployee,
          JSON.stringify(maintenanceHistory)
        ]
      );
    }
    console.log('✅ Added 15 equipment items');

    // 3. Seed Customers (50 customers)
    console.log('👤 Seeding customers...');
    const customers = [];
    for (let i = 0; i < 50; i++) {
      const name = generateName();
      const coords = generateCoordinates();
      const customerId = uuidv4();

      await db.query(
        `INSERT INTO customers (id, name, email, phone, address, lat, lon)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          customerId,
          name,
          `${name.toLowerCase().replace(' ', '.')}@example.com`,
          `555-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
          generateAddress(),
          coords.lat,
          coords.lng
        ]
      );

      customers.push({ id: customerId, name });
    }
    console.log(`✅ Added ${customers.length} customers`);

    // 4. Distribute customers into Leads (20), Quotes (15), and Jobs (15)
    console.log('📋 Creating leads, quotes, and jobs...');

    const sources = ['Website', 'Referral', 'Google', 'Facebook', 'Yelp', 'Direct Call', 'Emergency Call'];
    const leadStatuses = ['New', 'Contacted', 'Qualified', 'Lost'];
    const descriptions = [
      'Large oak tree needs trimming',
      'Remove dead tree in backyard',
      'Emergency - tree fell on fence',
      'Annual tree maintenance',
      'Stump grinding needed',
      'Multiple trees need pruning',
      'Tree health assessment requested',
      'Palm tree trimming',
      'Storm damage cleanup',
      'Tree removal near power lines'
    ];

    // Create 20 Leads
    const leads = [];
    for (let i = 0; i < 20; i++) {
      const customer = customers[i];
      const leadId = uuidv4();

      await db.query(
        `INSERT INTO leads (id, customer_id, source, status, description, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          leadId,
          customer.id,
          sources[Math.floor(Math.random() * sources.length)],
          leadStatuses[Math.floor(Math.random() * leadStatuses.length)],
          descriptions[Math.floor(Math.random() * descriptions.length)],
          randomPastDate(60)
        ]
      );

      leads.push({ id: leadId, customerId: customer.id, customerName: customer.name });
    }
    console.log(`✅ Added ${leads.length} leads`);

    // Create 15 Quotes (from next 15 customers)
    const quotes = [];
    for (let i = 20; i < 35; i++) {
      const customer = customers[i];
      const leadId = uuidv4();
      const quoteId = uuidv4();

      // Create lead first
      await db.query(
        `INSERT INTO leads (id, customer_id, source, status, description, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          leadId,
          customer.id,
          sources[Math.floor(Math.random() * sources.length)],
          'Qualified',
          descriptions[Math.floor(Math.random() * descriptions.length)],
          randomPastDate(45)
        ]
      );

      const services = [
        { description: 'Tree trimming and pruning', price: 850 },
        { description: 'Tree removal', price: 1200 },
        { description: 'Stump grinding', price: 400 },
        { description: 'Emergency tree service', price: 2500 },
        { description: 'Tree health assessment', price: 300 },
        { description: 'Palm tree trimming', price: 650 }
      ];

      const numServices = Math.floor(Math.random() * 3) + 1;
      const lineItems = [];
      for (let j = 0; j < numServices; j++) {
        const service = services[Math.floor(Math.random() * services.length)];
        lineItems.push({
          description: service.description,
          price: service.price + Math.floor(Math.random() * 200) - 100,
          selected: true
        });
      }

      const quoteStatuses = ['Draft', 'Sent', 'Accepted', 'Declined'];
      const status = quoteStatuses[Math.floor(Math.random() * quoteStatuses.length)];

      await db.query(
        `INSERT INTO quotes (id, lead_id, customer_name, status, line_items, stump_grinding_price, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          quoteId,
          leadId,
          customer.name,
          status,
          JSON.stringify(lineItems),
          Math.random() < 0.3 ? Math.floor(Math.random() * 300) + 200 : 0,
          randomPastDate(30)
        ]
      );

      quotes.push({ id: quoteId, leadId, customerName: customer.name, status });
    }
    console.log(`✅ Added ${quotes.length} quotes`);

    // Create 15 Jobs (from last 15 customers)
    let jobCount = 0;
    for (let i = 35; i < 50; i++) {
      const customer = customers[i];
      const leadId = uuidv4();
      const quoteId = uuidv4();
      const jobId = uuidv4();

      // Create lead
      await db.query(
        `INSERT INTO leads (id, customer_id, source, status, description, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          leadId,
          customer.id,
          sources[Math.floor(Math.random() * sources.length)],
          'Qualified',
          descriptions[Math.floor(Math.random() * descriptions.length)],
          randomPastDate(60)
        ]
      );

      // Create quote
      const lineItems = [{
        description: descriptions[Math.floor(Math.random() * descriptions.length)],
        price: 800 + Math.floor(Math.random() * 1500),
        selected: true
      }];

      await db.query(
        `INSERT INTO quotes (id, lead_id, customer_name, status, line_items, stump_grinding_price, accepted_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          quoteId,
          leadId,
          customer.name,
          'Accepted',
          JSON.stringify(lineItems),
          0,
          randomPastDate(20),
          randomPastDate(25)
        ]
      );

      // Create job
      const jobStatuses = ['Unscheduled', 'Scheduled', 'In Progress', 'Completed'];
      const status = jobStatuses[Math.floor(Math.random() * jobStatuses.length)];

      const assignedCrew = [];
      const crewSize = Math.floor(Math.random() * 3) + 1;
      for (let j = 0; j < crewSize; j++) {
        assignedCrew.push(employees[Math.floor(Math.random() * employees.length)].id);
      }

      const coords = generateCoordinates();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 30));

      await db.query(
        `INSERT INTO jobs (id, quote_id, customer_name, status, scheduled_date, assigned_crew, clock_in_lat, clock_in_lon)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          jobId,
          quoteId,
          customer.name,
          status,
          status === 'Unscheduled' ? '' : futureDate.toISOString().split('T')[0],
          JSON.stringify(assignedCrew),
          coords.lat,
          coords.lng
        ]
      );

      jobCount++;
    }
    console.log(`✅ Added ${jobCount} jobs`);

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - 10 employees`);
    console.log(`  - 15 equipment items`);
    console.log(`  - 50 customers`);
    console.log(`  - 20 leads`);
    console.log(`  - 15 quotes`);
    console.log(`  - 15 jobs`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run the seed function when executed directly from the command line
if (require.main === module) {
  const db = require('./db');

  seedDatabase(db)
    .then(() => {
      console.log('\n✅ Seed process completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Seed process failed:', err);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
