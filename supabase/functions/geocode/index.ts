// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

// Standard CORS headers to allow the app to call this function
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Get the Google Maps API Key from your Supabase project's secrets
// @ts-ignore
const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY')

serve(async (req) => {
  // This is needed for the browser to make the request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error("Google Maps API key is not set in Supabase secrets.")
    }

    const { address } = await req.json()
    if (!address) {
      throw new Error("Address is required.")
    }

    // Call the Google Maps Geocoding API
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        address
      )}&key=${GOOGLE_MAPS_API_KEY}`
    )

    const data = await response.json()

    if (data.status !== 'OK' || !data.results[0]) {
      throw new Error(`Geocoding failed: ${data.status} - ${data.error_message || 'No results found.'}`)
    }

    const location = data.results[0].geometry.location
    
    // Return the coordinates
    return new Response(JSON.stringify({ lat: location.lat, lng: location.lng }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})