const PdfPrinter = require('pdfmake');
const pdfMakeFonts = require('pdfmake/build/vfs_fonts');
const db = require('../db');

const ACCENT_COLOR = '#00c2ff';
const HEADER_BG = '#1a1a2e';
const TEXT_COLOR = '#333333';
const LIGHT_GRAY = '#f8f9fa';
const BORDER_COLOR = '#e5e7eb';

const printer = new PdfPrinter({
  Roboto: {
    normal: Buffer.from(pdfMakeFonts['Roboto-Regular.ttf'], 'base64'),
    bold: Buffer.from(pdfMakeFonts['Roboto-Medium.ttf'], 'base64'),
    italics: Buffer.from(pdfMakeFonts['Roboto-Italic.ttf'], 'base64'),
    bolditalics: Buffer.from(pdfMakeFonts['Roboto-MediumItalic.ttf'], 'base64')
  }
});

const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(parseFloat(amount) || 0);
};

const formatDate = (date) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatDateTime = (date) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

const getCompanyInfo = async () => {
  try {
    const { rows } = await db.query('SELECT * FROM company_profile LIMIT 1');
    if (rows[0]) {
      return {
        companyName: rows[0].company_name || 'TreePro AI',
        companyPhone: rows[0].phone_number || '',
        companyEmail: rows[0].email || '',
        companyAddress: [
          rows[0].address_line1,
          rows[0].city,
          rows[0].state,
          rows[0].zip_code
        ].filter(Boolean).join(', ')
      };
    }
  } catch (error) {
    console.warn('[PDF Service] Could not fetch company profile:', error.message);
  }
  
  return {
    companyName: 'TreePro AI',
    companyPhone: '',
    companyEmail: '',
    companyAddress: ''
  };
};

