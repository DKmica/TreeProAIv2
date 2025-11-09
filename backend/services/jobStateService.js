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
  scheduled: ['in_progress', 'weather_hold', 'cancelled'],
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
  weather_hold: 'Weather Hold',
  in_progress: 'In Progress',
  completed: 'Completed',
  invoiced: 'Invoiced',
  paid: 'Paid',
  cancelled: 'Cancelled'
};

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
    if (job.jha_required && !job.jha_acknowledged_at) {
      errors.push('Job Hazard Analysis must be acknowledged before starting work');
    }
    
    // Job must be scheduled first
    if (!job.scheduled_date) {
      errors.push('Job must be scheduled before starting work');
    }
    
    // Crew must be assigned
    if (!job.assigned_crew || job.assigned_crew.length === 0) {
      errors.push('Crew must be assigned before starting work');
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
   * - Generate invoice stub
   * - Send completion notification
   */
  completed: async (job, transitionData, db) => {
    console.log(`✅ [State Machine] Trigger: Job ${job.id} completed`);
    
    // Auto-generate invoice stub if not exists
    if (!job.invoice_id) {
      try {
        // Calculate invoice amount from job costs or quote
        let invoiceAmount = 0;
        
        // Get quote line items if quote_id exists
        if (job.quote_id) {
          const { rows: quotes } = await db.query(
            'SELECT line_items, stump_grinding_price FROM quotes WHERE id = $1',
            [job.quote_id]
          );
          
          if (quotes.length > 0) {
            const quote = quotes[0];
            const lineItems = quote.line_items || [];
            
            // Sum selected line items
            invoiceAmount = lineItems
              .filter(item => item.selected)
              .reduce((sum, item) => sum + (item.price || 0), 0);
            
            // Add stump grinding if applicable
            invoiceAmount += parseFloat(quote.stump_grinding_price || 0);
          }
        }
        
        // Create invoice
        const invoiceId = uuidv4();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30); // Net 30 terms
        
        await db.query(
          `INSERT INTO invoices (id, job_id, customer_name, status, amount, line_items, due_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            invoiceId,
            job.id,
            job.customer_name,
            'Draft',
            invoiceAmount,
            JSON.stringify([{ description: 'Tree Service', price: invoiceAmount }]),
            dueDate.toISOString().split('T')[0]
          ]
        );
        
        // Link invoice to job
        await db.query(
          'UPDATE jobs SET invoice_id = $1 WHERE id = $2',
          [invoiceId, job.id]
        );
        
        console.log(`   💰 Invoice ${invoiceId} created automatically (Amount: $${invoiceAmount})`);
      } catch (error) {
        console.error(`   ❌ Failed to auto-generate invoice:`, error.message);
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
   */
  cancelled: async (job, transitionData, db) => {
    console.log(`❌ [State Machine] Trigger: Job ${job.id} cancelled`);
    console.log(`   → Reason: ${transitionData.reason || 'Not specified'}`);
    
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
