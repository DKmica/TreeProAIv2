import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchService } from '../services/exceptionQueueService';

interface SearchResult {
  id: string;
  type: string;
  name?: string;
  description?: string;
  category?: string;
  status?: string;
  created_at?: string;
}

const GlobalSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const searchTimeout = setTimeout(() => {
      if (query.length >= 2) {
        performSearch();
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  const performSearch = async () => {
    try {
      setIsLoading(true);
      const data = await searchService.search(query);
      setResults(data.results || []);
      setIsOpen(true);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    const paths: Record<string, string> = {
      lead: `/crm?tab=leads&id=${result.id}`,
      quote: `/quotes/${result.id}`,
      job: `/jobs/${result.id}`,
      invoice: `/invoices/${result.id}`,
      client: `/crm?tab=clients&id=${result.id}`,
    };
    
    if (paths[result.type]) {
      navigate(paths[result.type]);
      setQuery('');
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search quotes, jobs, invoices..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="w-full px-4 py-2 bg-brand-gray-800 text-white placeholder-brand-gray-500 rounded-lg border border-brand-gray-700 focus:border-brand-cyan-500 focus:outline-none transition-colors"
        />
        {isLoading && (
          <div className="absolute right-3 top-2.5 text-brand-cyan-400">
            <div className="animate-spin">⚙</div>
          </div>
        )}
      </div>

      {isOpen && query.length >= 2 && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-2 bg-brand-gray-900 border border-brand-gray-700 rounded-lg shadow-lg z-40 max-h-96 overflow-y-auto">
            {results.length === 0 && !isLoading && (
              <div className="px-4 py-8 text-center text-brand-gray-400">
                No results found for "{query}"
              </div>
            )}
            
            {results.map((result) => (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => handleResultClick(result)}
                className="w-full px-4 py-3 text-left hover:bg-brand-gray-800 border-b border-brand-gray-800 last:border-b-0 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-white font-semibold group-hover:text-brand-cyan-400 transition-colors">
                      {result.name || result.description || `${result.type} #${result.id.substring(0, 8)}`}
                    </p>
                    <p className="text-sm text-brand-gray-500">
                      {result.category || result.type} • {result.status || 'Active'}
                    </p>
                  </div>
                  <span className="text-xs bg-brand-cyan-600/20 text-brand-cyan-400 px-2 py-1 rounded whitespace-nowrap ml-2">
                    {result.type.toUpperCase()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default GlobalSearch;
