const db = require('../db');

// Helper: Generate job number (JOB-YYYYMM-####)
const generateJobNumber = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `JOB-${year}${month}`;

  const { rows } = await db.query(
    `SELECT job_number FROM jobs
     WHERE job_number LIKE $1
     ORDER BY job_number DESC LIMIT 1`,
    [`${prefix}-%`]
  );

  let nextNumber = 1;
  if (rows.length > 0 && rows[0].job_number) {
    const lastNumber = parseInt(rows[0].job_number.split('-')[2]);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}-${String(nextNumber).padStart(4, '0')}`;
};

module.exports = {
  generateJobNumber
};
