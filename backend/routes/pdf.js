const express = require('express');
const pdfService = require('../services/pdfService');
const emailService = require('../services/automation/emailService');

const router = express.Router();

router.get('/quotes/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pdfService.generateQuotePdf(id);
    
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
  } catch (error) {
    console.error('[PDF Routes] Error generating quote PDF:', error.message);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    
    res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
  }
});

router.get('/invoices/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pdfService.generateInvoicePdf(id);
    
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
  } catch (error) {
    console.error('[PDF Routes] Error generating invoice PDF:', error.message);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
  }
});

router.get('/jobs/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pdfService.generateJobPdf(id);
    
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
  } catch (error) {
    console.error('[PDF Routes] Error generating job PDF:', error.message);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
  }
});

router.get('/form-submissions/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pdfService.generateFormPdf(id);
    
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
  } catch (error) {
    console.error('[PDF Routes] Error generating form submission PDF:', error.message);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Form submission not found' });
    }
    
    res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
  }
});

router.post('/quotes/:id/send-pdf', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, subject, message } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }
    
    const pdfResult = await pdfService.generateQuotePdf(id);
    
    const emailResult = await emailService.sendEmail({
      to: email,
      subject: subject || `Your Quote: ${pdfResult.filename.replace('.pdf', '')}`,
      body: message || `<p>Please find attached your quote.</p><p>Thank you for your business!</p>`,
      attachments: [{
        content: pdfResult.buffer.toString('base64'),
        filename: pdfResult.filename,
        type: 'application/pdf'
      }]
    }, { entityType: 'quote', entityData: {} });
    
    if (emailResult.simulated) {
      return res.json({
        success: true,
        message: 'Email was simulated (SendGrid not configured)',
        recipient: emailResult.recipient,
        filename: pdfResult.filename
      });
    }
    
    if (!emailResult.success) {
      return res.status(500).json({ error: 'Failed to send email', details: emailResult.error });
    }
    
    res.json({
      success: true,
      message: 'Quote PDF sent successfully',
      recipient: emailResult.recipient,
      filename: pdfResult.filename
    });
  } catch (error) {
    console.error('[PDF Routes] Error sending quote PDF:', error.message);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    
    res.status(500).json({ error: 'Failed to send PDF', details: error.message });
  }
});

router.post('/invoices/:id/send-pdf', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, subject, message } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }
    
    const pdfResult = await pdfService.generateInvoicePdf(id);
    
    const emailResult = await emailService.sendEmail({
      to: email,
      subject: subject || `Your Invoice: ${pdfResult.filename.replace('.pdf', '')}`,
      body: message || `<p>Please find attached your invoice.</p><p>Thank you for your business!</p>`,
      attachments: [{
        content: pdfResult.buffer.toString('base64'),
        filename: pdfResult.filename,
        type: 'application/pdf'
      }]
    }, { entityType: 'invoice', entityData: {} });
    
    if (emailResult.simulated) {
      return res.json({
        success: true,
        message: 'Email was simulated (SendGrid not configured)',
        recipient: emailResult.recipient,
        filename: pdfResult.filename
      });
    }
    
    if (!emailResult.success) {
      return res.status(500).json({ error: 'Failed to send email', details: emailResult.error });
    }
    
    res.json({
      success: true,
      message: 'Invoice PDF sent successfully',
      recipient: emailResult.recipient,
      filename: pdfResult.filename
    });
  } catch (error) {
    console.error('[PDF Routes] Error sending invoice PDF:', error.message);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    res.status(500).json({ error: 'Failed to send PDF', details: error.message });
  }
});

router.post('/jobs/:id/send-pdf', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, subject, message } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }
    
    const pdfResult = await pdfService.generateJobPdf(id);
    
    const emailResult = await emailService.sendEmail({
      to: email,
      subject: subject || `Your Work Order: ${pdfResult.filename.replace('.pdf', '')}`,
      body: message || `<p>Please find attached your work order.</p><p>Thank you for your business!</p>`,
      attachments: [{
        content: pdfResult.buffer.toString('base64'),
        filename: pdfResult.filename,
        type: 'application/pdf'
      }]
    }, { entityType: 'job', entityData: {} });
    
    if (emailResult.simulated) {
      return res.json({
        success: true,
        message: 'Email was simulated (SendGrid not configured)',
        recipient: emailResult.recipient,
        filename: pdfResult.filename
      });
    }
    
    if (!emailResult.success) {
      return res.status(500).json({ error: 'Failed to send email', details: emailResult.error });
    }
    
    res.json({
      success: true,
      message: 'Work order PDF sent successfully',
      recipient: emailResult.recipient,
      filename: pdfResult.filename
    });
  } catch (error) {
    console.error('[PDF Routes] Error sending job PDF:', error.message);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.status(500).json({ error: 'Failed to send PDF', details: error.message });
  }
});

router.post('/form-submissions/:id/send-pdf', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, subject, message } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }
    
    const pdfResult = await pdfService.generateFormPdf(id);
    
    const emailResult = await emailService.sendEmail({
      to: email,
      subject: subject || `Form Submission: ${pdfResult.filename.replace('.pdf', '')}`,
      body: message || `<p>Please find attached the form submission.</p>`,
      attachments: [{
        content: pdfResult.buffer.toString('base64'),
        filename: pdfResult.filename,
        type: 'application/pdf'
      }]
    }, { entityType: 'form_submission', entityData: {} });
    
    if (emailResult.simulated) {
      return res.json({
        success: true,
        message: 'Email was simulated (SendGrid not configured)',
        recipient: emailResult.recipient,
        filename: pdfResult.filename
      });
    }
    
    if (!emailResult.success) {
      return res.status(500).json({ error: 'Failed to send email', details: emailResult.error });
    }
    
    res.json({
      success: true,
      message: 'Form submission PDF sent successfully',
      recipient: emailResult.recipient,
      filename: pdfResult.filename
    });
  } catch (error) {
    console.error('[PDF Routes] Error sending form submission PDF:', error.message);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Form submission not found' });
    }
    
    res.status(500).json({ error: 'Failed to send PDF', details: error.message });
  }
});

module.exports = router;
