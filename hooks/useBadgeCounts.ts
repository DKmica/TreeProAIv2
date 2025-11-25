import { useState, useEffect, useCallback } from 'react';

interface BadgeCounts {
  pendingLeads: number;
  pendingQuotes: number;
  unpaidInvoices: number;
  todayJobs: number;
  exceptions: number;
  unreadMessages: number;
}

const REFRESH_INTERVAL = 60000;

export function useBadgeCounts() {
  const [counts, setCounts] = useState<BadgeCounts>({
    pendingLeads: 0,
    pendingQuotes: 0,
    unpaidInvoices: 0,
    todayJobs: 0,
    exceptions: 0,
    unreadMessages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCounts = useCallback(async () => {
    try {
      const response = await fetch('/api/badge-counts');
      if (response.ok) {
        const data = await response.json();
        setCounts({
          pendingLeads: data.pendingLeads || 0,
          pendingQuotes: data.pendingQuotes || 0,
          unpaidInvoices: data.unpaidInvoices || 0,
          todayJobs: data.todayJobs || 0,
          exceptions: data.exceptions || 0,
          unreadMessages: data.unreadMessages || 0,
        });
        setError(null);
      }
    } catch (err) {
      setError('Failed to fetch badge counts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchCounts]);

  return { counts, isLoading, error, refresh: fetchCounts };
}

export type { BadgeCounts };
