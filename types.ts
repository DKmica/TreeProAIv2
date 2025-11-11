

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
  customerUploads?: CustomerUpload[];
  
  // NEW Phase 1 fields:
  clientId?: string;
  propertyId?: string;
  leadScore: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  estimatedValue?: number;
  expectedCloseDate?: string;
  lastContactDate?: string;
  nextFollowupDate?: string;
  updatedAt: string;
  deletedAt?: string;
  
  // Nested
  client?: Client;
  property?: Property;
  tags?: Tag[];
}

export interface LineItem {
  description: string;
  price: number;
  selected: boolean;
}

export interface PortalMessage {
  sender: 'customer' | 'company';
  text: string;
  timestamp: string;
}

export interface Quote {
  id: string;
  leadId?: string;
  customerName: string;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Declined' | 'Converted';
  lineItems: LineItem[];
  stumpGrindingPrice?: number;
  createdAt: string;
  signature?: string;
  acceptedAt?: string;
  messages?: PortalMessage[];
  jobLocation?: string;
  specialInstructions?: string;
  validUntil?: string;
  depositAmount?: number;
  paymentTerms: string;
  customerUploads?: CustomerUpload[];
  
  // NEW Phase 1 fields:
  clientId?: string;
  propertyId?: string;
  quoteNumber: string;
  version: number;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  termsAndConditions?: string;
  internalNotes?: string;
  totalAmount: number;
  discountAmount: number;
  discountPercentage: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  updatedAt: string;
  deletedAt?: string;
  
  // Nested (when fetched with includes)
  client?: Client;
  property?: Property;
  versions?: QuoteVersion[];
  followups?: QuoteFollowup[];
  tags?: Tag[];
}

export interface CustomerUpload {
  url: string;
  name: string;
  uploadedAt: string;
  type: string;
}

export interface JobHazardAnalysis {
    identified_hazards: string[];
    recommended_ppe: string[];
    analysis_timestamp: string;
}

export interface JobCost {
    labor: number;
    equipment: number;
    materials: number;
    disposal: number;
    total: number;
}

export interface Job {
  id: string;
  quoteId?: string;
  customerName: string;
  status: 'Unscheduled' | 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  scheduledDate?: string;
  assignedCrew: string[];
  stumpGrindingPrice?: number;
  workStartedAt?: string;
  workEndedAt?: string;
  photos?: string[];
  clockInCoordinates?: { lat: number; lng: number; };
  clockOutCoordinates?: { lat: number; lng: number; };
  jha?: JobHazardAnalysis;
  jhaAcknowledgedAt?: string;
  costs?: JobCost;
  messages?: PortalMessage[];
  jobLocation?: string;
  specialInstructions?: string;
  equipmentNeeded?: string[];
  estimatedHours?: number;
  riskLevel?: 'Low' | 'Medium' | 'High' | 'Critical';
  jhaRequired?: boolean;
  
  // NEW Phase 1 fields:
  clientId?: string;
  propertyId?: string;
  jobNumber: string;
  updatedAt: string;
  deletedAt?: string;
  
  // Nested
  client?: Client;
  property?: Property;
  tags?: Tag[];
}

export interface RouteStop {
  order: number;
  jobId: string;
  customerName: string;
  scheduledDate?: string;
  status: Job['status'];
  location: {
    lat: number;
    lng: number;
    address?: string | null;
  };
  travelDistanceMiles: number;
  travelDurationMinutes: number;
  cumulativeDriveMinutes: number;
  arrivalTimeLocal: string;
  estimatedDurationHours: number;
  assignedCrewIds: string[];
  notes?: string;
}

export interface RouteOptimizationResult {
  date: string;
  crewId?: string;
  crewName?: string;
  startLocation?: string;
  totalDistanceMiles: number;
  totalDriveMinutes: number;
  totalEstimatedHours: number;
  stops: RouteStop[];
  warnings?: string[];
  generatedAt: string;
}

export interface CrewAvailabilitySummary {
  crewId: string;
  crewName: string;
  date: string;
  totalCapacityHours: number;
  scheduledHours: number;
  availableHours: number;
  utilizationPercentage: number;
  assignments: number;
  status: 'healthy' | 'tight' | 'overbooked';
  notes?: string;
}

export interface WeatherImpact {
  jobId: string;
  jobNumber?: string;
  customerName: string;
  scheduledDate: string;
  crewIds: string[];
  location: {
    lat: number;
    lng: number;
    address?: string | null;
  };
  condition: string;
  precipProbability: number;
  windMph: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendation: string;
  advisory?: string;
}

export interface DispatchNotification {
  crewId?: string;
  crewName?: string;
  jobId: string;
  scheduledDate: string;
  message: string;
  channel: 'sms' | 'push' | 'email';
  scheduledAt: string;
}

