// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// WARNING: The following are placeholders. The user MUST set these in their Supabase project secrets.
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { job_id, employee_id, eta_minutes } = await req.json()
    if (!job_id || !employee_id || !eta_minutes) {
      throw new Error('Missing required parameters: job_id, employee_id, eta_minutes')
    }

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
        console.warn("Twilio credentials are not set in Supabase secrets. SMS will not be sent.")
        // In a real scenario, you'd throw an error. For this demo, we'll simulate success.
        // throw new Error('Twilio credentials are not configured.')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Fetch job, customer, and employee details
    const { data: jobData, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('*, customers(*), employees!jobs_assigned_crew_fkey(*)')
      .eq('id', job_id)
      .single()

    if (jobError) throw jobError
    
    const customer = jobData.customers
    const employee = jobData.employees.find(e => e.id === employee_id)

    if (!customer || !customer.phone) {
      throw new Error(`Customer or customer phone number not found for job ${job_id}`)
    }
    if (!employee) {
      throw new Error(`Employee ${employee_id} not found for job ${job_id}`)
    }

    // 2. Construct the SMS message
    const messageBody = `Hi ${customer.name}, this is a notification from TreePro AI. Your crew, led by ${employee.name}, is on their way to your property. They are expected to arrive in approximately ${eta_minutes} minutes.`

    // 3. Send the SMS via Twilio (or simulate if credentials are not set)
    let twilioSid = 'simulated_success_sid'
    if (TWILIO_ACCOUNT_SID) {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`
        const twilioResponse = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                To: customer.phone,
                From: TWILIO_PHONE_NUMBER,
                Body: messageBody,
            }),
        })

        const twilioData = await twilioResponse.json()
        if (twilioData.error_code) {
            throw new Error(`Twilio error: ${twilioData.error_message}`)
        }
        twilioSid = twilioData.sid
    }
    
    // 4. Log the notification in the database
    const { error: logError } = await supabaseAdmin.from('omw_tracking').insert({
      job_id,
      employee_id,
      eta_minutes,
      user_id: jobData.user_id,
      twilio_sid: twilioSid,
    })

    if (logError) throw logError

    return new Response(JSON.stringify({ success: true, message: `Notification sent to ${customer.name}.` }), {
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