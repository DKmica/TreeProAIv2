import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
  id: string;
  type: 'client' | 'lead' | 'quote' | 'job' | 'invoice' | 'property' | 'tag' | 'employee' | 'equipment' | 'crew';
  name: string;
  subtitle?: string;
  status?: string;
  metadata?: Record<string, string>;
}

interface RecentSearch {
  query: string;
  timestamp: number;
  type?: string;
}

type SearchFilter = 'all' | 'client' | 'lead' | 'quote' | 'job' | 'invoice' | 'employee' | 'equipment';

const typeIcons: Record<string, React.ReactNode> = {
  client: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  lead: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  quote: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  job: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  invoice: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
    </svg>
  ),
  property: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  tag: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  employee: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
    </svg>
  ),
  equipment: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  crew: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
};

const typeColors: Record<string, string> = {
  client: 'bg-blue-500/20 text-blue-400',
  lead: 'bg-purple-500/20 text-purple-400',
  quote: 'bg-amber-500/20 text-amber-400',
  job: 'bg-emerald-500/20 text-emerald-400',
  invoice: 'bg-brand-cyan-500/20 text-brand-cyan-400',
  property: 'bg-rose-500/20 text-rose-400',
  tag: 'bg-indigo-500/20 text-indigo-400',
  employee: 'bg-orange-500/20 text-orange-400',
  equipment: 'bg-gray-500/20 text-gray-400',
  crew: 'bg-teal-500/20 text-teal-400',
};

const filterOptions: { value: SearchFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'client', label: 'Clients' },
  { value: 'lead', label: 'Leads' },
  { value: 'quote', label: 'Quotes' },
  { value: 'job', label: 'Jobs' },
  { value: 'invoice', label: 'Invoices' },
  { value: 'employee', label: 'Employees' },
  { value: 'equipment', label: 'Equipment' },
];

const RECENT_SEARCHES_KEY = 'treeproai_recent_searches';
const MAX_RECENT_SEARCHES = 5;
const LISTBOX_ID = 'global-search-listbox';
const getOptionId = (prefix: string, index: number) => `global-search-${prefix}-${index}`;

interface GlobalSearchEnhancedProps {
  className?: string;
  compact?: boolean;
  onClose?: () => void;
}

