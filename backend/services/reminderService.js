const db = require('../db');

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const scheduledReminders = new Map();

const getReminderKey = (invoiceId, label) => `${invoiceId}:${label}`;

const clearExistingReminder = (invoiceId, label) => {
  const key = getReminderKey(invoiceId, label);
  const existing = scheduledReminders.get(key);
  if (existing) {
    clearTimeout(existing);
    scheduledReminders.delete(key);
  }
};

const scheduleReminder = (invoice, daysOffset, label) => {
  clearExistingReminder(invoice.id, label);

  if (!invoice || !invoice.due_date) return;
  if (['Paid', 'Void'].includes(invoice.status)) return;

  const dueDate = new Date(invoice.due_date);
  if (Number.isNaN(dueDate.getTime())) return;

  const target = new Date(dueDate);
  target.setDate(target.getDate() + daysOffset);

  const delay = target.getTime() - Date.now();
  if (delay <= 0) {
    console.log(`📬 [Invoice Reminder] ${label} for invoice ${invoice.id} ready to send immediately.`);
    return;
  }

  const timer = setTimeout(() => {
    console.log(`📬 [Invoice Reminder] Invoice ${invoice.id} for ${invoice.customer_name || 'client'} ${label}.`);
    scheduledReminders.delete(getReminderKey(invoice.id, label));
  }, delay);

  scheduledReminders.set(getReminderKey(invoice.id, label), timer);
};

const scheduleInvoiceReminders = (invoice) => {
  if (!invoice || !invoice.due_date) return;

  scheduleReminder(invoice, -3, 'is due in 3 days');
  scheduleReminder(invoice, 0, 'is due today');
  scheduleReminder(invoice, 7, 'is 7 days overdue');
};

const hydrateReminderSchedule = async () => {
  const { rows: invoices } = await db.query(`
    SELECT * FROM invoices
    WHERE status NOT IN ('Paid', 'Void')
      AND due_date IS NOT NULL
  `);

  invoices.forEach(scheduleInvoiceReminders);
};

const cancelInvoiceReminders = (invoiceId) => {
  ['is due in 3 days', 'is due today', 'is 7 days overdue'].forEach((label) => {
    clearExistingReminder(invoiceId, label);
  });
};

const runDunningCheck = async () => {
  const { rows: invoices } = await db.query(`
    SELECT id, customer_name, status, due_date, amount_due
    FROM invoices
    WHERE status NOT IN ('Paid', 'Void')
      AND due_date IS NOT NULL
  `);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (const invoice of invoices) {
    const dueDate = new Date(invoice.due_date);
    if (Number.isNaN(dueDate.getTime())) continue;

    const daysPastDue = Math.floor((today.getTime() - dueDate.getTime()) / ONE_DAY_MS);

    if (daysPastDue > 0 && invoice.status !== 'Overdue') {
      await db.query(
        `UPDATE invoices SET status = 'Overdue', updated_at = NOW() WHERE id = $1`,
        [invoice.id]
      );
      console.log(
        `📣 [Dunning] Invoice ${invoice.id} for ${invoice.customer_name || 'client'} marked overdue (${daysPastDue} days past due)`
      );
    }

    if (daysPastDue >= 14) {
      console.log(
        `⚠️ [Dunning] Invoice ${invoice.id} is ${daysPastDue} days overdue. Consider escalating collection efforts.`
      );
    }
  }
};

module.exports = {
  scheduleInvoiceReminders,
  hydrateReminderSchedule,
  cancelInvoiceReminders,
  runDunningCheck,
  ONE_DAY_MS,
};
