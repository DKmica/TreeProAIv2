export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  coordinates: { lat: number; lng: number; };
}

export interface Lead {
  id: string;
  customer: Customer;
  source: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Lost';
  createdAt: string;
  description?: string;
}

export interface Quote {
  id: string;
  leadId: string;
  customerName: string;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Declined';
  amount: number;
  createdAt: string;
}

export interface Job {
  id: string;
  quoteId: string;
  customerName: string;
  status: 'Unscheduled' | 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  scheduledDate: string;
  assignedCrew: string[];
}

export interface Invoice {
  id: string;
  jobId: string;
  customerName: string;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
  amount: number;
  dueDate: string;
}

export interface LineItem {
  desc: string;
  qty: number;
  unit_price: number;
}

export interface AIEstimate {
  estimated_price_range: [number, number];
  line_items: LineItem[];
  difficulty: 'Low' | 'Medium' | 'High';
  confidence: number;
  rationale: string;
}

export interface Employee {
  id: string;
  name: string;
  phone: string;
  address: string;
  coordinates: { lat: number; lng: number; };
  ssn: string; // In a real app, this would be handled much more securely
  dob: string; // Date of Birth
  jobTitle: string;
  payRate: number; // per hour
  hireDate: string;
  certifications: string;
}

export interface Equipment {
  id: string;
  name: string;
  makeModel: string;
  purchaseDate: string;
  lastServiceDate: string;
  status: 'Operational' | 'Needs Maintenance' | 'Out of Service';
  assignedTo?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface SEOSuggestions {
  suggested_title: string;
  suggested_meta_description: string;
  optimization_tips: string[];
}

export interface EmailCampaign {
  subject: string;
  body: string;
}

// AI Core Types
export interface LeadScoreSuggestion {
  leadId: string;
  customerName: string;
  score: number; // 0-100
  reasoning: string;
  recommendedAction: 'Prioritize Follow-up' | 'Standard Follow-up' | 'Nurture';
}

export interface JobScheduleSuggestion {
  quoteId: string;
  customerName: string;
  suggestedDate: string;
  suggestedCrew: string[]; // Names of employees
  reasoning: string;
}

export interface MaintenanceAlert {
  equipmentId: string;
  equipmentName: string;
  reasoning: string;
  recommendedAction: 'Schedule Service Immediately' | 'Schedule Routine Check-up';
}

export interface AICoreInsights {
  businessSummary: string;
  leadScores: LeadScoreSuggestion[];
  jobSchedules: JobScheduleSuggestion[];
  maintenanceAlerts: MaintenanceAlert[];
}