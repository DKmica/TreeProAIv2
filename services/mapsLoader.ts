// This function handles loading the Google Maps script dynamically.
// It allows us to use an API key from the environment rather than hardcoding it.
export const loadGoogleMapsScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if the script is already loaded to prevent duplicate loads
    if (window.google && window.google.maps) {
      return resolve();
    }

    // Add a global error handler for auth failures before loading the script
    (window as any).gm_authFailure = () => {
        reject(new Error('Google Maps authentication failed. This is often due to an invalid API key or a project with billing not enabled. Please check your Google Cloud Console.'));
    };

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
        // If a script tag is already there, wait for it to load.
        if (window.google && window.google.maps) {
            delete (window as any).gm_authFailure; // Clean up
            return resolve();
        }
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', (e) => reject(e));
        return;
    }

    const script = document.createElement('script');
    
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return reject(new Error('API_KEY environment variable is not set. The map cannot be loaded. Please ensure it is configured.'));
    }

    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=beta&libraries=marker`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
        if (window.google && window.google.maps) {
            delete (window as any).gm_authFailure; // Clean up the global handler on success
            resolve();
        } else {
            reject(new Error('Google Maps script loaded but `window.google.maps` is not available.'));
        }
    };

    script.onerror = (error) => {
        console.error("Failed to load Google Maps script:", error);
        reject(new Error('Failed to load Google Maps script. Check your network connection and browser console for more details.'));
    };
    
    document.head.appendChild(script);
  });
};
