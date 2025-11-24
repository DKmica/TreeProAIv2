const db = require('../db');
const ragService = require('../services/ragService');
const vectorStore = require('../services/vectorStore');

const collectionDocIdPrefixes = {
  clients: 'client',
  leads: 'lead',
  quotes: 'quote',
  jobs: 'job',
  employees: 'employee',
  equipment: 'equipment'
};

const reindexDocument = async (tableName, row) => {
  if (!row) return;

  try {
    console.log(`[RAG] Re-indexing document for ${tableName} ID: ${row.id}`);
    switch (tableName) {
      case 'clients':
        await ragService.indexCustomers([row]);
        break;
      case 'leads': {
        const { rows: leads } = await db.query(`
              SELECT l.*,
                     CONCAT(c.first_name, ' ', c.last_name) as customer_name,
                     c.billing_address_line1 as address,
                     c.primary_phone as phone,
                     c.primary_email as email
              FROM leads l LEFT JOIN clients c ON l.client_id_new = c.id
              WHERE l.id = $1
            `, [row.id]);
        if (leads.length) {
          await ragService.indexLeads(leads);
        }
        break;
      }
      case 'quotes':
        await ragService.indexQuotes([row]);
        break;
      case 'jobs':
        await ragService.indexJobs([row]);
        break;
      case 'employees':
        await ragService.indexEmployees([row]);
        break;
      case 'equipment':
        await ragService.indexEquipment([row]);
        break;
      default:
        break;
    }
    console.log('[RAG] Re-indexing complete.');
  } catch (err) {
    console.error('[RAG] Failed to re-index document:', err);
  }
};

const removeFromVectorStore = async (tableName, id) => {
  const prefix = collectionDocIdPrefixes[tableName];
  if (!prefix) {
    return;
  }

  try {
    await vectorStore.removeDocument(tableName, `${prefix}_${id}`);
  } catch (err) {
    console.error('[RAG] Error removing document from vector store:', err);
  }
};

module.exports = {
  reindexDocument,
  removeFromVectorStore,
};
