// Base type for all user-owned data
export interface UserOwned {
  id: string;
  user_id: string;
  created_at: string;
}

// Module 1: CRM
export interface Customer extends UserOwned {
  name: string;
  email: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  address: string;
  coordinates: { lat: number; lng: number; };
}

export interface Lead extends UserOwned {
  customer_id: string;
  source: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Lost';
  pipeline_stage?: string;
  lost_reason?: string;
  notes?: string;
  customer?: Customer;
}

export interface Communication extends UserOwned {
  customer_id: string;
  lead_id?: string;
  type: 'Email' | 'Call' | 'SMS';
  direction: 'Incoming' | 'Outgoing';
  content?: string;
  timestamp: string;
}

// Module 2: Quoting
export interface Quote extends UserOwned {
  customer_id: string;
  lead_id?: string;
  status: 'Draft' | 'Sent' | 'Viewed' | 'Accepted' | 'Declined';
  total_price: number;
  service_items?: LineItem[];
  quote_notes?: string;
  customerName?: string;
}

// Module 3 & 4: Jobs & Field Operations
export interface Job extends UserOwned {
  customer_id: string;
  quote_id?: string;
  status: 'Unscheduled' | 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  date?: string;
  assigned_crew?: string[];
  job_price?: number;
  job_details?: any;
  customerName?: string;
  calculated_cost_labor?: number;
  calculated_cost_equipment?: number;
  calculated_cost_materials?: number;
  calculated_profit?: number;
}

export interface TimeEntry extends UserOwned {
  job_id: string;
  employee_id: string;
  clock_in: string;
  clock_out?: string;
  duration_minutes?: number;
  // For display
  employeeName?: string;
}

export interface SafetyChecklist extends UserOwned {
  job_id: string;
  checklist_name: string;
  completed_by?: string;
  completed_at?: string;
  form_data: any;
}

// Module 5: Equipment
export interface Equipment extends UserOwned {
  name: string;
  status: 'Operational' | 'Needs Maintenance' | 'Out of Service';
  last_maintenance?: string;
  purchase_date?: string;
  value?: number;
  current_location?: { lat: number; lng: number; };
}

export interface MaintenanceHistory extends UserOwned {
    equipment_id: string;
    service_date: string;
    description: string;
    cost?: number;
    parts_used?: string[];
}

// Module 6: Invoicing
export interface Invoice extends UserOwned {
  job_id: string;
  customer_id: string;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
  total_amount: number;
  due_date: string;
  issue_date: string;
  customerName?: string;
}

// Added back from previous version as it's still used
export interface Expense extends UserOwned {
  job_id: string;
  expense_type: string;
  amount: number;
  date: string;
}

// Module 8: Marketing
export interface MarketingCampaign extends UserOwned {
    name: string;
    type: 'Email' | 'Social Media';
    status: 'Draft' | 'Active' | 'Completed';
    target_audience: any;
    roi?: number;
}

export interface Review extends UserOwned {
    customer_id?: string;
    job_id?: string;
    source: 'Google' | 'Yelp' | 'Direct';
    rating: 1 | 2 | 3 | 4 | 5;
    content?: string;
    review_date: string;
}

// Module 9: HR
export interface Employee extends UserOwned {
  name: string;
  email: string;
  phone?: string;
  role: string;
  pay_rate: number;
  address: string;
  coordinates: { lat: number; lng: number; };
}

export interface Certification extends UserOwned {
    employee_id: string;
    name: string;
    issuing_authority?: string;
    expiry_date?: string;
    document_url?: string;
}

export interface TimeOffRequest extends UserOwned {
    employee_id: string;
    start_date: string;
    end_date: string;
    reason?: string;
    status: 'Pending' | 'Approved' | 'Denied';
}

// --- AI Related Types ---
export interface LineItem {
  desc: string;
  qty: number;
  unit_price: number;
}

export interface AIEstimate {
  species_identification: string;
  size_estimation: string;
  health_and_risk_assessment: string;
  identified_obstacles: string[];
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

// Module 10: Centralized AI Core
export interface LeadScoreSuggestion {
  leadId: string;
  customerName: string;
  score: number;
  reasoning: string;
  recommendedAction: 'Prioritize Follow-up' | 'Standard Follow-up' | 'Nurture';
  urgency: 'None' | 'Medium' | 'High';
}

export interface JobScheduleSuggestion {
  quoteId: string;
  customerName: string;
  suggestedDate: string;
  suggestedCrew: string[];
  reasoning: string;
}

export interface MaintenanceAlert {
  equipmentId: string;
  equipmentName: string;
  reasoning: string;
  recommendedAction: 'Schedule Service Immediately' | 'Schedule Routine Check-up';
}

export interface FinancialForecast {
    period: string; // e.g., "Next 30 Days"
    revenue: number;
    profit: number;
    cash_flow: number;
    confidence: number;
    reasoning: string;
}

export interface Anomaly {
    id: string;
    type: 'Expense' | 'Performance' | 'Revenue';
    description: string;
    severity: 'Low' | 'Medium' | 'High';
    recommendation: string;
}

export interface AICoreInsights {
  businessSummary: string;
  leadScores: LeadScoreSuggestion[];
  jobSchedules: JobScheduleSuggestion[];
  maintenanceAlerts: MaintenanceAlert[];
  financialForecasts: FinancialForecast[];
  anomalies: Anomaly[];
}