// Helper function to transform database row to API format
const transformRow = (row, tableName) => {
  if (!row) return null;
  
  const transformed = { ...row };
  
  // Handle coordinate fields
  if (tableName === 'clients' || tableName === 'employees') {
    if (row.lat !== undefined && row.lon !== undefined) {
      transformed.coordinates = { lat: row.lat, lng: row.lon };
      delete transformed.lat;
      delete transformed.lon;
    }
  }
  
  // Transform employees fields
  if (tableName === 'employees') {
    if (row.job_title !== undefined) {
      transformed.jobTitle = row.job_title;
      delete transformed.job_title;
    }
    if (row.pay_rate !== undefined) {
      transformed.payRate = (row.pay_rate !== null && row.pay_rate !== '') ? parseFloat(row.pay_rate) : row.pay_rate;
      delete transformed.pay_rate;
    }
    if (row.hire_date !== undefined) {
      transformed.hireDate = row.hire_date;
      delete transformed.hire_date;
    }
    if (row.performance_metrics !== undefined) {
      transformed.performanceMetrics = row.performance_metrics;
      delete transformed.performance_metrics;
    }
  }
  
  // Transform equipment fields
  if (tableName === 'equipment') {
    if (row.purchase_date !== undefined) {
      transformed.purchaseDate = row.purchase_date;
      delete transformed.purchase_date;
    }
    if (row.last_service_date !== undefined) {
      transformed.lastServiceDate = row.last_service_date;
      delete transformed.last_service_date;
    }
    if (row.assigned_to !== undefined) {
      transformed.assignedTo = row.assigned_to;
      delete transformed.assigned_to;
    }
    if (row.maintenance_history !== undefined) {
      transformed.maintenanceHistory = row.maintenance_history;
      delete transformed.maintenance_history;
    }
  }
  
  // Transform quotes fields
  if (tableName === 'quotes') {
    if (row.lead_id !== undefined) {
      transformed.leadId = row.lead_id;
      delete transformed.lead_id;
    }
    if (row.client_id !== undefined) {
      transformed.clientId = row.client_id;
      delete transformed.client_id;
    }
    if (row.property_id !== undefined) {
      transformed.propertyId = row.property_id;
      delete transformed.property_id;
    }
    if (row.quote_number !== undefined) {
      transformed.quoteNumber = row.quote_number;
      delete transformed.quote_number;
    }
    if (row.approval_status !== undefined) {
      transformed.approvalStatus = row.approval_status;
      delete transformed.approval_status;
    }
    if (row.approved_by !== undefined) {
      transformed.approvedBy = row.approved_by;
      delete transformed.approved_by;
    }
    if (row.approved_at !== undefined) {
      transformed.approvedAt = row.approved_at;
      delete transformed.approved_at;
    }
    if (row.terms_and_conditions !== undefined) {
      transformed.termsAndConditions = row.terms_and_conditions;
      delete transformed.terms_and_conditions;
    }
    if (row.internal_notes !== undefined) {
      transformed.internalNotes = row.internal_notes;
      delete transformed.internal_notes;
    }
    if (row.total_amount !== undefined) {
      transformed.totalAmount = (row.total_amount !== null && row.total_amount !== '') ? parseFloat(row.total_amount) : row.total_amount;
      delete transformed.total_amount;
    }
    if (row.discount_amount !== undefined) {
      transformed.discountAmount = (row.discount_amount !== null && row.discount_amount !== '') ? parseFloat(row.discount_amount) : row.discount_amount;
      delete transformed.discount_amount;
    }
    if (row.discount_percentage !== undefined) {
      transformed.discountPercentage = (row.discount_percentage !== null && row.discount_percentage !== '') ? parseFloat(row.discount_percentage) : row.discount_percentage;
      delete transformed.discount_percentage;
    }
    if (row.tax_rate !== undefined) {
      transformed.taxRate = (row.tax_rate !== null && row.tax_rate !== '') ? parseFloat(row.tax_rate) : row.tax_rate;
      delete transformed.tax_rate;
    }
    if (row.tax_amount !== undefined) {
      transformed.taxAmount = (row.tax_amount !== null && row.tax_amount !== '') ? parseFloat(row.tax_amount) : row.tax_amount;
      delete transformed.tax_amount;
    }
    if (row.grand_total !== undefined) {
      transformed.grandTotal = (row.grand_total !== null && row.grand_total !== '') ? parseFloat(row.grand_total) : row.grand_total;
      delete transformed.grand_total;
    }
    if (row.updated_at !== undefined) {
      transformed.updatedAt = row.updated_at;
      delete transformed.updated_at;
    }
    if (row.deleted_at !== undefined) {
      transformed.deletedAt = row.deleted_at;
      delete transformed.deleted_at;
    }
    if (row.customer_name !== undefined) {
      transformed.customerName = row.customer_name;
      delete transformed.customer_name;
    }
    if (row.line_items !== undefined) {
      transformed.lineItems = row.line_items;
      delete transformed.line_items;
    }
    if (row.stump_grinding_price !== undefined) {
      transformed.stumpGrindingPrice = (row.stump_grinding_price !== null && row.stump_grinding_price !== '') ? parseFloat(row.stump_grinding_price) : row.stump_grinding_price;
      delete transformed.stump_grinding_price;
    }
    if (row.accepted_at !== undefined) {
      transformed.acceptedAt = row.accepted_at;
      delete transformed.accepted_at;
    }
    if (row.job_location !== undefined) {
      transformed.jobLocation = row.job_location;
      delete transformed.job_location;
    }
    if (row.special_instructions !== undefined) {
      transformed.specialInstructions = row.special_instructions;
      delete transformed.special_instructions;
    }
    if (row.valid_until !== undefined) {
      transformed.validUntil = row.valid_until;
      delete transformed.valid_until;
    }
    if (row.deposit_amount !== undefined) {
      transformed.depositAmount = (row.deposit_amount !== null && row.deposit_amount !== '') ? parseFloat(row.deposit_amount) : row.deposit_amount;
      delete transformed.deposit_amount;
    }
    if (row.payment_terms !== undefined) {
      transformed.paymentTerms = row.payment_terms;
      delete transformed.payment_terms;
    }
    if (row.customer_uploads !== undefined) {
      transformed.customerUploads = row.customer_uploads;
      delete transformed.customer_uploads;
    }
  }

  // Transform leads fields
  if (tableName === 'leads') {
    if (row.customer_id !== undefined) {
      transformed.customerId = row.customer_id;
      delete transformed.customer_id;
    }
    if (row.customer_uploads !== undefined) {
      transformed.customerUploads = row.customer_uploads;
      delete transformed.customer_uploads;
    }
  }

  if (tableName === 'jobs') {
    if (row.clock_in_lat !== undefined && row.clock_in_lon !== undefined) {
      transformed.clockInCoordinates = { lat: row.clock_in_lat, lng: row.clock_in_lon };
      delete transformed.clock_in_lat;
      delete transformed.clock_in_lon;
    }
    if (row.clock_out_lat !== undefined && row.clock_out_lon !== undefined) {
      transformed.clockOutCoordinates = { lat: row.clock_out_lat, lng: row.clock_out_lon };
      delete transformed.clock_out_lat;
      delete transformed.clock_out_lon;
    }
    // Transform snake_case to camelCase for job fields
    if (row.work_started_at !== undefined) {
      transformed.workStartedAt = row.work_started_at;
      delete transformed.work_started_at;
    }
    if (row.work_ended_at !== undefined) {
      transformed.workEndedAt = row.work_ended_at;
      delete transformed.work_ended_at;
    }
    if (row.assigned_crew !== undefined) {
      transformed.assignedCrew = row.assigned_crew;
      delete transformed.assigned_crew;
    }
    if (row.stump_grinding_price !== undefined) {
      transformed.stumpGrindingPrice = (row.stump_grinding_price !== null && row.stump_grinding_price !== '') ? parseFloat(row.stump_grinding_price) : row.stump_grinding_price;
      delete transformed.stump_grinding_price;
    }
    if (row.quote_id !== undefined) {
      transformed.quoteId = row.quote_id;
      delete transformed.quote_id;
    }
    if (row.customer_name !== undefined) {
      transformed.customerName = row.customer_name;
      delete transformed.customer_name;
    }
    if (row.scheduled_date !== undefined) {
      transformed.scheduledDate = row.scheduled_date;
      delete transformed.scheduled_date;
    }
    if (row.job_location !== undefined) {
      transformed.jobLocation = row.job_location;
      delete transformed.job_location;
    }
    if (row.special_instructions !== undefined) {
      transformed.specialInstructions = row.special_instructions;
      delete transformed.special_instructions;
    }
    if (row.required_crew_size !== undefined) {
      transformed.requiredCrewSize = row.required_crew_size !== null ? Number(row.required_crew_size) : null;
      delete transformed.required_crew_size;
    }
    if (row.job_template_id !== undefined) {
      transformed.jobTemplateId = row.job_template_id;
      delete transformed.job_template_id;
    }
    if (row.equipment_needed !== undefined) {
      transformed.equipmentNeeded = row.equipment_needed;
      delete transformed.equipment_needed;
    }
    if (row.estimated_hours !== undefined) {
      transformed.estimatedHours = (row.estimated_hours !== null && row.estimated_hours !== '') ? parseFloat(row.estimated_hours) : row.estimated_hours;
      delete transformed.estimated_hours;
    }
    if (row.jha_acknowledged_at !== undefined) {
      transformed.jhaAcknowledgedAt = row.jha_acknowledged_at;
      delete transformed.jha_acknowledged_at;
    }
    if (row.risk_level !== undefined) {
      transformed.riskLevel = row.risk_level;
      delete transformed.risk_level;
    }
    if (row.jha_required !== undefined) {
      transformed.jhaRequired = row.jha_required;
      delete transformed.jha_required;
    }
    if (row.quote_version !== undefined) {
      transformed.quoteVersion = row.quote_version;
      delete transformed.quote_version;
    }
    if (row.quote_approval_status !== undefined) {
      transformed.quoteApprovalStatus = row.quote_approval_status;
      delete transformed.quote_approval_status;
    }
    if (row.quote_approved_by !== undefined) {
      transformed.quoteApprovedBy = row.quote_approved_by;
      delete transformed.quote_approved_by;
    }
    if (row.quote_approved_at !== undefined) {
      transformed.quoteApprovedAt = row.quote_approved_at;
      delete transformed.quote_approved_at;
    }
    if (row.quote_number !== undefined) {
      transformed.quoteNumber = row.quote_number;
      delete transformed.quote_number;
    }
  }

  if (tableName === 'job_series') {
    if (row.client_id !== undefined) {
      transformed.clientId = row.client_id;
      delete transformed.client_id;
    }
    if (row.property_id !== undefined) {
      transformed.propertyId = row.property_id;
      delete transformed.property_id;
    }
    if (row.series_name !== undefined) {
      transformed.seriesName = row.series_name;
      delete transformed.series_name;
    }
    if (row.service_type !== undefined) {
      transformed.serviceType = row.service_type;
      delete transformed.service_type;
    }
    if (row.recurrence_pattern !== undefined) {
      transformed.recurrencePattern = row.recurrence_pattern;
      delete transformed.recurrence_pattern;
    }
    if (row.recurrence_interval !== undefined) {
      transformed.recurrenceInterval = Number(row.recurrence_interval);
      delete transformed.recurrence_interval;
    }
    if (row.recurrence_day_of_week !== undefined) {
      transformed.recurrenceDayOfWeek = row.recurrence_day_of_week;
      delete transformed.recurrence_day_of_week;
    }
    if (row.recurrence_day_of_month !== undefined) {
      transformed.recurrenceDayOfMonth = row.recurrence_day_of_month;
      delete transformed.recurrence_day_of_month;
    }
    if (row.recurrence_month !== undefined) {
      transformed.recurrenceMonth = row.recurrence_month;
      delete transformed.recurrence_month;
    }
    if (row.start_date !== undefined) {
      transformed.startDate = row.start_date;
      delete transformed.start_date;
    }
    if (row.end_date !== undefined) {
      transformed.endDate = row.end_date;
      delete transformed.end_date;
    }
    if (row.is_active !== undefined) {
      transformed.isActive = row.is_active;
      delete transformed.is_active;
    }
    if (row.job_template_id !== undefined) {
      transformed.jobTemplateId = row.job_template_id;
      delete transformed.job_template_id;
    }
    if (row.default_crew_id !== undefined) {
      transformed.defaultCrewId = row.default_crew_id;
      delete transformed.default_crew_id;
    }
    if (row.estimated_duration_hours !== undefined) {
      transformed.estimatedDurationHours = row.estimated_duration_hours !== null ? Number(row.estimated_duration_hours) : null;
      delete transformed.estimated_duration_hours;
    }
  }

  if (tableName === 'recurring_job_instances') {
    if (row.job_series_id !== undefined) {
      transformed.jobSeriesId = row.job_series_id;
      delete transformed.job_series_id;
    }
    if (row.job_id !== undefined) {
      transformed.jobId = row.job_id;
      delete transformed.job_id;
    }
    if (row.scheduled_date !== undefined) {
      transformed.scheduledDate = row.scheduled_date;
      delete transformed.scheduled_date;
    }
  }

  // Transform pay_periods fields
  if (tableName === 'pay_periods') {
    if (row.start_date !== undefined) {
      transformed.startDate = row.start_date;
      delete transformed.start_date;
    }
    if (row.end_date !== undefined) {
      transformed.endDate = row.end_date;
      delete transformed.end_date;
    }
    if (row.period_type !== undefined) {
      transformed.periodType = row.period_type;
      delete transformed.period_type;
    }
    if (row.processed_at !== undefined) {
      transformed.processedAt = row.processed_at;
      delete transformed.processed_at;
    }
  }
  
  // Transform time_entries fields
  if (tableName === 'time_entries') {
    if (row.employee_id !== undefined) {
      transformed.employeeId = row.employee_id;
      delete transformed.employee_id;
    }
    if (row.job_id !== undefined) {
      transformed.jobId = row.job_id;
      delete transformed.job_id;
    }
    if (row.hours_worked !== undefined) {
      transformed.hoursWorked = (row.hours_worked !== null && row.hours_worked !== '') ? parseFloat(row.hours_worked) : row.hours_worked;
      delete transformed.hours_worked;
    }
    if (row.hourly_rate !== undefined) {
      transformed.hourlyRate = (row.hourly_rate !== null && row.hourly_rate !== '') ? parseFloat(row.hourly_rate) : row.hourly_rate;
      delete transformed.hourly_rate;
    }
    if (row.overtime_hours !== undefined) {
      transformed.overtimeHours = (row.overtime_hours !== null && row.overtime_hours !== '') ? parseFloat(row.overtime_hours) : row.overtime_hours;
      delete transformed.overtime_hours;
    }
  }
  
  // Transform payroll_records fields
  if (tableName === 'payroll_records') {
    if (row.employee_id !== undefined) {
      transformed.employeeId = row.employee_id;
      delete transformed.employee_id;
    }
    if (row.pay_period_id !== undefined) {
      transformed.payPeriodId = row.pay_period_id;
      delete transformed.pay_period_id;
    }
    if (row.regular_hours !== undefined) {
      transformed.regularHours = (row.regular_hours !== null && row.regular_hours !== '') ? parseFloat(row.regular_hours) : row.regular_hours;
      delete transformed.regular_hours;
    }
    if (row.overtime_hours !== undefined) {
      transformed.overtimeHours = (row.overtime_hours !== null && row.overtime_hours !== '') ? parseFloat(row.overtime_hours) : row.overtime_hours;
      delete transformed.overtime_hours;
    }
    if (row.hourly_rate !== undefined) {
      transformed.hourlyRate = (row.hourly_rate !== null && row.hourly_rate !== '') ? parseFloat(row.hourly_rate) : row.hourly_rate;
      delete transformed.hourly_rate;
    }
    if (row.regular_pay !== undefined) {
      transformed.regularPay = (row.regular_pay !== null && row.regular_pay !== '') ? parseFloat(row.regular_pay) : row.regular_pay;
      delete transformed.regular_pay;
    }
    if (row.overtime_pay !== undefined) {
      transformed.overtimePay = (row.overtime_pay !== null && row.overtime_pay !== '') ? parseFloat(row.overtime_pay) : row.overtime_pay;
      delete transformed.overtime_pay;
    }
    if (row.total_deductions !== undefined) {
      transformed.totalDeductions = (row.total_deductions !== null && row.total_deductions !== '') ? parseFloat(row.total_deductions) : row.total_deductions;
      delete transformed.total_deductions;
    }
    if (row.gross_pay !== undefined) {
      transformed.grossPay = (row.gross_pay !== null && row.gross_pay !== '') ? parseFloat(row.gross_pay) : row.gross_pay;
      delete transformed.gross_pay;
    }
    if (row.net_pay !== undefined) {
      transformed.netPay = (row.net_pay !== null && row.net_pay !== '') ? parseFloat(row.net_pay) : row.net_pay;
      delete transformed.net_pay;
    }
    if (row.paid_at !== undefined) {
      transformed.paidAt = row.paid_at;
      delete transformed.paid_at;
    }
    if (row.payment_method !== undefined) {
      transformed.paymentMethod = row.payment_method;
      delete transformed.payment_method;
    }
  }
  
  // Transform company_profile fields
  if (tableName === 'company_profile') {
    if (row.company_name !== undefined) {
      transformed.companyName = row.company_name;
      delete transformed.company_name;
    }
    if (row.phone_number !== undefined) {
      transformed.phoneNumber = row.phone_number;
      delete transformed.phone_number;
    }
    if (row.tax_ein !== undefined) {
      transformed.taxEin = row.tax_ein;
      delete transformed.tax_ein;
    }
    if (row.zip_code !== undefined) {
      transformed.zipCode = row.zip_code;
      delete transformed.zip_code;
    }
    if (row.logo_url !== undefined) {
      transformed.logoUrl = row.logo_url;
      delete transformed.logo_url;
    }
    if (row.business_hours !== undefined) {
      transformed.businessHours = row.business_hours;
      delete transformed.business_hours;
    }
    if (row.license_number !== undefined) {
      transformed.licenseNumber = row.license_number;
      delete transformed.license_number;
    }
    if (row.insurance_policy_number !== undefined) {
      transformed.insurancePolicyNumber = row.insurance_policy_number;
      delete transformed.insurance_policy_number;
    }
    if (row.updated_at !== undefined) {
      transformed.updatedAt = row.updated_at;
      delete transformed.updated_at;
    }
    if (row.created_at !== undefined) {
      transformed.createdAt = row.created_at;
      delete transformed.created_at;
    }
  }
  
  // Transform properties fields
  if (tableName === 'properties') {
    if (row.zip_code !== undefined) {
      transformed.zipCode = row.zip_code;
      delete transformed.zip_code;
    }
    if (row.client_id !== undefined) {
      transformed.clientId = row.client_id;
      delete transformed.client_id;
    }
    if (row.property_name !== undefined) {
      transformed.propertyName = row.property_name;
      delete transformed.property_name;
    }
    if (row.address_line1 !== undefined) {
      transformed.addressLine1 = row.address_line1;
      delete transformed.address_line1;
    }
    if (row.address_line2 !== undefined) {
      transformed.addressLine2 = row.address_line2;
      delete transformed.address_line2;
    }
    if (row.property_type !== undefined) {
      transformed.propertyType = row.property_type;
      delete transformed.property_type;
    }
    if (row.square_footage !== undefined) {
      transformed.squareFootage = (row.square_footage !== null && row.square_footage !== '') ? parseFloat(row.square_footage) : row.square_footage;
      delete transformed.square_footage;
    }
    if (row.lot_size !== undefined) {
      transformed.lotSize = (row.lot_size !== null && row.lot_size !== '') ? parseFloat(row.lot_size) : row.lot_size;
      delete transformed.lot_size;
    }
    if (row.gate_code !== undefined) {
      transformed.gateCode = row.gate_code;
      delete transformed.gate_code;
    }
    if (row.access_instructions !== undefined) {
      transformed.accessInstructions = row.access_instructions;
      delete transformed.access_instructions;
    }
    if (row.parking_instructions !== undefined) {
      transformed.parkingInstructions = row.parking_instructions;
      delete transformed.parking_instructions;
    }
    if (row.trees_on_property !== undefined) {
      transformed.treesOnProperty = row.trees_on_property;
      delete transformed.trees_on_property;
    }
    if (row.property_features !== undefined) {
      transformed.propertyFeatures = row.property_features;
      delete transformed.property_features;
    }
    if (row.is_primary !== undefined) {
      transformed.isPrimary = row.is_primary;
      delete transformed.is_primary;
    }
    if (row.created_at !== undefined) {
      transformed.createdAt = row.created_at;
      delete transformed.created_at;
    }
    if (row.updated_at !== undefined) {
      transformed.updatedAt = row.updated_at;
      delete transformed.updated_at;
    }
    if (row.deleted_at !== undefined) {
      transformed.deletedAt = row.deleted_at;
      delete transformed.deleted_at;
    }
  }
  
  // Transform estimate_feedback fields
  if (tableName === 'estimate_feedback') {
    if (row.quote_id !== undefined) {
      transformed.quoteId = row.quote_id;
      delete transformed.quote_id;
    }
    if (row.ai_estimate_data !== undefined) {
      transformed.aiEstimateData = row.ai_estimate_data;
      delete transformed.ai_estimate_data;
    }
    if (row.ai_suggested_price_min !== undefined) {
      transformed.aiSuggestedPriceMin = (row.ai_suggested_price_min !== null && row.ai_suggested_price_min !== '') ? parseFloat(row.ai_suggested_price_min) : row.ai_suggested_price_min;
      delete transformed.ai_suggested_price_min;
    }
    if (row.ai_suggested_price_max !== undefined) {
      transformed.aiSuggestedPriceMax = (row.ai_suggested_price_max !== null && row.ai_suggested_price_max !== '') ? parseFloat(row.ai_suggested_price_max) : row.ai_suggested_price_max;
      delete transformed.ai_suggested_price_max;
    }
    if (row.actual_price_quoted !== undefined) {
      transformed.actualPriceQuoted = (row.actual_price_quoted !== null && row.actual_price_quoted !== '') ? parseFloat(row.actual_price_quoted) : row.actual_price_quoted;
      delete transformed.actual_price_quoted;
    }
    if (row.feedback_rating !== undefined) {
      transformed.feedbackRating = row.feedback_rating;
      delete transformed.feedback_rating;
    }
    if (row.correction_reasons !== undefined) {
      transformed.correctionReasons = row.correction_reasons;
      delete transformed.correction_reasons;
    }
    if (row.user_notes !== undefined) {
      transformed.userNotes = row.user_notes;
      delete transformed.user_notes;
    }
    if (row.tree_species !== undefined) {
      transformed.treeSpecies = row.tree_species;
      delete transformed.tree_species;
    }
    if (row.tree_height !== undefined) {
      transformed.treeHeight = (row.tree_height !== null && row.tree_height !== '') ? parseFloat(row.tree_height) : row.tree_height;
      delete transformed.tree_height;
    }
    if (row.trunk_diameter !== undefined) {
      transformed.trunkDiameter = (row.trunk_diameter !== null && row.trunk_diameter !== '') ? parseFloat(row.trunk_diameter) : row.trunk_diameter;
      delete transformed.trunk_diameter;
    }
    if (row.job_location !== undefined) {
      transformed.jobLocation = row.job_location;
      delete transformed.job_location;
    }
    if (row.customer_name !== undefined) {
      transformed.customerName = row.customer_name;
      delete transformed.customer_name;
    }
  }
  
  // Transform crews fields
  if (tableName === 'crews') {
    if (row.is_active !== undefined) {
      transformed.isActive = row.is_active;
      delete transformed.is_active;
    }
    if (row.default_start_time !== undefined) {
      transformed.defaultStartTime = row.default_start_time;
      delete transformed.default_start_time;
    }
    if (row.default_end_time !== undefined) {
      transformed.defaultEndTime = row.default_end_time;
      delete transformed.default_end_time;
    }
    if (row.updated_at !== undefined) {
      transformed.updatedAt = row.updated_at;
      delete transformed.updated_at;
    }
    if (row.deleted_at !== undefined) {
      transformed.deletedAt = row.deleted_at;
      delete transformed.deleted_at;
    }
    if (row.member_count !== undefined) {
      transformed.memberCount = parseInt(row.member_count) || 0;
      delete transformed.member_count;
    }
  }
  
  // Transform crew_members fields
  if (tableName === 'crew_members') {
    if (row.crew_id !== undefined) {
      transformed.crewId = row.crew_id;
      delete transformed.crew_id;
    }
    if (row.employee_id !== undefined) {
      transformed.employeeId = row.employee_id;
      delete transformed.employee_id;
    }
    if (row.joined_at !== undefined) {
      transformed.joinedAt = row.joined_at;
      delete transformed.joined_at;
    }
    if (row.left_at !== undefined) {
      transformed.leftAt = row.left_at;
      delete transformed.left_at;
    }
    if (row.employee_name !== undefined) {
      transformed.employeeName = row.employee_name;
      delete transformed.employee_name;
    }
    if (row.job_title !== undefined) {
      transformed.jobTitle = row.job_title;
      delete transformed.job_title;
    }
  }
  
  // Transform crew_assignments fields
  if (tableName === 'crew_assignments') {
    if (row.job_id !== undefined) {
      transformed.jobId = row.job_id;
      delete transformed.job_id;
    }
    if (row.crew_id !== undefined) {
      transformed.crewId = row.crew_id;
      delete transformed.crew_id;
    }
    if (row.assigned_date !== undefined) {
      transformed.assignedDate = row.assigned_date;
      delete transformed.assigned_date;
    }
    if (row.assigned_by !== undefined) {
      transformed.assignedBy = row.assigned_by;
      delete transformed.assigned_by;
    }
    if (row.created_at !== undefined) {
      transformed.createdAt = row.created_at;
      delete transformed.created_at;
    }
    if (row.crew_name !== undefined) {
      transformed.crewName = row.crew_name;
      delete transformed.crew_name;
    }
    if (row.job_title !== undefined) {
      transformed.jobTitle = row.job_title;
      delete transformed.job_title;
    }
    if (row.customer_name !== undefined) {
      transformed.customerName = row.customer_name;
      delete transformed.customer_name;
    }
    if (row.scheduled_date !== undefined) {
      transformed.scheduledDate = row.scheduled_date;
      delete transformed.scheduled_date;
    }
  }
  
  // Transform form_templates fields
  if (tableName === 'form_templates') {
    if (row.form_type !== undefined) {
      transformed.formType = row.form_type;
      delete transformed.form_type;
    }
    if (row.is_active !== undefined) {
      transformed.isActive = row.is_active;
      delete transformed.is_active;
    }
    if (row.require_signature !== undefined) {
      transformed.requireSignature = row.require_signature;
      delete transformed.require_signature;
    }
    if (row.require_photos !== undefined) {
      transformed.requirePhotos = row.require_photos;
      delete transformed.require_photos;
    }
    if (row.min_photos !== undefined) {
      transformed.minPhotos = row.min_photos;
      delete transformed.min_photos;
    }
    if (row.created_by !== undefined) {
      transformed.createdBy = row.created_by;
      delete transformed.created_by;
    }
    if (row.updated_at !== undefined) {
      transformed.updatedAt = row.updated_at;
      delete transformed.updated_at;
    }
    if (row.deleted_at !== undefined) {
      transformed.deletedAt = row.deleted_at;
      delete transformed.deleted_at;
    }
  }
  
  // Transform job_forms fields
  if (tableName === 'job_forms') {
    if (row.job_id !== undefined) {
      transformed.jobId = row.job_id;
      delete transformed.job_id;
    }
    if (row.form_template_id !== undefined) {
      transformed.formTemplateId = row.form_template_id;
      delete transformed.form_template_id;
    }
    if (row.form_data !== undefined) {
      transformed.formData = row.form_data;
      delete transformed.form_data;
    }
    if (row.completed_at !== undefined) {
      transformed.completedAt = row.completed_at;
      delete transformed.completed_at;
    }
    if (row.completed_by !== undefined) {
      transformed.completedBy = row.completed_by;
      delete transformed.completed_by;
    }
    if (row.updated_at !== undefined) {
      transformed.updatedAt = row.updated_at;
      delete transformed.updated_at;
    }
  }
  
  // Transform invoices fields
  if (tableName === 'invoices') {
    if (row.job_id !== undefined) {
      transformed.jobId = row.job_id;
      delete transformed.job_id;
    }
    if (row.client_id !== undefined) {
      transformed.clientId = row.client_id;
      delete transformed.client_id;
    }
    if (row.property_id !== undefined) {
      transformed.propertyId = row.property_id;
      delete transformed.property_id;
    }
    if (row.customer_name !== undefined) {
      transformed.customerName = row.customer_name;
      delete transformed.customer_name;
    }
    if (row.invoice_number !== undefined) {
      transformed.invoiceNumber = row.invoice_number;
      delete transformed.invoice_number;
    }
    if (row.issue_date !== undefined) {
      transformed.issueDate = row.issue_date;
      delete transformed.issue_date;
    }
    if (row.sent_date !== undefined) {
      transformed.sentDate = row.sent_date;
      delete transformed.sent_date;
    }
    if (row.due_date !== undefined) {
      transformed.dueDate = row.due_date;
      delete transformed.due_date;
    }
    if (row.paid_at !== undefined) {
      transformed.paidAt = row.paid_at;
      delete transformed.paid_at;
    }
    if (row.line_items !== undefined) {
      transformed.lineItems = row.line_items;
      delete transformed.line_items;
    }
    if (row.subtotal !== undefined) {
      transformed.subtotal = (row.subtotal !== null && row.subtotal !== '') ? parseFloat(row.subtotal) : row.subtotal;
      delete transformed.subtotal;
    }
    if (row.discount_amount !== undefined) {
      transformed.discountAmount = (row.discount_amount !== null && row.discount_amount !== '') ? parseFloat(row.discount_amount) : row.discount_amount;
      delete transformed.discount_amount;
    }
    if (row.discount_percentage !== undefined) {
      transformed.discountPercentage = (row.discount_percentage !== null && row.discount_percentage !== '') ? parseFloat(row.discount_percentage) : row.discount_percentage;
      delete transformed.discount_percentage;
    }
    if (row.tax_rate !== undefined) {
      transformed.taxRate = (row.tax_rate !== null && row.tax_rate !== '') ? parseFloat(row.tax_rate) : row.tax_rate;
      delete transformed.tax_rate;
    }
    if (row.tax_amount !== undefined) {
      transformed.taxAmount = (row.tax_amount !== null && row.tax_amount !== '') ? parseFloat(row.tax_amount) : row.tax_amount;
      delete transformed.tax_amount;
    }
    if (row.total_amount !== undefined) {
      transformed.totalAmount = (row.total_amount !== null && row.total_amount !== '') ? parseFloat(row.total_amount) : row.total_amount;
      delete transformed.total_amount;
    }
    if (row.grand_total !== undefined) {
      transformed.grandTotal = (row.grand_total !== null && row.grand_total !== '') ? parseFloat(row.grand_total) : row.grand_total;
      delete transformed.grand_total;
    }
    if (row.amount_paid !== undefined) {
      transformed.amountPaid = (row.amount_paid !== null && row.amount_paid !== '') ? parseFloat(row.amount_paid) : row.amount_paid;
      delete transformed.amount_paid;
    }
    if (row.amount_due !== undefined) {
      transformed.amountDue = (row.amount_due !== null && row.amount_due !== '') ? parseFloat(row.amount_due) : row.amount_due;
      delete transformed.amount_due;
    }
    if (row.payment_terms !== undefined) {
      transformed.paymentTerms = row.payment_terms;
      delete transformed.payment_terms;
    }
    if (row.customer_email !== undefined) {
      transformed.customerEmail = row.customer_email;
      delete transformed.customer_email;
    }
    if (row.customer_phone !== undefined) {
      transformed.customerPhone = row.customer_phone;
      delete transformed.customer_phone;
    }
    if (row.customer_address !== undefined) {
      transformed.customerAddress = row.customer_address;
      delete transformed.customer_address;
    }
    if (row.customer_notes !== undefined) {
      transformed.customerNotes = row.customer_notes;
      delete transformed.customer_notes;
    }
    if (row.updated_at !== undefined) {
      transformed.updatedAt = row.updated_at;
      delete transformed.updated_at;
    }
  }
  
  // Transform payment_records fields
  if (tableName === 'payment_records') {
    if (row.invoice_id !== undefined) {
      transformed.invoiceId = row.invoice_id;
      delete transformed.invoice_id;
    }
    if (row.payment_date !== undefined) {
      transformed.paymentDate = row.payment_date;
      delete transformed.payment_date;
    }
    if (row.payment_method !== undefined) {
      transformed.paymentMethod = row.payment_method;
      delete transformed.payment_method;
    }
    if (row.transaction_id !== undefined) {
      transformed.transactionId = row.transaction_id;
      delete transformed.transaction_id;
    }
    if (row.reference_number !== undefined) {
      transformed.referenceNumber = row.reference_number;
      delete transformed.reference_number;
    }
    if (row.recorded_by !== undefined) {
      transformed.recordedBy = row.recorded_by;
      delete transformed.recorded_by;
    }
    if (row.created_at !== undefined) {
      transformed.createdAt = row.created_at;
      delete transformed.created_at;
    }
  }
  
  // Transform other snake_case fields
  if (row.created_at !== undefined) {
    transformed.createdAt = row.created_at;
    delete transformed.created_at;
  }
  
  return transformed;
};


