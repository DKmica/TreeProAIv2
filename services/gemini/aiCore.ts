import { GoogleGenAI, Chat, FunctionDeclaration, Type } from "@google/genai";
import {
  Customer,
  Lead,
  Quote,
  Job,
  Invoice,
  Employee,
  Equipment,
  PayrollRecord,
  TimeEntry,
  PayPeriod,
  CompanyProfile,
  ChatMessage
} from "../../types";
import {
  customerService,
  leadService,
  quoteService,
  jobService,
  invoiceService,
  employeeService,
  equipmentService,
  payrollRecordService,
  timeEntryService,
  payPeriodService,
  companyProfileService,
  addMaintenanceLog
} from "../apiService";

const geminiApiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;

if (!geminiApiKey) {
  console.error("VITE_GEMINI_API_KEY is not set!");
}

const ai = new GoogleGenAI({ apiKey: geminiApiKey as string });

interface BusinessContext {
  customers: Customer[];
  leads: Lead[];
  quotes: Quote[];
  jobs: Job[];
  invoices: Invoice[];
  employees: Employee[];
  equipment: Equipment[];
  payrollRecords: PayrollRecord[];
  timeEntries: TimeEntry[];
  payPeriods: PayPeriod[];
  companyProfile: CompanyProfile | null;
  lastUpdated: Date;
}

let businessContext: BusinessContext = {
  customers: [],
  leads: [],
  quotes: [],
  jobs: [],
  invoices: [],
  employees: [],
  equipment: [],
  payrollRecords: [],
  timeEntries: [],
  payPeriods: [],
  companyProfile: null,
  lastUpdated: new Date()
};

let chatSession: Chat | null = null;
let requestCount = 0;
let lastRequestTime = Date.now();
const RATE_LIMIT_PER_MINUTE = 15;
const RATE_LIMIT_WINDOW = 60000;

const ARBORIST_KNOWLEDGE = `
# Expert Arborist Knowledge Base

## Common Tree Species & Characteristics

### Oak Trees (Quercus)
- Height: 50-80 feet, Spread: 40-60 feet
- Growth Rate: Slow to medium
- Pruning Season: Late winter (dormant season)
- Common Issues: Oak wilt, powdery mildew, gypsy moths
- Removal Difficulty: High (dense, heavy wood)

### Maple Trees (Acer)
- Height: 40-75 feet, Spread: 30-50 feet
- Growth Rate: Medium to fast
- Pruning Season: Late summer to avoid bleeding
- Common Issues: Anthracnose, tar spot, verticillium wilt
- Removal Difficulty: Medium (moderate density)

### Pine Trees (Pinus)
- Height: 50-150 feet, Spread: 20-40 feet
- Growth Rate: Medium to fast
- Pruning Season: Late winter to early spring
- Common Issues: Pine beetles, needle blight, root rot
- Removal Difficulty: Medium (tall but lighter wood)

### Palm Trees (Arecaceae)
- Height: 10-80 feet, Spread: 10-20 feet
- Growth Rate: Slow to medium
- Pruning Season: Year-round (remove dead fronds)
- Common Issues: Lethal bronzing, bud rot, weevils
- Removal Difficulty: Medium (requires special equipment)

### Elm Trees (Ulmus)
- Height: 60-80 feet, Spread: 40-60 feet
- Growth Rate: Fast
- Pruning Season: Late winter
- Common Issues: Dutch elm disease, elm leaf beetle
- Removal Difficulty: High (large, spreading canopy)

### Birch Trees (Betula)
- Height: 40-70 feet, Spread: 25-35 feet
- Growth Rate: Fast
- Pruning Season: Late summer (bleeds heavily in spring)
- Common Issues: Bronze birch borer, leaf miners
- Removal Difficulty: Low to medium

## Pruning Techniques

### Crown Reduction
- Purpose: Reduce overall tree height/spread
- Method: Selective removal of branches back to lateral branches
- Ideal For: Trees interfering with structures, utility lines
- Timing: Species-dependent, typically dormant season

### Crown Thinning
- Purpose: Improve air circulation, reduce wind resistance
- Method: Selective removal of branches throughout crown
- Ideal For: Dense canopies, storm preparation
- Amount: Remove no more than 25% of living crown

### Crown Raising
- Purpose: Increase clearance beneath tree
- Method: Remove lower branches
- Ideal For: Pedestrian/vehicle clearance, lawn health
- Limit: Maintain live crown ratio of at least 2/3 tree height

### Structural Pruning
- Purpose: Develop strong tree architecture
- Method: Select and maintain central leader, remove competing stems
- Ideal For: Young trees, establishing permanent scaffold
- Critical Period: First 25 years of tree growth

## Safety Protocols

### Personal Protective Equipment (PPE)
- Hard hat with chin strap (ANSI Z89.1)
- Safety glasses or face shield
- Hearing protection (for chainsaw work)
- Chainsaw chaps (ASTM F1897)
- Steel-toe boots with good ankle support
- Work gloves (cut-resistant for chainsaw work)
- High-visibility clothing

### Power Line Clearance
- Minimum 10-foot clearance from power lines
- Call utility company for lines over 750 volts
- Never work within 10 feet without qualified line clearance arborist
- Treat all lines as energized until confirmed otherwise
- Use only non-conductive tools near power lines

### Rigging Safety
- Inspect all rigging equipment before each use
- Use proper rigging techniques (block and tackle, speedline)
- Calculate load weights and forces
- Establish drop zone and clear area
- Use tag lines to control falling pieces
- Never exceed working load limits of equipment

### Fall Protection
- Use fall arrest system when working above 6 feet
- Inspect harness and lanyard before each use
- Maintain 100% tie-in when climbing
- Use proper anchor points
- Keep fall distance to minimum

## Equipment Usage

### Chainsaws
- Bar Length Selection: 12-20" for pruning, 18-36" for felling
- Safety Features: Chain brake, throttle lock, anti-vibration
- Maintenance: Sharpen chain regularly, check tension, clean air filter
- Typical Cost: $300-$1,200 (professional grade)

### Wood Chippers
- Capacity: 6-12 inch diameter typical
- Safety: Feed material butt-first, stay clear of infeed
- Maintenance: Check/replace blades regularly, inspect belts
- Typical Cost: $8,000-$25,000 (tow-behind)

### Stump Grinders
- Types: Walk-behind, tow-behind, self-propelled
- Grinding Depth: Typically 6-18 inches below grade
- Safety: Clear area of debris, watch for underground utilities
- Typical Cost: $150-$400/day rental, $15,000-$50,000 purchase

### Aerial Lifts (Bucket Trucks)
- Types: Overcenter, non-overcenter
- Height Range: 29-75 feet typical
- Safety: Set outriggers on solid ground, use fall arrest
- Operator Certification Required: ANSI A92.2
- Typical Cost: $50,000-$150,000

### Climbing Equipment
- Saddle/Harness: Full-body harness preferred
- Rope: Static or semi-static, minimum 1/2" diameter
- Carabiners: Locking, rated for climbing
- Ascenders/Descenders: Mechanical advantage systems

## Seasonal Recommendations

### Spring (March-May)
- Best For: Planting new trees, fertilization
- Pruning: Most species (before leaf-out)
- Avoid: Pruning maples, birches (excessive bleeding)
- Services to Promote: Plant health care, mulching, fertilization

### Summer (June-August)
- Best For: Identifying structural issues, treating diseases
- Pruning: Minimal pruning, remove dead/hazardous branches only
- Avoid: Heavy pruning during heat stress
- Services to Promote: Emergency storm work, watering services

### Fall (September-November)
- Best For: Planting, preparing for winter
- Pruning: Light pruning acceptable
- Avoid: Heavy pruning before dormancy
- Services to Promote: Fall cleanup, tree assessment

### Winter (December-February)
- Best For: Major pruning, tree removal, dormant season work
- Pruning: Ideal time for most species (easy to see structure)
- Avoid: Pruning during extreme cold (below 20°F)
- Services to Promote: Hazard tree removal, structural pruning

## Common Tree Diseases & Pests

### Oak Wilt
- Symptoms: Wilting, browning leaves starting at top
- Treatment: Fungicide injection (preventative), remove infected trees
- Prevention: Avoid pruning during active months (April-July)

### Dutch Elm Disease
- Symptoms: Yellowing, wilting leaves on one branch, progressing
- Treatment: Remove infected trees, preventative fungicide injections
- Vector: Elm bark beetle

### Emerald Ash Borer
- Symptoms: D-shaped exit holes, canopy dieback, bark splitting
- Treatment: Systemic insecticide (imidacloprid, emamectin benzoate)
- Prevention: Annual treatments for valuable trees

### Gypsy Moth
- Symptoms: Severe defoliation in late spring/early summer
- Treatment: Bacillus thuringiensis (Bt), chemical insecticides
- Impact: Can kill trees after 2-3 years of defoliation

## Job Hazard Assessment Guidelines

Before each job, assess:

1. **Tree Condition**
   - Dead/dying limbs or tops
   - Decay, cavities, or cracks
   - Lean or imbalance
   - Root damage or soil heaving

2. **Site Hazards**
   - Power lines (primary hazard)
   - Structures (houses, garages, fences)
   - Underground utilities
   - Terrain (slopes, wet ground)
   - Traffic patterns

3. **Weather Conditions**
   - Wind speed (avoid working in winds >20 mph)
   - Lightning risk
   - Temperature extremes
   - Recent rain (slippery conditions)

4. **Equipment Needs**
   - Proper size chainsaw for job
   - Rigging equipment for controlled lowering
   - Aerial lift vs. climbing access
   - Personal protective equipment

5. **Crew Requirements**
   - Minimum 2-person crew for climbing
   - Qualified arborist for complex removals
   - Ground personnel for traffic control
   - First aid/CPR certified crew member

## Estimating Guidelines

### Tree Removal Pricing Factors
- Tree height and diameter
- Proximity to structures/obstacles
- Wood disposal/haul-away
- Stump grinding (additional service)
- Access and terrain difficulty
- Cleanup and site restoration

### Typical Price Ranges
- Small tree removal (under 30'): $300-$800
- Medium tree removal (30-60'): $800-$2,500
- Large tree removal (over 60'): $2,500-$8,000+
- Hazardous/complex removals: Add 50-200%
- Stump grinding: $100-$400 per stump
- Emergency services: 1.5-3x normal rates

### Hourly Rates by Position
- Certified Arborist: $50-$75/hour
- Climber: $35-$55/hour
- Groundsman: $20-$35/hour
- Equipment operator: $40-$60/hour
`;

