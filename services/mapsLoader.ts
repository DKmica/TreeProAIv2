// This function handles loading the Google Maps script dynamically.
// It allows us to use an API key from the environment rather than hardcoding it.
export const loadGoogleMapsScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if the script is already loaded to prevent duplicate loads
    if (window.google && window.google.maps) {
      return resolve();
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
        // If a script tag is already there, wait for it to load.
        if (window.google && window.google.maps) {
            return resolve();
        }
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', (e) => reject(e));
        return;
    }

    const script = document.createElement('script');
    
    // Hardcoded Google Maps API key as requested.
    const apiKey = 'AIzaSyCweyegNcdWPO53GqYFIelJ2YXIHYFkImM';

    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=beta&libraries=marker`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
        if (window.google && window.google.maps) {
            resolve();
        } else {
            reject(new Error('Google Maps script loaded but `window.google.maps` is not available.'));
        }
    };

    script.onerror = (error) => {
        console.error("Failed to load Google Maps script:", error);
        reject(new Error('Failed to load Google Maps script. Check your API key, network connection, and browser console for more details.'));
    };
    
    document.head.appendChild(script);
  });
};