export interface DispatchResult {
  summary: string;
  notifications: DispatchNotification[];
  generatedAt: string;
}


export interface Invoice {
  id: string;
  jobId?: string;
  clientId?: string;
  propertyId?: string;
  customerName: string;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Void';
  
  // Invoice identification
  invoiceNumber: string;
  issueDate: string;
  sentDate?: string;
  dueDate: string;
  paidAt?: string;
  
  // Line items and amounts
  lineItems: LineItem[];
  subtotal: number;
  discountAmount: number;
  discountPercentage: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  grandTotal: number;
  
  // Payment tracking
  amountPaid: number;
  amountDue: number;
  paymentTerms: string;
  
  // Customer information
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  
  // Notes
  notes?: string;
  customerNotes?: string;
  
  // Legacy field for backward compatibility
  amount: number;
  
  // Audit
  createdAt: string;
  updatedAt?: string;
  
  // Nested (when fetched with includes)
  payments?: PaymentRecord[];
  job?: Job;
  client?: Client;
  property?: Property;
}

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'Cash' | 'Check' | 'Credit Card' | 'Debit Card' | 'ACH' | 'Wire Transfer' | 'Other';
  transactionId?: string;
  referenceNumber?: string;
  notes?: string;
  recordedBy?: string;
  createdAt: string;
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
  performanceMetrics?: {
    jobsCompleted: number;
    safetyIncidents: number;
    customerRating: number; // out of 5
  };
}

export interface MaintenanceLog {
  id: string;
  date: string;
  description: string;
  cost: number;
}

export interface Equipment {
  id: string;
  name: string;
  make: string;
  model: string;
  purchaseDate: string;
  lastServiceDate: string;
  status: 'Operational' | 'Needs Maintenance' | 'Out of Service';
  assignedTo?: string;
  maintenanceHistory?: MaintenanceLog[];
}

// ============================================================================
// PHASE 1 CRM TYPES
// ============================================================================

// Client Hierarchy Types
export interface Client {
  id: string;
  
  // Basic Info
  title?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  
  // Contact
  primaryEmail?: string;
  primaryPhone?: string;
  
  // Classification
  clientType: 'residential' | 'commercial' | 'property_manager';
  industry?: string;
  
  // Status
  status: 'active' | 'inactive' | 'archived';
  leadSource?: string;
  
  // Financial
  paymentTerms: string;
  creditLimit?: number;
  taxExempt: boolean;
  
  // Billing Address
  billingAddressLine1?: string;
  billingAddressLine2?: string;
  billingCity?: string;
  billingState?: string;
  billingZip?: string;
  billingCountry: string;
  
  // Metadata
  notes?: string;
  internalNotes?: string;
  referralSource?: string;
  lifetimeValue: number;
  
  // Audit
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  deletedAt?: string;
  
  // Nested (when fetched with includes)
  properties?: Property[];
  contacts?: Contact[];
  tags?: Tag[];
  customFields?: CustomFieldValue[];
  stats?: ClientStats;
}

export interface ClientStats {
  totalQuotes: number;
  totalJobs: number;
  totalInvoices: number;
  lifetimeValue: number;
  lastJobDate?: string;
}

export interface Property {
  id: string;
  clientId: string;
  
  // Address
  propertyName?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  
  // Location
  lat?: number;
  lon?: number;
  
  // Details
  propertyType?: string;
  squareFootage?: number;
  lotSize?: number;
  
  // Access
  gateCode?: string;
  accessInstructions?: string;
  parkingInstructions?: string;
  
  // Service
  treesOnProperty?: number;
  propertyFeatures?: string[];
  
  // Status
  isPrimary: boolean;
  
  // Audit
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  
  // Nested
  client?: Client;
  contacts?: Contact[];
}

export interface Contact {
  id: string;
  clientId: string;
  propertyId?: string;
  
  // Personal
  title?: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  
  // Role
  contactType: 'general' | 'billing' | 'site_manager' | 'tenant' | 'owner';
  isPrimary: boolean;
  
  // Preferences
  preferredContactMethod: 'email' | 'phone' | 'sms';
  canApproveQuotes: boolean;
  canReceiveInvoices: boolean;
  
  // Notes
  notes?: string;
  
  // Audit
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  
  // Nested
  channels?: ContactChannel[];
  client?: Client;
  property?: Property;
}

export interface ContactChannel {
  id: string;
  contactId: string;
  channelType: 'email' | 'phone' | 'mobile' | 'fax';
  channelValue: string;
  label?: string;
  isPrimary: boolean;
  isVerified: boolean;
  bounced: boolean;
  doNotContact: boolean;
  createdAt: string;
}

// Tagging Types
export interface Tag {
  id: string;
  name: string;
  color: string;
  description?: string;
  category?: string;
  createdAt: string;
  usageCount?: number;
}

