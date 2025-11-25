const db = require('../../db');
const { sendSms, formatPhoneNumber } = require('../automation/smsService');
const { sendEmail } = require('../automation/emailService');

const NOTIFICATION_TEMPLATES = {
  on_my_way: {
    sms: 'Hi {{customer_name}}! Your tree service crew is on the way and will arrive in approximately {{eta_minutes}} minutes. - {{company_name}}',
    email: {
      subject: 'Your {{company_name}} crew is on the way!',
      body: `<p>Hi {{customer_name}},</p>
<p>Great news! Your tree service crew is on their way to {{property_address}}.</p>
<p><strong>Estimated arrival:</strong> {{eta_minutes}} minutes</p>
<p>If you have any questions, please call us at {{company_phone}}.</p>
<p>Thank you for choosing {{company_name}}!</p>`
    }
  },
  arrived: {
    sms: 'Hi {{customer_name}}! Your {{company_name}} crew has arrived at {{property_address}}. They will begin work shortly.',
    email: {
      subject: 'Your {{company_name}} crew has arrived!',
      body: `<p>Hi {{customer_name}},</p>
<p>Your tree service crew has arrived at {{property_address}} and will begin work shortly.</p>
<p>If you have any special instructions, please let the crew leader know.</p>
<p>Thank you for choosing {{company_name}}!</p>`
    }
  },
  completed: {
    sms: 'Hi {{customer_name}}! Your tree service job at {{property_address}} is complete. Thank you for choosing {{company_name}}! We appreciate your business.',
    email: {
      subject: 'Your tree service job is complete!',
      body: `<p>Hi {{customer_name}},</p>
<p>Great news! Your tree service job at {{property_address}} has been completed.</p>
<p>We hope you're satisfied with our work. If you have any questions or feedback, please don't hesitate to reach out.</p>
<p>Thank you for choosing {{company_name}}!</p>
<p>Best regards,<br>The {{company_name}} Team</p>`
    }
  },
  delayed: {
    sms: 'Hi {{customer_name}}, we apologize but your {{company_name}} crew is running about {{delay_minutes}} minutes behind schedule. New ETA: {{new_eta}}. We appreciate your patience!',
    email: {
      subject: 'Update on your scheduled service',
      body: `<p>Hi {{customer_name}},</p>
<p>We wanted to let you know that our crew is running approximately {{delay_minutes}} minutes behind schedule.</p>
<p><strong>New estimated arrival:</strong> {{new_eta}}</p>
<p>We apologize for any inconvenience this may cause. If you need to reschedule, please call us at {{company_phone}}.</p>
<p>Thank you for your patience!</p>`
    }
  },
  rescheduled: {
    sms: 'Hi {{customer_name}}, your tree service has been rescheduled to {{new_date}}. If you have questions, call {{company_phone}}. - {{company_name}}',
    email: {
      subject: 'Your service has been rescheduled',
      body: `<p>Hi {{customer_name}},</p>
<p>Your tree service appointment has been rescheduled to <strong>{{new_date}}</strong>.</p>
<p>If this new date doesn't work for you, please contact us at {{company_phone}} to arrange a different time.</p>
<p>We apologize for any inconvenience.</p>
<p>Thank you,<br>The {{company_name}} Team</p>`
    }
  }
};

const replaceTemplateVariables = (template, variables) => {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
    result = result.replace(pattern, value || '');
  }
  return result;
};

const getJobNotificationContext = async (jobId) => {
  const { rows: jobs } = await db.query(
    `SELECT j.*, 
            c.name as client_name, c.email as client_email, c.phone as client_phone,
            q.job_location
     FROM jobs j
     LEFT JOIN quotes q ON j.quote_id = q.id
     LEFT JOIN leads l ON q.lead_id = l.id
     LEFT JOIN clients c ON l.client_id = c.id
     WHERE j.id = $1`,
    [jobId]
  );
  
  if (!jobs.length) {
    throw new Error(`Job ${jobId} not found`);
  }
  
  const job = jobs[0];
  
  let companyName = 'TreePro AI';
  let companyPhone = '';
  try {
    const { rows: company } = await db.query('SELECT * FROM company_profile LIMIT 1');
    if (company.length) {
      companyName = company[0].company_name || 'TreePro AI';
      companyPhone = company[0].phone_number || '';
    }
  } catch (e) {
  }
  
  return {
    job,
    variables: {
      customer_name: job.client_name || job.customer_name || 'Valued Customer',
      customer_email: job.client_email || '',
      customer_phone: job.client_phone || job.customer_phone || '',
      property_address: job.job_location || job.job_location || 'your property',
      job_number: job.job_number || '',
      scheduled_date: job.scheduled_date || '',
      company_name: companyName,
      company_phone: companyPhone
    }
  };
};

