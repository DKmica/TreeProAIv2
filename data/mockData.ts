import { Lead, Quote, Job, Customer, Invoice, Employee, Equipment } from '../types';

const mockUserId = 'mock-user-123';
const mockDate = new Date().toISOString();

export const mockCustomers: Customer[] = [
  { id: 'cust1', user_id: mockUserId, created_at: mockDate, name: 'John Doe', email: 'john.doe@example.com', phone: '555-1234', address: '123 Oak St, Los Angeles, CA', coordinates: { lat: 34.0522, lng: -118.2437 } },
  { id: 'cust2', user_id: mockUserId, created_at: mockDate, name: 'Jane Smith', email: 'jane.smith@example.com', phone: '555-5678', address: '456 Pine Ave, New York, NY', coordinates: { lat: 40.7128, lng: -74.0060 } },
  { id: 'cust3', user_id: mockUserId, created_at: mockDate, name: 'Sarah Wilson', email: 'sarah.w@example.com', phone: '555-8888', address: '789 Birch Rd, Chicago, IL', coordinates: { lat: 41.8781, lng: -87.6298 } },
];

export const mockLeads: Lead[] = [
  { id: 'lead1', user_id: mockUserId, customer_id: 'cust1', source: 'Website', status: 'New', created_at: '2023-10-26', customer: mockCustomers[0], notes: 'Wants a quote for trimming a large maple tree.' },
  { id: 'lead2', user_id: mockUserId, customer_id: 'cust2', source: 'Referral', status: 'Contacted', created_at: '2023-10-25', customer: mockCustomers[1] },
  { id: 'lead3', user_id: mockUserId, customer_id: 'cust3', source: 'Emergency Call', status: 'New', created_at: new Date().toISOString().split('T')[0], customer: mockCustomers[2], notes: 'A large branch has fallen on my garage. Need it removed ASAP!' },
];

export const mockQuotes: Quote[] = [
  { id: 'quote1', user_id: mockUserId, created_at: '2023-10-26', customer_id: 'cust1', lead_id: 'lead1', customerName: 'John Doe', status: 'Accepted', total_price: 1200 },
  { id: 'quote2', user_id: mockUserId, created_at: '2023-10-25', customer_id: 'cust2', lead_id: 'lead2', customerName: 'Jane Smith', status: 'Accepted', total_price: 850 },
  { id: 'quote3', user_id: mockUserId, created_at: new Date().toISOString().split('T')[0], customer_id: 'cust3', lead_id: 'lead3', customerName: 'Sarah Wilson', status: 'Accepted', total_price: 2500 },
];

export const mockJobs: Job[] = [
    { id: 'job1', user_id: mockUserId, created_at: mockDate, customer_id: 'cust2', quote_id: 'quote2', customerName: 'Jane Smith', status: 'Scheduled', date: '2023-11-05', assigned_crew: ['emp2', 'emp3'] },
    { id: 'job2', user_id: mockUserId, created_at: mockDate, customer_id: 'cust1', quote_id: 'quote1', customerName: 'John Doe', status: 'In Progress', date: new Date().toISOString().split('T')[0], assigned_crew: ['emp1'] },
    { id: 'job3', user_id: mockUserId, created_at: mockDate, customer_id: 'cust3', quote_id: 'quote3', customerName: 'Sarah Wilson', status: 'Unscheduled', date: '', assigned_crew: ['emp1', 'emp3'] },
];

export const mockInvoices: Invoice[] = [
    { id: 'inv1', user_id: mockUserId, created_at: mockDate, job_id: 'job1', customer_id: 'cust2', customerName: 'Jane Smith', status: 'Paid', total_amount: 850, due_date: '2023-11-20', issue_date: '2023-11-06' },
];

export const mockEmployees: Employee[] = [
  { id: 'emp1', user_id: mockUserId, created_at: mockDate, name: 'Mike Miller', email: 'mike@example.com', phone: '555-8765', address: '789 Maple Dr, Los Angeles, CA', coordinates: { lat: 34.0550, lng: -118.2450 }, role: 'Crew Leader', pay_rate: 35 },
  { id: 'emp2', user_id: mockUserId, created_at: mockDate, name: 'Carlos Ray', email: 'carlos@example.com', phone: '555-4321', address: '321 Birch Ln, New York, NY', coordinates: { lat: 40.7150, lng: -74.0080 }, role: 'Groundsman', pay_rate: 22 },
  { id: 'emp3', user_id: mockUserId, created_at: mockDate, name: 'David Chen', email: 'david@example.com', phone: '555-9999', address: '555 Willow Way, Chicago, IL', coordinates: { lat: 41.8800, lng: -87.6300 }, role: 'Arborist Climber', pay_rate: 28 },
];

export const mockEquipment: Equipment[] = [
  { id: 'equip1', user_id: mockUserId, created_at: mockDate, name: 'Stump Grinder', last_maintenance: '2023-05-15', status: 'Operational' },
  { id: 'equip2', user_id: mockUserId, created_at: mockDate, name: 'Wood Chipper', last_maintenance: '2023-08-15', status: 'Needs Maintenance' },
  { id: 'equip3', user_id: mockUserId, created_at: mockDate, name: 'Chainsaw', last_maintenance: '2023-10-10', status: 'Operational' },
];