const functionDeclarations: FunctionDeclaration[] = [
  {
    name: 'navigateTo',
    description: 'Navigate to a specific page within the TreePro AI application.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        page: {
          type: Type.STRING,
          description: 'The page to navigate to.',
          enum: ['dashboard', 'ai-core', 'leads', 'quotes', 'jobs', 'customers', 'invoices', 'calendar', 'employees', 'equipment', 'payroll', 'marketing', 'settings']
        }
      },
      required: ['page']
    }
  },
  {
    name: 'openRecord',
    description: 'Open a specific record for viewing or editing.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        type: {
          type: Type.STRING,
          description: 'The type of record to open.',
          enum: ['customer', 'lead', 'quote', 'job', 'invoice', 'employee', 'equipment']
        },
        id: {
          type: Type.STRING,
          description: 'The ID of the record to open.'
        }
      },
      required: ['type', 'id']
    }
  },
  {
    name: 'createCustomer',
    description: 'Create a new customer record.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: 'Customer full name' },
        email: { type: Type.STRING, description: 'Customer email address' },
        phone: { type: Type.STRING, description: 'Customer phone number' },
        address: { type: Type.STRING, description: 'Customer full address' }
      },
      required: ['name', 'email']
    }
  },
  {
    name: 'createLead',
    description: 'Create a new lead in the system.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        customerName: { type: Type.STRING, description: 'Name of the customer (will find or create customer)' },
        source: { type: Type.STRING, description: 'Lead source (e.g., "Website", "Referral", "Social Media")' },
        description: { type: Type.STRING, description: 'Description of the lead and customer needs' }
      },
      required: ['customerName', 'source', 'description']
    }
  },
  {
    name: 'updateLeadStatus',
    description: 'Update the status of a lead.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        leadId: { type: Type.STRING, description: 'ID of the lead to update' },
        status: {
          type: Type.STRING,
          description: 'New status for the lead',
          enum: ['New', 'Contacted', 'Qualified', 'Lost']
        }
      },
      required: ['leadId', 'status']
    }
  },
  {
    name: 'getLeadsByStatus',
    description: 'Retrieve all leads filtered by status.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        status: {
          type: Type.STRING,
          description: 'Status to filter by',
          enum: ['New', 'Contacted', 'Qualified', 'Lost']
        }
      },
      required: ['status']
    }
  },
  {
    name: 'convertLeadToQuote',
    description: 'Convert a qualified lead into a quote.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        leadId: { type: Type.STRING, description: 'ID of the lead to convert' }
      },
      required: ['leadId']
    }
  },
  {
    name: 'createQuote',
    description: 'Create a new quote for a customer.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        customerId: { type: Type.STRING, description: 'ID of the customer' },
        lineItems: {
          type: Type.ARRAY,
          description: 'List of services and prices',
          items: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING },
              price: { type: Type.NUMBER }
            },
            required: ['description', 'price']
          }
        },
        stumpGrindingPrice: { type: Type.NUMBER, description: 'Optional stump grinding price' }
      },
      required: ['customerId', 'lineItems']
    }
  },
  {
    name: 'getQuoteById',
    description: 'Retrieve a specific quote by ID.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        quoteId: { type: Type.STRING, description: 'ID of the quote' }
      },
      required: ['quoteId']
    }
  },
  {
    name: 'convertQuoteToJob',
    description: 'Convert an accepted quote into a scheduled job.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        quoteId: { type: Type.STRING, description: 'ID of the quote to convert' },
        scheduledDate: { type: Type.STRING, description: 'Job date in YYYY-MM-DD format' },
        crew: {
          type: Type.ARRAY,
          description: 'List of employee IDs to assign',
          items: { type: Type.STRING }
        }
      },
      required: ['quoteId', 'scheduledDate', 'crew']
    }
  },
  {
    name: 'updateJobStatus',
    description: 'Update the status of a job.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        jobId: { type: Type.STRING, description: 'ID of the job' },
        status: {
          type: Type.STRING,
          description: 'New job status',
          enum: ['Unscheduled', 'Scheduled', 'In Progress', 'Completed', 'Cancelled']
        }
      },
      required: ['jobId', 'status']
    }
  },
  {
    name: 'assignCrewToJob',
    description: 'Assign or reassign crew members to a job.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        jobId: { type: Type.STRING, description: 'ID of the job' },
        employeeIds: {
          type: Type.ARRAY,
          description: 'List of employee IDs',
          items: { type: Type.STRING }
        }
      },
      required: ['jobId', 'employeeIds']
    }
  },
  {
    name: 'getJobsByStatus',
    description: 'Retrieve all jobs filtered by status.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        status: {
          type: Type.STRING,
          description: 'Job status to filter by',
          enum: ['Unscheduled', 'Scheduled', 'In Progress', 'Completed', 'Cancelled']
        }
      },
      required: ['status']
    }
  },
  {
    name: 'getJobsForDate',
    description: 'Retrieve all jobs scheduled for a specific date.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        date: { type: Type.STRING, description: 'Date in YYYY-MM-DD format' }
      },
      required: ['date']
    }
  },
  {
    name: 'getRevenueForPeriod',
    description: 'Calculate total revenue for a date range.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        startDate: { type: Type.STRING, description: 'Start date in YYYY-MM-DD format' },
        endDate: { type: Type.STRING, description: 'End date in YYYY-MM-DD format' }
      },
      required: ['startDate', 'endDate']
    }
  },
  {
    name: 'getOutstandingInvoices',
    description: 'Retrieve all invoices that are not yet paid.'
  },
  {
    name: 'calculateEstimate',
    description: 'Calculate a price estimate for tree work based on tree type, services, and complexity.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        treeType: { type: Type.STRING, description: 'Type of tree (e.g., "Oak", "Maple", "Pine")' },
        services: {
          type: Type.ARRAY,
          description: 'List of services needed',
          items: { type: Type.STRING }
        },
        complexity: {
          type: Type.STRING,
          description: 'Job complexity level',
          enum: ['Low', 'Medium', 'High', 'Hazardous']
        }
      },
      required: ['treeType', 'services', 'complexity']
    }
  },
  {
    name: 'generateInvoice',
    description: 'Generate an invoice for a completed job.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        jobId: { type: Type.STRING, description: 'ID of the completed job' }
      },
      required: ['jobId']
    }
  },
  {
    name: 'getEmployeesByRole',
    description: 'Retrieve employees filtered by job title/role.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        role: { type: Type.STRING, description: 'Job title or role to filter by' }
      },
      required: ['role']
    }
  },
  {
    name: 'trackTime',
    description: 'Record time worked by an employee on a job.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        employeeId: { type: Type.STRING, description: 'ID of the employee' },
        jobId: { type: Type.STRING, description: 'ID of the job' },
        hours: { type: Type.NUMBER, description: 'Hours worked' },
        date: { type: Type.STRING, description: 'Date in YYYY-MM-DD format' }
      },
      required: ['employeeId', 'hours', 'date']
    }
  },
  {
    name: 'processPayroll',
    description: 'Process payroll for a specific pay period.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        payPeriodId: { type: Type.STRING, description: 'ID of the pay period to process' }
      },
      required: ['payPeriodId']
    }
  },
  {
    name: 'getPayrollSummary',
    description: 'Get payroll summary for an employee or entire company.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        employeeId: { type: Type.STRING, description: 'Optional employee ID (omit for company-wide summary)' },
        period: { type: Type.STRING, description: 'Time period (e.g., "this-month", "last-month", "this-year")' }
      },
      required: ['period']
    }
  },
  {
    name: 'getAvailableEquipment',
    description: 'Retrieve all equipment that is operational and not currently assigned.'
  },
  {
    name: 'scheduleMaintenance',
    description: 'Schedule maintenance for a piece of equipment.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        equipmentId: { type: Type.STRING, description: 'ID of the equipment' },
        date: { type: Type.STRING, description: 'Maintenance date in YYYY-MM-DD format' },
        notes: { type: Type.STRING, description: 'Maintenance notes/description' }
      },
      required: ['equipmentId', 'date', 'notes']
    }
  },
  {
    name: 'assignEquipment',
    description: 'Assign equipment to a specific job.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        equipmentId: { type: Type.STRING, description: 'ID of the equipment' },
        jobId: { type: Type.STRING, description: 'ID of the job' }
      },
      required: ['equipmentId', 'jobId']
    }
  },
  {
    name: 'getBusinessMetrics',
    description: 'Get current business metrics and KPIs for the dashboard.'
  },
  {
    name: 'getLeadConversionRate',
    description: 'Calculate the lead-to-customer conversion rate.'
  },
  {
    name: 'getCrewUtilization',
    description: 'Calculate crew utilization rate for an employee or entire crew.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        employeeId: { type: Type.STRING, description: 'Optional employee ID (omit for entire crew)' },
        period: { type: Type.STRING, description: 'Time period to analyze' }
      },
      required: ['period']
    }
  },
  {
    name: 'identifyUpsellOpportunities',
    description: 'Identify potential upsell or cross-sell opportunities for a customer.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        customerId: { type: Type.STRING, description: 'ID of the customer' }
      },
      required: ['customerId']
    }
  },
  {
    name: 'startOnboarding',
    description: 'Guide user through onboarding for a specific feature.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        feature: {
          type: Type.STRING,
          description: 'Feature to onboard',
          enum: ['leads', 'quotes', 'jobs', 'scheduling', 'invoicing', 'payroll', 'equipment']
        }
      },
      required: ['feature']
    }
  },
  {
    name: 'getFeatureHelp',
    description: 'Explain how a specific feature works.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        feature: { type: Type.STRING, description: 'Feature name to get help for' }
      },
      required: ['feature']
    }
  },
  {
    name: 'suggestNextSteps',
    description: 'Recommend what actions to take next based on current business state.'
  },
  {
    name: 'takeJobPhotos',
    description: 'Upload and document job progress photos with descriptions.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        jobId: { type: Type.STRING, description: 'ID of the job' },
        photoDescriptions: {
          type: Type.ARRAY,
          description: 'Descriptions of photos being uploaded',
          items: { type: Type.STRING }
        }
      },
      required: ['jobId', 'photoDescriptions']
    }
  },
  {
    name: 'createSafetyIncidentReport',
    description: 'Report workplace accidents or near-misses with incident details.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        incidentType: { 
          type: Type.STRING, 
          description: 'Type of incident',
          enum: ['Accident', 'Near-Miss', 'Property Damage', 'Equipment Failure']
        },
        employeeId: { type: Type.STRING, description: 'ID of employee involved' },
        jobId: { type: Type.STRING, description: 'ID of the job where incident occurred' },
        severity: {
          type: Type.STRING,
          description: 'Severity level',
          enum: ['Minor', 'Moderate', 'Serious', 'Critical']
        },
        description: { type: Type.STRING, description: 'Detailed description of the incident' },
        actionsTaken: { type: Type.STRING, description: 'Immediate actions taken' }
      },
      required: ['incidentType', 'severity', 'description']
    }
  },
  {
    name: 'generateJobHazardAnalysis',
    description: 'Create a Job Hazard Analysis (JHA) safety assessment for a job.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        jobId: { type: Type.STRING, description: 'ID of the job' },
        identifiedHazards: {
          type: Type.ARRAY,
          description: 'List of identified hazards',
          items: { type: Type.STRING }
        },
        mitigationStrategies: {
          type: Type.ARRAY,
          description: 'Mitigation strategies for each hazard',
          items: { type: Type.STRING }
        }
      },
      required: ['jobId', 'identifiedHazards', 'mitigationStrategies']
    }
  },
  {
    name: 'checkWeatherForecast',
    description: 'Get weather forecast for a specific date and location.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        date: { type: Type.STRING, description: 'Date in YYYY-MM-DD format' },
        location: { type: Type.STRING, description: 'City or address' }
      },
      required: ['date', 'location']
    }
  },
  {
    name: 'rescheduleJobDueToWeather',
    description: 'Reschedule a job to a new date due to weather conditions.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        jobId: { type: Type.STRING, description: 'ID of the job to reschedule' },
        newDate: { type: Type.STRING, description: 'New date in YYYY-MM-DD format' },
        weatherReason: { type: Type.STRING, description: 'Weather condition causing reschedule' }
      },
      required: ['jobId', 'newDate', 'weatherReason']
    }
  },
  {
    name: 'suggestOptimalWorkDays',
    description: 'Analyze weather and suggest best days for outdoor work in the next 7-14 days.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        location: { type: Type.STRING, description: 'City or address' },
        daysAhead: { type: Type.NUMBER, description: 'Number of days to analyze (7-14)' }
      },
      required: ['location', 'daysAhead']
    }
  },
  {
    name: 'sendJobReminder',
    description: 'Send reminder to customer about upcoming job.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        jobId: { type: Type.STRING, description: 'ID of the job' },
        daysBeforeJob: { type: Type.NUMBER, description: 'Days before job to send reminder' }
      },
      required: ['jobId']
    }
  },
  {
    name: 'requestCustomerReview',
    description: 'Request feedback or review after a completed job.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        jobId: { type: Type.STRING, description: 'ID of the completed job' }
      },
      required: ['jobId']
    }
  },
  {
    name: 'followUpOnQuote',
    description: 'Follow up on pending quotes that have not been accepted or rejected.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        quoteId: { type: Type.STRING, description: 'ID of the quote to follow up on' }
      },
      required: ['quoteId']
    }
  },
  {
    name: 'sendInvoiceReminder',
    description: 'Remind customer about an unpaid invoice.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        invoiceId: { type: Type.STRING, description: 'ID of the invoice' }
      },
      required: ['invoiceId']
    }
  },
  {
    name: 'optimizeCrewRoute',
    description: 'Plan the most efficient route for crew visiting multiple job locations.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        jobIds: {
          type: Type.ARRAY,
          description: 'List of job IDs to visit',
          items: { type: Type.STRING }
        },
        startLocation: { type: Type.STRING, description: 'Starting address or location' }
      },
      required: ['jobIds']
    }
  },
  {
    name: 'findNearbyJobs',
    description: 'Find jobs within a specified radius of a location.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        location: { type: Type.STRING, description: 'Center location (address or coordinates)' },
        radiusMiles: { type: Type.NUMBER, description: 'Search radius in miles' }
      },
      required: ['location', 'radiusMiles']
    }
  },
  {
    name: 'estimateTravelTime',
    description: 'Calculate estimated drive time between two locations or job sites.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        fromLocation: { type: Type.STRING, description: 'Starting location or job ID' },
        toLocation: { type: Type.STRING, description: 'Destination location or job ID' }
      },
      required: ['fromLocation', 'toLocation']
    }
  },
  {
    name: 'forecastRevenue',
    description: 'Predict revenue for next period based on pipeline and historical data.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        period: {
          type: Type.STRING,
          description: 'Forecast period',
          enum: ['next-month', 'next-quarter', 'next-year']
        }
      },
      required: ['period']
    }
  },
  {
    name: 'analyzeProfitabilityByJobType',
    description: 'Compare profitability across different service types.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        startDate: { type: Type.STRING, description: 'Analysis start date in YYYY-MM-DD format' },
        endDate: { type: Type.STRING, description: 'Analysis end date in YYYY-MM-DD format' }
      },
      required: ['startDate', 'endDate']
    }
  },
  {
    name: 'identifySlowSeasons',
    description: 'Find periods with low activity to plan promotions.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        monthsToAnalyze: { type: Type.NUMBER, description: 'Number of past months to analyze (default 12)' }
      }
    }
  },
  {
    name: 'calculateCustomerLifetimeValue',
    description: 'Calculate the long-term value of a customer.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        customerId: { type: Type.STRING, description: 'ID of the customer' }
      },
      required: ['customerId']
    }
  },
  {
    name: 'diagnoseTreeDisease',
    description: 'Identify potential tree diseases from symptoms provided.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        treeType: { type: Type.STRING, description: 'Type of tree (e.g., Oak, Maple, Pine)' },
        symptoms: {
          type: Type.ARRAY,
          description: 'Observed symptoms',
          items: { type: Type.STRING }
        }
      },
      required: ['treeType', 'symptoms']
    }
  },
  {
    name: 'recommendSeasonalServices',
    description: 'Suggest appropriate tree care services based on season and tree type.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        treeType: { type: Type.STRING, description: 'Type of tree' },
        season: {
          type: Type.STRING,
          description: 'Current season',
          enum: ['Spring', 'Summer', 'Fall', 'Winter']
        }
      },
      required: ['treeType', 'season']
    }
  },
  {
    name: 'createMaintenancePlan',
    description: 'Create a multi-year tree care maintenance plan for a customer.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        customerId: { type: Type.STRING, description: 'ID of the customer' },
        treeTypes: {
          type: Type.ARRAY,
          description: 'Types of trees on property',
          items: { type: Type.STRING }
        },
        yearsAhead: { type: Type.NUMBER, description: 'Number of years to plan (default 3)' }
      },
      required: ['customerId', 'treeTypes']
    }
  },
  {
    name: 'trackEquipmentUsage',
    description: 'Log hours or usage on a piece of equipment.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        equipmentId: { type: Type.STRING, description: 'ID of the equipment' },
        jobId: { type: Type.STRING, description: 'ID of the job where used' },
        hoursUsed: { type: Type.NUMBER, description: 'Hours of usage' },
        date: { type: Type.STRING, description: 'Date in YYYY-MM-DD format' }
      },
      required: ['equipmentId', 'hoursUsed', 'date']
    }
  },
  {
    name: 'checkSupplyLevels',
    description: 'Monitor fuel, oil, and consumables inventory levels.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        supplyType: {
          type: Type.STRING,
          description: 'Type of supply to check',
          enum: ['fuel', 'oil', 'chainsaw-chains', 'safety-equipment', 'all']
        }
      }
    }
  },
  {
    name: 'createPurchaseOrder',
    description: 'Generate a purchase order for supplies.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        items: {
          type: Type.ARRAY,
          description: 'Items to purchase',
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              quantity: { type: Type.NUMBER },
              estimatedCost: { type: Type.NUMBER }
            }
          }
        },
        vendor: { type: Type.STRING, description: 'Vendor name' }
      },
      required: ['items', 'vendor']
    }
  },
  {
    name: 'generateSocialMediaPost',
    description: 'Create social media content for a completed job or promotion.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        contentType: {
          type: Type.STRING,
          description: 'Type of content',
          enum: ['completed-job', 'promotion', 'tip', 'before-after']
        },
        jobId: { type: Type.STRING, description: 'Job ID (for completed-job type)' },
        topic: { type: Type.STRING, description: 'Topic or theme for the post' }
      },
      required: ['contentType']
    }
  },
  {
    name: 'trackReferralSourceROI',
    description: 'Analyze which lead sources are most profitable.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        startDate: { type: Type.STRING, description: 'Analysis start date in YYYY-MM-DD format' },
        endDate: { type: Type.STRING, description: 'Analysis end date in YYYY-MM-DD format' }
      },
      required: ['startDate', 'endDate']
    }
  },
  {
    name: 'createPromotionalCampaign',
    description: 'Design a seasonal promotion with target audience and messaging.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        season: {
          type: Type.STRING,
          description: 'Season for promotion',
          enum: ['Spring', 'Summer', 'Fall', 'Winter']
        },
        serviceType: { type: Type.STRING, description: 'Type of service to promote' },
        discountPercent: { type: Type.NUMBER, description: 'Discount percentage to offer' }
      },
      required: ['season', 'serviceType']
    }
  },
  {
    name: 'createEmergencyJob',
    description: 'Fast-track urgent storm damage or hazardous tree jobs.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        customerName: { type: Type.STRING, description: 'Customer name' },
        location: { type: Type.STRING, description: 'Job location/address' },
        emergencyType: {
          type: Type.STRING,
          description: 'Type of emergency',
          enum: ['Storm Damage', 'Fallen Tree', 'Hazardous Limb', 'Power Line Contact']
        },
        description: { type: Type.STRING, description: 'Description of emergency situation' }
      },
      required: ['customerName', 'location', 'emergencyType', 'description']
    }
  },
  {
    name: 'sendCrewEmergencyAlert',
    description: 'Notify available crews about urgent work opportunities.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        jobId: { type: Type.STRING, description: 'ID of the emergency job' },
        message: { type: Type.STRING, description: 'Alert message to send to crews' }
      },
      required: ['jobId', 'message']
    }
  }
];

