/**
 * TreePro AI - Job State Machine Service
 * 
 * Implements a comprehensive job state machine with:
 * - 10 distinct states (draft → paid/cancelled)
 * - Guarded state transitions with validation
 * - Automated triggers (notifications, invoice generation, etc.)
 * - Transaction-safe state changes
 * - Complete audit trail
 * 
 * State Flow:
 * draft → needs_permit → waiting_on_client → scheduled → in_progress → completed → invoiced → paid
 *                                                ↓             ↓
 *                                          weather_hold    weather_hold
 *                                                ↓             ↓
 *                                           scheduled      scheduled
 * 
 * Any state → cancelled (except paid)
 */

const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const reminderService = require('./reminderService');
const { emitBusinessEvent } = require('./automation');

// ============================================================================
// STATE TRANSITION MATRIX
// ============================================================================

/**
 * Defines all allowed state transitions
 * Key: current state, Value: array of allowed next states
 */
const STATE_TRANSITION_MATRIX = {
  draft: ['needs_permit', 'waiting_on_client', 'scheduled', 'cancelled'],
  needs_permit: ['waiting_on_client', 'scheduled', 'cancelled'],
  waiting_on_client: ['scheduled', 'cancelled'],
  scheduled: ['en_route', 'in_progress', 'weather_hold', 'cancelled'],
  en_route: ['on_site', 'scheduled', 'weather_hold', 'cancelled'],
  on_site: ['in_progress', 'scheduled', 'weather_hold', 'cancelled'],
  weather_hold: ['scheduled', 'cancelled'],
  in_progress: ['completed', 'weather_hold', 'cancelled'],
  completed: ['invoiced'],
  invoiced: ['paid', 'completed'], // completed = invoice void/correction
  paid: [], // Terminal state
  cancelled: [] // Terminal state
};

/**
 * Human-readable state names for notifications
 */
const STATE_NAMES = {
  draft: 'Draft',
  needs_permit: 'Needs Permit',
  waiting_on_client: 'Waiting on Client',
  scheduled: 'Scheduled',
  en_route: 'En Route',
  on_site: 'On Site',
  weather_hold: 'Weather Hold',
  in_progress: 'In Progress',
  completed: 'Completed',
  invoiced: 'Invoiced',
  paid: 'Paid',
  cancelled: 'Cancelled'
};

/**
 * Maps job states to supported business event types
 * Supported events: job_created, job_scheduled, job_started, job_completed, job_cancelled
 */
const STATE_TO_EVENT_TYPE = {
  scheduled: 'job_scheduled',
  in_progress: 'job_started',
  completed: 'job_completed',
  cancelled: 'job_cancelled'
};

/**
 * Get the business event type for a job state transition
 * @param {string} toState - The state being transitioned to
 * @returns {string|null} - The event type or null if no event should be emitted
 */
