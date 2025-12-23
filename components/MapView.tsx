
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Job, Employee, Customer, RouteOptimizationResult } from '../types';
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
            class Polyline {
                constructor(options?: any);
                setOptions(options: any): void;
                setMap(map: Map | null): void;
                [key: string]: any;
            }
            class LatLngBounds {
                constructor(sw?: any, ne?: any);
                extend(latLng: any): void;
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
    routePlan?: RouteOptimizationResult | null;
}

const MapView: React.FC<MapViewProps> = ({ jobs, employees, customers, selectedJobId, onJobSelect, routePlan }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<google.maps.Map | null>(null);
    const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
    const routeLineRef = useRef<google.maps.Polyline | null>(null);
    const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [mapError, setMapError] = useState<string | null>(null);

    const orderedRouteStops = useMemo(() => {
        if (!routePlan?.stops) return [];
        return [...routePlan.stops]
            .filter(stop => stop.location?.lat !== undefined && stop.location?.lng !== undefined)
            .sort((a, b) => a.order - b.order);
    }, [routePlan]);

    const routePath = useMemo(() => {
        if (routePlan?.routePath?.length) return routePlan.routePath;
        return orderedRouteStops.map(stop => stop.location);
    }, [orderedRouteStops, routePlan]);

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
        const activeJobs = jobs.filter(job => job.status === 'scheduled' || job.status === 'en_route' || job.status === 'on_site' || job.status === 'in_progress');
        activeJobs.forEach(job => {
            // Get coordinates from various sources
            let coords: { lat: number; lng: number } | null = null;
            const jobAny = job as any;
            
            // 1. Try job's own coordinates (job_lat/job_lon from DB)
            if (jobAny.jobLat && jobAny.jobLon) {
                coords = { lat: parseFloat(jobAny.jobLat), lng: parseFloat(jobAny.jobLon) };
            }
            // 2. Try job's property coordinates
            else if (jobAny.property?.lat && jobAny.property?.lon) {
                coords = { lat: parseFloat(jobAny.property.lat), lng: parseFloat(jobAny.property.lon) };
            }
            // 3. Fallback to customer lookup (legacy support)
            else {
                const customer = customers.find(c => c.name === job.customerName);
                if (customer?.coordinates && (customer.coordinates.lat !== 0 || customer.coordinates.lng !== 0)) {
                    coords = customer.coordinates;
                }
            }
            
            if (!coords || (coords.lat === 0 && coords.lng === 0)) return;

            const isSelected = job.id === selectedJobId;
            const routeStop = orderedRouteStops.find(stop => stop.jobId === job.id);

            const getStatusColor = (status: string) => {
                switch(status) {
                    case 'in_progress': return '#1d4ed8';
                    case 'en_route': return '#0284c7';
                    case 'on_site': return '#ea580c';
                    default: return '#16a34a';
                }
            };

            const jobPin = new google.maps.marker.PinElement({
                background: isSelected
                    ? '#ca8a04'
                    : routeStop
                        ? '#0ea5e9'
                        : getStatusColor(job.status),
                borderColor: '#fff',
                glyphColor: '#fff',
                glyph: routeStop ? `${routeStop.order}` : undefined,
                scale: isSelected ? 1.4 : routeStop ? 1.2 : 1.0,
            });

            const marker = new google.maps.marker.AdvancedMarkerElement({
                position: coords,
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

            marker.addListener('click', (e: any) => {
                e.domEvent.stopPropagation(); // Prevent map click from firing immediately
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
            const coords = employee.coordinates;
            if (!coords) return;
            
            const lat = typeof coords.lat === 'number' ? coords.lat : parseFloat(String(coords.lat));
            const lng = typeof coords.lng === 'number' ? coords.lng : parseFloat(String(coords.lng));
            
            if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return;

            const validPosition = { lat, lng };

            const crewPin = new google.maps.marker.PinElement({
                background: '#f97316', // Orange for crew
                borderColor: '#fff',
                glyphText: 'E', // Using a simple 'E' for Employee for better clarity
                glyphColor: '#fff',
            });

            const marker = new google.maps.marker.AdvancedMarkerElement({
                position: validPosition,
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
            if (job) {
                // Get coordinates using same logic as marker creation
                let jobCoords: { lat: number; lng: number } | null = null;
                if ((job as any).property?.lat && (job as any).property?.lon) {
                    jobCoords = { lat: (job as any).property.lat, lng: (job as any).property.lon };
                } else if ((job as any).lat && (job as any).lng) {
                    jobCoords = { lat: (job as any).lat, lng: (job as any).lng };
                } else {
                    const customer = customers.find(c => c.name === job.customerName);
                    if (customer?.coordinates && (customer.coordinates.lat !== 0 || customer.coordinates.lng !== 0)) {
                        jobCoords = customer.coordinates;
                    }
                }
                
                if (jobCoords) {
                    map.setZoom(15);
                    map.setCenter(jobCoords);
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
        }

        // Draw route polyline
        if (routeLineRef.current) {
            routeLineRef.current.setMap(null);
            routeLineRef.current = null;
        }

        if (routePath.length >= 2) {
            const line = new google.maps.Polyline({
                path: routePath,
                map,
                strokeColor: '#0ea5e9',
                strokeOpacity: 0.85,
                strokeWeight: 4,
                icons: [
                    {
                        icon: {
                            path: 'M 0,-1 0,1',
                            strokeOpacity: 1,
                            scale: 2
                        },
                        offset: '0',
                        repeat: '30px'
                    }
                ]
            });

            // Fit bounds to route if present
            const bounds = new google.maps.LatLngBounds();
            routePath.forEach(point => bounds.extend(point));
            map.fitBounds(bounds);
            routeLineRef.current = line;
        }

    }, [jobs, employees, customers, mapLoaded, selectedJobId, onJobSelect, orderedRouteStops, routePath]);

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