const createPdfBuffer = (docDefinition) => {
  return new Promise((resolve, reject) => {
    try {
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks = [];
      
      pdfDoc.on('data', chunk => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      
      pdfDoc.end();
    } catch (error) {
      reject(error);
    }
  });
};

const defaultStyles = {
  header: {
    fontSize: 24,
    bold: true,
    color: HEADER_BG,
    margin: [0, 0, 0, 5]
  },
  subheader: {
    fontSize: 14,
    bold: true,
    color: TEXT_COLOR,
    margin: [0, 10, 0, 5]
  },
  documentTitle: {
    fontSize: 18,
    bold: true,
    color: ACCENT_COLOR,
    margin: [0, 0, 0, 10]
  },
  label: {
    fontSize: 10,
    color: '#6b7280',
    margin: [0, 0, 0, 2]
  },
  value: {
    fontSize: 11,
    color: TEXT_COLOR,
    margin: [0, 0, 0, 8]
  },
  tableHeader: {
    fontSize: 10,
    bold: true,
    color: '#ffffff',
    fillColor: HEADER_BG,
    margin: [5, 8, 5, 8]
  },
  tableCell: {
    fontSize: 10,
    color: TEXT_COLOR,
    margin: [5, 6, 5, 6]
  },
  total: {
    fontSize: 12,
    bold: true,
    color: TEXT_COLOR
  },
  grandTotal: {
    fontSize: 14,
    bold: true,
    color: ACCENT_COLOR
  },
  footer: {
    fontSize: 9,
    color: '#6b7280',
    alignment: 'center'
  },
  notes: {
    fontSize: 10,
    color: TEXT_COLOR,
    italics: true
  }
};

const createHeader = (companyInfo, documentType, documentNumber) => {
  return [
    {
      columns: [
        {
          width: '*',
          stack: [
            { text: companyInfo.companyName, style: 'header' },
            companyInfo.companyAddress ? { text: companyInfo.companyAddress, style: 'label' } : {},
            companyInfo.companyPhone ? { text: companyInfo.companyPhone, style: 'label' } : {},
            companyInfo.companyEmail ? { text: companyInfo.companyEmail, style: 'label' } : {}
          ]
        },
        {
          width: 'auto',
          alignment: 'right',
          stack: [
            { text: documentType, style: 'documentTitle' },
            { text: `#${documentNumber}`, fontSize: 12, color: TEXT_COLOR }
          ]
        }
      ],
      margin: [0, 0, 0, 20]
    },
    {
      canvas: [
        { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: ACCENT_COLOR }
      ],
      margin: [0, 0, 0, 20]
    }
  ];
};

const createInfoSection = (leftItems, rightItems) => {
  const createStack = (items) => {
    const stack = [];
    items.forEach(item => {
      if (item.value) {
        stack.push({ text: item.label, style: 'label' });
        stack.push({ text: item.value, style: 'value' });
      }
    });
    return stack;
  };

  return {
    columns: [
      { width: '*', stack: createStack(leftItems) },
      { width: '*', stack: createStack(rightItems) }
    ],
    margin: [0, 0, 0, 20]
  };
};

const createLineItemsTable = (lineItems) => {
  if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
    return {
      table: {
        widths: ['*'],
        body: [[{ text: 'No line items', alignment: 'center', color: '#6b7280', margin: [0, 10, 0, 10] }]]
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 20]
    };
  }

  const tableBody = [
    [
      { text: 'Description', style: 'tableHeader' },
      { text: 'Qty', style: 'tableHeader', alignment: 'center' },
      { text: 'Unit Price', style: 'tableHeader', alignment: 'right' },
      { text: 'Amount', style: 'tableHeader', alignment: 'right' }
    ]
  ];

  lineItems.forEach((item, index) => {
    const description = item.description || item.name || 'Service';
    const quantity = item.quantity || 1;
    const unitPrice = parseFloat(item.unitPrice || item.unit_price || item.price || 0);
    const amount = parseFloat(item.amount || item.total || (quantity * unitPrice) || 0);
    
    tableBody.push([
      { text: description, style: 'tableCell', fillColor: index % 2 === 0 ? LIGHT_GRAY : null },
      { text: String(quantity), style: 'tableCell', alignment: 'center', fillColor: index % 2 === 0 ? LIGHT_GRAY : null },
      { text: formatCurrency(unitPrice), style: 'tableCell', alignment: 'right', fillColor: index % 2 === 0 ? LIGHT_GRAY : null },
      { text: formatCurrency(amount), style: 'tableCell', alignment: 'right', fillColor: index % 2 === 0 ? LIGHT_GRAY : null }
    ]);
  });

  return {
    table: {
      headerRows: 1,
      widths: ['*', 50, 80, 80],
      body: tableBody
    },
    layout: {
      hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
      vLineWidth: () => 0,
      hLineColor: (i) => i === 1 ? ACCENT_COLOR : BORDER_COLOR,
      paddingLeft: () => 5,
      paddingRight: () => 5,
      paddingTop: () => 6,
      paddingBottom: () => 6
    },
    margin: [0, 0, 0, 15]
  };
};

const createTotalsSection = (data) => {
  const rows = [];

  if (data.subtotal) {
    rows.push([
      { text: 'Subtotal:', alignment: 'right', style: 'tableCell' },
      { text: data.subtotal, alignment: 'right', style: 'tableCell' }
    ]);
  }

  if (data.discountAmount) {
    const discountLabel = data.discountPercentage 
      ? `Discount (${data.discountPercentage}%):`
      : 'Discount:';
    rows.push([
      { text: discountLabel, alignment: 'right', style: 'tableCell' },
      { text: `-${data.discountAmount}`, alignment: 'right', style: 'tableCell', color: '#10b981' }
    ]);
  }

  if (data.taxAmount) {
    const taxLabel = data.taxRate ? `Tax (${data.taxRate}%):` : 'Tax:';
    rows.push([
      { text: taxLabel, alignment: 'right', style: 'tableCell' },
      { text: data.taxAmount, alignment: 'right', style: 'tableCell' }
    ]);
  }

  rows.push([
    { text: 'Total:', alignment: 'right', style: 'total' },
    { text: data.grandTotal, alignment: 'right', style: 'grandTotal' }
  ]);

  if (data.amountPaid) {
    rows.push([
      { text: 'Amount Paid:', alignment: 'right', style: 'tableCell' },
      { text: data.amountPaid, alignment: 'right', style: 'tableCell', color: '#10b981' }
    ]);
  }

  if (data.amountDue) {
    rows.push([
      { text: 'Amount Due:', alignment: 'right', style: 'total' },
      { text: data.amountDue, alignment: 'right', style: 'grandTotal' }
    ]);
  }

  if (data.depositAmount) {
    rows.push([
      { text: 'Deposit Required:', alignment: 'right', style: 'tableCell' },
      { text: data.depositAmount, alignment: 'right', style: 'tableCell', color: ACCENT_COLOR }
    ]);
  }

  return {
    columns: [
      { width: '*', text: '' },
      {
        width: 200,
        table: {
          widths: ['*', 80],
          body: rows
        },
        layout: 'noBorders'
      }
    ],
    margin: [0, 0, 0, 20]
  };
};