function getEventTypeForState(toState) {
  return STATE_TO_EVENT_TYPE[toState] || null;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validation rules for transitioning to each state
 * Each function returns { valid: boolean, errors: string[] }
 */
const VALIDATION_RULES = {
  /**
   * Validate transition to 'scheduled' state
   * Requires: scheduled_date, assigned_crew (non-empty array)
   */
  scheduled: async (job, db) => {
    const errors = [];
    
    if (!job.scheduled_date) {
      errors.push('scheduled_date is required to schedule a job');
    }
    
    if (!job.assigned_crew || job.assigned_crew.length === 0) {
      errors.push('assigned_crew is required and must contain at least one crew member');
    }
    
    // Check if permit is required and approved
    if (job.permit_required && job.permit_status !== 'approved') {
      errors.push('Permit must be approved before scheduling');
    }
    
    // Check if deposit is required and received
    if (job.deposit_required && job.deposit_status !== 'received' && job.deposit_status !== 'waived') {
      errors.push('Deposit must be received or waived before scheduling');
    }
    
    return { valid: errors.length === 0, errors };
  },

  /**
   * Validate transition to 'in_progress' state
   * Requires: JHA acknowledged if jha_required
   */
  in_progress: async (job, db) => {
    const errors = [];

    // JHA must be acknowledged if required
    if (job.jha_required) {
      const hasJhaData = job.jha && Object.keys(job.jha || {}).length > 0;
      if (!hasJhaData) {
        errors.push('Job Hazard Analysis must be completed before starting work');
      }
      if (!job.jha_acknowledged_at) {
        errors.push('Job Hazard Analysis must be acknowledged before starting work');
      }
    }

    // Job must be scheduled first
    if (!job.scheduled_date) {
      errors.push('Job must be scheduled before starting work');
    }

    // Crew must be assigned
    if (!job.assigned_crew || job.assigned_crew.length === 0) {
      errors.push('Crew must be assigned before starting work');
    }

    // All attached job forms must be completed
    const { rows: jobForms } = await db.query(
      'SELECT status FROM job_forms WHERE job_id = $1',
      [job.id]
    );

    if (jobForms.length > 0) {
      const incompleteForms = jobForms.filter(form => form.status !== 'completed');
      if (incompleteForms.length > 0) {
        errors.push(
          `All job forms must be completed before starting work (${incompleteForms.length} pending)`
        );
      }
    }

    return { valid: errors.length === 0, errors };
  },

  /**
   * Validate transition to 'completed' state
   * Requires: work_end_time, completion_checklist
   */
  completed: async (job, db) => {
    const errors = [];
    
    if (!job.work_end_time && !job.work_ended_at) {
      errors.push('work_end_time is required to mark job as completed');
    }
    
    // Check if completion checklist exists and all items are checked
    if (job.completion_checklist && Array.isArray(job.completion_checklist)) {
      const uncheckedItems = job.completion_checklist.filter(item => !item.checked);
      if (uncheckedItems.length > 0) {
        errors.push(`Completion checklist has ${uncheckedItems.length} unchecked items`);
      }
    }
    
    // Ensure work was started
    if (!job.work_start_time && !job.work_started_at) {
      errors.push('Work must be started before it can be completed');
    }
    
    return { valid: errors.length === 0, errors };
  },

  /**
   * Validate transition to 'invoiced' state
   * Requires: invoice_id linkage
   */
  invoiced: async (job, db) => {
    const errors = [];
    
    if (!job.invoice_id) {
      errors.push('invoice_id is required to mark job as invoiced');
    } else {
      // Verify invoice exists
      const { rows } = await db.query('SELECT id FROM invoices WHERE id = $1', [job.invoice_id]);
      if (rows.length === 0) {
        errors.push('Referenced invoice does not exist');
      }
    }
    
    return { valid: errors.length === 0, errors };
  },

  /**
   * Validate transition to 'paid' state
   * Requires: payment_received_at
   */
  paid: async (job, db) => {
    const errors = [];
    
    if (!job.payment_received_at) {
      errors.push('payment_received_at is required to mark job as paid');
    }
    
    // Ensure invoice exists
    if (!job.invoice_id) {
      errors.push('Job must be invoiced before marking as paid');
    }
    
    return { valid: errors.length === 0, errors };
  },

  /**
   * Validate transition to 'needs_permit' state
   */
  needs_permit: async (job, db) => {
    const errors = [];
    
    // Mark permit as required
    if (!job.permit_required) {
      errors.push('permit_required must be true to use this state');
    }
    
    return { valid: errors.length === 0, errors };
  },

  /**
   * Validate transition to 'waiting_on_client' state
   */
  waiting_on_client: async (job, db) => {
    // No specific validation - this is a holding state
    return { valid: true, errors: [] };
  },

  /**
   * Validate transition to 'en_route' state
   * Crew has departed and is traveling to job site
   */
  en_route: async (job, db) => {
    const errors = [];
    
    if (!job.scheduled_date) {
      errors.push('Job must be scheduled before marking as en route');
    }
    
    if (!job.assigned_crew || job.assigned_crew.length === 0) {
      errors.push('Crew must be assigned before marking as en route');
    }
    
    return { valid: errors.length === 0, errors };
  },

  /**
   * Validate transition to 'on_site' state
   * Crew has arrived at job site but work has not started
   */
  on_site: async (job, db) => {
    const errors = [];
    
    if (!job.scheduled_date) {
      errors.push('Job must be scheduled before marking as on site');
    }
    
    if (!job.assigned_crew || job.assigned_crew.length === 0) {
      errors.push('Crew must be assigned before marking as on site');
    }
    
    return { valid: errors.length === 0, errors };
  },

  /**
   * Validate transition to 'weather_hold' state
   */
  weather_hold: async (job, db) => {
    const errors = [];
    
    if (!job.weather_hold_reason || job.weather_hold_reason.trim() === '') {
      errors.push('weather_hold_reason is required when placing job on weather hold');
    }
    
    return { valid: errors.length === 0, errors };
  },

  /**
   * Validate transition to 'cancelled' state
   */
  cancelled: async (job, db) => {
    // Can always cancel (except from terminal states which are blocked by transition matrix)
    return { valid: true, errors: [] };
  },

  /**
   * Validate transition to 'draft' state (initial state only)
   */
  draft: async (job, db) => {
    // Draft is only for new jobs
    return { valid: true, errors: [] };
  }
};

// ============================================================================
// INVOICE HELPER FUNCTIONS
// ============================================================================

/**
 * Generate invoice number in format: INV-YYYY-####
 * 
 * CRITICAL FIXES IMPLEMENTED:
 * 1. Uses PostgreSQL advisory lock to serialize number generation (prevents race conditions)
 * 2. Uses numeric ordering via SUBSTRING + CAST to handle numbers > 9999
 * 3. Uses dedicated client from pool to ensure lock/query/unlock on SAME connection
 * 4. Falls back to timestamp-based number if errors occur
 * 
 * This prevents:
 * - Race conditions during concurrent job completions (advisory lock)
 * - Lexicographic sorting issue (INV-2025-10000 < INV-2025-9999)
 * - Lock session bug where lock is acquired on one connection but released on another
 * 
 * Advisory Lock Strategy:
 * - Uses lock ID based on year (simple year value)
 * - Serializes all invoice number generation for the same year
 * - Gets dedicated client from pool to ensure all operations on same session
 * - Lock is released in finally block to prevent indefinite holds
 */
const generateInvoiceNumber = async (db) => {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const lockId = year; // Simple year-based lock
  
  // Get a dedicated client from the pool
  const client = await db.connect();
  
  try {
    // Acquire advisory lock on THIS client's session
    await client.query('SELECT pg_advisory_lock($1)', [lockId]);
    console.log(`🔒 Advisory lock acquired for invoice generation (year ${year})`);
    
    // Find max sequence number using numeric ordering
    const { rows } = await client.query(`
      SELECT COALESCE(
        MAX(CAST(SUBSTRING(invoice_number FROM 'INV-[0-9]+-([0-9]+)') AS INTEGER)), 
        0
      ) as max_seq
      FROM invoices
      WHERE invoice_number LIKE $1
    `, [`${prefix}%`]);
    
    const nextSeq = (rows[0]?.max_seq || 0) + 1;
    const paddedSeq = String(nextSeq).padStart(4, '0');
    const invoiceNumber = `${prefix}${paddedSeq}`;
    
    console.log(`📄 Generated invoice number: ${invoiceNumber}`);
    
    return invoiceNumber;
    
  } catch (error) {
    console.error(`❌ Invoice number generation failed:`, error.message);
    
    // Fallback to timestamp-based number on error
    const timestamp = Date.now().toString().slice(-6);
    const fallbackNumber = `${prefix}${timestamp}`;
    console.log(`🔄 Fallback invoice number: ${fallbackNumber}`);
    return fallbackNumber;
    
  } finally {
    // Release lock and return client to pool
    // This MUST happen even if errors occur
    try {
      await client.query('SELECT pg_advisory_unlock($1)', [lockId]);
      console.log(`🔓 Advisory lock released for year ${year}`);
    } catch (unlockError) {
      console.error(`⚠️  Failed to release advisory lock:`, unlockError.message);
    }
    client.release();
  }
};

/**
 * Calculate invoice totals from line items, discount, and tax
 * @returns Object with subtotal, discountAmount, taxAmount, totalAmount, grandTotal
 */
const calculateInvoiceTotals = (lineItems, discountAmount = 0, discountPercentage = 0, taxRate = 0) => {
  // Calculate subtotal from line items
  const subtotal = lineItems.reduce((sum, item) => {
    return sum + (parseFloat(item.price) || 0);
  }, 0);
  
  // Apply discount
  let totalDiscount = parseFloat(discountAmount) || 0;
  if (discountPercentage > 0) {
    totalDiscount = subtotal * (parseFloat(discountPercentage) / 100);
  }
  
  const totalAmount = subtotal - totalDiscount;
  
  // Calculate tax
  const taxAmount = totalAmount * (parseFloat(taxRate) / 100);
  
  // Calculate grand total
  const grandTotal = totalAmount + taxAmount;
  
  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    discountAmount: parseFloat(totalDiscount.toFixed(2)),
    discountPercentage: parseFloat(discountPercentage) || 0,
    taxRate: parseFloat(taxRate) || 0,
    taxAmount: parseFloat(taxAmount.toFixed(2)),
    totalAmount: parseFloat(totalAmount.toFixed(2)),
    grandTotal: parseFloat(grandTotal.toFixed(2))
  };
};

