

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

export interface LineItem {
  description: string;
  price: number;
  selected: boolean;
}

export interface Quote {
  id: string;
  leadId: string;
  customerName: string;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Declined';
  lineItems: LineItem[];
  stumpGrindingPrice: number; // 0 if not included
  createdAt: string;
  signature?: string; // Base64 encoded image
  acceptedAt?: string; // ISO date string
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
  quoteId: string;
  customerName: string;
  status: 'Unscheduled' | 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  scheduledDate: string;
  assignedCrew: string[];
  stumpGrindingPrice?: number;
  workStartedAt?: string;
  workEndedAt?: string;
  photos?: string[];
  clockInCoordinates?: { lat: number; lng: number; };
  clockOutCoordinates?: { lat: number; lng: number; };
  jha?: JobHazardAnalysis;
  costs?: JobCost;
}


export interface Invoice {
  id: string;
  jobId: string;
  customerName: string;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
  amount: number;
  lineItems: LineItem[];
  dueDate: string;
  paidAt?: string; // ISO date string
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

export interface AICoreInsights {
  businessSummary: string;
  leadScores: LeadScoreSuggestion[];
  jobSchedules: JobScheduleSuggestion[];
  maintenanceAlerts: MaintenanceAlert[];
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

export interface UpsellSuggestion {
  service_name: string;
  description: string;
  suggested_price: number;
}

export interface MaintenanceAdvice {
  next_service_recommendation: string;
  common_issues: string[];
}

export interface OptimizedRoute {
  orderedJobs: Job[];
  totalDistance: string;
  totalDuration: string;
  googleMapsUrl: string;
}

// Add type declarations for Google Maps API to satisfy TypeScript compiler
// in absence of @types/google.maps. This allows using google.maps.* types
// and window.google.
declare global {
    namespace google {
        namespace maps {
            interface LatLngLiteral { lat: number; lng: number; }
            type LatLng = LatLngLiteral;
            
            class Map {
                constructor(mapDiv: Element | null, opts?: any);
                setZoom(zoom: number): void;
                setCenter(latLng: LatLng | any): void;
                addListener(eventName: string, handler: (...args: any[]) => void): void;
                [key: string]: any;
            }
            class InfoWindow {
                constructor(opts?: any);
                setContent(content: string | Node): void;
                open(options?: any): void;
                close(): void;
            }
            namespace marker {
                class AdvancedMarkerElement {
                    constructor(options?: any);
                    set map(map: Map | null);
                    get position(): LatLng | null;
                    addListener(eventName: string, handler: (...args: any[]) => void): void;
                    [key: string]: any;
                }
                class PinElement {
                    constructor(options?: any);
                    get element(): HTMLElement;
                }
            }
            
            // For Directions Service
            class DirectionsService {
                route(request: DirectionsRequest, callback: (result: DirectionsResult | null, status: DirectionsStatus) => void): void;
            }
            class DirectionsRenderer {
                constructor(opts?: DirectionsRendererOptions);
                setMap(map: Map | null): void;
                setDirections(directions: DirectionsResult | null): void;
            }
            interface DirectionsRequest {
                origin: LatLng | string;
                destination: LatLng | string;
                waypoints?: DirectionsWaypoint[];
                optimizeWaypoints?: boolean;
                travelMode: TravelMode;
            }
            interface DirectionsWaypoint {
                location: LatLng | string;
                stopover?: boolean;
            }
            enum TravelMode { DRIVING = 'DRIVING' }
            enum DirectionsStatus { OK = 'OK' }
            interface DirectionsResult {
                routes: DirectionsRoute[];
            }
            interface DirectionsRoute { }
            interface DirectionsRendererOptions {
                map?: Map;
                directions?: DirectionsResult;
                suppressMarkers?: boolean;
            }
        }
    }
    interface Window {
        google: typeof google;
    }
}