const createCrewTable = (assignedCrew) => {
  if (!assignedCrew || !Array.isArray(assignedCrew) || assignedCrew.length === 0) {
    return {
      text: 'No crew assigned',
      color: '#6b7280',
      margin: [0, 0, 0, 15]
    };
  }

  const tableBody = [
    [
      { text: 'Name', style: 'tableHeader' },
      { text: 'Role', style: 'tableHeader' },
      { text: 'Phone', style: 'tableHeader', alignment: 'right' }
    ]
  ];

  assignedCrew.forEach((member, index) => {
    const name = member.name || member.employee_name || 'Unknown';
    const role = member.role || 'Crew Member';
    const phone = member.phone || '';
    
    tableBody.push([
      { text: name, style: 'tableCell', fillColor: index % 2 === 0 ? LIGHT_GRAY : null },
      { text: role, style: 'tableCell', fillColor: index % 2 === 0 ? LIGHT_GRAY : null },
      { text: phone, style: 'tableCell', alignment: 'right', fillColor: index % 2 === 0 ? LIGHT_GRAY : null }
    ]);
  });

  return {
    table: {
      headerRows: 1,
      widths: ['*', '*', 100],
      body: tableBody
    },
    layout: {
      hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
      vLineWidth: () => 0,
      hLineColor: (i) => i === 1 ? ACCENT_COLOR : BORDER_COLOR
    },
    margin: [0, 0, 0, 15]
  };
};

const createFieldsTable = (fields, submissionData) => {
  if (!fields || !Array.isArray(fields) || fields.length === 0) {
    return {
      text: 'No form fields',
      color: '#6b7280',
      margin: [0, 0, 0, 15]
    };
  }

  const tableBody = [];

  fields.forEach((field, index) => {
    const label = field.label || field.field_label || field.name || 'Field';
    const fieldName = field.name || field.field_name || '';
    let value = submissionData?.[fieldName] || '';
    
    if (field.type === 'checkbox' || field.field_type === 'checkbox') {
      value = value ? 'Yes' : 'No';
    } else if (Array.isArray(value)) {
      value = value.join(', ');
    } else if (typeof value === 'object') {
      value = JSON.stringify(value);
    }

    tableBody.push([
      { text: label, bold: true, style: 'tableCell', fillColor: index % 2 === 0 ? LIGHT_GRAY : null },
      { text: String(value || 'N/A'), style: 'tableCell', fillColor: index % 2 === 0 ? LIGHT_GRAY : null }
    ]);
  });

  return {
    table: {
      widths: [150, '*'],
      body: tableBody
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0,
      hLineColor: () => BORDER_COLOR
    },
    margin: [0, 0, 0, 15]
  };
};

