const db = require('../../db');

let sendgridClient = null;
let fromEmail = null;

const initializeSendGrid = () => {
  const apiKey = process.env.SENDGRID_API_KEY;
  
  if (!apiKey) {
    console.warn('[EmailService] SENDGRID_API_KEY not configured. Email sending disabled.');
    return false;
  }

  try {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(apiKey);
    sendgridClient = sgMail;
    fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@treepro.ai';
    console.log('[EmailService] SendGrid initialized successfully');
    return true;
  } catch (error) {
    console.error('[EmailService] Failed to initialize SendGrid:', error.message);
    return false;
  }
};

const getEmailTemplate = async (templateId) => {
  const { rows } = await db.query(
    `SELECT * FROM email_templates WHERE id = $1 AND is_active = true AND deleted_at IS NULL`,
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
    company_phone: '',
    company_email: ''
  };

  try {
    const { rows: company } = await db.query(
      `SELECT * FROM company_profile LIMIT 1`
    );
    
    if (company[0]) {
      variables.company_name = company[0].company_name || 'TreePro AI';
      variables.company_phone = company[0].phone_number || '';
      variables.company_email = company[0].email || '';
    }
  } catch (error) {
    console.warn('[EmailService] Could not fetch company profile:', error.message);
  }

  const entityData = context.entityData || {};
  
  variables.customer_name = entityData.customer_name || 
    entityData.first_name || 
    entityData.name || 
    'Valued Customer';
  
  variables.customer_email = entityData.email || 
    entityData.customer_email ||
    entityData.primary_email || '';
  
  variables.customer_phone = entityData.phone ||
    entityData.customer_phone ||
    entityData.primary_phone || '';

  if (context.entityType === 'quote' || entityData.quote_id) {
    variables.quote_number = entityData.quote_number || entityData.id?.substring(0, 8) || '';
    variables.quote_amount = formatCurrency(entityData.total_amount || entityData.amount);
    variables.quote_link = `${process.env.REPLIT_DEV_DOMAIN || ''}/quotes/${entityData.id || entityData.quote_id}`;
    variables.property_address = formatAddress(entityData);
  }

  if (context.entityType === 'invoice' || entityData.invoice_id) {
    variables.invoice_number = entityData.invoice_number || entityData.id?.substring(0, 8) || '';
    variables.invoice_amount = formatCurrency(entityData.total_amount || entityData.amount);
    variables.due_date = formatDate(entityData.due_date);
    variables.payment_link = `${process.env.REPLIT_DEV_DOMAIN || ''}/invoices/${entityData.id || entityData.invoice_id}/pay`;
  }

  if (context.entityType === 'job' || entityData.job_id) {
    variables.job_number = entityData.job_number || '';
    variables.job_date = formatDate(entityData.scheduled_date);
    variables.job_description = entityData.description || entityData.special_instructions || '';
    variables.survey_link = `${process.env.REPLIT_DEV_DOMAIN || ''}/feedback/${entityData.id || entityData.job_id}`;
  }

  return variables;
};

const formatCurrency = (amount) => {
  if (!amount) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(parseFloat(amount));
};

const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatAddress = (data) => {
  const parts = [
    data.address_line1 || data.job_location,
    data.city,
    data.state,
    data.zip_code
  ].filter(Boolean);
  
  return parts.join(', ');
};

const sendEmail = async (config, context) => {
  const { template_id, subject, body, to, cc, bcc, attachments } = config;

  const variables = await buildVariablesFromContext(context);

  let emailSubject = subject;
  let emailBody = body;
  let emailBodyText = body;

  if (template_id) {
    const template = await getEmailTemplate(template_id);
    if (template) {
      emailSubject = emailSubject || template.subject;
      emailBody = template.body_html;
      emailBodyText = template.body_text || template.body_html;
    }
  }

  emailSubject = replaceVariables(emailSubject, variables);
  emailBody = replaceVariables(emailBody, variables);
  emailBodyText = replaceVariables(emailBodyText, variables);

  const recipient = to || 
    context.entityData?.email || 
    context.entityData?.customer_email ||
    context.entityData?.primary_email;

  if (!recipient) {
    console.warn('[EmailService] No recipient email found');
    return {
      success: false,
      error: 'No recipient email address'
    };
  }

  if (!sendgridClient) {
    console.log('[EmailService] SendGrid not configured - logging email instead');
    console.log(`  To: ${recipient}`);
    console.log(`  Subject: ${emailSubject}`);
    console.log(`  Body preview: ${emailBodyText?.substring(0, 100)}...`);
    if (attachments && attachments.length > 0) {
      console.log(`  Attachments: ${attachments.map(a => a.filename).join(', ')}`);
    }
    
    return {
      success: true,
      simulated: true,
      recipient,
      subject: emailSubject,
      note: 'Email logged (SendGrid not configured)'
    };
  }

  try {
    const msg = {
      to: recipient,
      from: fromEmail,
      subject: emailSubject,
      text: emailBodyText,
      html: emailBody
    };

    if (cc) msg.cc = cc;
    if (bcc) msg.bcc = bcc;
    
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      msg.attachments = attachments.map(att => ({
        content: att.content,
        filename: att.filename,
        type: att.type || 'application/pdf',
        disposition: att.disposition || 'attachment'
      }));
    }

    await sendgridClient.send(msg);

    console.log(`[EmailService] Email sent successfully to: ${recipient}`);

    return {
      success: true,
      recipient,
      subject: emailSubject,
      messageId: Date.now().toString()
    };

  } catch (error) {
    console.error('[EmailService] Failed to send email:', error.message);
    
    return {
      success: false,
      error: error.message,
      recipient
    };
  }
};

const sendBulkEmails = async (recipients, config, context) => {
  const results = [];
  
  for (const recipient of recipients) {
    const result = await sendEmail(
      { ...config, to: recipient },
      context
    );
    results.push({ recipient, ...result });
  }
  
  return results;
};

module.exports = {
  initializeSendGrid,
  sendEmail,
  sendBulkEmails,
  getEmailTemplate,
  replaceVariables,
  buildVariablesFromContext
};