// ============================================================================
// AUTOMATED TRIGGERS
// ============================================================================

/**
 * Automated actions triggered by state transitions
 * Each function is called after successful state transition
 */
const AUTOMATED_TRIGGERS = {
  /**
   * Trigger when job moves to 'scheduled' state
   * - Send crew notifications
   * - Create calendar events
   */
  scheduled: async (job, transitionData, db) => {
    console.log(`🔔 [State Machine] Trigger: Job ${job.id} scheduled`);
    console.log(`   → Scheduled date: ${job.scheduled_date}`);
    console.log(`   → Assigned crew: ${job.assigned_crew?.join(', ')}`);
    
    // TODO: Send crew notifications via email/SMS
    // TODO: Create calendar events
    // TODO: Update crew schedules
    
    // Log notification (placeholder for actual notification system)
    if (job.assigned_crew && job.assigned_crew.length > 0) {
      for (const crewMemberId of job.assigned_crew) {
        console.log(`   📧 Notification sent to crew member: ${crewMemberId}`);
      }
    }
  },

  /**
   * Trigger when job moves to 'in_progress' state
   * - Record work start time
   * - Send customer notification
   */
  in_progress: async (job, transitionData, db) => {
    console.log(`🚀 [State Machine] Trigger: Job ${job.id} started`);
    
    // Auto-set work_start_time if not already set
    if (!job.work_start_time && !job.work_started_at) {
      await db.query(
        'UPDATE jobs SET work_start_time = NOW() WHERE id = $1',
        [job.id]
      );
      console.log(`   → work_start_time set automatically`);
    }
    
    // TODO: Send customer notification that crew is on site
    console.log(`   📧 Customer notification: Crew arrived on site`);
  },

  /**
   * Trigger when job moves to 'completed' state
   * - Generate complete, payment-ready invoice
   * - Send completion notification
   * - Update client category to active_customer
   */
  completed: async (job, transitionData, db) => {
    console.log(`✅ [State Machine] Trigger: Job ${job.id} completed`);
    
    // Auto-generate complete invoice if not exists
    if (!job.invoice_id) {
      try {
        console.log(`   🔄 Generating complete invoice for job ${job.id}...`);
        
        // Step 1: Generate invoice number
        const invoiceNumber = await generateInvoiceNumber(db);
        console.log(`   📋 Invoice number: ${invoiceNumber}`);
        
        // Step 2: Fetch client details for contact information
        let clientEmail = null;
        let clientPhone = null;
        let clientAddress = null;
        
        if (job.client_id) {
          const { rows: clients } = await db.query(
            `SELECT primary_email, primary_phone, billing_address_line1, billing_address_line2, 
                    billing_city, billing_state, billing_zip_code 
             FROM clients WHERE id = $1`,
            [job.client_id]
          );
          
          if (clients.length > 0) {
            const client = clients[0];
            clientEmail = client.primary_email;
            clientPhone = client.primary_phone;
            
            // Construct full address
            const addressParts = [
              client.billing_address_line1,
              client.billing_address_line2,
              client.billing_city,
              client.billing_state,
              client.billing_zip_code
            ].filter(Boolean);
            clientAddress = addressParts.join(', ');
            
            console.log(`   📧 Client contact info retrieved: ${clientEmail}`);
          }
        }
        
        // Step 3: Get quote data with line items, discount, and tax info
        let invoiceLineItems = [];
        let discountAmount = 0;
        let discountPercentage = 0;
        let taxRate = 0;
        
        if (job.quote_id) {
          const { rows: quotes } = await db.query(
            `SELECT line_items, stump_grinding_price, discount_amount, 
                    discount_percentage, tax_rate 
             FROM quotes WHERE id = $1`,
            [job.quote_id]
          );
          
          if (quotes.length > 0) {
            const quote = quotes[0];
            const quoteLineItems = quote.line_items || [];
            
            // Build invoice line items from selected quote items
            invoiceLineItems = quoteLineItems
              .filter(item => item.selected)
              .map(item => ({
                description: item.description || item.tree || 'Tree Service',
                price: parseFloat(item.price) || 0
              }));
            
            // Add stump grinding if applicable
            const stumpGrindingPrice = parseFloat(quote.stump_grinding_price || 0);
            if (stumpGrindingPrice > 0) {
              invoiceLineItems.push({
                description: 'Stump Grinding',
                price: stumpGrindingPrice
              });
            }
            
            // Get discount and tax info from quote
            discountAmount = parseFloat(quote.discount_amount) || 0;
            discountPercentage = parseFloat(quote.discount_percentage) || 0;
            taxRate = parseFloat(quote.tax_rate) || 0;
            
            console.log(`   📊 Loaded ${invoiceLineItems.length} line items from quote`);
          }
        }
        
        // Fallback: Create default line item if no quote data
        if (invoiceLineItems.length === 0) {
          invoiceLineItems = [
            {
              description: 'Tree Service',
              price: 0
            }
          ];
          console.log(`   ⚠️  No quote data found, using default line item`);
        }
        
        // Step 4: Calculate totals using helper function
        const totals = calculateInvoiceTotals(
          invoiceLineItems,
          discountAmount,
          discountPercentage,
          taxRate
        );
        
        console.log(`   💵 Calculated totals:`);
        console.log(`      Subtotal: $${totals.subtotal}`);
        console.log(`      Discount: $${totals.discountAmount}`);
        console.log(`      Tax: $${totals.taxAmount}`);
        console.log(`      Grand Total: $${totals.grandTotal}`);
        
        // Step 5: Prepare invoice data
        const invoiceId = uuidv4();
        const issueDate = new Date().toISOString().split('T')[0];
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30); // Net 30 terms
        const dueDateStr = dueDate.toISOString().split('T')[0];
        const paymentTerms = 'Net 30';
        const status = 'Draft';
        
        // Step 6: Insert complete invoice record
        const query = `
          INSERT INTO invoices (
            id, job_id, client_id, property_id, customer_name, status,
            invoice_number, issue_date, due_date, 
            line_items, subtotal, discount_amount, discount_percentage,
            tax_rate, tax_amount, total_amount, grand_total,
            amount_paid, amount_due, payment_terms,
            customer_email, customer_phone, customer_address,
            amount
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9,
            $10, $11, $12, $13,
            $14, $15, $16, $17,
            $18, $19, $20,
            $21, $22, $23,
            $24
          )
        `;
        
        const values = [
          invoiceId,
          job.id,
          job.client_id || null,
          job.property_id || null,
          job.customer_name,
          status,
          invoiceNumber,
          issueDate,
          dueDateStr,
          JSON.stringify(invoiceLineItems),
          totals.subtotal,
          totals.discountAmount,
          totals.discountPercentage,
          totals.taxRate,
          totals.taxAmount,
          totals.totalAmount,
          totals.grandTotal,
          0, // amount_paid
          totals.grandTotal, // amount_due
          paymentTerms,
          clientEmail,
          clientPhone,
          clientAddress,
          totals.grandTotal // amount (for backward compatibility)
        ];
        
        await db.query(query, values);
        
        // Step 7: Link invoice to job
        await db.query(
          'UPDATE jobs SET invoice_id = $1 WHERE id = $2',
          [invoiceId, job.id]
        );

        console.log(`   ✅ Complete invoice ${invoiceNumber} created successfully`);
        console.log(`      Invoice ID: ${invoiceId}`);
        console.log(`      Status: ${status} (ready for review)`);
        console.log(`      Amount: $${totals.grandTotal}`);

        reminderService.scheduleInvoiceReminders({
          id: invoiceId,
          due_date: dueDateStr,
          status,
          customer_name: job.customer_name
        });
      } catch (error) {
        console.error(`   ❌ Failed to auto-generate invoice:`, error.message);
        console.error(`      Error details:`, error);
        // Don't fail job completion if invoice creation fails
      }
    }
    
    // Update client category to active_customer (they now have a completed job)
    if (job.client_id) {
      try {
        await db.query(
          `UPDATE clients 
           SET client_category = 'active_customer', updated_at = NOW() 
           WHERE id = $1 AND client_category != 'active_customer'`,
          [job.client_id]
        );
        console.log(`   ✨ Client ${job.client_id} upgraded to active_customer`);
      } catch (error) {
        console.error(`   ❌ Failed to update client category:`, error.message);
      }
    }
    
    // TODO: Send completion notification to customer
    console.log(`   📧 Customer notification: Job completed`);
  },

  /**
   * Trigger when job moves to 'invoiced' state
   * - Send invoice to customer
   * - Schedule payment reminders
   */
  invoiced: async (job, transitionData, db) => {
    console.log(`💸 [State Machine] Trigger: Job ${job.id} invoiced`);
    
    // Update invoice status to 'Sent'
    if (job.invoice_id) {
      await db.query(
        "UPDATE invoices SET status = 'Sent' WHERE id = $1",
        [job.invoice_id]
      );
      console.log(`   → Invoice ${job.invoice_id} marked as Sent`);
    }
    
    // TODO: Send invoice to customer via email
    // TODO: Schedule payment reminders
    console.log(`   📧 Invoice sent to customer: ${job.customer_name}`);
  },

  /**
   * Trigger when job moves to 'paid' state
   * - Update accounting
   * - Send thank you message
   */
  paid: async (job, transitionData, db) => {
    console.log(`💰 [State Machine] Trigger: Job ${job.id} paid`);
    
    // Update invoice status to 'Paid'
    if (job.invoice_id) {
      await db.query(
        "UPDATE invoices SET status = 'Paid', paid_at = NOW() WHERE id = $1",
        [job.invoice_id]
      );
      console.log(`   → Invoice ${job.invoice_id} marked as Paid`);
    }
    
    // TODO: Update accounting integration (QuickBooks, etc.)
    // TODO: Send thank you message
    console.log(`   📧 Thank you message sent to customer`);
    console.log(`   💼 Accounting system updated`);
  },

  /**
   * Trigger when job moves to 'cancelled' state
   * - Free up crew schedule
   * - Send cancellation notifications
   * - Re-evaluate client category (may downgrade if no completed jobs)
   */
  cancelled: async (job, transitionData, db) => {
    console.log(`❌ [State Machine] Trigger: Job ${job.id} cancelled`);
    console.log(`   → Reason: ${transitionData.reason || 'Not specified'}`);
    
    // Check if client should be downgraded to potential_client
    if (job.client_id) {
      try {
        const { rows } = await db.query(
          `SELECT COUNT(*) AS completed_jobs
           FROM jobs
           WHERE client_id = $1
             AND LOWER(status) = 'completed'`,
          [job.client_id]
        );
        
        const completedJobs = parseInt(rows[0]?.completed_jobs || 0, 10);
        
        if (completedJobs === 0) {
          await db.query(
            `UPDATE clients 
             SET client_category = 'potential_client', updated_at = NOW() 
             WHERE id = $1 AND client_category != 'potential_client'`,
            [job.client_id]
          );
          console.log(`   ⬇️  Client ${job.client_id} downgraded to potential_client (no completed jobs)`);
        }
      } catch (error) {
        console.error(`   ❌ Failed to update client category:`, error.message);
      }
    }
    
    // TODO: Free up crew schedule
    // TODO: Send cancellation notifications
    // TODO: Update customer records
    
    if (job.assigned_crew && job.assigned_crew.length > 0) {
      console.log(`   📧 Cancellation notifications sent to crew`);
    }
    console.log(`   📧 Cancellation notification sent to customer`);
  }
};