const generateQuotePdf = async (quoteId, options = {}) => {
  const { rows } = await db.query(
    `SELECT q.*, 
            c.primary_email as client_email, 
            c.primary_phone as client_phone,
            c.billing_address_line1, c.billing_city, c.billing_state, c.billing_zip_code
     FROM quotes q
     LEFT JOIN clients c ON q.client_id = c.id
     WHERE q.id = $1`,
    [quoteId]
  );

  if (rows.length === 0) {
    throw new Error(`Quote not found: ${quoteId}`);
  }

  const quote = rows[0];
  const companyInfo = await getCompanyInfo();

  const lineItems = typeof quote.line_items === 'string' 
    ? JSON.parse(quote.line_items) 
    : (quote.line_items || []);

  const subtotal = quote.total_amount || 
    lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  const quoteNumber = quote.quote_number || quote.id.substring(0, 8);

  const docDefinition = {
    pageSize: 'LETTER',
    pageMargins: [40, 40, 40, 60],
    defaultStyle: {
      font: 'Roboto',
      fontSize: 10,
      color: TEXT_COLOR
    },
    styles: defaultStyles,
    content: [
      ...createHeader(companyInfo, 'QUOTE', quoteNumber),
      createInfoSection(
        [
          { label: 'Customer', value: quote.customer_name || 'Customer' },
          { label: 'Email', value: quote.client_email || '' },
          { label: 'Phone', value: quote.client_phone || '' },
          { label: 'Job Location', value: quote.job_location || '' }
        ],
        [
          { label: 'Quote Date', value: formatDate(quote.created_at) },
          { label: 'Valid Until', value: quote.valid_until || 'N/A' },
          { label: 'Status', value: (quote.status || 'Draft').toUpperCase() }
        ]
      ),
      { text: 'Line Items', style: 'subheader' },
      createLineItemsTable(lineItems),
      createTotalsSection({
        subtotal: formatCurrency(subtotal),
        discountAmount: quote.discount_amount ? formatCurrency(quote.discount_amount) : null,
        discountPercentage: quote.discount_percentage,
        taxRate: quote.tax_rate,
        taxAmount: quote.tax_amount ? formatCurrency(quote.tax_amount) : null,
        grandTotal: formatCurrency(quote.grand_total || subtotal),
        depositAmount: quote.deposit_amount ? formatCurrency(quote.deposit_amount) : null
      }),
      quote.special_instructions ? [
        { text: 'Special Instructions', style: 'subheader' },
        { text: quote.special_instructions, style: 'notes', margin: [0, 0, 0, 15] }
      ] : [],
      quote.terms_and_conditions ? [
        { text: 'Terms & Conditions', style: 'subheader' },
        { text: quote.terms_and_conditions, style: 'notes', fontSize: 9 }
      ] : []
    ].flat(),
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: `Generated by ${companyInfo.companyName}`, style: 'footer' },
        { text: `Page ${currentPage} of ${pageCount}`, style: 'footer', alignment: 'right' }
      ],
      margin: [40, 20, 40, 0]
    })
  };

  const buffer = await createPdfBuffer(docDefinition);

  return {
    buffer,
    filename: `Quote-${quoteNumber}.pdf`,
    contentType: 'application/pdf'
  };
};

