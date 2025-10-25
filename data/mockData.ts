import { Lead, Quote, Job, Customer, Invoice, Employee, Equipment, LineItem, JobCost, PortalMessage, CustomFieldDefinition, DocumentTemplate } from '../types';

export const mockCustomers: Customer[] = [
  { id: 'cust1', name: 'John Doe', email: 'john.doe@example.com', phone: '555-1234', address: '123 Oak St, Los Angeles, CA', coordinates: { lat: 34.0522, lng: -118.2437 } },
  { id: 'cust2', name: 'Jane Smith', email: 'jane.smith@example.com', phone: '555-5678', address: '456 Pine Ave, New York, NY', coordinates: { lat: 40.7128, lng: -74.0060 } },
  { id: 'cust3', name: 'Sarah Wilson', email: 'sarah.w@example.com', phone: '555-8888', address: '789 Birch Rd, Chicago, IL', coordinates: { lat: 41.8781, lng: -87.6298 } },
  { id: 'cust4', name: 'Michael Brown', email: 'michael.b@example.com', phone: '555-4444', address: '101 Maple Ln, Miami, FL', coordinates: { lat: 25.7617, lng: -80.1918 } },
];

export const mockLeads: Lead[] = [
  { id: 'lead1', customer: mockCustomers[0], source: 'Website', status: 'New', createdAt: '2023-10-26', description: 'Wants a quote for trimming a large maple tree.' },
  { id: 'lead2', customer: mockCustomers[1], source: 'Referral', status: 'Contacted', createdAt: '2023-10-25' },
  { id: 'lead3', customer: mockCustomers[2], source: 'Emergency Call', status: 'New', createdAt: new Date().toISOString().split('T')[0], description: 'A large branch has fallen on my garage. Need it removed ASAP!' },
  { id: 'lead4', customer: mockCustomers[3], source: 'Website', status: 'Qualified', createdAt: '2023-10-28', description: 'Request for quote for various services.' },
];