const recordNotification = async (notification) => {
  try {
    await db.query(
      `INSERT INTO customer_notifications (
        job_id, client_id, notification_type, channel,
        recipient_phone, recipient_email, message_content,
        eta_minutes, sent_at, external_message_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        notification.jobId,
        notification.clientId || null,
        notification.type,
        notification.channel,
        notification.recipientPhone || null,
        notification.recipientEmail || null,
        notification.messageContent,
        notification.etaMinutes || null,
        notification.sentAt || new Date(),
        notification.externalMessageId || null
      ]
    );
  } catch (error) {
    console.error('[NotificationService] Failed to record notification:', error.message);
  }
};

const sendOnMyWay = async (jobId, crewId, etaMinutes, options = {}) => {
  console.log(`[NotificationService] Sending "On My Way" notification for job ${jobId}`);
  
  const context = await getJobNotificationContext(jobId);
  const { job, variables } = context;
  
  variables.eta_minutes = etaMinutes.toString();
  
  const template = NOTIFICATION_TEMPLATES.on_my_way;
  const results = [];
  const channels = options.channels || ['sms'];
  
  if (channels.includes('sms') && variables.customer_phone) {
    const message = replaceTemplateVariables(template.sms, variables);
    const smsResult = await sendSms(
      { message, to: variables.customer_phone },
      { entityType: 'job', entityData: job }
    );
    
    await recordNotification({
      jobId,
      type: 'on_my_way',
      channel: 'sms',
      recipientPhone: variables.customer_phone,
      messageContent: message,
      etaMinutes,
      sentAt: new Date(),
      externalMessageId: smsResult.messageSid
    });
    
    results.push({ channel: 'sms', ...smsResult });
  }
  
  if (channels.includes('email') && variables.customer_email) {
    const subject = replaceTemplateVariables(template.email.subject, variables);
    const body = replaceTemplateVariables(template.email.body, variables);
    const emailResult = await sendEmail(
      { subject, body, to: variables.customer_email },
      { entityType: 'job', entityData: job }
    );
    
    await recordNotification({
      jobId,
      type: 'on_my_way',
      channel: 'email',
      recipientEmail: variables.customer_email,
      messageContent: body,
      etaMinutes,
      sentAt: new Date(),
      externalMessageId: emailResult.messageId
    });
    
    results.push({ channel: 'email', ...emailResult });
  }
  
  console.log(`[NotificationService] On My Way notification sent via ${results.length} channel(s)`);
  
  return {
    jobId,
    crewId,
    type: 'on_my_way',
    etaMinutes,
    results,
    sentAt: new Date().toISOString()
  };
};

const sendArrivalNotification = async (jobId, options = {}) => {
  console.log(`[NotificationService] Sending arrival notification for job ${jobId}`);
  
  const context = await getJobNotificationContext(jobId);
  const { job, variables } = context;
  
  const template = NOTIFICATION_TEMPLATES.arrived;
  const results = [];
  const channels = options.channels || ['sms'];
  
  if (channels.includes('sms') && variables.customer_phone) {
    const message = replaceTemplateVariables(template.sms, variables);
    const smsResult = await sendSms(
      { message, to: variables.customer_phone },
      { entityType: 'job', entityData: job }
    );
    
    await recordNotification({
      jobId,
      type: 'arrived',
      channel: 'sms',
      recipientPhone: variables.customer_phone,
      messageContent: message,
      sentAt: new Date(),
      externalMessageId: smsResult.messageSid
    });
    
    results.push({ channel: 'sms', ...smsResult });
  }
  
  if (channels.includes('email') && variables.customer_email) {
    const subject = replaceTemplateVariables(template.email.subject, variables);
    const body = replaceTemplateVariables(template.email.body, variables);
    const emailResult = await sendEmail(
      { subject, body, to: variables.customer_email },
      { entityType: 'job', entityData: job }
    );
    
    await recordNotification({
      jobId,
      type: 'arrived',
      channel: 'email',
      recipientEmail: variables.customer_email,
      messageContent: body,
      sentAt: new Date(),
      externalMessageId: emailResult.messageId
    });
    
    results.push({ channel: 'email', ...emailResult });
  }
  
  console.log(`[NotificationService] Arrival notification sent via ${results.length} channel(s)`);
  
  return {
    jobId,
    type: 'arrived',
    results,
    sentAt: new Date().toISOString()
  };
};

const sendCompletionNotification = async (jobId, options = {}) => {
  console.log(`[NotificationService] Sending completion notification for job ${jobId}`);
  
  const context = await getJobNotificationContext(jobId);
  const { job, variables } = context;
  
  const template = NOTIFICATION_TEMPLATES.completed;
  const results = [];
  const channels = options.channels || ['sms', 'email'];
  
  if (channels.includes('sms') && variables.customer_phone) {
    const message = replaceTemplateVariables(template.sms, variables);
    const smsResult = await sendSms(
      { message, to: variables.customer_phone },
      { entityType: 'job', entityData: job }
    );
    
    await recordNotification({
      jobId,
      type: 'completed',
      channel: 'sms',
      recipientPhone: variables.customer_phone,
      messageContent: message,
      sentAt: new Date(),
      externalMessageId: smsResult.messageSid
    });
    
    results.push({ channel: 'sms', ...smsResult });
  }
  
  if (channels.includes('email') && variables.customer_email) {
    const subject = replaceTemplateVariables(template.email.subject, variables);
    const body = replaceTemplateVariables(template.email.body, variables);
    const emailResult = await sendEmail(
      { subject, body, to: variables.customer_email },
      { entityType: 'job', entityData: job }
    );
    
    await recordNotification({
      jobId,
      type: 'completed',
      channel: 'email',
      recipientEmail: variables.customer_email,
      messageContent: body,
      sentAt: new Date(),
      externalMessageId: emailResult.messageId
    });
    
    results.push({ channel: 'email', ...emailResult });
  }
  
  console.log(`[NotificationService] Completion notification sent via ${results.length} channel(s)`);
  
  return {
    jobId,
    type: 'completed',
    results,
    sentAt: new Date().toISOString()
  };
};

const sendDelayNotification = async (jobId, delayMinutes, newEta, options = {}) => {
  console.log(`[NotificationService] Sending delay notification for job ${jobId}`);
  
  const context = await getJobNotificationContext(jobId);
  const { job, variables } = context;
  
  variables.delay_minutes = delayMinutes.toString();
  variables.new_eta = newEta;
  
  const template = NOTIFICATION_TEMPLATES.delayed;
  const results = [];
  const channels = options.channels || ['sms'];
  
  if (channels.includes('sms') && variables.customer_phone) {
    const message = replaceTemplateVariables(template.sms, variables);
    const smsResult = await sendSms(
      { message, to: variables.customer_phone },
      { entityType: 'job', entityData: job }
    );
    
    await recordNotification({
      jobId,
      type: 'delayed',
      channel: 'sms',
      recipientPhone: variables.customer_phone,
      messageContent: message,
      sentAt: new Date(),
      externalMessageId: smsResult.messageSid
    });
    
    results.push({ channel: 'sms', ...smsResult });
  }
  
  return {
    jobId,
    type: 'delayed',
    delayMinutes,
    newEta,
    results,
    sentAt: new Date().toISOString()
  };
};

const sendRescheduleNotification = async (jobId, newDate, options = {}) => {
  console.log(`[NotificationService] Sending reschedule notification for job ${jobId}`);
  
  const context = await getJobNotificationContext(jobId);
  const { job, variables } = context;
  
  const dateObj = new Date(newDate);
  variables.new_date = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  
  const template = NOTIFICATION_TEMPLATES.rescheduled;
  const results = [];
  const channels = options.channels || ['sms', 'email'];
  
  if (channels.includes('sms') && variables.customer_phone) {
    const message = replaceTemplateVariables(template.sms, variables);
    const smsResult = await sendSms(
      { message, to: variables.customer_phone },
      { entityType: 'job', entityData: job }
    );
    
    await recordNotification({
      jobId,
      type: 'rescheduled',
      channel: 'sms',
      recipientPhone: variables.customer_phone,
      messageContent: message,
      sentAt: new Date(),
      externalMessageId: smsResult.messageSid
    });
    
    results.push({ channel: 'sms', ...smsResult });
  }
  
  if (channels.includes('email') && variables.customer_email) {
    const subject = replaceTemplateVariables(template.email.subject, variables);
    const body = replaceTemplateVariables(template.email.body, variables);
    const emailResult = await sendEmail(
      { subject, body, to: variables.customer_email },
      { entityType: 'job', entityData: job }
    );
    
    await recordNotification({
      jobId,
      type: 'rescheduled',
      channel: 'email',
      recipientEmail: variables.customer_email,
      messageContent: body,
      sentAt: new Date(),
      externalMessageId: emailResult.messageId
    });
    
    results.push({ channel: 'email', ...emailResult });
  }
  
  return {
    jobId,
    type: 'rescheduled',
    newDate,
    results,
    sentAt: new Date().toISOString()
  };
};

const getNotificationHistory = async (jobId) => {
  const { rows } = await db.query(
    `SELECT * FROM customer_notifications 
     WHERE job_id = $1 
     ORDER BY created_at DESC`,
    [jobId]
  );
  
  return rows.map(n => ({
    id: n.id,
    type: n.notification_type,
    channel: n.channel,
    recipientPhone: n.recipient_phone,
    recipientEmail: n.recipient_email,
    etaMinutes: n.eta_minutes,
    sentAt: n.sent_at,
    deliveredAt: n.delivered_at,
    failedAt: n.failed_at,
    failureReason: n.failure_reason,
    createdAt: n.created_at
  }));
};

module.exports = {
  sendOnMyWay,
  sendArrivalNotification,
  sendCompletionNotification,
  sendDelayNotification,
  sendRescheduleNotification,
  getNotificationHistory,
  NOTIFICATION_TEMPLATES
};