const generateInvoicePdf = async (invoiceId, options = {}) => {
  const { rows } = await db.query(
    `SELECT i.*, 
            c.primary_email as client_email, 
            c.primary_phone as client_phone,
            c.billing_address_line1, c.billing_city, c.billing_state, c.billing_zip_code
     FROM invoices i
     LEFT JOIN clients c ON i.client_id = c.id
     WHERE i.id = $1`,
    [invoiceId]
  );

  if (rows.length === 0) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }

  const invoice = rows[0];
  const companyInfo = await getCompanyInfo();

  const lineItems = typeof invoice.line_items === 'string' 
    ? JSON.parse(invoice.line_items) 
    : (invoice.line_items || []);

  const subtotal = invoice.subtotal || invoice.total_amount || 
    lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  const customerAddress = invoice.customer_address || [
    invoice.billing_address_line1,
    invoice.billing_city,
    invoice.billing_state,
    invoice.billing_zip_code
  ].filter(Boolean).join(', ');

  const invoiceNumber = invoice.invoice_number || invoice.id.substring(0, 8);

  const docDefinition = {
    pageSize: 'LETTER',
    pageMargins: [40, 40, 40, 60],
    defaultStyle: {
      font: 'Roboto',
      fontSize: 10,
      color: TEXT_COLOR
    },
    styles: defaultStyles,
    content: [
      ...createHeader(companyInfo, 'INVOICE', invoiceNumber),
      createInfoSection(
        [
          { label: 'Bill To', value: invoice.customer_name || 'Customer' },
          { label: 'Email', value: invoice.customer_email || invoice.client_email || '' },
          { label: 'Phone', value: invoice.customer_phone || invoice.client_phone || '' },
          { label: 'Address', value: customerAddress }
        ],
        [
          { label: 'Invoice Date', value: formatDate(invoice.issue_date) },
          { label: 'Due Date', value: formatDate(invoice.due_date) },
          { label: 'Payment Terms', value: invoice.payment_terms || 'Net 30' },
          { label: 'Status', value: (invoice.status || 'Draft').toUpperCase() }
        ]
      ),
      { text: 'Line Items', style: 'subheader' },
      createLineItemsTable(lineItems),
      createTotalsSection({
        subtotal: formatCurrency(subtotal),
        discountAmount: invoice.discount_amount ? formatCurrency(invoice.discount_amount) : null,
        discountPercentage: invoice.discount_percentage,
        taxRate: invoice.tax_rate,
        taxAmount: invoice.tax_amount ? formatCurrency(invoice.tax_amount) : null,
        grandTotal: formatCurrency(invoice.grand_total || invoice.amount || subtotal),
        amountPaid: invoice.amount_paid ? formatCurrency(invoice.amount_paid) : null,
        amountDue: formatCurrency((invoice.grand_total || invoice.amount || subtotal) - (invoice.amount_paid || 0))
      }),
      invoice.notes || invoice.customer_notes ? [
        { text: 'Notes', style: 'subheader' },
        { text: invoice.notes || invoice.customer_notes, style: 'notes' }
      ] : []
    ].flat(),
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: `Generated by ${companyInfo.companyName}`, style: 'footer' },
        { text: `Page ${currentPage} of ${pageCount}`, style: 'footer', alignment: 'right' }
      ],
      margin: [40, 20, 40, 0]
    })
  };

  const buffer = await createPdfBuffer(docDefinition);

  return {
    buffer,
    filename: `Invoice-${invoiceNumber}.pdf`,
    contentType: 'application/pdf'
  };
};

const generateJobPdf = async (jobId, options = {}) => {
  const { rows } = await db.query(
    `SELECT j.*, 
            q.quote_number,
            c.primary_email as client_email, 
            c.primary_phone as client_phone
     FROM jobs j
     LEFT JOIN quotes q ON j.quote_id = q.id
     LEFT JOIN clients c ON j.client_id = c.id
     WHERE j.id = $1`,
    [jobId]
  );

  if (rows.length === 0) {
    throw new Error(`Job not found: ${jobId}`);
  }

  const job = rows[0];
  const companyInfo = await getCompanyInfo();

  const assignedCrew = typeof job.assigned_crew === 'string' 
    ? JSON.parse(job.assigned_crew) 
    : (job.assigned_crew || []);

  const equipmentNeeded = typeof job.equipment_needed === 'string' 
    ? JSON.parse(job.equipment_needed) 
    : (job.equipment_needed || []);

  let workDuration = '';
  if (job.work_started_at && job.work_ended_at) {
    const start = new Date(job.work_started_at);
    const end = new Date(job.work_ended_at);
    const diffMs = end - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    workDuration = `${hours}h ${minutes}m`;
  }

  const jobNumber = job.job_number || job.id.substring(0, 8);
  const equipmentList = Array.isArray(equipmentNeeded) && equipmentNeeded.length > 0 
    ? equipmentNeeded.map(e => typeof e === 'object' ? e.name : e).join(', ') 
    : null;

  const docDefinition = {
    pageSize: 'LETTER',
    pageMargins: [40, 40, 40, 60],
    defaultStyle: {
      font: 'Roboto',
      fontSize: 10,
      color: TEXT_COLOR
    },
    styles: defaultStyles,
    content: [
      ...createHeader(companyInfo, 'WORK ORDER', jobNumber),
      createInfoSection(
        [
          { label: 'Customer', value: job.customer_name || 'Customer' },
          { label: 'Email', value: job.client_email || '' },
          { label: 'Phone', value: job.client_phone || '' },
          { label: 'Job Location', value: job.job_location || '' }
        ],
        [
          { label: 'Scheduled Date', value: formatDate(job.scheduled_date) },
          { label: 'Estimated Hours', value: job.estimated_hours ? `${job.estimated_hours} hrs` : 'N/A' },
          { label: 'Quote Reference', value: job.quote_number || 'N/A' },
          { label: 'Status', value: (job.status || 'Draft').toUpperCase() }
        ]
      ),
      assignedCrew.length > 0 ? [
        { text: 'Assigned Crew', style: 'subheader' },
        createCrewTable(assignedCrew)
      ] : [],
      equipmentList ? [
        { text: 'Equipment Needed', style: 'subheader' },
        { text: equipmentList, style: 'value', margin: [0, 0, 0, 15] }
      ] : [],
      job.special_instructions ? [
        { text: 'Special Instructions', style: 'subheader' },
        { text: job.special_instructions, style: 'notes', margin: [0, 0, 0, 15] }
      ] : [],
      (job.work_started_at || job.work_ended_at) ? [
        { text: 'Work Log', style: 'subheader' },
        createInfoSection(
          [
            { label: 'Started', value: job.work_started_at ? formatDateTime(job.work_started_at) : 'Not started' },
            { label: 'Completed', value: job.work_ended_at ? formatDateTime(job.work_ended_at) : 'In progress' }
          ],
          [
            { label: 'Duration', value: workDuration || 'N/A' }
          ]
        )
      ] : []
    ].flat(),
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: `Generated by ${companyInfo.companyName}`, style: 'footer' },
        { text: `Page ${currentPage} of ${pageCount}`, style: 'footer', alignment: 'right' }
      ],
      margin: [40, 20, 40, 0]
    })
  };

  const buffer = await createPdfBuffer(docDefinition);

  return {
    buffer,
    filename: `WorkOrder-${jobNumber}.pdf`,
    contentType: 'application/pdf'
  };
};