// Helper function to transform API data to database format
const transformToDb = (data, tableName) => {
  const transformed = { ...data };
  
  // Handle coordinate fields
  if ((tableName === 'clients' || tableName === 'employees') && data.coordinates) {
    transformed.lat = data.coordinates.lat;
    transformed.lon = data.coordinates.lng;
    delete transformed.coordinates;
  }
  
  // Transform employees fields
  if (tableName === 'employees') {
    if (data.jobTitle !== undefined) {
      transformed.job_title = data.jobTitle;
      delete transformed.jobTitle;
    }
    if (data.payRate !== undefined) {
      transformed.pay_rate = data.payRate;
      delete transformed.payRate;
    }
    if (data.hireDate !== undefined) {
      transformed.hire_date = data.hireDate;
      delete transformed.hireDate;
    }
    if (data.performanceMetrics !== undefined) {
      transformed.performance_metrics = data.performanceMetrics;
      delete transformed.performanceMetrics;
    }
  }
  
  // Transform equipment fields
  if (tableName === 'equipment') {
    if (data.purchaseDate !== undefined) {
      transformed.purchase_date = data.purchaseDate;
      delete transformed.purchaseDate;
    }
    if (data.lastServiceDate !== undefined) {
      transformed.last_service_date = data.lastServiceDate;
      delete transformed.lastServiceDate;
    }
    if (data.assignedTo !== undefined) {
      transformed.assigned_to = data.assignedTo;
      delete transformed.assignedTo;
    }
    if (data.maintenanceHistory !== undefined) {
      transformed.maintenance_history = data.maintenanceHistory;
      delete transformed.maintenanceHistory;
    }
  }
  
  // Transform quotes fields
  if (tableName === 'quotes') {
    if (data.leadId !== undefined) {
      transformed.lead_id = data.leadId;
      delete transformed.leadId;
    }
    if (data.clientId !== undefined) {
      transformed.client_id = data.clientId;
      delete transformed.clientId;
    }
    if (data.propertyId !== undefined) {
      transformed.property_id = data.propertyId;
      delete transformed.propertyId;
    }
    if (data.quoteNumber !== undefined) {
      transformed.quote_number = data.quoteNumber;
      delete transformed.quoteNumber;
    }
    if (data.approvalStatus !== undefined) {
      transformed.approval_status = data.approvalStatus;
      delete transformed.approvalStatus;
    }
    if (data.approvedBy !== undefined) {
      transformed.approved_by = data.approvedBy;
      delete transformed.approvedBy;
    }
    if (data.approvedAt !== undefined) {
      transformed.approved_at = data.approvedAt;
      delete transformed.approvedAt;
    }
    if (data.termsAndConditions !== undefined) {
      transformed.terms_and_conditions = data.termsAndConditions;
      delete transformed.termsAndConditions;
    }
    if (data.internalNotes !== undefined) {
      transformed.internal_notes = data.internalNotes;
      delete transformed.internalNotes;
    }
    if (data.totalAmount !== undefined) {
      transformed.total_amount = data.totalAmount;
      delete transformed.totalAmount;
    }
    if (data.discountAmount !== undefined) {
      transformed.discount_amount = data.discountAmount;
      delete transformed.discountAmount;
    }
    if (data.discountPercentage !== undefined) {
      transformed.discount_percentage = data.discountPercentage;
      delete transformed.discountPercentage;
    }
    if (data.taxRate !== undefined) {
      transformed.tax_rate = data.taxRate;
      delete transformed.taxRate;
    }
    if (data.taxAmount !== undefined) {
      transformed.tax_amount = data.taxAmount;
      delete transformed.taxAmount;
    }
    if (data.grandTotal !== undefined) {
      transformed.grand_total = data.grandTotal;
      delete transformed.grandTotal;
    }
    if (data.updatedAt !== undefined) {
      transformed.updated_at = data.updatedAt;
      delete transformed.updatedAt;
    }
    if (data.deletedAt !== undefined) {
      transformed.deleted_at = data.deletedAt;
      delete transformed.deletedAt;
    }
    if (data.customerName !== undefined) {
      transformed.customer_name = data.customerName;
      delete transformed.customerName;
    }
    if (data.lineItems !== undefined) {
      transformed.line_items = data.lineItems;
      delete transformed.lineItems;
    }
    if (data.stumpGrindingPrice !== undefined) {
      transformed.stump_grinding_price = data.stumpGrindingPrice;
      delete transformed.stumpGrindingPrice;
    }
    if (data.acceptedAt !== undefined) {
      transformed.accepted_at = data.acceptedAt;
      delete transformed.acceptedAt;
    }
    if (data.jobLocation !== undefined) {
      transformed.job_location = data.jobLocation;
      delete transformed.jobLocation;
    }
    if (data.specialInstructions !== undefined) {
      transformed.special_instructions = data.specialInstructions;
      delete transformed.specialInstructions;
    }
    if (data.validUntil !== undefined) {
      transformed.valid_until = data.validUntil;
      delete transformed.validUntil;
    }
    if (data.depositAmount !== undefined) {
      transformed.deposit_amount = data.depositAmount;
      delete transformed.depositAmount;
    }
    if (data.paymentTerms !== undefined) {
      transformed.payment_terms = data.paymentTerms;
      delete transformed.paymentTerms;
    }
    if (data.customerUploads !== undefined) {
      transformed.customer_uploads = data.customerUploads;
      delete transformed.customerUploads;
    }
  }

  // Transform leads fields
  if (tableName === 'leads') {
    if (data.customerId !== undefined) {
      transformed.customer_id = data.customerId;
      delete transformed.customerId;
    }
    if (data.customerUploads !== undefined) {
      transformed.customer_uploads = data.customerUploads;
      delete transformed.customerUploads;
    }
  }

  if (tableName === 'jobs') {
    // Ensure status defaults to 'draft' if not provided (valid per job state machine)
    if (!transformed.status || transformed.status === '' || transformed.status === 'Unscheduled') {
      transformed.status = 'draft';
    }
    
    if (data.clockInCoordinates) {
      transformed.clock_in_lat = data.clockInCoordinates.lat;
      transformed.clock_in_lon = data.clockInCoordinates.lng;
      delete transformed.clockInCoordinates;
    }
    if (data.clockOutCoordinates) {
      transformed.clock_out_lat = data.clockOutCoordinates.lat;
      transformed.clock_out_lon = data.clockOutCoordinates.lng;
      delete transformed.clockOutCoordinates;
    }
    // Transform camelCase to snake_case
    if (data.workStartedAt !== undefined) {
      transformed.work_started_at = data.workStartedAt;
      delete transformed.workStartedAt;
    }
    if (data.workEndedAt !== undefined) {
      transformed.work_ended_at = data.workEndedAt;
      delete transformed.workEndedAt;
    }
    if (data.assignedCrew !== undefined) {
      transformed.assigned_crew = data.assignedCrew;
      delete transformed.assignedCrew;
    }
    if (data.stumpGrindingPrice !== undefined) {
      transformed.stump_grinding_price = data.stumpGrindingPrice;
      delete transformed.stumpGrindingPrice;
    }
    if (data.quoteId !== undefined) {
      transformed.quote_id = data.quoteId;
      delete transformed.quoteId;
    }
    if (data.customerName !== undefined) {
      transformed.customer_name = data.customerName;
      delete transformed.customerName;
    }
    if (data.scheduledDate !== undefined) {
      transformed.scheduled_date = data.scheduledDate;
      delete transformed.scheduledDate;
    }
    if (data.jobLocation !== undefined) {
      transformed.job_location = data.jobLocation;
      delete transformed.jobLocation;
    }
    if (data.specialInstructions !== undefined) {
      transformed.special_instructions = data.specialInstructions;
      delete transformed.specialInstructions;
    }
    if (data.requiredCrewSize !== undefined) {
      transformed.required_crew_size = data.requiredCrewSize;
      delete transformed.requiredCrewSize;
    }
    if (data.jobTemplateId !== undefined) {
      transformed.job_template_id = data.jobTemplateId;
      delete transformed.jobTemplateId;
    }
    if (data.equipmentNeeded !== undefined) {
      transformed.equipment_needed = data.equipmentNeeded;
      delete transformed.equipmentNeeded;
    }
    if (data.estimatedHours !== undefined) {
      transformed.estimated_hours = data.estimatedHours;
      delete transformed.estimatedHours;
    }
    if (data.jhaAcknowledgedAt !== undefined) {
      transformed.jha_acknowledged_at = data.jhaAcknowledgedAt;
      delete transformed.jhaAcknowledgedAt;
    }
    if (data.riskLevel !== undefined) {
      transformed.risk_level = data.riskLevel;
      delete transformed.riskLevel;
    }
    if (data.jhaRequired !== undefined) {
      transformed.jha_required = data.jhaRequired;
      delete transformed.jhaRequired;
    }
  }
  
  // Transform pay_periods fields
  if (tableName === 'pay_periods') {
    if (data.startDate !== undefined) {
      transformed.start_date = data.startDate;
      delete transformed.startDate;
    }
    if (data.endDate !== undefined) {
      transformed.end_date = data.endDate;
      delete transformed.endDate;
    }
    if (data.periodType !== undefined) {
      transformed.period_type = data.periodType;
      delete transformed.periodType;
    }
    if (data.processedAt !== undefined) {
      transformed.processed_at = data.processedAt;
      delete transformed.processedAt;
    }
  }
  
  // Transform time_entries fields
  if (tableName === 'time_entries') {
    if (data.employeeId !== undefined) {
      transformed.employee_id = data.employeeId;
      delete transformed.employeeId;
    }
    if (data.jobId !== undefined) {
      transformed.job_id = data.jobId;
      delete transformed.jobId;
    }
    if (data.hoursWorked !== undefined) {
      transformed.hours_worked = data.hoursWorked;
      delete transformed.hoursWorked;
    }
    if (data.hourlyRate !== undefined) {
      transformed.hourly_rate = data.hourlyRate;
      delete transformed.hourlyRate;
    }
    if (data.overtimeHours !== undefined) {
      transformed.overtime_hours = data.overtimeHours;
      delete transformed.overtimeHours;
    }
  }
  
  // Transform payroll_records fields
  if (tableName === 'payroll_records') {
    if (data.employeeId !== undefined) {
      transformed.employee_id = data.employeeId;
      delete transformed.employeeId;
    }
    if (data.payPeriodId !== undefined) {
      transformed.pay_period_id = data.payPeriodId;
      delete transformed.payPeriodId;
    }
    if (data.regularHours !== undefined) {
      transformed.regular_hours = data.regularHours;
      delete transformed.regularHours;
    }
    if (data.overtimeHours !== undefined) {
      transformed.overtime_hours = data.overtimeHours;
      delete transformed.overtimeHours;
    }
    if (data.hourlyRate !== undefined) {
      transformed.hourly_rate = data.hourlyRate;
      delete transformed.hourlyRate;
    }
    if (data.regularPay !== undefined) {
      transformed.regular_pay = data.regularPay;
      delete transformed.regularPay;
    }
    if (data.overtimePay !== undefined) {
      transformed.overtime_pay = data.overtimePay;
      delete transformed.overtimePay;
    }
    if (data.totalDeductions !== undefined) {
      transformed.total_deductions = data.totalDeductions;
      delete transformed.totalDeductions;
    }
    if (data.grossPay !== undefined) {
      transformed.gross_pay = data.grossPay;
      delete transformed.grossPay;
    }
    if (data.netPay !== undefined) {
      transformed.net_pay = data.netPay;
      delete transformed.netPay;
    }
    if (data.paidAt !== undefined) {
      transformed.paid_at = data.paidAt;
      delete transformed.paidAt;
    }
    if (data.paymentMethod !== undefined) {
      transformed.payment_method = data.paymentMethod;
      delete transformed.paymentMethod;
    }
  }
  
  // Transform company_profile fields
  if (tableName === 'company_profile') {
    if (data.companyName !== undefined) {
      transformed.company_name = data.companyName;
      delete transformed.companyName;
    }
    if (data.phoneNumber !== undefined) {
      transformed.phone_number = data.phoneNumber;
      delete transformed.phoneNumber;
    }
    if (data.taxEin !== undefined) {
      transformed.tax_ein = data.taxEin;
      delete transformed.taxEin;
    }
    if (data.zipCode !== undefined) {
      transformed.zip_code = data.zipCode;
      delete transformed.zipCode;
    }
    if (data.logoUrl !== undefined) {
      transformed.logo_url = data.logoUrl;
      delete transformed.logoUrl;
    }
    if (data.businessHours !== undefined) {
      transformed.business_hours = data.businessHours;
      delete transformed.businessHours;
    }
    if (data.licenseNumber !== undefined) {
      transformed.license_number = data.licenseNumber;
      delete transformed.licenseNumber;
    }
    if (data.insurancePolicyNumber !== undefined) {
      transformed.insurance_policy_number = data.insurancePolicyNumber;
      delete transformed.insurancePolicyNumber;
    }
    if (data.updatedAt !== undefined) {
      transformed.updated_at = data.updatedAt;
      delete transformed.updatedAt;
    }
  }
  
  // Transform estimate_feedback fields
  if (tableName === 'estimate_feedback') {
    if (data.quoteId !== undefined) {
      transformed.quote_id = data.quoteId;
      delete transformed.quoteId;
    }
    if (data.aiEstimateData !== undefined && typeof data.aiEstimateData === 'object') {
      transformed.ai_estimate_data = JSON.stringify(data.aiEstimateData);
      delete transformed.aiEstimateData;
    }
    if (data.aiSuggestedPriceMin !== undefined) {
      transformed.ai_suggested_price_min = data.aiSuggestedPriceMin;
      delete transformed.aiSuggestedPriceMin;
    }
    if (data.aiSuggestedPriceMax !== undefined) {
      transformed.ai_suggested_price_max = data.aiSuggestedPriceMax;
      delete transformed.aiSuggestedPriceMax;
    }
    if (data.actualPriceQuoted !== undefined) {
      transformed.actual_price_quoted = data.actualPriceQuoted;
      delete transformed.actualPriceQuoted;
    }
    if (data.feedbackRating !== undefined) {
      transformed.feedback_rating = data.feedbackRating;
      delete transformed.feedbackRating;
    }
    if (data.correctionReasons !== undefined && typeof data.correctionReasons === 'object') {
      transformed.correction_reasons = JSON.stringify(data.correctionReasons);
      delete transformed.correctionReasons;
    }
    if (data.userNotes !== undefined) {
      transformed.user_notes = data.userNotes;
      delete transformed.userNotes;
    }
    if (data.treeSpecies !== undefined) {
      transformed.tree_species = data.treeSpecies;
      delete transformed.treeSpecies;
    }
    if (data.treeHeight !== undefined) {
      transformed.tree_height = data.treeHeight;
      delete transformed.treeHeight;
    }
    if (data.trunkDiameter !== undefined) {
      transformed.trunk_diameter = data.trunkDiameter;
      delete transformed.trunkDiameter;
    }
    if (data.jobLocation !== undefined) {
      transformed.job_location = data.jobLocation;
      delete transformed.jobLocation;
    }
    if (data.customerName !== undefined) {
      transformed.customer_name = data.customerName;
      delete transformed.customerName;
    }
    if (data.hazards !== undefined && typeof data.hazards === 'object') {
      transformed.hazards = JSON.stringify(data.hazards);
    }
  }
  
  // Transform invoices fields
  if (tableName === 'invoices') {
    if (data.jobId !== undefined) {
      transformed.job_id = data.jobId;
      delete transformed.jobId;
    }
    if (data.clientId !== undefined) {
      transformed.client_id = data.clientId;
      delete transformed.clientId;
    }
    if (data.propertyId !== undefined) {
      transformed.property_id = data.propertyId;
      delete transformed.propertyId;
    }
    if (data.customerName !== undefined) {
      transformed.customer_name = data.customerName;
      delete transformed.customerName;
    }
    if (data.invoiceNumber !== undefined) {
      transformed.invoice_number = data.invoiceNumber;
      delete transformed.invoiceNumber;
    }
    if (data.issueDate !== undefined) {
      transformed.issue_date = data.issueDate;
      delete transformed.issueDate;
    }
    if (data.sentDate !== undefined) {
      transformed.sent_date = data.sentDate;
      delete transformed.sentDate;
    }
    if (data.dueDate !== undefined) {
      transformed.due_date = data.dueDate;
      delete transformed.dueDate;
    }
    if (data.paidAt !== undefined) {
      transformed.paid_at = data.paidAt;
      delete transformed.paidAt;
    }
    if (data.lineItems !== undefined) {
      transformed.line_items = data.lineItems;
      delete transformed.lineItems;
    }
    if (data.discountAmount !== undefined) {
      transformed.discount_amount = data.discountAmount;
      delete transformed.discountAmount;
    }
    if (data.discountPercentage !== undefined) {
      transformed.discount_percentage = data.discountPercentage;
      delete transformed.discountPercentage;
    }
    if (data.taxRate !== undefined) {
      transformed.tax_rate = data.taxRate;
      delete transformed.taxRate;
    }
    if (data.taxAmount !== undefined) {
      transformed.tax_amount = data.taxAmount;
      delete transformed.taxAmount;
    }
    if (data.totalAmount !== undefined) {
      transformed.total_amount = data.totalAmount;
      delete transformed.totalAmount;
    }
    if (data.grandTotal !== undefined) {
      transformed.grand_total = data.grandTotal;
      delete transformed.grandTotal;
    }
    if (data.amountPaid !== undefined) {
      transformed.amount_paid = data.amountPaid;
      delete transformed.amountPaid;
    }
    if (data.amountDue !== undefined) {
      transformed.amount_due = data.amountDue;
      delete transformed.amountDue;
    }
    if (data.paymentTerms !== undefined) {
      transformed.payment_terms = data.paymentTerms;
      delete transformed.paymentTerms;
    }
    if (data.customerEmail !== undefined) {
      transformed.customer_email = data.customerEmail;
      delete transformed.customerEmail;
    }
    if (data.customerPhone !== undefined) {
      transformed.customer_phone = data.customerPhone;
      delete transformed.customerPhone;
    }
    if (data.customerAddress !== undefined) {
      transformed.customer_address = data.customerAddress;
      delete transformed.customerAddress;
    }
    if (data.customerNotes !== undefined) {
      transformed.customer_notes = data.customerNotes;
      delete transformed.customerNotes;
    }
    if (data.updatedAt !== undefined) {
      transformed.updated_at = data.updatedAt;
      delete transformed.updatedAt;
    }
  }
  
  // Transform payment_records fields
  if (tableName === 'payment_records') {
    if (data.invoiceId !== undefined) {
      transformed.invoice_id = data.invoiceId;
      delete transformed.invoiceId;
    }
    if (data.paymentDate !== undefined) {
      transformed.payment_date = data.paymentDate;
      delete transformed.paymentDate;
    }
    if (data.paymentMethod !== undefined) {
      transformed.payment_method = data.paymentMethod;
      delete transformed.paymentMethod;
    }
    if (data.transactionId !== undefined) {
      transformed.transaction_id = data.transactionId;
      delete transformed.transactionId;
    }
    if (data.referenceNumber !== undefined) {
      transformed.reference_number = data.referenceNumber;
      delete transformed.referenceNumber;
    }
    if (data.recordedBy !== undefined) {
      transformed.recorded_by = data.recordedBy;
      delete transformed.recordedBy;
    }
  }
  
  if (data.createdAt !== undefined) {
    transformed.created_at = data.createdAt;
    delete transformed.createdAt;
  }
  
  // JSON.stringify JSONB fields to prevent "invalid input syntax for type json" errors
  // This ensures objects and arrays are properly serialized before database insertion
  
  // Jobs table JSONB fields
  if (tableName === 'jobs') {
    if (transformed.assigned_crew !== undefined && typeof transformed.assigned_crew === 'object') {
      transformed.assigned_crew = JSON.stringify(transformed.assigned_crew);
    }
    if (transformed.completion_checklist !== undefined && typeof transformed.completion_checklist === 'object') {
      transformed.completion_checklist = JSON.stringify(transformed.completion_checklist);
    }
    if (transformed.equipment_needed !== undefined && typeof transformed.equipment_needed === 'object') {
      transformed.equipment_needed = JSON.stringify(transformed.equipment_needed);
    }
    if (transformed.permit_details !== undefined && typeof transformed.permit_details === 'object') {
      transformed.permit_details = JSON.stringify(transformed.permit_details);
    }
  }
  
  // Quotes table JSONB fields
  if (tableName === 'quotes') {
    if (transformed.line_items !== undefined && typeof transformed.line_items === 'object') {
      transformed.line_items = JSON.stringify(transformed.line_items);
    }
  }
  
  // Employees table JSONB fields
  if (tableName === 'employees') {
    if (transformed.performance_metrics !== undefined && typeof transformed.performance_metrics === 'object') {
      transformed.performance_metrics = JSON.stringify(transformed.performance_metrics);
    }
  }
  
  // Equipment table JSONB fields
  if (tableName === 'equipment') {
    if (transformed.maintenance_history !== undefined && typeof transformed.maintenance_history === 'object') {
      transformed.maintenance_history = JSON.stringify(transformed.maintenance_history);
    }
  }
  
  // Invoices table JSONB fields
  if (tableName === 'invoices') {
    if (transformed.line_items !== undefined && typeof transformed.line_items === 'object') {
      transformed.line_items = JSON.stringify(transformed.line_items);
    }
  }

  return transformed;
};

module.exports = {
  transformRow,
  transformToDb,
};