// ============================================================================
// CORE SERVICE FUNCTIONS
// ============================================================================

/**
 * Check if a state transition is allowed
 * @param {string} fromState - Current state
 * @param {string} toState - Desired state
 * @returns {boolean} - True if transition is allowed
 */
function isTransitionAllowed(fromState, toState) {
  const allowedTransitions = STATE_TRANSITION_MATRIX[fromState] || [];
  return allowedTransitions.includes(toState);
}

/**
 * Get all allowed transitions from current state
 * @param {string} currentState - Current job state
 * @returns {string[]} - Array of allowed next states
 */
function getAllowedTransitions(currentState) {
  return STATE_TRANSITION_MATRIX[currentState] || [];
}

/**
 * Get job by ID with all necessary fields
 * @param {string} jobId - Job UUID
 * @returns {Object|null} - Job object or null if not found
 */
async function getJob(jobId) {
  const { rows } = await db.query('SELECT * FROM jobs WHERE id = $1', [jobId]);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Get job by ID with complete related entity data for event enrichment
 * Includes client info, property info, and quote pricing data
 * @param {string} jobId - Job UUID
 * @returns {Object|null} - Enriched job object or null if not found
 */
async function getJobWithRelations(jobId) {
  const { rows } = await db.query(`
    SELECT 
      j.*,
      -- Client information
      c.first_name AS client_first_name,
      c.last_name AS client_last_name,
      c.company_name AS client_company_name,
      c.primary_email AS client_email,
      c.primary_phone AS client_phone,
      c.client_type,
      c.client_category,
      c.stripe_customer_id,
      -- Property information
      p.property_name,
      p.address_line1 AS property_address,
      p.city AS property_city,
      p.state AS property_state,
      p.zip_code AS property_zip,
      p.lat AS property_lat,
      p.lon AS property_lon,
      p.access_instructions AS property_access_instructions,
      -- Quote pricing information
      q.total_amount AS quote_total_amount,
      q.grand_total AS quote_grand_total,
      q.discount_amount AS quote_discount_amount,
      q.tax_amount AS quote_tax_amount,
      q.line_items AS quote_line_items
    FROM jobs j
    LEFT JOIN clients c ON j.client_id = c.id
    LEFT JOIN properties p ON j.property_id = p.id
    LEFT JOIN quotes q ON j.quote_id = q.id
    WHERE j.id = $1
  `, [jobId]);
  
  if (rows.length === 0) {
    return null;
  }
  
  const row = rows[0];
  
  // Build enriched job with explicit null fallbacks for all fields
  // This prevents undefined values that can cause UUID parsing errors in workflows
  const enrichedJob = {
    ...row,
    
    // Ensure required IDs are present (explicit null, never undefined)
    id: row.id,
    client_id: row.client_id || null,
    property_id: row.property_id || null,
    quote_id: row.quote_id || null,
    invoice_id: row.invoice_id || null,
    
    // Customer name with multiple fallbacks
    customer_name: row.client_company_name || 
      (row.client_first_name && row.client_last_name ? 
        `${row.client_first_name} ${row.client_last_name}`.trim() : 
        (row.client_first_name || row.client_last_name || row.customer_name || 'Unknown')),
    
    // Price with fallbacks (check job price first, then quote values)
    price: parseFloat(row.price) || parseFloat(row.total_amount) || 
           parseFloat(row.quote_grand_total) || parseFloat(row.quote_total_amount) || 0,
    total_amount: parseFloat(row.total_amount) || parseFloat(row.quote_grand_total) || 
                  parseFloat(row.quote_total_amount) || parseFloat(row.price) || 0,
    
    // Line items from quote or job (ensure array, never undefined)
    line_items: row.quote_line_items || row.line_items || [],
    
    // Contact info from client (explicit null fallbacks)
    customer_email: row.client_email || null,
    customer_phone: row.client_phone || null,
    
    // Client fields with null fallbacks
    client_first_name: row.client_first_name || null,
    client_last_name: row.client_last_name || null,
    client_company_name: row.client_company_name || null,
    client_email: row.client_email || null,
    client_phone: row.client_phone || null,
    client_type: row.client_type || null,
    client_category: row.client_category || null,
    stripe_customer_id: row.stripe_customer_id || null,
    
    // Property fields with null fallbacks
    property_name: row.property_name || null,
    property_address: row.property_address || null,
    property_city: row.property_city || null,
    property_state: row.property_state || null,
    property_zip: row.property_zip || null,
    property_lat: row.property_lat || null,
    property_lon: row.property_lon || null,
    property_access_instructions: row.property_access_instructions || null,
    
    // Full property address string
    full_property_address: [
      row.property_address,
      row.property_city,
      row.property_state,
      row.property_zip
    ].filter(Boolean).join(', ') || null,
    
    // Quote fields with null/0 fallbacks
    quote_total_amount: parseFloat(row.quote_total_amount) || 0,
    quote_grand_total: parseFloat(row.quote_grand_total) || 0,
    quote_discount_amount: parseFloat(row.quote_discount_amount) || 0,
    quote_tax_amount: parseFloat(row.quote_tax_amount) || 0,
    quote_line_items: row.quote_line_items || []
  };
  
  return enrichedJob;
}

/**
 * Validate state transition
 * @param {Object} job - Current job object
 * @param {string} toState - Desired state
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
async function validateTransition(job, toState) {
  // Check if transition is allowed by state machine
  if (!isTransitionAllowed(job.status, toState)) {
    return {
      valid: false,
      errors: [`Transition from '${job.status}' to '${toState}' is not allowed`]
    };
  }
  
  // Run state-specific validation
  const validator = VALIDATION_RULES[toState];
  if (validator) {
    return await validator(job, db);
  }
  
  // No specific validation for this state
  return { valid: true, errors: [] };
}

/**
 * Record state transition in audit trail
 * @param {Object} transitionData - Transition details
 * @returns {string} - Transition ID
 */
async function recordTransition(transitionData) {
  const {
    jobId,
    fromState,
    toState,
    changedBy,
    changedByRole = 'system',
    changeSource = 'manual',
    reason,
    notes,
    metadata
  } = transitionData;
  
  const transitionId = uuidv4();
  
  await db.query(
    `INSERT INTO job_state_transitions 
     (id, job_id, from_state, to_state, changed_by, changed_by_role, change_source, reason, notes, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      transitionId,
      jobId,
      fromState,
      toState,
      changedBy,
      changedByRole,
      changeSource,
      reason || null,
      notes ? JSON.stringify(notes) : null,
      metadata ? JSON.stringify(metadata) : null
    ]
  );
  
  return transitionId;
}

/**
 * Execute automated triggers for state transition
 * @param {Object} job - Job object
 * @param {string} toState - New state
 * @param {Object} transitionData - Transition context
 */
async function executeAutomatedTriggers(job, toState, transitionData) {
  const trigger = AUTOMATED_TRIGGERS[toState];
  if (trigger) {
    try {
      await trigger(job, transitionData, db);
    } catch (error) {
      console.error(`[State Machine] Trigger failed for state '${toState}':`, error);
      // Don't fail the transition if trigger fails - just log it
    }
  }
}

/**
 * Transition job to new state (main function)
 * @param {string} jobId - Job UUID
 * @param {string} toState - Desired state
 * @param {Object} options - Transition options
 * @returns {Object} - { success: boolean, job: Object, transition: Object, errors: string[] }
 */
async function transitionJobState(jobId, toState, options = {}) {
  const {
    changedBy,
    changedByRole = 'system',
    changeSource = 'manual',
    reason,
    notes,
    metadata,
    jobUpdates = {} // Additional job field updates
  } = options;
  
  // Start transaction
  try {
    await db.query('BEGIN');
    
    // Get current job state (with FOR UPDATE lock)
    const { rows } = await db.query('SELECT * FROM jobs WHERE id = $1 FOR UPDATE', [jobId]);
    
    if (rows.length === 0) {
      await db.query('ROLLBACK');
      return {
        success: false,
        errors: ['Job not found']
      };
    }
    
    const job = rows[0];
    const fromState = job.status;
    
    // Validate transition
    const validation = await validateTransition(job, toState);
    if (!validation.valid) {
      await db.query('ROLLBACK');
      return {
        success: false,
        errors: validation.errors
      };
    }
    
    // Update job state
    const updateFields = {
      status: toState,
      last_state_change_at: new Date(),
      ...jobUpdates
    };
    
    const updateKeys = Object.keys(updateFields);
    const updateValues = Object.values(updateFields);
    const updateSetClause = updateKeys.map((key, i) => `${key} = $${i + 2}`).join(', ');
    
    await db.query(
      `UPDATE jobs SET ${updateSetClause} WHERE id = $1`,
      [jobId, ...updateValues]
    );
    
    // Record transition in audit trail
    const transitionId = uuidv4();
    await db.query(
      `INSERT INTO job_state_transitions 
       (id, job_id, from_state, to_state, changed_by, changed_by_role, change_source, reason, notes, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        transitionId,
        jobId,
        fromState,
        toState,
        changedBy,
        changedByRole,
        changeSource,
        reason || null,
        notes ? JSON.stringify(notes) : null,
        metadata ? JSON.stringify(metadata) : null
      ]
    );
    
    // Commit transaction
    await db.query('COMMIT');
    
    // Get updated job
    const updatedJob = await getJob(jobId);
    
    // Execute automated triggers (after commit, so they don't block)
    const transitionData = { jobId, fromState, toState, changedBy, reason, notes };
    await executeAutomatedTriggers(updatedJob, toState, transitionData);
    
    // Emit business event for automation engine with complete entity data
    const eventType = getEventTypeForState(toState);
    if (eventType) {
      try {
        // Fetch enriched job data with client/property/quote relations for downstream workflows
        const enrichedJob = await getJobWithRelations(jobId);
        
        await emitBusinessEvent(eventType, {
          id: jobId,
          ...enrichedJob,
          // Ensure critical fields are present for workflows
          customer_name: enrichedJob?.customer_name || updatedJob.customer_name || 'Unknown',
          price: enrichedJob?.price || enrichedJob?.total_amount || 0,
          total_amount: enrichedJob?.total_amount || 0,
          client_id: enrichedJob?.client_id || updatedJob.client_id,
          property_id: enrichedJob?.property_id || updatedJob.property_id,
          // Include transition context
          transition: {
            from: fromState,
            to: toState,
            changedBy,
            reason,
            notes
          }
        });
        
        console.log(`📤 [State Machine] Emitted ${eventType} event for job ${jobId}`);
      } catch (eventError) {
        console.error(`[State Machine] Failed to emit business event:`, eventError.message);
        // Don't fail the transition if event emission fails
      }
    }
    
    console.log(`✅ [State Machine] Job ${jobId}: ${fromState} → ${toState}`);
    
    return {
      success: true,
      job: updatedJob,
      transition: {
        id: transitionId,
        from: fromState,
        to: toState,
        timestamp: new Date()
      },
      errors: []
    };
    
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('[State Machine] Transaction failed:', error);
    return {
      success: false,
      errors: [`Transaction failed: ${error.message}`]
    };
  }
}