const generateFormPdf = async (formSubmissionId, options = {}) => {
  const { rows } = await db.query(
    `SELECT fs.*, 
            ft.name as form_name, 
            ft.description as form_description,
            ft.fields as form_fields,
            e.name as employee_name,
            j.job_number,
            j.customer_name
     FROM form_submissions fs
     JOIN form_templates ft ON fs.form_template_id = ft.id
     LEFT JOIN employees e ON fs.submitted_by = e.id
     LEFT JOIN jobs j ON fs.job_id = j.id
     WHERE fs.id = $1`,
    [formSubmissionId]
  );

  if (rows.length === 0) {
    throw new Error(`Form submission not found: ${formSubmissionId}`);
  }

  const submission = rows[0];
  const companyInfo = await getCompanyInfo();

  const formFields = typeof submission.form_fields === 'string' 
    ? JSON.parse(submission.form_fields) 
    : (submission.form_fields || []);

  const submissionData = typeof submission.submission_data === 'string' 
    ? JSON.parse(submission.submission_data) 
    : (submission.submission_data || {});

  const { rows: photos } = await db.query(
    'SELECT COUNT(*) as count FROM form_photos WHERE form_submission_id = $1',
    [formSubmissionId]
  );
  const photoCount = parseInt(photos[0]?.count || 0);

  const formName = submission.form_name || 'Form Submission';

  const docDefinition = {
    pageSize: 'LETTER',
    pageMargins: [40, 40, 40, 60],
    defaultStyle: {
      font: 'Roboto',
      fontSize: 10,
      color: TEXT_COLOR
    },
    styles: defaultStyles,
    content: [
      ...createHeader(companyInfo, 'FORM SUBMISSION', formName.substring(0, 20)),
      submission.form_description ? {
        text: submission.form_description,
        style: 'notes',
        margin: [0, 0, 0, 15]
      } : {},
      createInfoSection(
        [
          { label: 'Submitted By', value: submission.employee_name || 'Unknown' },
          { label: 'Submitted At', value: formatDateTime(submission.submitted_at) }
        ],
        [
          { label: 'Job Number', value: submission.job_number || 'N/A' },
          { label: 'Customer', value: submission.customer_name || 'N/A' }
        ]
      ),
      { text: 'Form Data', style: 'subheader' },
      createFieldsTable(formFields, submissionData),
      submission.signature_data ? [
        { text: 'Signature', style: 'subheader' },
        { text: 'Signature captured electronically', style: 'notes', margin: [0, 0, 0, 15] }
      ] : [],
      photoCount > 0 ? [
        { text: 'Attachments', style: 'subheader' },
        { text: `${photoCount} photo(s) attached`, style: 'notes', margin: [0, 0, 0, 15] }
      ] : [],
      (submission.location_lat && submission.location_lon) ? [
        { text: 'Location', style: 'subheader' },
        { text: `Lat: ${submission.location_lat}, Lon: ${submission.location_lon}`, style: 'notes' }
      ] : []
    ].flat(),
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: `Generated by ${companyInfo.companyName}`, style: 'footer' },
        { text: `Page ${currentPage} of ${pageCount}`, style: 'footer', alignment: 'right' }
      ],
      margin: [40, 20, 40, 0]
    })
  };

  const buffer = await createPdfBuffer(docDefinition);

  return {
    buffer,
    filename: `Form-${formName.replace(/\s+/g, '-')}-${formSubmissionId.substring(0, 8)}.pdf`,
    contentType: 'application/pdf'
  };
};

