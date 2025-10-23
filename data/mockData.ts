import { Lead, Quote, Job, Customer, Invoice, Employee, Equipment } from '../types';

export const mockCustomers: Customer[] = [
  { id: 'cust1', name: 'John Doe', email: 'john.doe@example.com', phone: '555-1234', address: '123 Oak St, Los Angeles, CA', coordinates: { lat: 34.0522, lng: -118.2437 } },
  { id: 'cust2', name: 'Jane Smith', email: 'jane.smith@example.com', phone: '555-5678', address: '456 Pine Ave, New York, NY', coordinates: { lat: 40.7128, lng: -74.0060 } },
  { id: 'cust3', name: 'Sarah Wilson', email: 'sarah.w@example.com', phone: '555-8888', address: '789 Birch Rd, Chicago, IL', coordinates: { lat: 41.8781, lng: -87.6298 } },
];

export const mockLeads: Lead[] = [
  { id: 'lead1', customer: mockCustomers[0], source: 'Website', status: 'New', createdAt: '2023-10-26', description: 'Wants a quote for trimming a large maple tree.' },
  { id: 'lead2', customer: mockCustomers[1], source: 'Referral', status: 'Contacted', createdAt: '2023-10-25' },
  { id: 'lead3', customer: mockCustomers[2], source: 'Emergency Call', status: 'New', createdAt: new Date().toISOString().split('T')[0], description: 'A large branch has fallen on my garage. Need it removed ASAP!' },
];

export const mockQuotes: Quote[] = [
  { id: 'quote1', leadId: 'lead1', customerName: 'John Doe', status: 'Accepted', lineItems: [{description: 'Trimming large maple tree', price: 1200, selected: true}], stumpGrindingPrice: 0, createdAt: '2023-10-26' },
  { id: 'quote2', leadId: 'lead2', customerName: 'Jane Smith', status: 'Accepted', lineItems: [{description: 'Oak tree removal', price: 850, selected: true}], stumpGrindingPrice: 0, createdAt: '2023-10-25' },
  { id: 'quote3', leadId: 'lead3', customerName: 'Sarah Wilson', status: 'Accepted', lineItems: [{description: 'Emergency branch removal from garage', price: 2100, selected: true}], stumpGrindingPrice: 400, createdAt: new Date().toISOString().split('T')[0] },
];

export const mockJobs: Job[] = [
    { id: 'job1', quoteId: 'quote2', customerName: 'Jane Smith', status: 'Scheduled', scheduledDate: '2023-11-05', assignedCrew: ['emp2', 'emp3'] },
    { id: 'job2', quoteId: 'quote1', customerName: 'John Doe', status: 'In Progress', scheduledDate: new Date().toISOString().split('T')[0], assignedCrew: ['emp1'] },
    { id: 'job3', quoteId: 'quote3', customerName: 'Sarah Wilson', status: 'Unscheduled', scheduledDate: '', assignedCrew: ['emp1', 'emp3'] },
];

export const mockInvoices: Invoice[] = [
    { id: 'inv1', jobId: 'job1', customerName: 'Jane Smith', status: 'Paid', amount: 850, dueDate: '2023-11-20' },
];

export const mockEmployees: Employee[] = [
  { id: 'emp1', name: 'Mike Miller', phone: '555-8765', address: '789 Maple Dr, Los Angeles, CA', coordinates: { lat: 34.0550, lng: -118.2450 }, ssn: 'XXX-XX-1234', dob: '1985-05-15', jobTitle: 'Crew Leader', payRate: 35, hireDate: '2020-03-01', certifications: 'ISA Certified Arborist, First Aid/CPR', performanceMetrics: { jobsCompleted: 152, safetyIncidents: 0, customerRating: 4.9 } },
  { id: 'emp2', name: 'Carlos Ray', phone: '555-4321', address: '321 Birch Ln, New York, NY', coordinates: { lat: 40.7150, lng: -74.0080 }, ssn: 'XXX-XX-5678', dob: '1992-11-20', jobTitle: 'Groundsman', payRate: 22, hireDate: '2022-06-15', certifications: 'Chainsaw Safety', performanceMetrics: { jobsCompleted: 88, safetyIncidents: 1, customerRating: 4.6 } },
  { id: 'emp3', name: 'David Chen', phone: '555-9999', address: '555 Willow Way, Chicago, IL', coordinates: { lat: 41.8800, lng: -87.6300 }, ssn: 'XXX-XX-9999', dob: '1995-01-30', jobTitle: 'Arborist Climber', payRate: 28, hireDate: '2021-08-01', certifications: 'ISA Certified Tree Worker, Aerial Rescue', performanceMetrics: { jobsCompleted: 115, safetyIncidents: 0, customerRating: 4.8 } },

];

export const mockEquipment: Equipment[] = [
  { id: 'equip1', name: 'Stump Grinder', makeModel: 'Vermeer SC30TX', purchaseDate: '2021-02-10', lastServiceDate: '2023-05-15', status: 'Operational', assignedTo: 'Mike Miller' },
  { id: 'equip2', name: 'Wood Chipper', makeModel: 'Bandit 15XP', purchaseDate: '2020-01-15', lastServiceDate: '2023-08-15', status: 'Needs Maintenance', assignedTo: 'Crew 1' },
  { id: 'equip3', name: 'Chainsaw', makeModel: 'Stihl MS 462', purchaseDate: '2023-03-20', lastServiceDate: '2023-10-10', status: 'Operational' },
];