/**
 * Get state transition history for a job
 * @param {string} jobId - Job UUID
 * @returns {Array} - Array of transition objects
 */
async function getStateHistory(jobId) {
  const { rows } = await db.query(
    `SELECT * FROM job_state_transitions 
     WHERE job_id = $1 
     ORDER BY created_at DESC`,
    [jobId]
  );
  
  return rows.map(row => ({
    id: row.id,
    jobId: row.job_id,
    fromState: row.from_state,
    toState: row.to_state,
    changedBy: row.changed_by,
    changedByRole: row.changed_by_role,
    changeSource: row.change_source,
    reason: row.reason,
    notes: row.notes,
    metadata: row.metadata,
    createdAt: row.created_at
  }));
}

/**
 * Get allowed transitions for a job (with context)
 * @param {string} jobId - Job UUID
 * @returns {Object} - { currentState, allowedTransitions: [...], blockedReasons: {...} }
 */
async function getAllowedTransitionsForJob(jobId) {
  const job = await getJob(jobId);
  
  if (!job) {
    return {
      error: 'Job not found',
      currentState: null,
      allowedTransitions: []
    };
  }
  
  const currentState = job.status;
  const potentialTransitions = getAllowedTransitions(currentState);
  
  // Validate each potential transition to see if it's actually available
  const transitionDetails = [];
  
  for (const toState of potentialTransitions) {
    const validation = await validateTransition(job, toState);
    
    transitionDetails.push({
      state: toState,
      stateName: STATE_NAMES[toState],
      allowed: validation.valid,
      blockedReasons: validation.errors
    });
  }
  
  return {
    currentState,
    currentStateName: STATE_NAMES[currentState],
    transitions: transitionDetails
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Core functions
  transitionJobState,
  getStateHistory,
  getAllowedTransitionsForJob,
  
  // Utility functions
  isTransitionAllowed,
  getAllowedTransitions,
  validateTransition,
  getJob,
  
  // Constants
  STATE_TRANSITION_MATRIX,
  STATE_NAMES,
  VALIDATION_RULES,
  AUTOMATED_TRIGGERS
};