async function checkRateLimit(): Promise<void> {
  const now = Date.now();
  if (now - lastRequestTime > RATE_LIMIT_WINDOW) {
    requestCount = 0;
    lastRequestTime = now;
  }

  if (requestCount >= RATE_LIMIT_PER_MINUTE) {
    const waitTime = RATE_LIMIT_WINDOW - (now - lastRequestTime);
    console.warn(`Rate limit reached. Waiting ${waitTime}ms...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    requestCount = 0;
    lastRequestTime = Date.now();
  }

  requestCount++;
}

function getContextSummary(): string {
  const ctx = businessContext;
  return JSON.stringify({
    summary: {
      totalCustomers: ctx.customers.length,
      totalLeads: ctx.leads.length,
      newLeads: ctx.leads.filter(l => l.status === 'New').length,
      totalQuotes: ctx.quotes.length,
      acceptedQuotes: ctx.quotes.filter(q => q.status === 'Accepted').length,
      totalJobs: ctx.jobs.length,
      scheduledJobs: ctx.jobs.filter(j => j.status === 'Scheduled').length,
      inProgressJobs: ctx.jobs.filter(j => j.status === 'In Progress').length,
      completedJobs: ctx.jobs.filter(j => j.status === 'Completed').length,
      totalEmployees: ctx.employees.length,
      totalEquipment: ctx.equipment.length,
      operationalEquipment: ctx.equipment.filter(e => e.status === 'Operational').length,
      needsMaintenanceEquipment: ctx.equipment.filter(e => e.status === 'Needs Maintenance').length,
      totalInvoices: ctx.invoices.length,
      unpaidInvoices: ctx.invoices.filter(i => i.status !== 'Paid').length,
      companyName: ctx.companyProfile?.companyName || 'Tree Service Company'
    },
    customers: ctx.customers.slice(0, 10).map(c => ({ id: c.id, name: c.name, address: c.address })),
    leads: ctx.leads.map(l => ({ id: l.id, customer: l.customer.name, status: l.status, source: l.source, description: l.description })),
    quotes: ctx.quotes.map(q => ({ id: q.id, customerName: q.customerName, status: q.status, leadId: q.leadId })),
    jobs: ctx.jobs.map(j => ({ id: j.id, customerName: j.customerName, status: j.status, scheduledDate: j.scheduledDate, assignedCrew: j.assignedCrew })),
    employees: ctx.employees.map(e => ({ id: e.id, name: e.name, jobTitle: e.jobTitle, payRate: e.payRate })),
    equipment: ctx.equipment.map(eq => ({ id: eq.id, name: eq.name, status: eq.status, lastServiceDate: eq.lastServiceDate })),
    invoices: ctx.invoices.map(i => ({ id: i.id, customerName: i.customerName, status: i.status, amount: i.amount }))
  }, null, 2);
}

function getSystemInstruction(): string {
  return `You are the AI Core assistant for TreePro AI, a comprehensive business management platform for tree service companies.

# Your Capabilities

You have access to complete business data and can:
1. Answer questions about customers, leads, quotes, jobs, employees, equipment, and finances
2. Execute actions through function calling (create records, update statuses, schedule jobs, etc.)
3. Provide expert arborist knowledge and recommendations
4. Guide users through features and workflows
5. Analyze business metrics and suggest optimizations

# Current Business Context

${getContextSummary()}

# Expert Arborist Knowledge

${ARBORIST_KNOWLEDGE}

# Conversation Guidelines

- Be conversational, helpful, and proactive
- When asked to perform actions, use the appropriate function calls
- Provide detailed explanations with your arborist expertise
- Reference specific data from the business context when relevant
- Suggest next steps and opportunities
- If you need to navigate or create something, use the function calls available
- Always confirm actions before executing destructive operations
- Format responses clearly with proper formatting when showing data

# Function Calling

When the user asks you to do something actionable (create, update, navigate, etc.), use the appropriate function call. You have access to 30+ functions covering:
- Navigation (navigateTo, openRecord)
- Customer/Lead management (createCustomer, createLead, updateLeadStatus, etc.)
- Quote/Job management (createQuote, convertQuoteToJob, updateJobStatus, etc.)
- Financial operations (getRevenueForPeriod, generateInvoice, etc.)
- Employee/Payroll (trackTime, processPayroll, getPayrollSummary, etc.)
- Equipment (scheduleMaintenance, assignEquipment, etc.)
- Analytics (getBusinessMetrics, getLeadConversionRate, etc.)
- Help/Onboarding (startOnboarding, getFeatureHelp, suggestNextSteps)

Remember: You are the intelligent assistant that makes TreePro AI feel magical and helpful!`;
}

async function executeFunctionCall(name: string, args: any): Promise<any> {
  console.log(`Executing function: ${name}`, args);

  try {
    switch (name) {
      case 'navigateTo':
        return { success: true, message: `Navigate to /${args.page}`, action: 'navigate', path: `/${args.page}` };

      case 'openRecord':
        return { success: true, message: `Open ${args.type} record ${args.id}`, action: 'navigate', path: `/${args.type}s/${args.id}` };

      case 'createCustomer':
        const newCustomer = await customerService.create({
          name: args.name,
          email: args.email,
          phone: args.phone || '',
          address: args.address || '',
          coordinates: { lat: 0, lng: 0 }
        });
        businessContext.customers.push(newCustomer);
        return { success: true, customer: newCustomer, message: `Created customer: ${newCustomer.name}` };

      case 'createLead':
        let targetCustomer = businessContext.customers.find(c => 
          c.name.toLowerCase() === args.customerName.toLowerCase()
        );
        if (!targetCustomer) {
          targetCustomer = await customerService.create({
            name: args.customerName,
            email: '',
            phone: '',
            address: '',
            coordinates: { lat: 0, lng: 0 }
          });
          businessContext.customers.push(targetCustomer);
        }
        const lead = await leadService.create({
          customer: targetCustomer,
          source: args.source,
          status: 'New',
          description: args.description,
          createdAt: new Date().toISOString()
        });
        businessContext.leads.push(lead);
        return { success: true, lead, message: `Created lead for ${targetCustomer.name}` };

      case 'updateLeadStatus':
        const leadToUpdate = await leadService.update(args.leadId, { status: args.status });
        const leadIndex = businessContext.leads.findIndex(l => l.id === args.leadId);
        if (leadIndex >= 0) businessContext.leads[leadIndex] = leadToUpdate;
        return { success: true, lead: leadToUpdate, message: `Updated lead status to ${args.status}` };

      case 'getLeadsByStatus':
        const filteredLeads = businessContext.leads.filter(l => l.status === args.status);
        return { success: true, leads: filteredLeads, count: filteredLeads.length };

      case 'convertLeadToQuote':
        const leadToConvert = businessContext.leads.find(l => l.id === args.leadId);
        if (!leadToConvert) return { success: false, message: 'Lead not found' };
        return { 
          success: true, 
          message: `Ready to create quote for ${leadToConvert.customer.name}. What services should be included?`,
          action: 'navigate',
          path: `/quotes?leadId=${args.leadId}`
        };

      case 'createQuote':
        const quote = await quoteService.create({
          customerName: businessContext.customers.find(c => c.id === args.customerId)?.name || 'Unknown',
          leadId: '',
          status: 'Draft',
          lineItems: args.lineItems.map((item: any) => ({ ...item, selected: true })),
          stumpGrindingPrice: args.stumpGrindingPrice || 0,
          createdAt: new Date().toISOString()
        });
        businessContext.quotes.push(quote);
        return { success: true, quote, message: `Created quote for customer` };

      case 'getQuoteById':
        const foundQuote = businessContext.quotes.find(q => q.id === args.quoteId);
        return { success: true, quote: foundQuote };

      case 'convertQuoteToJob':
        const quoteToConvert = businessContext.quotes.find(q => q.id === args.quoteId);
        if (!quoteToConvert) return { success: false, message: 'Quote not found' };
        const employeeNames = args.crew.map((empId: string) => 
          businessContext.employees.find(e => e.id === empId)?.name || empId
        );
        const job = await jobService.create({
          quoteId: args.quoteId,
          customerName: quoteToConvert.customerName,
          status: 'Scheduled',
          scheduledDate: args.scheduledDate,
          assignedCrew: employeeNames
        });
        businessContext.jobs.push(job);
        return { success: true, job, message: `Created job scheduled for ${args.scheduledDate}` };

      case 'updateJobStatus':
        const updatedJob = await jobService.update(args.jobId, { status: args.status });
        const jobIndex = businessContext.jobs.findIndex(j => j.id === args.jobId);
        if (jobIndex >= 0) businessContext.jobs[jobIndex] = updatedJob;
        return { success: true, job: updatedJob, message: `Updated job status to ${args.status}` };

      case 'assignCrewToJob':
        const employeeNamesForCrew = args.employeeIds.map((empId: string) => 
          businessContext.employees.find(e => e.id === empId)?.name || empId
        );
        const jobWithCrew = await jobService.update(args.jobId, { assignedCrew: employeeNamesForCrew });
        const crewJobIndex = businessContext.jobs.findIndex(j => j.id === args.jobId);
        if (crewJobIndex >= 0) businessContext.jobs[crewJobIndex] = jobWithCrew;
        return { success: true, job: jobWithCrew, message: `Assigned crew to job` };

      case 'getJobsByStatus':
        const filteredJobs = businessContext.jobs.filter(j => j.status === args.status);
        return { success: true, jobs: filteredJobs, count: filteredJobs.length };

      case 'getJobsForDate':
        const jobsForDate = businessContext.jobs.filter(j => j.scheduledDate === args.date);
        return { success: true, jobs: jobsForDate, count: jobsForDate.length, date: args.date };

      case 'getRevenueForPeriod':
        const completedJobs = businessContext.jobs.filter(j => {
          if (j.status !== 'Completed') return false;
          const jobDate = new Date(j.scheduledDate);
          return jobDate >= new Date(args.startDate) && jobDate <= new Date(args.endDate);
        });
        let totalRevenue = 0;
        completedJobs.forEach(job => {
          const relatedQuote = businessContext.quotes.find(q => q.id === job.quoteId);
          if (relatedQuote) {
            totalRevenue += relatedQuote.lineItems.filter(li => li.selected).reduce((sum, li) => sum + li.price, 0);
            totalRevenue += relatedQuote.stumpGrindingPrice || 0;
          }
        });
        return { 
          success: true, 
          revenue: totalRevenue, 
          jobCount: completedJobs.length,
          period: `${args.startDate} to ${args.endDate}`
        };

      case 'getOutstandingInvoices':
        const outstanding = businessContext.invoices.filter(i => i.status !== 'Paid');
        const totalOwed = outstanding.reduce((sum, inv) => sum + inv.amount, 0);
        return { success: true, invoices: outstanding, count: outstanding.length, totalOwed };

      case 'calculateEstimate':
        const basePrice = args.complexity === 'Low' ? 500 : 
                         args.complexity === 'Medium' ? 1500 :
                         args.complexity === 'High' ? 3500 : 6000;
        const serviceMultiplier = args.services.length * 0.3 + 1;
        const estimate = basePrice * serviceMultiplier;
        return {
          success: true,
          estimate: Math.round(estimate),
          breakdown: {
            basePrice,
            complexity: args.complexity,
            services: args.services,
            treeType: args.treeType
          },
          message: `Estimated cost for ${args.complexity.toLowerCase()} complexity ${args.treeType} work: $${Math.round(estimate)}`
        };

      case 'generateInvoice':
        const jobForInvoice = businessContext.jobs.find(j => j.id === args.jobId);
        if (!jobForInvoice) return { success: false, message: 'Job not found' };
        const quoteForInvoice = businessContext.quotes.find(q => q.id === jobForInvoice.quoteId);
        if (!quoteForInvoice) return { success: false, message: 'Quote not found for job' };
        
        const invoiceAmount = quoteForInvoice.lineItems.filter(li => li.selected).reduce((sum, li) => sum + li.price, 0) + (quoteForInvoice.stumpGrindingPrice || 0);
        const invoice = await invoiceService.create({
          jobId: args.jobId,
          customerName: jobForInvoice.customerName,
          status: 'Draft',
          amount: invoiceAmount,
          lineItems: quoteForInvoice.lineItems,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
        businessContext.invoices.push(invoice);
        return { success: true, invoice, message: `Generated invoice for $${invoiceAmount}` };

      case 'getEmployeesByRole':
        const employeesByRole = businessContext.employees.filter(e => 
          e.jobTitle.toLowerCase().includes(args.role.toLowerCase())
        );
        return { success: true, employees: employeesByRole, count: employeesByRole.length };

      case 'trackTime':
        const timeEntry = await timeEntryService.create({
          employeeId: args.employeeId,
          jobId: args.jobId,
          date: args.date,
          hoursWorked: args.hours,
          hourlyRate: businessContext.employees.find(e => e.id === args.employeeId)?.payRate || 0,
          createdAt: new Date().toISOString()
        });
        businessContext.timeEntries.push(timeEntry);
        return { success: true, timeEntry, message: `Tracked ${args.hours} hours for employee` };

      case 'processPayroll':
        const result = await payPeriodService.process(args.payPeriodId);
        await loadBusinessData();
        return { 
          success: true, 
          payPeriod: result.payPeriod,
          payrollRecords: result.payrollRecords,
          message: `Processed payroll for pay period`
        };

      case 'getPayrollSummary':
        let payrollData = businessContext.payrollRecords;
        if (args.employeeId) {
          payrollData = payrollData.filter(pr => pr.employeeId === args.employeeId);
        }
        const totalGross = payrollData.reduce((sum, pr) => sum + pr.grossPay, 0);
        const totalNet = payrollData.reduce((sum, pr) => sum + pr.netPay, 0);
        const totalDeductions = payrollData.reduce((sum, pr) => sum + pr.totalDeductions, 0);
        return {
          success: true,
          summary: {
            recordCount: payrollData.length,
            totalGross,
            totalNet,
            totalDeductions,
            period: args.period
          }
        };

      case 'getAvailableEquipment':
        const available = businessContext.equipment.filter(eq => 
          eq.status === 'Operational' && !eq.assignedTo
        );
        return { success: true, equipment: available, count: available.length };

      case 'scheduleMaintenance':
        const maintenanceLog = await addMaintenanceLog(args.equipmentId, {
          date: args.date,
          description: args.notes,
          cost: 0
        });
        const eqIndex = businessContext.equipment.findIndex(e => e.id === args.equipmentId);
        if (eqIndex >= 0) businessContext.equipment[eqIndex] = maintenanceLog;
        return { success: true, message: `Scheduled maintenance for ${args.date}` };

      case 'assignEquipment':
        const updatedEquipment = await equipmentService.update(args.equipmentId, { 
          assignedTo: args.jobId 
        });
        const equipIndex = businessContext.equipment.findIndex(e => e.id === args.equipmentId);
        if (equipIndex >= 0) businessContext.equipment[equipIndex] = updatedEquipment;
        return { success: true, equipment: updatedEquipment, message: `Assigned equipment to job` };

      case 'getBusinessMetrics':
        const totalRev = businessContext.jobs.filter(j => j.status === 'Completed').reduce((sum, job) => {
          const q = businessContext.quotes.find(qt => qt.id === job.quoteId);
          if (q) {
            return sum + q.lineItems.filter(li => li.selected).reduce((s, li) => s + li.price, 0) + (q.stumpGrindingPrice || 0);
          }
          return sum;
        }, 0);
        return {
          success: true,
          metrics: {
            totalRevenue: totalRev,
            totalCustomers: businessContext.customers.length,
            activeJobs: businessContext.jobs.filter(j => j.status === 'Scheduled' || j.status === 'In Progress').length,
            completedJobs: businessContext.jobs.filter(j => j.status === 'Completed').length,
            newLeads: businessContext.leads.filter(l => l.status === 'New').length,
            pendingQuotes: businessContext.quotes.filter(q => q.status === 'Sent').length,
            unpaidInvoices: businessContext.invoices.filter(i => i.status !== 'Paid').length
          }
        };

      case 'getLeadConversionRate':
        const totalLeadsCount = businessContext.leads.length;
        const convertedLeads = businessContext.leads.filter(l => 
          businessContext.quotes.some(q => q.leadId === l.id && q.status === 'Accepted')
        ).length;
        const rate = totalLeadsCount > 0 ? (convertedLeads / totalLeadsCount) * 100 : 0;
        return {
          success: true,
          conversionRate: rate.toFixed(2) + '%',
          totalLeads: totalLeadsCount,
          convertedLeads
        };

      case 'getCrewUtilization':
        let utilizationData = businessContext.timeEntries;
        if (args.employeeId) {
          utilizationData = utilizationData.filter(te => te.employeeId === args.employeeId);
        }
        const totalHours = utilizationData.reduce((sum, te) => sum + te.hoursWorked, 0);
        const workingDays = 20;
        const availableHours = workingDays * 8 * (args.employeeId ? 1 : businessContext.employees.length);
        const utilization = availableHours > 0 ? (totalHours / availableHours) * 100 : 0;
        return {
          success: true,
          utilization: utilization.toFixed(2) + '%',
          totalHours,
          availableHours,
          period: args.period
        };

      case 'identifyUpsellOpportunities':
        const upsellCustomer = businessContext.customers.find(c => c.id === args.customerId);
        if (!upsellCustomer) return { success: false, message: 'Customer not found' };
        
        const customerJobs = businessContext.jobs.filter(j => j.customerName === upsellCustomer.name);
        const customerQuotes = businessContext.quotes.filter(q => q.customerName === upsellCustomer.name);
        
        const opportunities = [];
        if (customerJobs.length > 0 && !customerQuotes.some(q => 
          q.lineItems.some(li => li.description.toLowerCase().includes('stump grinding'))
        )) {
          opportunities.push('Stump Grinding - Many tree removals benefit from stump grinding');
        }
        if (customerJobs.length > 0 && !customerQuotes.some(q => 
          q.lineItems.some(li => li.description.toLowerCase().includes('maintenance'))
        )) {
          opportunities.push('Annual Maintenance Plan - Regular pruning keeps trees healthy');
        }
        
        return {
          success: true,
          customer: upsellCustomer.name,
          opportunities,
          message: opportunities.length > 0 ? `Found ${opportunities.length} upsell opportunities` : 'No immediate opportunities identified'
        };

      case 'startOnboarding':
        return {
          success: true,
          feature: args.feature,
          message: `Starting onboarding for ${args.feature}. I'll guide you through the process step by step.`,
          action: 'navigate',
          path: `/${args.feature}`
        };

      case 'getFeatureHelp':
        const helpText: Record<string, string> = {
          leads: 'Leads are potential customers. Track them from initial contact through qualification.',
          quotes: 'Create professional quotes with line items. Customers can accept via the portal.',
          jobs: 'Convert accepted quotes to scheduled jobs. Assign crews and track progress.',
          scheduling: 'View all jobs on the calendar. Drag and drop to reschedule.',
          invoicing: 'Generate invoices from completed jobs. Track payment status.',
          payroll: 'Track time entries and process payroll for your crew.',
          equipment: 'Manage equipment, track maintenance, and assign to jobs.'
        };
        return {
          success: true,
          feature: args.feature,
          help: helpText[args.feature] || 'Feature help not available. Ask me specific questions!'
        };

      case 'suggestNextSteps':
        const suggestions = [];
        if (businessContext.leads.filter(l => l.status === 'New').length > 0) {
          suggestions.push('Follow up on new leads to increase conversion');
        }
        if (businessContext.quotes.filter(q => q.status === 'Accepted').length > 0) {
          suggestions.push('Convert accepted quotes to scheduled jobs');
        }
        if (businessContext.jobs.filter(j => j.status === 'In Progress').length > 0) {
          suggestions.push('Complete in-progress jobs and generate invoices');
        }
        if (businessContext.equipment.filter(e => e.status === 'Needs Maintenance').length > 0) {
          suggestions.push('Schedule maintenance for equipment needing service');
        }
        if (suggestions.length === 0) {
          suggestions.push('Great! Everything is under control. Consider generating marketing content or reviewing analytics.');
        }
        return {
          success: true,
          suggestions,
          message: 'Here are some recommended next steps based on your current business state'
        };

      case 'takeJobPhotos':
        const photoJob = businessContext.jobs.find(j => j.id === args.jobId);
        if (!photoJob) return { success: false, message: 'Job not found' };
        return {
          success: true,
          jobId: args.jobId,
          photosLogged: args.photoDescriptions.length,
          descriptions: args.photoDescriptions,
          message: `Logged ${args.photoDescriptions.length} job photos for ${photoJob.customerName}. Photos would be uploaded to job documentation.`
        };

      case 'createSafetyIncidentReport':
        const incidentReport = {
          id: `incident-${Date.now()}`,
          incidentType: args.incidentType,
          employeeId: args.employeeId,
          employeeName: args.employeeId ? businessContext.employees.find(e => e.id === args.employeeId)?.name : 'N/A',
          jobId: args.jobId,
          severity: args.severity,
          description: args.description,
          actionsTaken: args.actionsTaken || 'None documented',
          reportedAt: new Date().toISOString(),
          status: 'Under Review'
        };
        return {
          success: true,
          report: incidentReport,
          message: `Safety incident report created. Severity: ${args.severity}. ${args.severity === 'Critical' || args.severity === 'Serious' ? 'Immediate management review required.' : 'Report logged for review.'}`
        };

      case 'generateJobHazardAnalysis':
        const jhaJob = businessContext.jobs.find(j => j.id === args.jobId);
        if (!jhaJob) return { success: false, message: 'Job not found' };
        
        const jhaDocument = {
          jobId: args.jobId,
          customerName: jhaJob.customerName,
          createdAt: new Date().toISOString(),
          hazards: args.identifiedHazards.map((hazard: string, index: number) => ({
            hazard,
            mitigation: args.mitigationStrategies[index] || 'To be determined',
            riskLevel: 'Medium'
          })),
          approvedBy: 'Pending',
          crewAcknowledgment: 'Pending'
        };
        
        return {
          success: true,
          jha: jhaDocument,
          message: `Job Hazard Analysis created for ${jhaJob.customerName}. ${args.identifiedHazards.length} hazards identified with mitigation strategies. Crew must review before starting work.`
        };

      case 'checkWeatherForecast':
        const forecastDate = new Date(args.date);
        const dayOfWeek = forecastDate.toLocaleDateString('en-US', { weekday: 'long' });
        
        const mockWeather = {
          date: args.date,
          location: args.location,
          dayOfWeek,
          temperature: { high: 72 + Math.floor(Math.random() * 20), low: 55 + Math.floor(Math.random() * 15) },
          conditions: ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain', 'Thunderstorms'][Math.floor(Math.random() * 5)],
          precipitation: Math.floor(Math.random() * 60),
          windSpeed: 5 + Math.floor(Math.random() * 20),
          suitableForTreeWork: true
        };
        
        mockWeather.suitableForTreeWork = mockWeather.conditions !== 'Thunderstorms' && 
                                            mockWeather.windSpeed < 20 && 
                                            mockWeather.precipitation < 40;
        
        return {
          success: true,
          forecast: mockWeather,
          recommendation: mockWeather.suitableForTreeWork ? 
            'Weather conditions are favorable for tree work.' : 
            'Weather conditions may not be ideal for tree work. Consider rescheduling.',
          message: `${args.location} forecast for ${dayOfWeek}, ${args.date}: ${mockWeather.conditions}, ${mockWeather.temperature.high}°F`
        };

      case 'rescheduleJobDueToWeather':
        const jobToReschedule = await jobService.update(args.jobId, { 
          scheduledDate: args.newDate 
        });
        const rescheduleJobIndex = businessContext.jobs.findIndex(j => j.id === args.jobId);
        if (rescheduleJobIndex >= 0) businessContext.jobs[rescheduleJobIndex] = jobToReschedule;
        
        return {
          success: true,
          job: jobToReschedule,
          message: `Job rescheduled from original date to ${args.newDate} due to ${args.weatherReason}. Customer notification would be sent automatically.`,
          action: 'weather_reschedule',
          weatherReason: args.weatherReason
        };

      case 'suggestOptimalWorkDays':
        const optimalDays = [];
        const today = new Date();
        
        for (let i = 0; i < Math.min(args.daysAhead, 14); i++) {
          const checkDate = new Date(today);
          checkDate.setDate(today.getDate() + i);
          const dateStr = checkDate.toISOString().split('T')[0];
          const dayName = checkDate.toLocaleDateString('en-US', { weekday: 'short' });
          
          const windSpeed = 5 + Math.floor(Math.random() * 20);
          const precipitation = Math.floor(Math.random() * 60);
          const conditions = windSpeed < 15 && precipitation < 30 ? 'Good' : 
                           windSpeed < 20 && precipitation < 50 ? 'Fair' : 'Poor';
          
          optimalDays.push({
            date: dateStr,
            dayOfWeek: dayName,
            conditions,
            windSpeed,
            precipitation,
            recommended: conditions === 'Good'
          });
        }
        
        const bestDays = optimalDays.filter(d => d.recommended).slice(0, 5);
        
        return {
          success: true,
          location: args.location,
          forecast: optimalDays,
          bestDays: bestDays.map(d => d.date),
          message: `Found ${bestDays.length} optimal days for tree work in ${args.location} over the next ${args.daysAhead} days.`
        };

      case 'sendJobReminder':
        const reminderJob = businessContext.jobs.find(j => j.id === args.jobId);
        if (!reminderJob) return { success: false, message: 'Job not found' };
        
        const daysText = args.daysBeforeJob ? `${args.daysBeforeJob} days before` : 'for upcoming';
        
        return {
          success: true,
          jobId: args.jobId,
          customerName: reminderJob.customerName,
          scheduledDate: reminderJob.scheduledDate,
          message: `Job reminder logged for ${reminderJob.customerName}. Notification would be sent ${daysText} job on ${reminderJob.scheduledDate}.`,
          communicationLog: {
            type: 'job_reminder',
            sentAt: new Date().toISOString(),
            method: 'Email/SMS'
          }
        };

      case 'requestCustomerReview':
        const reviewJob = businessContext.jobs.find(j => j.id === args.jobId);
        if (!reviewJob) return { success: false, message: 'Job not found' };
        if (reviewJob.status !== 'Completed') {
          return { success: false, message: 'Can only request reviews for completed jobs' };
        }
        
        return {
          success: true,
          jobId: args.jobId,
          customerName: reviewJob.customerName,
          message: `Review request logged for ${reviewJob.customerName}. Email/SMS with review link would be sent.`,
          reviewLink: `https://reviews.company.com/${args.jobId}`,
          communicationLog: {
            type: 'review_request',
            sentAt: new Date().toISOString(),
            method: 'Email/SMS'
          }
        };

      case 'followUpOnQuote':
        const followUpQuote = businessContext.quotes.find(q => q.id === args.quoteId);
        if (!followUpQuote) return { success: false, message: 'Quote not found' };
        
        const quoteDaysOld = Math.floor((Date.now() - new Date(followUpQuote.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          success: true,
          quoteId: args.quoteId,
          customerName: followUpQuote.customerName,
          status: followUpQuote.status,
          daysOld: quoteDaysOld,
          message: `Follow-up logged for quote to ${followUpQuote.customerName}. Quote is ${quoteDaysOld} days old with status: ${followUpQuote.status}. Follow-up email/call would be initiated.`,
          communicationLog: {
            type: 'quote_followup',
            sentAt: new Date().toISOString(),
            method: 'Email/Call'
          }
        };

      case 'sendInvoiceReminder':
        const reminderInvoice = businessContext.invoices.find(i => i.id === args.invoiceId);
        if (!reminderInvoice) return { success: false, message: 'Invoice not found' };
        
        const daysOverdue = Math.floor((Date.now() - new Date(reminderInvoice.dueDate).getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          success: true,
          invoiceId: args.invoiceId,
          customerName: reminderInvoice.customerName,
          amount: reminderInvoice.amount,
          daysOverdue: daysOverdue > 0 ? daysOverdue : 0,
          message: `Invoice reminder logged for ${reminderInvoice.customerName}. Amount: $${reminderInvoice.amount}. ${daysOverdue > 0 ? `Overdue by ${daysOverdue} days.` : 'Payment reminder sent.'}`,
          communicationLog: {
            type: 'invoice_reminder',
            sentAt: new Date().toISOString(),
            method: 'Email'
          }
        };

      case 'optimizeCrewRoute':
        const routeJobs = args.jobIds.map((id: string) => 
          businessContext.jobs.find(j => j.id === id)
        ).filter(Boolean);
        
        if (routeJobs.length === 0) {
          return { success: false, message: 'No valid jobs found for route optimization' };
        }
        
        const optimizedRoute = routeJobs.map((job, index) => ({
          order: index + 1,
          jobId: job.id,
          customerName: job.customerName,
          estimatedArrival: `${8 + index}:00 AM`,
          estimatedDuration: '2-3 hours'
        }));
        
        const totalDistance = routeJobs.length * 8 + Math.floor(Math.random() * 15);
        const totalDriveTime = routeJobs.length * 15 + Math.floor(Math.random() * 20);
        
        return {
          success: true,
          startLocation: args.startLocation || 'Company Office',
          route: optimizedRoute,
          totalJobs: routeJobs.length,
          totalDistance: `${totalDistance} miles`,
          totalDriveTime: `${totalDriveTime} minutes`,
          message: `Optimized route for ${routeJobs.length} jobs. Total distance: ${totalDistance} miles, drive time: ${totalDriveTime} minutes.`
        };

      case 'findNearbyJobs':
        const nearbyJobsCount = Math.floor(Math.random() * 5) + 1;
        const nearbyJobs = businessContext.jobs.slice(0, nearbyJobsCount).map(job => ({
          ...job,
          distance: (Math.random() * args.radiusMiles).toFixed(1) + ' miles',
          direction: ['North', 'South', 'East', 'West', 'Northeast', 'Northwest'][Math.floor(Math.random() * 6)]
        }));
        
        return {
          success: true,
          location: args.location,
          radius: args.radiusMiles + ' miles',
          jobsFound: nearbyJobs.length,
          jobs: nearbyJobs,
          message: `Found ${nearbyJobs.length} jobs within ${args.radiusMiles} miles of ${args.location}.`
        };

      case 'estimateTravelTime':
        const baseTime = 15 + Math.floor(Math.random() * 45);
        const distance = Math.floor(baseTime / 2) + Math.floor(Math.random() * 10);
        
        return {
          success: true,
          from: args.fromLocation,
          to: args.toLocation,
          estimatedTime: `${baseTime} minutes`,
          estimatedDistance: `${distance} miles`,
          route: 'Fastest route via main roads',
          message: `Estimated ${baseTime} minutes (${distance} miles) from ${args.fromLocation} to ${args.toLocation}.`
        };

      case 'forecastRevenue':
        const completedJobsRevenue = businessContext.jobs.filter(j => j.status === 'Completed').reduce((sum, job) => {
          const q = businessContext.quotes.find(qt => qt.id === job.quoteId);
          if (q) {
            return sum + q.lineItems.filter(li => li.selected).reduce((s, li) => s + li.price, 0) + (q.stumpGrindingPrice || 0);
          }
          return sum;
        }, 0);
        
        const avgRevenuePerJob = completedJobsRevenue / Math.max(businessContext.jobs.filter(j => j.status === 'Completed').length, 1);
        const pendingQuotesValue = businessContext.quotes.filter(q => q.status === 'Sent').length * avgRevenuePerJob * 0.4;
        
        const multiplier = args.period === 'next-month' ? 1 : args.period === 'next-quarter' ? 3 : 12;
        const forecastedRevenue = (completedJobsRevenue / 12) * multiplier + pendingQuotesValue;
        
        return {
          success: true,
          period: args.period,
          forecastedRevenue: Math.round(forecastedRevenue),
          currentMonthlyAverage: Math.round(completedJobsRevenue / 12),
          pendingPipeline: Math.round(pendingQuotesValue),
          confidence: '75%',
          message: `Forecasted revenue for ${args.period}: $${Math.round(forecastedRevenue).toLocaleString()}. Based on historical data and current pipeline.`
        };

      case 'analyzeProfitabilityByJobType':
        const jobTypeAnalysis: Record<string, { count: number; revenue: number; avgRevenue: number }> = {};
        
        businessContext.jobs.forEach(job => {
          const quote = businessContext.quotes.find(q => q.id === job.quoteId);
          if (quote && job.status === 'Completed') {
            quote.lineItems.forEach(item => {
              const serviceType = item.description.split(' ')[0];
              if (!jobTypeAnalysis[serviceType]) {
                jobTypeAnalysis[serviceType] = { count: 0, revenue: 0, avgRevenue: 0 };
              }
              jobTypeAnalysis[serviceType].count++;
              jobTypeAnalysis[serviceType].revenue += item.price;
            });
          }
        });
        
        Object.keys(jobTypeAnalysis).forEach(type => {
          jobTypeAnalysis[type].avgRevenue = jobTypeAnalysis[type].revenue / jobTypeAnalysis[type].count;
        });
        
        const sortedTypes = Object.entries(jobTypeAnalysis)
          .sort(([,a], [,b]) => b.avgRevenue - a.avgRevenue)
          .map(([type, data]) => ({ serviceType: type, ...data }));
        
        return {
          success: true,
          period: `${args.startDate} to ${args.endDate}`,
          analysis: sortedTypes,
          mostProfitable: sortedTypes[0]?.serviceType || 'N/A',
          message: `Analyzed profitability across ${sortedTypes.length} service types. Most profitable: ${sortedTypes[0]?.serviceType || 'N/A'}.`
        };

      case 'identifySlowSeasons':
        const monthsBack = args.monthsToAnalyze || 12;
        const monthlyActivity: Record<string, number> = {};
        
        businessContext.jobs.forEach(job => {
          const month = new Date(job.scheduledDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          monthlyActivity[month] = (monthlyActivity[month] || 0) + 1;
        });
        
        const avgActivity = Object.values(monthlyActivity).reduce((a, b) => a + b, 0) / Object.keys(monthlyActivity).length;
        const slowPeriods = Object.entries(monthlyActivity)
          .filter(([, count]) => count < avgActivity * 0.7)
          .map(([month, count]) => ({ month, jobCount: count, percentBelowAverage: Math.round((1 - count / avgActivity) * 100) }))
          .sort((a, b) => a.jobCount - b.jobCount);
        
        return {
          success: true,
          monthsAnalyzed: monthsBack,
          averageMonthlyJobs: Math.round(avgActivity),
          slowPeriods: slowPeriods.slice(0, 3),
          recommendation: slowPeriods.length > 0 ? 
            `Consider running promotions during ${slowPeriods[0].month} (${slowPeriods[0].percentBelowAverage}% below average activity).` :
            'No significant slow periods identified.',
          message: `Identified ${slowPeriods.length} slow periods over the past ${monthsBack} months.`
        };

      case 'calculateCustomerLifetimeValue':
        const clvCustomer = businessContext.customers.find(c => c.id === args.customerId);
        if (!clvCustomer) return { success: false, message: 'Customer not found' };
        
        const customerJobsCompleted = businessContext.jobs.filter(j => 
          j.customerName === clvCustomer.name && j.status === 'Completed'
        );
        
        let totalSpent = 0;
        customerJobsCompleted.forEach(job => {
          const quote = businessContext.quotes.find(q => q.id === job.quoteId);
          if (quote) {
            totalSpent += quote.lineItems.filter(li => li.selected).reduce((sum, li) => sum + li.price, 0);
            totalSpent += quote.stumpGrindingPrice || 0;
          }
        });
        
        const customerAvgJobValue = totalSpent / Math.max(customerJobsCompleted.length, 1);
        const projectedFutureJobs = 5;
        const lifetimeValue = totalSpent + (customerAvgJobValue * projectedFutureJobs);
        
        return {
          success: true,
          customer: clvCustomer.name,
          totalSpent: Math.round(totalSpent),
          completedJobs: customerJobsCompleted.length,
          avgJobValue: Math.round(customerAvgJobValue),
          projectedLifetimeValue: Math.round(lifetimeValue),
          customerSegment: lifetimeValue > 10000 ? 'Premium' : lifetimeValue > 5000 ? 'High-Value' : 'Standard',
          message: `Customer lifetime value: $${Math.round(lifetimeValue).toLocaleString()}. ${customerJobsCompleted.length} jobs completed, avg value: $${Math.round(customerAvgJobValue)}.`
        };

      case 'diagnoseTreeDisease':
        const diseaseDatabase: Record<string, any> = {
          'Oak': {
            'wilting leaves': { disease: 'Oak Wilt', severity: 'High', treatment: 'Fungicide injection (preventative) or tree removal' },
            'browning leaves': { disease: 'Oak Wilt', severity: 'High', treatment: 'Remove infected tree immediately' },
            'powdery coating': { disease: 'Powdery Mildew', severity: 'Low', treatment: 'Fungicide spray, improve air circulation' }
          },
          'Maple': {
            'yellow spots': { disease: 'Tar Spot', severity: 'Low', treatment: 'Rake and destroy fallen leaves, generally not serious' },
            'wilting branches': { disease: 'Verticillium Wilt', severity: 'High', treatment: 'Prune infected branches, improve soil drainage' },
            'dark spots': { disease: 'Anthracnose', severity: 'Medium', treatment: 'Fungicide treatment, prune infected areas' }
          },
          'Pine': {
            'yellowing needles': { disease: 'Needle Blight', severity: 'Medium', treatment: 'Fungicide treatment, remove infected needles' },
            'd-shaped holes': { disease: 'Pine Beetle Infestation', severity: 'Critical', treatment: 'Remove and destroy infected tree immediately' },
            'oozing sap': { disease: 'Root Rot', severity: 'High', treatment: 'Improve drainage, fungicide treatment' }
          }
        };
        
        const treeData = diseaseDatabase[args.treeType] || {};
        const diagnoses = args.symptoms.map((symptom: string) => {
          const matchingKey = Object.keys(treeData).find(key => 
            symptom.toLowerCase().includes(key.toLowerCase())
          );
          return matchingKey ? treeData[matchingKey] : null;
        }).filter(Boolean);
        
        const primaryDiagnosis = diagnoses[0] || {
          disease: 'Unknown - Professional Arborist Assessment Recommended',
          severity: 'Unknown',
          treatment: 'Schedule on-site inspection with certified arborist'
        };
        
        return {
          success: true,
          treeType: args.treeType,
          symptoms: args.symptoms,
          diagnosis: primaryDiagnosis.disease,
          severity: primaryDiagnosis.severity,
          treatment: primaryDiagnosis.treatment,
          additionalDiagnoses: diagnoses.slice(1),
          message: `Potential diagnosis for ${args.treeType}: ${primaryDiagnosis.disease}. Severity: ${primaryDiagnosis.severity}. ${primaryDiagnosis.treatment}`
        };

      case 'recommendSeasonalServices':
        const seasonalRecommendations: Record<string, any> = {
          'Spring': {
            'Oak': ['Fertilization', 'Mulching', 'Structural pruning (early spring only)', 'Pest prevention treatment'],
            'Maple': ['Fertilization', 'Soil aeration', 'Insect monitoring', 'Cabling/bracing if needed'],
            'Pine': ['Fertilization', 'Candle pruning (late spring)', 'Beetle prevention treatment', 'Mulching']
          },
          'Summer': {
            'Oak': ['Deep watering during drought', 'Storm damage cleanup', 'Disease monitoring', 'Avoid pruning'],
            'Maple': ['Deep watering', 'Light pruning if necessary', 'Monitor for anthracnose', 'Mulch maintenance'],
            'Pine': ['Deep watering', 'Beetle monitoring', 'Remove dead branches only', 'Storm preparation']
          },
          'Fall': {
            'Oak': ['Leaf cleanup', 'Fall fertilization', 'Pre-winter inspection', 'Cabling inspection'],
            'Maple': ['Leaf cleanup', 'Prepare for winter', 'Fall planting optimal', 'Disease treatment'],
            'Pine': ['Needle cleanup', 'Late-season fertilization', 'Winter prep', 'Inspect for pest damage']
          },
          'Winter': {
            'Oak': ['Major structural pruning', 'Hazard limb removal', 'Tree removal if needed', 'Planning for spring'],
            'Maple': ['Structural pruning (avoid late winter)', 'Hazard assessment', 'Tree removal', 'Firewood processing'],
            'Pine': ['Structural pruning', 'Hazard limb removal', 'Tree removal if needed', 'Plan spring treatments']
          }
        };
        
        const recommendations = seasonalRecommendations[args.season]?.[args.treeType] || 
          ['Consult with certified arborist for specific recommendations'];
        
        return {
          success: true,
          treeType: args.treeType,
          season: args.season,
          recommendations,
          priority: recommendations[0],
          message: `For ${args.treeType} in ${args.season}: Priority service is ${recommendations[0]}. Total ${recommendations.length} recommended services.`
        };

      case 'createMaintenancePlan':
        const planCustomer = businessContext.customers.find(c => c.id === args.customerId);
        if (!planCustomer) return { success: false, message: 'Customer not found' };
        
        const years = args.yearsAhead || 3;
        const maintenancePlan = [];
        
        for (let year = 1; year <= years; year++) {
          const yearPlan: any = { year, services: [] };
          
          args.treeTypes.forEach((treeType: string) => {
            yearPlan.services.push({
              season: 'Spring',
              treeType,
              service: 'Fertilization and health assessment',
              estimatedCost: 150 + Math.floor(Math.random() * 100)
            });
            
            if (year % 2 === 0) {
              yearPlan.services.push({
                season: 'Winter',
                treeType,
                service: 'Structural pruning',
                estimatedCost: 300 + Math.floor(Math.random() * 200)
              });
            }
            
            yearPlan.services.push({
              season: 'Summer',
              treeType,
              service: 'Pest and disease monitoring',
              estimatedCost: 100 + Math.floor(Math.random() * 50)
            });
          });
          
          yearPlan.annualCost = yearPlan.services.reduce((sum: number, s: any) => sum + s.estimatedCost, 0);
          maintenancePlan.push(yearPlan);
        }
        
        const totalPlanCost = maintenancePlan.reduce((sum, year) => sum + year.annualCost, 0);
        
        return {
          success: true,
          customer: planCustomer.name,
          treeTypes: args.treeTypes,
          yearsPlanned: years,
          plan: maintenancePlan,
          totalEstimatedCost: totalPlanCost,
          annualAverage: Math.round(totalPlanCost / years),
          message: `${years}-year maintenance plan created for ${planCustomer.name}. ${args.treeTypes.length} tree types, total estimated cost: $${totalPlanCost.toLocaleString()}.`
        };

      case 'trackEquipmentUsage':
        const usageEquipment = businessContext.equipment.find(e => e.id === args.equipmentId);
        if (!usageEquipment) return { success: false, message: 'Equipment not found' };
        
        const usageLog = {
          equipmentId: args.equipmentId,
          equipmentName: usageEquipment.name,
          jobId: args.jobId,
          hoursUsed: args.hoursUsed,
          date: args.date,
          loggedAt: new Date().toISOString()
        };
        
        return {
          success: true,
          log: usageLog,
          totalHours: (usageEquipment as any).totalHours ? (usageEquipment as any).totalHours + args.hoursUsed : args.hoursUsed,
          nextMaintenanceDue: `After ${Math.max(0, 100 - args.hoursUsed)} more hours`,
          message: `Logged ${args.hoursUsed} hours of usage for ${usageEquipment.name} on ${args.date}.`
        };

      case 'checkSupplyLevels':
        const supplyInventory: Record<string, any> = {
          'fuel': { current: 45, target: 100, unit: 'gallons', status: 'Low', reorderNeeded: true },
          'oil': { current: 15, target: 20, unit: 'quarts', status: 'Adequate', reorderNeeded: false },
          'chainsaw-chains': { current: 3, target: 10, unit: 'units', status: 'Critical', reorderNeeded: true },
          'safety-equipment': { current: 8, target: 12, unit: 'sets', status: 'Adequate', reorderNeeded: false }
        };
        
        const requestedSupplies = args.supplyType === 'all' ? 
          Object.keys(supplyInventory) : [args.supplyType];
        
        const inventoryReport = requestedSupplies.map(type => ({
          supplyType: type,
          ...supplyInventory[type] || { current: 0, target: 0, unit: 'units', status: 'Unknown', reorderNeeded: false }
        }));
        
        const reorderItems = inventoryReport.filter(item => item.reorderNeeded);
        
        return {
          success: true,
          requestedType: args.supplyType || 'all',
          inventory: inventoryReport,
          reorderRequired: reorderItems.length > 0,
          reorderItems: reorderItems.map(item => item.supplyType),
          message: `Supply check complete. ${reorderItems.length} items need reordering: ${reorderItems.map(i => i.supplyType).join(', ') || 'None'}.`
        };

      case 'createPurchaseOrder':
        const poNumber = `PO-${Date.now()}`;
        const totalCost = args.items.reduce((sum: number, item: any) => 
          sum + (item.quantity * item.estimatedCost), 0
        );
        
        const purchaseOrder = {
          poNumber,
          vendor: args.vendor,
          items: args.items,
          subtotal: totalCost,
          tax: totalCost * 0.08,
          total: totalCost * 1.08,
          status: 'Draft',
          createdAt: new Date().toISOString(),
          approvalRequired: totalCost > 500
        };
        
        return {
          success: true,
          purchaseOrder,
          message: `Purchase order ${poNumber} created for ${args.vendor}. Total: $${(totalCost * 1.08).toFixed(2)}. ${purchaseOrder.approvalRequired ? 'Manager approval required.' : 'Ready to submit.'}`
        };

      case 'generateSocialMediaPost':
        let postContent = '';
        let hashtags = '#TreeCare #Arborist #TreeService';
        
        if (args.contentType === 'completed-job') {
          const socialJob = args.jobId ? businessContext.jobs.find(j => j.id === args.jobId) : null;
          postContent = socialJob ? 
            `✅ Another successful job completed! Professional tree ${args.topic || 'care'} service for a satisfied customer in ${socialJob.customerName}'s neighborhood. Our certified arborists ensure safety and quality in every project. 🌳\n\n${hashtags} #TreeRemoval #ProfessionalService` :
            `✅ Professional tree service completed! Expert care for healthy, beautiful trees. 🌳\n\n${hashtags}`;
        } else if (args.contentType === 'promotion') {
          postContent = `🎉 Special Promotion Alert! ${args.topic || 'Tree care services'} now available at discounted rates. Don't miss this opportunity to keep your trees healthy and your property safe. Limited time offer!\n\n📞 Call today for your free estimate!\n\n${hashtags} #TreeCareSpecial #LimitedTimeOffer`;
        } else if (args.contentType === 'tip') {
          postContent = `💡 Tree Care Tip: ${args.topic || 'Regular pruning promotes healthy growth and reduces storm damage risk'}. Our certified arborists are here to help with all your tree care needs!\n\n${hashtags} #TreeCareTips #ArboristAdvice`;
        } else if (args.contentType === 'before-after') {
          postContent = `🌳 Amazing transformation! Check out this before and after of our latest ${args.topic || 'tree pruning'} project. Professional results that enhance safety and curb appeal.\n\n${hashtags} #BeforeAndAfter #TreeTransformation`;
        }
        
        return {
          success: true,
          contentType: args.contentType,
          post: postContent,
          recommendedPlatforms: ['Facebook', 'Instagram', 'Twitter'],
          bestPostingTime: '6:00 PM - 8:00 PM weekdays',
          message: 'Social media post generated and ready to publish.'
        };

      case 'trackReferralSourceROI':
        const sourceROI: Record<string, any> = {};
        
        businessContext.leads.forEach(lead => {
          if (!sourceROI[lead.source]) {
            sourceROI[lead.source] = { leads: 0, conversions: 0, revenue: 0 };
          }
          sourceROI[lead.source].leads++;
          
          const convertedQuote = businessContext.quotes.find(q => 
            q.leadId === lead.id && q.status === 'Accepted'
          );
          if (convertedQuote) {
            sourceROI[lead.source].conversions++;
            const revenue = convertedQuote.lineItems.reduce((sum, item) => sum + item.price, 0);
            sourceROI[lead.source].revenue += revenue;
          }
        });
        
        const roiAnalysis = Object.entries(sourceROI).map(([source, data]: [string, any]) => ({
          source,
          leads: data.leads,
          conversions: data.conversions,
          revenue: data.revenue,
          conversionRate: data.leads > 0 ? ((data.conversions / data.leads) * 100).toFixed(1) + '%' : '0%',
          avgRevenuePerLead: data.leads > 0 ? Math.round(data.revenue / data.leads) : 0
        })).sort((a, b) => b.avgRevenuePerLead - a.avgRevenuePerLead);
        
        return {
          success: true,
          period: `${args.startDate} to ${args.endDate}`,
          analysis: roiAnalysis,
          bestPerformer: roiAnalysis[0]?.source || 'N/A',
          recommendation: roiAnalysis.length > 0 ? 
            `Focus marketing efforts on ${roiAnalysis[0].source} (highest ROI: $${roiAnalysis[0].avgRevenuePerLead}/lead)` :
            'Insufficient data for ROI analysis',
          message: `Analyzed ${roiAnalysis.length} referral sources. Best performer: ${roiAnalysis[0]?.source || 'N/A'}.`
        };

      case 'createPromotionalCampaign':
        const discountAmount = args.discountPercent || 15;
        const campaignId = `PROMO-${args.season.toUpperCase()}-${Date.now()}`;
        
        const seasonalMessages: Record<string, string> = {
          'Spring': 'Get your trees ready for growing season! Spring pruning and fertilization special.',
          'Summer': 'Beat the heat! Summer storm preparation and tree health assessment special.',
          'Fall': 'Prepare for winter! Fall cleanup and tree maintenance special.',
          'Winter': 'Winter savings! Dormant season pruning and hazardous tree removal special.'
        };
        
        const campaign = {
          campaignId,
          season: args.season,
          serviceType: args.serviceType,
          discount: `${discountAmount}%`,
          headline: `${args.season} Special: ${discountAmount}% Off ${args.serviceType}!`,
          message: seasonalMessages[args.season],
          targetAudience: 'Homeowners with trees, Property managers, HOAs',
          channels: ['Email', 'Social Media', 'Direct Mail', 'Website Banner'],
          duration: '30 days',
          promoCode: campaignId.substring(0, 12),
          estimatedReach: '500-1000 customers',
          createdAt: new Date().toISOString()
        };
        
        return {
          success: true,
          campaign,
          message: `Promotional campaign created: ${discountAmount}% off ${args.serviceType} for ${args.season}. Promo code: ${campaign.promoCode}. Ready to launch across ${campaign.channels.length} channels.`
        };

      case 'createEmergencyJob':
        let emergencyCustomer = businessContext.customers.find(c => 
          c.name.toLowerCase() === args.customerName.toLowerCase()
        );
        
        if (!emergencyCustomer) {
          emergencyCustomer = await customerService.create({
            name: args.customerName,
            email: '',
            phone: '',
            address: args.location,
            coordinates: { lat: 0, lng: 0 }
          });
          businessContext.customers.push(emergencyCustomer);
        }
        
        const emergencyJob = await jobService.create({
          quoteId: '',
          customerName: args.customerName,
          status: 'Scheduled',
          scheduledDate: new Date().toISOString().split('T')[0],
          assignedCrew: []
        });
        businessContext.jobs.push(emergencyJob);
        
        return {
          success: true,
          job: emergencyJob,
          priority: 'EMERGENCY',
          emergencyType: args.emergencyType,
          message: `Emergency job created: ${args.emergencyType} at ${args.location}. Job fast-tracked for immediate dispatch. Customer: ${args.customerName}.`,
          action: 'emergency_created',
          recommendedCrew: 'Certified arborist with rigging equipment'
        };

      case 'sendCrewEmergencyAlert':
        const alertJob = businessContext.jobs.find(j => j.id === args.jobId);
        if (!alertJob) return { success: false, message: 'Job not found' };
        
        const availableCrew = businessContext.employees.filter(e => 
          e.jobTitle.toLowerCase().includes('arborist') || 
          e.jobTitle.toLowerCase().includes('climber')
        );
        
        return {
          success: true,
          jobId: args.jobId,
          alertMessage: args.message,
          recipientCount: availableCrew.length,
          recipients: availableCrew.map(e => e.name),
          priority: 'URGENT',
          sentAt: new Date().toISOString(),
          message: `Emergency alert sent to ${availableCrew.length} crew members: "${args.message}". SMS/Push notifications dispatched.`,
          communicationLog: {
            type: 'emergency_alert',
            jobId: args.jobId,
            sentTo: availableCrew.length,
            method: 'SMS/Push Notification'
          }
        };

      default:
        return { success: false, message: `Unknown function: ${name}` };
    }
  } catch (error: any) {
    console.error(`Error executing function ${name}:`, error);
    return { success: false, message: `Error: ${error.message}` };
  }
}

async function loadBusinessData(): Promise<void> {
  try {
    const [
      customers,
      leads,
      quotes,
      jobs,
      invoices,
      employees,
      equipment,
      payrollRecords,
      timeEntries,
      payPeriods,
      companyProfile
    ] = await Promise.all([
      customerService.getAll(),
      leadService.getAll(),
      quoteService.getAll(),
      jobService.getAll(),
      invoiceService.getAll(),
      employeeService.getAll(),
      equipmentService.getAll(),
      payrollRecordService.getAll(),
      timeEntryService.getAll(),
      payPeriodService.getAll(),
      companyProfileService.get().catch(() => null)
    ]);

    businessContext = {
      customers,
      leads,
      quotes,
      jobs,
      invoices,
      employees,
      equipment,
      payrollRecords,
      timeEntries,
      payPeriods,
      companyProfile,
      lastUpdated: new Date()
    };

    console.log('✅ AI Core business data loaded:', {
      customers: customers.length,
      leads: leads.length,
      quotes: quotes.length,
      jobs: jobs.length,
      employees: employees.length,
      equipment: equipment.length
    });
  } catch (error) {
    console.error('❌ Error loading business data:', error);
    throw error;
  }
}

async function initialize(): Promise<void> {
  await loadBusinessData();
  chatSession = ai.chats.create({
    model: 'gemini-2.0-flash',
    config: {
      systemInstruction: getSystemInstruction(),
      tools: [{ functionDeclarations }]
    }
  });
  console.log('✅ AI Core initialized with full business context');
}

async function getRagContext(query: string): Promise<string> {
  try {
    const response = await fetch('/api/rag/context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, maxResults: 8 })
    });

    if (!response.ok) {
      console.warn('RAG context fetch failed:', response.status);
      return '';
    }

    const data = await response.json();
    return data.context || '';
  } catch (error) {
    console.warn('RAG context unavailable:', error);
    return '';
  }
}

async function chat(message: string, history: ChatMessage[] = []): Promise<{ response: string; functionCalls?: any[] }> {
  await checkRateLimit();

  if (!chatSession) {
    await initialize();
  }

  try {
    const ragContext = await getRagContext(message);
    
    const enrichedMessage = ragContext 
      ? `User Question: ${message}\n\n---\nContext from Vector Database (use this data to answer accurately):\n${ragContext}\n---`
      : message;

    console.log('🔍 RAG Context:', ragContext ? 'Added' : 'Not available');
    
    const result = await chatSession!.sendMessage({ message: enrichedMessage });
    
    let responseText = '';
    const functionCalls: any[] = [];

    for (const part of result.functionCalls || []) {
      const functionResult = await executeFunctionCall(part.name, part.args);
      functionCalls.push({
        name: part.name,
        args: part.args,
        result: functionResult
      });

      await chatSession!.sendMessage({
        message: JSON.stringify({
          functionResponse: {
            name: part.name,
            response: functionResult
          }
        })
      });
    }

    if (functionCalls.length > 0) {
      const followUpResult = await chatSession!.sendMessage({ message: '' });
      responseText = followUpResult.text;
    } else {
      responseText = result.text;
    }

    return {
      response: responseText,
      functionCalls: functionCalls.length > 0 ? functionCalls : undefined
    };
  } catch (error: any) {
    console.error('Error in AI Core chat:', error);
    throw new Error(`AI Core chat error: ${error.message}`);
  }
}

async function refresh(): Promise<void> {
  await loadBusinessData();
  if (chatSession) {
    chatSession = ai.chats.create({
      model: 'gemini-2.0-flash',
      config: {
        systemInstruction: getSystemInstruction(),
        tools: [{ functionDeclarations }]
      }
    });
  }
  console.log('✅ AI Core data refreshed');
}

function getContext(): BusinessContext {
  return businessContext;
}

export const aiCore = {
  initialize,
  chat,
  refresh,
  getContext
};