export interface EntityTag {
  id: string;
  tagId: string;
  entityType: 'client' | 'property' | 'quote' | 'job' | 'lead';
  entityId: string;
  taggedAt: string;
  taggedBy?: string;
  tag?: Tag;
}

// Custom Fields Types
export interface CustomFieldValue {
  id: string;
  fieldDefinitionId: string;
  entityType: string;
  entityId: string;
  fieldValue: string;
  createdAt: string;
  updatedAt: string;
  definition?: CustomFieldDefinition;
}

// Quote Enhancement Types
export interface QuoteVersion {
  id: string;
  quoteId: string;
  versionNumber: number;
  lineItems: LineItem[];
  totalAmount: number;
  terms?: string;
  notes?: string;
  changedBy?: string;
  changeReason?: string;
  createdAt: string;
}

export interface QuoteFollowup {
  id: string;
  quoteId: string;
  followupType: 'email' | 'call' | 'sms' | 'in_person';
  scheduledDate: string;
  subject?: string;
  message?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'skipped';
  completedAt?: string;
  completedBy?: string;
  clientResponse?: string;
  outcome?: 'interested' | 'not_interested' | 'needs_time' | 'converted';
  isAutomated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteTemplate {
  id: string;
  name: string;
  description?: string;
  lineItems: LineItem[];
  termsAndConditions?: string;
  validDays: number;
  depositPercentage: number;
  paymentTerms: string;
  serviceCategory?: string;
  isActive: boolean;
  useCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

// API Response Types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// END PHASE 1 CRM TYPES
// ============================================================================

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface ChatMessage {
  id:string;
  role: 'user' | 'model' | 'tool';
  text: string;
  sources?: GroundingSource[];
  isThinking?: boolean;
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

export interface PayrollInsight {
  totalLaborCost: number;
  laborCostPercentage: number;
  overtimeCostImpact: number;
  recommendations: string[];
}

export interface AICoreInsights {
  businessSummary: string;
  leadScores: LeadScoreSuggestion[];
  jobSchedules: JobScheduleSuggestion[];
  maintenanceAlerts: MaintenanceAlert[];
  payrollInsights: PayrollInsight;
}

// AI Tree Estimator Types
export interface SuggestedService {
    service_name: string;
    description: string;
    price_range: {
        min: number;
        max: number;
    };
}

export interface AITreeEstimate {
    tree_identification: string;
    health_assessment: string;
    measurements: {
        height_feet: number;
        canopy_width_feet: number;
        trunk_diameter_inches: number;
    };
    hazards_obstacles: string[];
    detailed_assessment: string;
    suggested_services: SuggestedService[];
    required_equipment: string[];
    required_manpower: number;
    estimated_duration_hours: number;
}

export interface EstimateFeedback {
    id: string;
    quoteId?: string;
    aiEstimateData: AITreeEstimate;
    aiSuggestedPriceMin: number;
    aiSuggestedPriceMax: number;
    actualPriceQuoted?: number;
    feedbackRating: 'accurate' | 'too_low' | 'too_high';
    correctionReasons: string[];
    userNotes?: string;
    treeSpecies?: string;
    treeHeight?: number;
    trunkDiameter?: number;
    hazards: string[];
    jobLocation?: string;
    customerName?: string;
    createdAt: string;
}

export interface EstimateFeedbackStats {
    totalFeedback: number;
    accurateCount: number;
    tooLowCount: number;
    tooHighCount: number;
    accuracyRate: number;
    averagePriceDifference: number;
    commonCorrectionReasons: { reason: string; count: number }[];
    feedbackByTreeSize: {
        small: { count: number; avgDifference: number };
        medium: { count: number; avgDifference: number };
        large: { count: number; avgDifference: number };
        extraLarge: { count: number; avgDifference: number };
    };
}

export interface UpsellSuggestion {
  service_name: string;
  description: string;
  suggested_price: number;
}

export interface MaintenanceAdvice {
  next_service_recommendation: string;
  common_issues: string[];
}

export interface CustomFieldDefinition {
  id: string;
  entityType: 'client' | 'property' | 'quote' | 'job' | 'lead';
  fieldName: string;
  fieldLabel: string;
  fieldType: 'text' | 'number' | 'date' | 'dropdown' | 'checkbox' | 'textarea';
  isRequired: boolean;
  defaultValue?: string;
  options?: string[];
  validationRules?: Record<string, any>;
  displayOrder: number;
  helpText?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  type: 'Quote' | 'Invoice' | 'Report';
  description: string;
  content: string; // For now, this will be a simple string, maybe Markdown or HTML
}

// Payroll Types
export interface PayPeriod {
  id: string;
  startDate: string;
  endDate: string;
  periodType: 'weekly' | 'bi-weekly' | 'monthly';
  status: 'Open' | 'Processing' | 'Closed';
  processedAt?: string;
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  employeeId: string;
  jobId?: string;
  clockIn: string;
  clockOut?: string;
  breakMinutes?: number;
  clockInLocation?: { lat: number; lng: number; address?: string };
  clockOutLocation?: { lat: number; lng: number; address?: string };
  clockInPhotoUrl?: string;
  clockOutPhotoUrl?: string;
  notes?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  hoursWorked?: number;
  overtimeHours?: number;
  hourlyRate: number;
  totalAmount?: number;
  createdAt: string;
  updatedAt?: string;
  
  employeeName?: string;
  jobTitle?: string;
  jobClientName?: string;
}

export interface Timesheet {
  id: string;
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  totalHours: number;
  totalRegularHours: number;
  totalOvertimeHours: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  
  employeeName?: string;
  approverName?: string;
}

export interface PayrollDeduction {
  type: string; // e.g., "Federal Tax", "State Tax", "Social Security", "Medicare", "Health Insurance"
  amount: number;
  percentage?: number;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  payPeriodId: string;
  regularHours: number;
  overtimeHours: number;
  hourlyRate: number;
  regularPay: number;
  overtimePay: number;
  bonuses: number;
  deductions: PayrollDeduction[];
  totalDeductions: number;
  grossPay: number;
  netPay: number;
  paidAt?: string;
  paymentMethod: 'Check' | 'Direct Deposit' | 'Cash';
  notes?: string;
  createdAt: string;
}

export interface PayrollSummary {
  totalEmployees: number;
  totalRegularHours: number;
  totalOvertimeHours: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  averageHourlyRate: number;
}

export interface CompanyProfile {
  id: string;
  companyName: string;
  phoneNumber?: string;
  taxEin?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  logoUrl?: string;
  tagline?: string;
  businessHours?: string;
  licenseNumber?: string;
  insurancePolicyNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobStateTransition {
  id: string;
  jobId: string;
  fromState: string | null;
  toState: string;
  changedBy: string | null;
  changedByRole: string | null;
  changeSource: 'manual' | 'automation' | 'api';
  reason: string | null;
  notes: any;
  metadata: any;
  createdAt: string;
}

export interface AllowedTransition {
  state: string;
  allowed: boolean;
  blockedReasons: string[];
}

export interface JobTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  defaultDurationHours: number | null;
  defaultCrewSize: number | null;
  defaultEquipmentIds: any;
  basePrice: number | null;
  pricePerHour: number | null;
  lineItems: any;
  permitRequired: boolean;
  depositRequired: boolean;
  depositPercentage: number | null;
  jhaRequired: boolean;
  completionChecklist: any;
  safetyNotes: string | null;
  specialInstructions: string | null;
  usageCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Crew {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  defaultStartTime?: string;
  defaultEndTime?: string;
  capacity?: number;
  memberCount?: number;
  assignmentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CrewMember {
  id: string;
  crewId: string;
  employeeId: string;
  role: string;
  joinedAt: string;
  leftAt?: string;
  employee?: Employee;
}

export interface CrewAssignment {
  id: string;
  jobId: string;
  crewId: string;
  assignedDate: string;
  assignedBy?: string;
  notes?: string;
  createdAt: string;
  job?: Job;
}

export interface RecurringJobSeries {
  id: string;
  clientId: string;
  propertyId?: string | null;
  seriesName: string;
  description?: string | null;
  serviceType?: string | null;
  recurrencePattern: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  recurrenceInterval: number;
  recurrenceDayOfWeek?: number | null;
  recurrenceDayOfMonth?: number | null;
  recurrenceMonth?: number | null;
  startDate: string;
  endDate?: string | null;
  isActive: boolean;
  jobTemplateId?: string | null;
  defaultCrewId?: string | null;
  estimatedDurationHours?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  nextOccurrence?: string | null;
  upcomingInstanceCount?: number;
}

export interface RecurringJobInstance {
  id: string;
  jobSeriesId: string;
  jobId?: string | null;
  scheduledDate: string;
  status: 'scheduled' | 'skipped' | 'created' | 'cancelled';
  createdAt: string;
  job?: Job;
}

// ============================================================================
// PHASE 2B FORM TEMPLATES TYPES
// ============================================================================

export interface FormField {
  id: string;
  type: 'text' | 'number' | 'checkbox' | 'select' | 'textarea' | 'date' | 'signature';
  label: string;
  required: boolean;
  options?: string[];
}

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  fields: FormField[];
  requireSignature?: boolean;
  requirePhotos?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JobForm {
  id: string;
  jobId: string;
  formTemplateId: string;
  formData: Record<string, any>;
  status: 'pending' | 'in_progress' | 'completed';
  completedAt?: string;
  completedBy?: string;
  createdAt: string;
  updatedAt: string;
  template?: FormTemplate;
}