export const mockQuotes: Quote[] = [
  { id: 'quote1', leadId: 'lead1', customerName: 'John Doe', status: 'Accepted', lineItems: [{description: 'Trimming large maple tree', price: 1200, selected: true}], stumpGrindingPrice: 0, createdAt: '2023-10-26', acceptedAt: '2023-10-27T10:00:00Z', signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' },
  { id: 'quote2', leadId: 'lead2', customerName: 'Jane Smith', status: 'Accepted', lineItems: [{description: 'Oak tree removal', price: 850, selected: true}], stumpGrindingPrice: 0, createdAt: '2023-10-25', acceptedAt: '2023-10-26T11:30:00Z', signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' },
  { id: 'quote3', leadId: 'lead3', customerName: 'Sarah Wilson', status: 'Accepted', lineItems: [{description: 'Emergency branch removal from garage', price: 2100, selected: true}], stumpGrindingPrice: 400, createdAt: new Date().toISOString().split('T')[0], acceptedAt: new Date().toISOString(), signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' },
  { id: 'quote4', leadId: 'lead4', customerName: 'Michael Brown', status: 'Sent', lineItems: [
    {description: 'Remove large pine tree near house', price: 1800, selected: true},
    {description: 'Prune two front yard oak trees', price: 650, selected: true},
    {description: 'Fertilization treatment for all trees', price: 250, selected: false},
  ], stumpGrindingPrice: 350, createdAt: '2023-10-28',
  messages: [
      { sender: 'customer', text: 'Hi, I received the quote. Could we potentially schedule this for a Saturday?', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
      { sender: 'company', text: 'Hi Michael, Saturday work is possible but may incur a small surcharge. Let me know if you\'d like an updated quote.', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
  ]
},
];

const mockJob1Costs: JobCost = {
  labor: 448,
  equipment: 100,
  materials: 20,
  disposal: 80,
  total: 648,
};

const mockJob2Messages: PortalMessage[] = [
    { sender: 'customer', text: 'The crew is doing a great job! Just wanted to make sure they clean up all the smaller twigs from the lawn when they are done.', timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() },
    { sender: 'company', text: 'Absolutely! A thorough cleanup is part of our standard procedure. The crew will ensure your property is spotless before they leave.', timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString() }
];

export const mockJobs: Job[] = [
    { id: 'job1', quoteId: 'quote2', customerName: 'Jane Smith', status: 'Completed', scheduledDate: '2023-11-05', assignedCrew: ['emp2', 'emp3'], photos: [], workStartedAt: '2023-11-05T08:00:00Z', workEndedAt: '2023-11-05T16:00:00Z', clockInCoordinates: { lat: 40.7128, lng: -74.0060 }, clockOutCoordinates: { lat: 40.7130, lng: -74.0062 }, costs: mockJob1Costs },
    { id: 'job2', quoteId: 'quote1', customerName: 'John Doe', status: 'In Progress', scheduledDate: new Date().toISOString().split('T')[0], assignedCrew: ['emp1'], photos: [], workStartedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), clockInCoordinates: { lat: 34.0522, lng: -118.2437 }, messages: mockJob2Messages },
    { id: 'job3', quoteId: 'quote3', customerName: 'Sarah Wilson', status: 'Unscheduled', scheduledDate: '', assignedCrew: ['emp1', 'emp3'], photos: [] },
];

const quote2LineItems: LineItem[] = mockQuotes.find(q => q.id === 'quote2')?.lineItems || [];
const quote1LineItems: LineItem[] = mockQuotes.find(q => q.id === 'quote1')?.lineItems || [];

export const mockInvoices: Invoice[] = [
    { id: 'inv1', jobId: 'job1', customerName: 'Jane Smith', status: 'Paid', amount: 850, lineItems: quote2LineItems, dueDate: '2023-11-20', paidAt: '2023-11-15T14:25:00Z' },
    { id: 'inv2', jobId: 'job2', customerName: 'John Doe', status: 'Sent', amount: 1200, lineItems: quote1LineItems, dueDate: '2024-01-15' },
];

export const mockEmployees: Employee[] = [
  { id: 'emp1', name: 'Mike Miller', phone: '555-8765', address: '789 Maple Dr, Los Angeles, CA', coordinates: { lat: 34.0550, lng: -118.2450 }, ssn: 'XXX-XX-1234', dob: '1985-05-15', jobTitle: 'Crew Leader', payRate: 35, hireDate: '2020-03-01', certifications: 'ISA Certified Arborist, First Aid/CPR', performanceMetrics: { jobsCompleted: 152, safetyIncidents: 0, customerRating: 4.9 } },
  { id: 'emp2', name: 'Carlos Ray', phone: '555-4321', address: '321 Birch Ln, New York, NY', coordinates: { lat: 40.7150, lng: -74.0080 }, ssn: 'XXX-XX-5678', dob: '1992-11-20', jobTitle: 'Groundsman', payRate: 22, hireDate: '2022-06-15', certifications: 'Chainsaw Safety', performanceMetrics: { jobsCompleted: 88, safetyIncidents: 1, customerRating: 4.6 } },
  { id: 'emp3', name: 'David Chen', phone: '555-9999', address: '555 Willow Way, Chicago, IL', coordinates: { lat: 41.8800, lng: -87.6300 }, ssn: 'XXX-XX-9999', dob: '1995-01-30', jobTitle: 'Arborist Climber', payRate: 28, hireDate: '2021-08-01', certifications: 'ISA Certified Tree Worker, Aerial Rescue', performanceMetrics: { jobsCompleted: 115, safetyIncidents: 0, customerRating: 4.8 } },
];

export const mockEquipment: Equipment[] = [
  { id: 'equip1', name: 'Stump Grinder', make: 'Vermeer', model: 'SC30TX', purchaseDate: '2021-02-10', lastServiceDate: '2023-05-15', status: 'Operational', assignedTo: 'Mike Miller',
    maintenanceHistory: [
      { id: 'maint1', date: '2023-05-15', description: 'Replaced grinder teeth and changed oil.', cost: 450 },
      { id: 'maint2', date: '2022-11-01', description: 'Annual engine service.', cost: 220 },
    ]
  },
  { id: 'equip2', name: 'Wood Chipper', make: 'Bandit', model: '15XP', purchaseDate: '2020-01-15', lastServiceDate: '2023-08-15', status: 'Needs Maintenance', assignedTo: 'Crew 1',
    maintenanceHistory: [
        { id: 'maint3', date: '2023-08-15', description: 'Sharpened blades.', cost: 300 },
        { id: 'maint4', date: '2023-02-20', description: 'Replaced hydraulic fluid.', cost: 150 },
    ]
   },
  { id: 'equip3', name: 'Chainsaw', make: 'Stihl', model: 'MS 462', purchaseDate: '2023-03-20', lastServiceDate: '2023-10-10', status: 'Operational', maintenanceHistory: [] },
];

export const mockCustomFields: CustomFieldDefinition[] = [
    { id: 'cf_cust_gatecode', name: 'Gate Code', type: 'text', entity: 'customer' },
    { id: 'cf_cust_preferredcontact', name: 'Preferred Contact Method', type: 'text', entity: 'customer' },
    { id: 'cf_job_followup', name: 'Follow-up Required', type: 'checkbox', entity: 'job' },
];

export const mockDocumentTemplates: DocumentTemplate[] = [
    { 
        id: 'tpl_quote_standard', 
        name: 'Standard Customer Quote', 
        type: 'Quote', 
        description: 'A clean, standard quote format for most residential jobs. Includes line items, total, and signature line.',
        content: `<h1>Quote for {{customer.name}}</h1><p>Thank you for the opportunity to provide a quote for your tree care needs.</p>...`
    },
    { 
        id: 'tpl_quote_commercial', 
        name: 'Commercial Project Proposal', 
        type: 'Quote', 
        description: 'A detailed proposal for large-scale commercial projects, including scope of work, terms, and insurance details.',
        content: `<h1>Project Proposal for {{customer.name}}</h1><h2>Scope of Work</h2>...`
    },
    { 
        id: 'tpl_invoice_basic', 
        name: 'Basic Service Invoice', 
        type: 'Invoice', 
        description: 'A simple invoice for completed work, showing services rendered and total amount due.',
        content: `<h1>Invoice</h1><h2>Amount Due: {{invoice.amount}}</h2>...`
    },
    { 
        id: 'tpl_report_risk', 
        name: 'Tree Risk Assessment', 
        type: 'Report', 
        description: 'A formal report detailing a tree risk assessment (TRAQ) for insurance or municipal purposes.',
        content: `<h1>Tree Risk Assessment Report</h1><h3>Property: {{customer.address}}</h3>...`
    },
     { 
        id: 'tpl_report_health', 
        name: 'Arborist Health Report', 
        type: 'Report', 
        description: 'Provides a detailed analysis of a tree\'s health, including disease diagnosis and treatment recommendations.',
        content: `<h1>Arborist Health Report for {{customer.name}}</h1>...`
    },
];