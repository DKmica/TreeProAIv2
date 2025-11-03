const { GoogleGenerativeAI } = require('@google/genai');

const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY);

class EmbeddingService {
  constructor() {
    this.model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    this.batchSize = 100;
  }

  async embedText(text) {
    try {
      const result = await this.model.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  async embedBatch(texts) {
    const embeddings = [];
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      const batchEmbeddings = await Promise.all(
        batch.map(text => this.embedText(text))
      );
      embeddings.push(...batchEmbeddings);
      
      if (i + this.batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    return embeddings;
  }

  formatCustomerForEmbedding(customer) {
    return `Customer: ${customer.name}
Location: ${customer.address || ''}, ${customer.city || ''}, ${customer.state || ''} ${customer.zip || ''}
Phone: ${customer.phone || ''}
Email: ${customer.email || ''}
Notes: ${customer.notes || 'No notes'}`;
  }

  formatLeadForEmbedding(lead) {
    return `Lead: ${lead.customer?.name || 'Unknown'}
Status: ${lead.status}
Source: ${lead.source || 'Unknown'}
Location: ${lead.customer?.address || ''}, ${lead.customer?.city || ''}
Service Type: ${lead.service_type || lead.serviceType || 'General tree service'}
Estimated Value: $${lead.estimated_value || lead.estimatedValue || 0}
Notes: ${lead.notes || 'No notes'}
Description: ${lead.description || ''}`;
  }

  formatQuoteForEmbedding(quote) {
    const lineItems = Array.isArray(quote.lineItems) 
      ? quote.lineItems.map(item => `${item.description}: $${item.price}`).join(', ')
      : (Array.isArray(quote.line_items) 
        ? quote.line_items.map(item => `${item.description}: $${item.price}`).join(', ')
        : 'No line items');
    
    return `Quote #${quote.id}
Customer: ${quote.customerName || quote.customer_name || 'Unknown'}
Total: $${quote.total || 0}
Status: ${quote.status}
Services: ${lineItems}
Location: ${quote.jobLocation || quote.job_location || ''}
Special Instructions: ${quote.specialInstructions || quote.special_instructions || 'None'}
Valid Until: ${quote.validUntil || quote.valid_until || 'Not specified'}`;
  }

  formatJobForEmbedding(job) {
    return `Job #${job.id}
Customer: ${job.customer?.name || 'Unknown'}
Location: ${job.customer?.address || ''}, ${job.customer?.city || ''}
Status: ${job.status}
Scheduled: ${job.scheduled_date || job.scheduledDate || 'Not scheduled'}
Crew: ${job.assigned_crew || job.assignedCrew || 'Not assigned'}
Description: ${job.description || ''}
Total Cost: $${job.total_cost || job.totalCost || 0}
Notes: ${job.notes || 'No notes'}`;
  }

  formatEmployeeForEmbedding(employee) {
    return `Employee: ${employee.name}
Title: ${employee.jobTitle || employee.job_title || 'Employee'}
Crew: ${employee.crew || 'Unassigned'}
Phone: ${employee.phone || ''}
Email: ${employee.email || ''}
Pay Rate: $${employee.payRate || employee.pay_rate || 0}/hr
Hire Date: ${employee.hireDate || employee.hire_date || 'Unknown'}
Status: ${employee.status || 'Active'}`;
  }

  formatEquipmentForEmbedding(equipment) {
    return `Equipment: ${equipment.name}
Type: ${equipment.type}
Make/Model: ${equipment.make} ${equipment.model}
Status: ${equipment.status}
Assigned To: Crew ${equipment.assignedTo || equipment.assigned_to || 'Unassigned'}
Purchase Date: ${equipment.purchaseDate || equipment.purchase_date || 'Unknown'}
Last Service: ${equipment.lastServiceDate || equipment.last_service_date || 'Never'}
Notes: ${equipment.notes || 'No notes'}`;
  }
}

module.exports = new EmbeddingService();
