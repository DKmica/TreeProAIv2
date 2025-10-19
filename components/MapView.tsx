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
                [key: string]: any;
            }
            class InfoWindow {
                constructor(opts?: any);
                setContent(content: string | Node): void;
                open(options?: any): void;
            }
            namespace marker {
                class AdvancedMarkerElement {
                    constructor(options?: any);
                    set map(map: Map | null);
                    get position(): LatLng | null;
                    addListener(eventName: string, handler: (...args: any[]) => void): void;
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
}

const MapView: React.FC<MapViewProps> = ({ jobs, employees, customers }) => {
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
            mapInstance.current = new window.google.maps.Map(mapRef.current, {
                center: { lat: 39.8283, lng: -98.5795 }, // Center of US
                zoom: 4,
                mapId: 'TREEPRO_AI_MAP' // Custom map ID for styling
            });
            infoWindowRef.current = new window.google.maps.InfoWindow();
        }
    }, [mapLoaded]);

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

            const jobPin = new google.maps.marker.PinElement({
                background: job.status === 'In Progress' ? '#1d4ed8' : '#0891b2', // Blue for 'In Progress', Cyan for 'Scheduled'
                borderColor: '#fff',
                glyphColor: '#fff',
            });

            const marker = new google.maps.marker.AdvancedMarkerElement({
                position: customer.coordinates,
                map,
                title: `Job: ${job.id} - ${job.customerName}`,
                content: jobPin.element,
            });

            const content = `
                <div style="font-family: sans-serif; color: #334155; padding: 5px;">
                    <h3 style="font-weight: 600; font-size: 1.125rem; margin: 0 0 8px 0; color: #1e293b;">Job: ${job.id}</h3>
                    <p style="margin: 2px 0;"><strong>Customer:</strong> ${job.customerName}</p>
                    <p style="margin: 2px 0;"><strong>Status:</strong> ${job.status}</p>
                    <p style="margin: 2px 0;"><strong>Date:</strong> ${job.date}</p>
                </div>`;

            marker.addListener('click', () => {
                infoWindow.setContent(content);
                infoWindow.open({
                    anchor: marker,
                    map,
                });
                map.setZoom(15);
                map.setCenter(marker.position as google.maps.LatLng);
            });
            newMarkers.push(marker);
        });

        // Add Employee Markers
        employees.forEach(employee => {
            if (!employee.coordinates || (employee.coordinates.lat === 0 && employee.coordinates.lng === 0)) return;

            const crewPin = new google.maps.marker.PinElement({
                background: '#f97316', // Orange for crew
                borderColor: '#fff',
                glyph: new URL('data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-1.458a9.337 9.337 0 004.121 1.458c1.61.296 3.023-.423 3.023-2.622v-3.023a9.337 9.337 0 00-1.458-4.121a9.337 9.337 0 001.458-4.121V6.523c0-2.199-1.414-2.918-3.023-2.622a9.337 9.337 0 00-4.121 1.458A9.337 9.337 0 0015 3.872a9.38 9.38 0 00-2.625-.372M15 19.128v-3.023c0-2.199-1.414-2.918-3.023-2.622a9.337 9.337 0 00-4.121 1.458A9.337 9.337 0 003 16.105v3.023c0 2.199 1.414 2.918 3.023 2.622a9.337 9.337 0 004.121-1.458 9.337 9.337 0 004.121 1.458zM15 19.128a9.38 9.38 0 00-2.625-.372M15 19.128a9.38 9.38 0 002.625.372M6.75 8.25A3.75 3.75 0 0110.5 4.5a3.75 3.75 0 013.75 3.75v.375c0 1.023-.428 1.948-1.125 2.625a3.75 3.75 0 11-5.25 0 3.75 3.75 0 01-1.125-2.625V8.25z"/></svg>')
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
                    <p style="margin: 2px 0;"><strong>Title:</strong> ${employee.role}</p>
                </div>`;
            
            marker.addListener('click', () => {
                infoWindow.setContent(content);
                infoWindow.open({
                    anchor: marker,
                    map,
                });
                map.setZoom(15);
                map.setCenter(marker.position as google.maps.LatLng);
            });
            newMarkers.push(marker);
        });

        markersRef.current = newMarkers;

    }, [jobs, employees, customers, mapLoaded]);

    if (mapError) {
        return (
             <div className="flex flex-col items-center justify-center h-full bg-red-50 text-red-800 p-4 text-center rounded-lg" role="alert">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="mt-3 font-semibold">Map Error</p>
                <p className="mt-2 text-sm">{mapError}</p>
                <a 
                  href="https://developers.google.com/maps/documentation/javascript/error-messages#invalid-key-map-error"
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
                <SpinnerIcon className="h-8 w-8 text-brand-cyan-600" />
                <p className="ml-3 text-brand-navy-600">Loading Map...</p>
            </div>
        );
    }

    return <div ref={mapRef} style={{ width: '100%', height: '100%' }} role="application" aria-label="Map of jobs and crews"/>;
};

export default MapView;