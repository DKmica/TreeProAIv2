const db = require('../../db');

let twilioClient = null;
let fromPhone = null;

const initializeTwilio = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken) {
    console.warn('[SMSService] Twilio credentials not configured. SMS sending disabled.');
    return false;
  }

  if (!phoneNumber) {
    console.warn('[SMSService] TWILIO_PHONE_NUMBER not configured. SMS sending disabled.');
    return false;
  }

  try {
    const twilio = require('twilio');
    twilioClient = twilio(accountSid, authToken);
    fromPhone = phoneNumber;
    console.log('[SMSService] Twilio initialized successfully');
    return true;
  } catch (error) {
    console.error('[SMSService] Failed to initialize Twilio:', error.message);
    return false;
  }
};

const getSmsTemplate = async (templateId) => {
  const { rows } = await db.query(
    `SELECT * FROM sms_templates WHERE id = $1 AND is_active = true AND deleted_at IS NULL`,
    [templateId]
  );
  return rows[0] || null;
};

const replaceVariables = (text, variables) => {
  if (!text) return text;
  
  let result = text;
  
  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
    result = result.replace(pattern, value || '');
  }
  
  return result;
};

const buildVariablesFromContext = async (context) => {
  const variables = {
    company_name: 'TreePro AI',
    company_phone: ''
  };

  try {
    const { rows: company } = await db.query(
      `SELECT * FROM company_profile LIMIT 1`
    );
    
    if (company[0]) {
      variables.company_name = company[0].company_name || 'TreePro AI';
      variables.company_phone = company[0].phone_number || '';
    }
  } catch (error) {
    console.warn('[SMSService] Could not fetch company profile:', error.message);
  }

  const entityData = context.entityData || {};
  
  variables.customer_name = entityData.customer_name || 
    entityData.first_name || 
    'there';
  
  variables.customer_phone = entityData.phone ||
    entityData.customer_phone ||
    entityData.primary_phone || '';

  if (context.entityType === 'quote') {
    variables.quote_amount = formatCurrency(entityData.total_amount || entityData.amount);
    variables.quote_link = shortenUrl(`${process.env.REPLIT_DEV_DOMAIN || ''}/quotes/${entityData.id}`);
  }

  if (context.entityType === 'invoice') {
    variables.invoice_number = entityData.invoice_number || '';
    variables.invoice_amount = formatCurrency(entityData.total_amount || entityData.amount);
    variables.payment_link = shortenUrl(`${process.env.REPLIT_DEV_DOMAIN || ''}/invoices/${entityData.id}/pay`);
  }

  if (context.entityType === 'job') {
    variables.job_date = formatDateShort(entityData.scheduled_date);
    variables.eta = entityData.eta || 'soon';
    variables.property_address = formatAddressShort(entityData);
  }

  return variables;
};

const formatCurrency = (amount) => {
  if (!amount) return '$0';
  return '$' + parseFloat(amount).toFixed(0);
};

const formatDateShort = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
};

const formatAddressShort = (data) => {
  return data.address_line1 || data.job_location || 'your property';
};

const shortenUrl = (url) => {
  return url;
};

const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  } else if (cleaned.startsWith('+')) {
    return phone;
  }
  
  return `+1${cleaned}`;
};

const sendSms = async (config, context) => {
  const { template_id, message, to } = config;

  const variables = await buildVariablesFromContext(context);

  let smsMessage = message;

  if (template_id) {
    const template = await getSmsTemplate(template_id);
    if (template) {
      smsMessage = smsMessage || template.message;
    }
  }

  smsMessage = replaceVariables(smsMessage, variables);

  if (smsMessage && smsMessage.length > 160) {
    console.warn(`[SMSService] Message exceeds 160 chars (${smsMessage.length}), may be split into multiple SMS`);
  }

  const recipient = formatPhoneNumber(
    to || 
    context.entityData?.phone || 
    context.entityData?.customer_phone ||
    context.entityData?.primary_phone
  );

  if (!recipient) {
    console.warn('[SMSService] No recipient phone number found');
    return {
      success: false,
      error: 'No recipient phone number'
    };
  }

  if (!twilioClient) {
    console.log('[SMSService] Twilio not configured - logging SMS instead');
    console.log(`  To: ${recipient}`);
    console.log(`  Message: ${smsMessage}`);
    
    return {
      success: true,
      simulated: true,
      recipient,
      message: smsMessage,
      note: 'SMS logged (Twilio not configured)'
    };
  }

  try {
    const result = await twilioClient.messages.create({
      body: smsMessage,
      from: fromPhone,
      to: recipient
    });

    console.log(`[SMSService] SMS sent successfully to: ${recipient}, SID: ${result.sid}`);

    return {
      success: true,
      recipient,
      messageSid: result.sid,
      status: result.status
    };

  } catch (error) {
    console.error('[SMSService] Failed to send SMS:', error.message);
    
    return {
      success: false,
      error: error.message,
      recipient
    };
  }
};

const sendBulkSms = async (recipients, config, context) => {
  const results = [];
  
  for (const recipient of recipients) {
    const result = await sendSms(
      { ...config, to: recipient },
      context
    );
    results.push({ recipient, ...result });
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
};

module.exports = {
  initializeTwilio,
  sendSms,
  sendBulkSms,
  getSmsTemplate,
  replaceVariables,
  buildVariablesFromContext,
  formatPhoneNumber
};