const generateJobFormPdf = async (jobFormId, options = {}) => {
  const { rows } = await db.query(
    `SELECT jf.*, 
            ft.name as form_name, 
            ft.description as form_description,
            ft.fields as form_fields,
            j.job_number,
            j.customer_name
     FROM job_forms jf
     JOIN form_templates ft ON jf.form_template_id = ft.id
     LEFT JOIN jobs j ON jf.job_id = j.id
     WHERE jf.id = $1`,
    [jobFormId]
  );

  if (rows.length === 0) {
    throw new Error(`Job form not found: ${jobFormId}`);
  }

  const jobForm = rows[0];
  const companyInfo = await getCompanyInfo();

  const formFields = typeof jobForm.form_fields === 'string' 
    ? JSON.parse(jobForm.form_fields) 
    : (jobForm.form_fields || []);

  const formData = typeof jobForm.form_data === 'string' 
    ? JSON.parse(jobForm.form_data) 
    : (jobForm.form_data || {});

  const formName = jobForm.form_name || 'Job Form';

  const docDefinition = {
    pageSize: 'LETTER',
    pageMargins: [40, 40, 40, 60],
    defaultStyle: {
      font: 'Roboto',
      fontSize: 10,
      color: TEXT_COLOR
    },
    styles: defaultStyles,
    content: [
      ...createHeader(companyInfo, 'JOB FORM', formName.substring(0, 20)),
      jobForm.form_description ? {
        text: jobForm.form_description,
        style: 'notes',
        margin: [0, 0, 0, 15]
      } : {},
      createInfoSection(
        [
          { label: 'Completed By', value: jobForm.completed_by || 'N/A' },
          { label: 'Date', value: jobForm.completed_at ? formatDateTime(jobForm.completed_at) : formatDateTime(jobForm.created_at) }
        ],
        [
          { label: 'Job Number', value: jobForm.job_number || 'N/A' },
          { label: 'Customer', value: jobForm.customer_name || 'N/A' }
        ]
      ),
      { text: 'Form Data', style: 'subheader' },
      createFieldsTable(formFields, formData)
    ].flat(),
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: `Generated by ${companyInfo.companyName}`, style: 'footer' },
        { text: `Page ${currentPage} of ${pageCount}`, style: 'footer', alignment: 'right' }
      ],
      margin: [40, 20, 40, 0]
    })
  };

  const buffer = await createPdfBuffer(docDefinition);

  return {
    buffer,
    filename: `JobForm-${formName.replace(/\s+/g, '-')}-${jobFormId.substring(0, 8)}.pdf`,
    contentType: 'application/pdf'
  };
};

module.exports = {
  generateQuotePdf,
  generateInvoicePdf,
  generateJobPdf,
  generateFormPdf,
  generateJobFormPdf,
  formatCurrency,
  formatDate,
  formatDateTime
};