const GlobalSearchEnhanced: React.FC<GlobalSearchEnhancedProps> = ({ 
  className = '', 
  compact = false,
  onClose 
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [activeFilter, setActiveFilter] = useState<SearchFilter>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load recent searches from localStorage:', error);
      setRecentSearches([]);
    }
  }, []);

  const saveRecentSearch = useCallback((searchQuery: string, type?: string) => {
    const newSearches = [
      { query: searchQuery, timestamp: Date.now(), type },
      ...recentSearches.filter(s => s.query.toLowerCase() !== searchQuery.toLowerCase())
    ].slice(0, MAX_RECENT_SEARCHES);
    
    setRecentSearches(newSearches);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(newSearches));
      } catch (error) {
        console.error('Failed to save recent searches to localStorage:', error);
      }
    }
  }, [recentSearches]);

  const filteredResults = useMemo(() => {
    if (activeFilter === 'all') return results;
    return results.filter(r => r.type === activeFilter);
  }, [results, activeFilter]);

  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    filteredResults.forEach(result => {
      if (!groups[result.type]) groups[result.type] = [];
      groups[result.type].push(result);
    });
    return groups;
  }, [filteredResults]);

  useEffect(() => {
    const abortController = new AbortController();
    
    const searchTimeout = setTimeout(async () => {
      if (query.length >= 2) {
        setIsLoading(true);
        try {
          const typeParam = activeFilter !== 'all' ? `&type=${activeFilter}` : '';
          const response = await fetch(
            `/api/search?q=${encodeURIComponent(query)}${typeParam}`,
            { signal: abortController.signal }
          );
          if (response.ok) {
            const data = await response.json();
            setResults(data.results || []);
          } else {
            setResults([]);
          }
        } catch (error) {
          if (error instanceof Error && error.name !== 'AbortError') {
            console.error('Search failed:', error);
            setResults([]);
          }
        } finally {
          if (!abortController.signal.aborted) {
            setIsLoading(false);
          }
        }
        setIsOpen(true);
      } else {
        setResults([]);
      }
    }, 300);

    return () => {
      clearTimeout(searchTimeout);
      abortController.abort();
    };
  }, [query, activeFilter]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const itemCount = filteredResults.length || (query.length === 0 ? recentSearches.length : 0);
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % itemCount);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + itemCount) % itemCount);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          if (filteredResults.length > 0) {
            handleResultClick(filteredResults[selectedIndex]);
          } else if (recentSearches[selectedIndex]) {
            setQuery(recentSearches[selectedIndex].query);
          }
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        onClose?.();
        break;
    }
  };

  const handleResultClick = (result: SearchResult) => {
    saveRecentSearch(query, result.type);
    
    const paths: Record<string, string> = {
      client: `/crm/clients/${result.id}`,
      lead: `/crm?tab=leads&id=${result.id}`,
      quote: `/quotes/${result.id}`,
      job: `/jobs?id=${result.id}`,
      invoice: `/invoices?id=${result.id}`,
      property: `/crm/clients/${result.metadata?.clientId || ''}?property=${result.id}`,
      tag: `/crm?tag=${result.id}`,
      employee: `/employees?id=${result.id}`,
      equipment: `/equipment/${result.id}`,
      crew: `/crews?id=${result.id}`,
    };
    
    if (paths[result.type]) {
      navigate(paths[result.type]);
      setQuery('');
      setIsOpen(false);
      onClose?.();
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(RECENT_SEARCHES_KEY);
      } catch (error) {
        console.error('Failed to clear recent searches from localStorage:', error);
      }
    }
  };

  const showRecent = query.length === 0 && recentSearches.length > 0 && isOpen;
  const showResults = query.length >= 2 && isOpen;
  const isListboxOpen = showRecent || showResults;
  
  const getActiveDescendant = (): string | undefined => {
    if (selectedIndex < 0) return undefined;
    if (showResults && filteredResults.length > 0) {
      return getOptionId('result', selectedIndex);
    }
    if (showRecent && recentSearches.length > 0) {
      return getOptionId('recent', selectedIndex);
    }
    return undefined;
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-400 pointer-events-none">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isListboxOpen}
          aria-controls={LISTBOX_ID}
          aria-activedescendant={getActiveDescendant()}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          placeholder={compact ? "Search..." : "Search clients, jobs, invoices... (Cmd+K)"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className={`
            w-full pl-10 pr-10 py-2.5 
            bg-brand-gray-800 text-white placeholder-brand-gray-500 
            rounded-lg border border-brand-gray-700 
            focus:border-brand-cyan-500 focus:ring-2 focus:ring-brand-cyan-500/20 focus:outline-none 
            transition-all duration-200
            ${compact ? 'text-sm' : 'text-sm'}
          `}
        />
        
        {isLoading ? (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-cyan-400">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : query.length > 0 ? (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : !compact && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 text-brand-gray-500">
            <kbd className="px-1.5 py-0.5 text-xs font-mono bg-brand-gray-700 rounded">Cmd</kbd>
            <kbd className="px-1.5 py-0.5 text-xs font-mono bg-brand-gray-700 rounded">K</kbd>
          </div>
        )}
      </div>

      {(showRecent || showResults) && (
        <div 
          id={LISTBOX_ID}
          role="listbox"
          aria-label="Search results"
          className="absolute top-full left-0 right-0 mt-2 bg-brand-gray-900 border border-brand-gray-700 rounded-xl shadow-2xl z-50 max-h-[70vh] overflow-hidden"
        >
          {showResults && (
            <div className="px-3 py-2 border-b border-brand-gray-700 flex flex-wrap gap-1">
              {filterOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setActiveFilter(option.value)}
                  className={`
                    px-2.5 py-1 text-xs font-medium rounded-full transition-colors
                    ${activeFilter === option.value 
                      ? 'bg-brand-cyan-500 text-white' 
                      : 'bg-brand-gray-800 text-brand-gray-400 hover:text-white hover:bg-brand-gray-700'
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          {showRecent && (
            <div>
              <div className="flex items-center justify-between px-4 py-2 border-b border-brand-gray-700">
                <span className="text-xs font-medium text-brand-gray-400 uppercase tracking-wider">Recent Searches</span>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-brand-gray-500 hover:text-brand-cyan-400 transition-colors"
                >
                  Clear
                </button>
              </div>
              <div className="py-1">
                {recentSearches.map((search, index) => (
                  <button
                    key={search.timestamp}
                    id={getOptionId('recent', index)}
                    role="option"
                    aria-selected={selectedIndex === index}
                    onClick={() => setQuery(search.query)}
                    className={`
                      w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors
                      ${selectedIndex === index ? 'bg-brand-gray-800' : 'hover:bg-brand-gray-800/50'}
                    `}
                  >
                    <svg className="w-4 h-4 text-brand-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-brand-gray-300">{search.query}</span>
                    {search.type && (
                      <span className="text-xs text-brand-gray-500 ml-auto">{search.type}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showResults && (
            <div className="overflow-y-auto max-h-[60vh]">
              {filteredResults.length === 0 && !isLoading && (
                <div className="px-4 py-8 text-center">
                  <svg className="w-12 h-12 mx-auto text-brand-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-brand-gray-400 mb-1">No results found</p>
                  <p className="text-sm text-brand-gray-500">Try adjusting your search or filter</p>
                </div>
              )}
              
              {(Object.entries(groupedResults) as [string, SearchResult[]][]).map(([type, typeResults]) => (
                <div key={type}>
                  <div className="px-4 py-1.5 bg-brand-gray-800/50 border-b border-brand-gray-700">
                    <span className="text-xs font-semibold text-brand-gray-400 uppercase tracking-wider">
                      {type}s ({typeResults.length})
                    </span>
                  </div>
                  <div className="py-1">
                    {typeResults.map((result, index) => {
                      const globalIndex = filteredResults.indexOf(result);
                      return (
                        <button
                          key={`${result.type}-${result.id}`}
                          id={getOptionId('result', globalIndex)}
                          role="option"
                          aria-selected={selectedIndex === globalIndex}
                          onClick={() => handleResultClick(result)}
                          className={`
                            w-full px-4 py-3 text-left flex items-center gap-3 transition-colors
                            ${selectedIndex === globalIndex ? 'bg-brand-gray-800' : 'hover:bg-brand-gray-800/50'}
                          `}
                        >
                          <div className={`p-2 rounded-lg ${typeColors[result.type]}`}>
                            {typeIcons[result.type]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {result.name}
                            </p>
                            {result.subtitle && (
                              <p className="text-xs text-brand-gray-400 truncate">
                                {result.subtitle}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {result.status && (
                              <span className={`
                                text-xs px-2 py-0.5 rounded-full
                                ${result.status === 'active' || result.status === 'completed' || result.status === 'paid' 
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : result.status === 'pending' || result.status === 'in_progress' 
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : 'bg-brand-gray-600 text-brand-gray-300'
                                }
                              `}>
                                {result.status}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="px-4 py-2 bg-brand-gray-800/50 border-t border-brand-gray-700">
            <div className="flex items-center justify-between text-xs text-brand-gray-500">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-brand-gray-700 rounded">↑</kbd>
                  <kbd className="px-1 py-0.5 bg-brand-gray-700 rounded">↓</kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-brand-gray-700 rounded">↵</kbd>
                  select
                </span>
              </div>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-brand-gray-700 rounded">esc</kbd>
                close
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalSearchEnhanced;
