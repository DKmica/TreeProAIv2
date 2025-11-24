/**
 * Exception Queue API Service
 * Handles fetching and managing exceptions
 */

const API_BASE = '/api';

export interface Exception {
  id: string;
  exception_type: 'quote_pending_approval' | 'invoice_overdue' | 'job_missing_forms' | 'quote_follow_up';
  entity_id: string;
  entity_type: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  description?: string;
  created_at: string;
}

export const exceptionQueueService = {
  async getAll() {
    const response = await fetch(`${API_BASE}/exception-queue`);
    if (!response.ok) throw new Error('Failed to fetch exceptions');
    return response.json();
  },

  async resolve(exceptionId: string) {
    const response = await fetch(`${API_BASE}/exception-queue/${exceptionId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to resolve exception');
    return response.json();
  },
};

export const searchService = {
  async search(query: string) {
    if (!query || query.length < 2) return { results: [], total: 0 };
    const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Search failed');
    return response.json();
  },
};
