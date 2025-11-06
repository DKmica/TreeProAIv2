const vectorStore = require('./vectorStore');
const embeddingService = require('./embeddingService');
const db = require('../db');

class RAGService {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      await vectorStore.initialize();
      this.initialized = true;
      console.log('✅ RAG Service initialized');
    } catch (error) {
      console.error('Error initializing RAG service:', error);
      throw error;
    }
  }

  async buildVectorDatabase() {
    console.log('🔄 Building vector database from business data...');

    try {
      const [
        customers,
        leads,
        quotes,
        jobs,
        employees,
        equipment
      ] = await Promise.all([
        db.query('SELECT * FROM customers'),
        db.query(`
          SELECT l.*, 
                 c.name as customer_name,
                 c.address,
                 c.phone, c.email
          FROM leads l
          LEFT JOIN customers c ON l.customer_id = c.id
        `),
        db.query('SELECT * FROM quotes'),
        db.query('SELECT * FROM jobs'),
        db.query('SELECT * FROM employees'),
        db.query('SELECT * FROM equipment')
      ]);

      await this.indexCustomers(customers.rows);
      await this.indexLeads(leads.rows);
      await this.indexQuotes(quotes.rows);
      await this.indexJobs(jobs.rows);
      await this.indexEmployees(employees.rows);
      await this.indexEquipment(equipment.rows);

      const stats = await vectorStore.getCollectionStats();
      console.log('✅ Vector database built successfully:', stats);
      
      return stats;
    } catch (error) {
      console.error('Error building vector database:', error);
      throw error;
    }
  }

  async indexCustomers(customers) {
    if (!customers || customers.length === 0) return;

    const documents = customers.map(customer => ({
      id: `customer_${customer.id}`,
      text: embeddingService.formatCustomerForEmbedding(customer),
      metadata: {
        type: 'customer',
        id: customer.id,
        name: customer.name,
        address: customer.address
      }
    }));

    await vectorStore.clearCollection('customers');
    await vectorStore.addDocuments('customers', documents);
  }

  async indexLeads(leads) {
    if (!leads || leads.length === 0) return;

    const documents = leads.map(lead => ({
      id: `lead_${lead.id}`,
      text: embeddingService.formatLeadForEmbedding({
        ...lead,
        customer: {
          name: lead.customer_name,
          address: lead.address,
          city: lead.city,
          state: lead.state
        }
      }),
      metadata: {
        type: 'lead',
        id: lead.id,
        status: lead.status,
        source: lead.source,
        customer_name: lead.customer_name
      }
    }));

    await vectorStore.clearCollection('leads');
    await vectorStore.addDocuments('leads', documents);
  }

  async indexQuotes(quotes) {
    if (!quotes || quotes.length === 0) return;

    const documents = quotes.map(quote => ({
      id: `quote_${quote.id}`,
      text: embeddingService.formatQuoteForEmbedding(quote),
      metadata: {
        type: 'quote',
        id: quote.id,
        status: quote.status,
        total: quote.total,
        customer_name: quote.customer_name
      }
    }));

    await vectorStore.clearCollection('quotes');
    await vectorStore.addDocuments('quotes', documents);
  }

  async indexJobs(jobs) {
    if (!jobs || jobs.length === 0) return;

    const documents = jobs.map(job => ({
      id: `job_${job.id}`,
      text: embeddingService.formatJobForEmbedding({
        ...job,
        customer: {
          name: job.customer_name,
          address: job.job_location
        }
      }),
      metadata: {
        type: 'job',
        id: job.id,
        status: job.status,
        customer_name: job.customer_name,
        assigned_crew: job.assigned_crew
      }
    }));

    await vectorStore.clearCollection('jobs');
    await vectorStore.addDocuments('jobs', documents);
  }

  async indexEmployees(employees) {
    if (!employees || employees.length === 0) return;

    const documents = employees.map(employee => ({
      id: `employee_${employee.id}`,
      text: embeddingService.formatEmployeeForEmbedding(employee),
      metadata: {
        type: 'employee',
        id: employee.id,
        name: employee.name,
        crew: employee.crew,
        job_title: employee.job_title
      }
    }));

    await vectorStore.clearCollection('employees');
    await vectorStore.addDocuments('employees', documents);
  }

  async indexEquipment(equipment) {
    if (!equipment || equipment.length === 0) return;

    const documents = equipment.map(item => ({
      id: `equipment_${item.id}`,
      text: embeddingService.formatEquipmentForEmbedding(item),
      metadata: {
        type: 'equipment',
        id: item.id,
        name: item.name,
        type: item.type,
        status: item.status
      }
    }));

    await vectorStore.clearCollection('equipment');
    await vectorStore.addDocuments('equipment', documents);
  }

  async search(query, options = {}) {
    const {
      collections = null,
      limit = 5
    } = options;

    try {
      const results = await vectorStore.searchAcrossCollections(
        query,
        collections,
        limit
      );

      const allResults = [];
      for (const [collectionName, items] of Object.entries(results)) {
        for (const item of items) {
          allResults.push({
            collection: collectionName,
            ...item
          });
        }
      }

      allResults.sort((a, b) => a.distance - b.distance);

      return allResults.slice(0, limit * 2);
    } catch (error) {
      console.error('Error searching vector database:', error);
      return [];
    }
  }

  async getContextForQuery(query, maxResults = 10) {
    const results = await this.search(query, { limit: maxResults });
    
    if (results.length === 0) {
      return 'No relevant business data found for this query.';
    }

    let context = 'Relevant Business Data:\n\n';
    
    for (const result of results) {
      context += `[${result.collection.toUpperCase()}]\n`;
      context += result.document;
      context += '\n\n';
    }

    return context;
  }
}

module.exports = new RAGService();
