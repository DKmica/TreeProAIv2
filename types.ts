// Base type for all user-owned data
export interface UserOwned {
  id: string;
  user_id: string;
  created_at: string;
}

export interface Customer extends UserOwned {
  name: string;
  email: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  // For map view compatibility
  address: string; // Combined address
  coordinates: { lat: number; lng: number; };
}

export interface Lead extends UserOwned {
  customer_id: string;
  source: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Lost';
  notes?: string;
  // For display
  customer?: Customer;
}

export interface Quote extends UserOwned {
  customer_id: string;
  lead_id?: string;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Declined';
  total_price: number;
  // For display
  customerName?: string;
}

export interface Job extends UserOwned {
  customer_id: string;
  quote_id?: string;
  status: 'Unscheduled' | 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  date?: string;
  assigned_crew?: string[]; // Array of employee IDs
  // For display
  customerName?: string;
}

export interface Invoice extends UserOwned {
  job_id: string;
  customer_id: string;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
  total_amount: number;
  due_date: string;
  issue_date: string;
  // For display
  customerName?: string;
}

export interface Employee extends UserOwned {
  name: string;
  email: string;
  phone?: string;
  role: string;
  pay_rate: number;
  // For map view compatibility
  address: string; // Combined address
  coordinates: { lat: number; lng: number; };
}

export interface Equipment extends UserOwned {
  name: string;
  status: 'Operational' | 'Needs Maintenance' | 'Out of Service';
  last_maintenance?: string;
  // For display
  makeModel?: string; // From old type, will be empty
  assignedTo?: string; // From old type, will be empty
}


// --- AI Related Types ---

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