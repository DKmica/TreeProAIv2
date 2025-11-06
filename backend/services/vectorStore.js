const embeddingService = require('./embeddingService');

class InMemoryVectorStore {
  constructor() {
    this.collections = {
      customers: [],
      leads: [],
      quotes: [],
      jobs: [],
      employees: [],
      equipment: []
    };
    this.collectionNames = Object.keys(this.collections);
  }

  async initialize() {
    console.log('✅ In-memory vector store initialized');
    return true;
  }

  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  async addDocuments(collectionName, documents) {
    if (!this.collections[collectionName]) {
      console.warn(`Collection ${collectionName} not found`);
      return;
    }

    try {
      const texts = documents.map(doc => doc.text);
      const embeddings = await embeddingService.embedBatch(texts);

      const processedDocs = documents.map((doc, index) => ({
        id: doc.id,
        text: doc.text,
        embedding: embeddings[index],
        metadata: doc.metadata || {}
      }));

      this.collections[collectionName].push(...processedDocs);
      console.log(`✅ Added ${documents.length} documents to ${collectionName}`);
    } catch (error) {
      console.error(`Error adding documents to ${collectionName}:`, error);
      throw error;
    }
  }

  async query(collectionName, queryText, nResults = 5) {
    if (!this.collections[collectionName]) {
      console.warn(`Collection ${collectionName} not found`);
      return [];
    }

    const collection = this.collections[collectionName];
    if (collection.length === 0) {
      return [];
    }

    try {
      const queryEmbedding = await embeddingService.embedText(queryText);

      const results = collection.map(doc => ({
        id: doc.id,
        document: doc.text,
        metadata: doc.metadata,
        similarity: this.cosineSimilarity(queryEmbedding, doc.embedding)
      }));

      results.sort((a, b) => b.similarity - a.similarity);

      return results.slice(0, nResults).map(r => ({
        ...r,
        distance: 1 - r.similarity
      }));
    } catch (error) {
      console.error(`Error querying ${collectionName}:`, error);
      return [];
    }
  }

  async clearCollection(collectionName) {
    if (!this.collections[collectionName]) {
      return;
    }

    this.collections[collectionName] = [];
    console.log(`✅ Cleared collection: ${collectionName}`);
  }

  async searchAcrossCollections(queryText, collectionsToSearch = null, nResultsPerCollection = 3) {
    const searchCollections = collectionsToSearch || this.collectionNames;
    const results = {};

    for (const collectionName of searchCollections) {
      try {
        results[collectionName] = await this.query(collectionName, queryText, nResultsPerCollection);
      } catch (error) {
        console.error(`Error searching ${collectionName}:`, error);
        results[collectionName] = [];
      }
    }

    return results;
  }

  async getCollectionStats() {
    const stats = {};

    for (const collectionName of this.collectionNames) {
      stats[collectionName] = this.collections[collectionName].length;
    }

    return stats;
  }
}

module.exports = new InMemoryVectorStore();
