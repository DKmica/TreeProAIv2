
import React, { useEffect, useRef, useState } from 'react';
import { Job, Employee, Customer } from '../types';
import { loadGoogleMapsScript } from '../services/mapsLoader';
import SpinnerIcon from './icons/SpinnerIcon';

// Add type declarations for Google Maps API to satisfy TypeScript compiler
// in absence of @types/google.maps. This allows using google.maps.* types
// and window.google.
declare global {
    namespace google {
        namespace maps {
            interface LatLng {}
            
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
        }
    }
    interface Window {
        google: typeof google;
    }
}

interface MapViewProps {
    jobs: Job[];
    employees: Employee[];
    customers: Customer[];
    selectedJobId: string | null;
    onJobSelect: (jobId: string | null) => void;
}

const MapView: React.FC<MapViewProps> = ({ jobs, employees, customers, selectedJobId, onJobSelect }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<google.maps.Map | null>(null);
    const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
    const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [mapError, setMapError] = useState<string | null>(null);

    useEffect(() => {
        loadGoogleMapsScript()
            .then(() => {
                setMapLoaded(true);
            })
            .catch(error => {
                console.error(error);
                setMapError(error.message);
            });
    }, []);

    useEffect(() => {
        if (!mapLoaded) return;

        if (mapRef.current && !mapInstance.current && window.google?.maps?.marker) {
            const map = new window.google.maps.Map(mapRef.current, {
                center: { lat: 39.8283, lng: -98.5795 }, // Center of US
                zoom: 4,
                mapId: 'TREEPRO_AI_MAP' // Custom map ID for styling
            });
            mapInstance.current = map;
            infoWindowRef.current = new window.google.maps.InfoWindow();

            // Add a single listener to close info window and deselect job when map is clicked
            map.addListener('click', () => {
                infoWindowRef.current?.close();
                onJobSelect(null);
            });
        }
    }, [mapLoaded, onJobSelect]);

    useEffect(() => {
        if (!mapLoaded) return;

        const map = mapInstance.current;
        const infoWindow = infoWindowRef.current;
        if (!map || !infoWindow) return;

        // Clear previous markers from the map
        markersRef.current.forEach(marker => {
            marker.map = null;
        });
        markersRef.current = [];

        const newMarkers: google.maps.marker.AdvancedMarkerElement[] = [];

        // Add Job Markers
        const activeJobs = jobs.filter(job => job.status === 'Scheduled' || job.status === 'In Progress');
        activeJobs.forEach(job => {
            const customer = customers.find(c => c.name === job.customerName);
            if (!customer?.coordinates || (customer.coordinates.lat === 0 && customer.coordinates.lng === 0)) return;
            
            const isSelected = job.id === selectedJobId;

            const jobPin = new google.maps.marker.PinElement({
                background: isSelected ? '#ca8a04' : (job.status === 'In Progress' ? '#1d4ed8' : '#16a34a'), // Gold for selected, Blue for 'In Progress', Green for 'Scheduled'
                borderColor: '#fff',
                glyphColor: '#fff',
                scale: isSelected ? 1.4 : 1.0,
            });

            const marker = new google.maps.marker.AdvancedMarkerElement({
                position: customer.coordinates,
                map,
                title: `Job: ${job.id}`,
                content: jobPin.element,
                zIndex: isSelected ? 10 : 1, // Bring selected marker to front
            });

            const content = `
                <div style="font-family: sans-serif; color: #334155; padding: 5px;">
                    <h3 style="font-weight: 600; font-size: 1.125rem; margin: 0 0 8px 0; color: #1e293b;">Job: ${job.id}</h3>
                    <p style="margin: 2px 0;"><strong>Customer:</strong> ${job.customerName}</p>
                    <p style="margin: 2px 0;"><strong>Status:</strong> ${job.status}</p>
                    <p style="margin: 2px 0;"><strong>Date:</strong> ${job.scheduledDate}</p>
                </div>`;

            marker.addListener('click', (e: MouseEvent) => {
                e.stopPropagation(); // Prevent map click from firing immediately
                infoWindow.setContent(content);
                infoWindow.open({
                    anchor: marker,
                    map,
                });
                map.setZoom(15);
                map.setCenter(marker.position as google.maps.LatLng);
                onJobSelect(job.id);
            });
            newMarkers.push(marker);
        });

        // Add Employee Markers
        employees.forEach(employee => {
            if (!employee.coordinates || (employee.coordinates.lat === 0 && employee.coordinates.lng === 0)) return;

            const crewPin = new google.maps.marker.PinElement({
                background: '#f97316', // Orange for crew
                borderColor: '#fff',
                glyph: 'E', // Using a simple 'E' for Employee for better clarity
                glyphColor: '#fff',
            });

            const marker = new google.maps.marker.AdvancedMarkerElement({
                position: employee.coordinates,
                map,
                title: `Crew: ${employee.name}`,
                content: crewPin.element,
            });

            const content = `
                <div style="font-family: sans-serif; color: #334155; padding: 5px;">
                    <h3 style="font-weight: 600; font-size: 1.125rem; margin: 0 0 8px 0; color: #1e293b;">Crew: ${employee.name}</h3>
                    <p style="margin: 2px 0;"><strong>Title:</strong> ${employee.jobTitle}</p>
                </div>`;
            
            marker.addListener('click', () => {
                infoWindow.setContent(content);
                infoWindow.open({
                    anchor: marker,
                    map,
                });
            });
            newMarkers.push(marker);
        });

        markersRef.current = newMarkers;

        // Auto-center and open info window if a job is selected from the list
        if (selectedJobId) {
            const job = jobs.find(j => j.id === selectedJobId);
            const customer = customers.find(c => c.name === job?.customerName);
            if (customer?.coordinates && (customer.coordinates.lat !== 0 || customer.coordinates.lng !== 0)) {
                map.setZoom(15);
                map.setCenter(customer.coordinates);
                 // Open info window for selected job
                const selectedMarker = newMarkers.find(m => m.title?.startsWith(`Job: ${selectedJobId}`));
                if (selectedMarker) {
                    const content = `
                    <div style="font-family: sans-serif; color: #334155; padding: 5px;">
                        <h3 style="font-weight: 600; font-size: 1.125rem; margin: 0 0 8px 0; color: #1e293b;">Job: ${job.id}</h3>
                        <p style="margin: 2px 0;"><strong>Customer:</strong> ${job.customerName}</p>
                        <p style="margin: 2px 0;"><strong>Status:</strong> ${job.status}</p>
                        <p style="margin: 2px 0;"><strong>Date:</strong> ${job.scheduledDate}</p>
                    </div>`;
                    infoWindow.setContent(content);
                    infoWindow.open({ anchor: selectedMarker, map });
                }
            }
        }

    }, [jobs, employees, customers, mapLoaded, selectedJobId, onJobSelect]);

    if (mapError) {
        return (
             <div className="flex flex-col items-center justify-center h-full bg-red-50 text-red-800 p-4 text-center rounded-lg" role="alert">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="mt-3 font-semibold">Map Error</p>
                <p className="mt-2 text-sm">{mapError}</p>
                 <p className="mt-1 text-xs">This often indicates a problem with the Google Maps API key, such as billing not being enabled for the associated project.</p>
                <a 
                  href="https://developers.google.com/maps/documentation/javascript/error-messages#billing-not-enabled-map-error"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Troubleshooting Guide
                </a>
            </div>
        );
    }
    
    if (!mapLoaded) {
        return (
            <div className="flex items-center justify-center h-full">
                <SpinnerIcon className="h-8 w-8 text-brand-green-600" />
                <p className="ml-3 text-brand-gray-600">Loading Map...</p>
            </div>
        );
    }

    return <div ref={mapRef} style={{ width: '100%', height: '100%' }} role="application" aria-label="Map of jobs and crews"/>;
};

export default MapView;
