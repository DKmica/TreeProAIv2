import React, { useState, useMemo, useCallback } from 'react';
import Skeleton from './Skeleton';
import EmptyState from './EmptyState';

export interface Column<T> {
  key: string;
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  hideOnMobile?: boolean;
  renderMobile?: (row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (row: T) => string;
  loading?: boolean;
  emptyState?: {
    title: string;
    description?: string;
    action?: { label: string; onClick: () => void };
  };
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selectedRows?: string[];
  onSelectionChange?: (keys: string[]) => void;
  sortable?: boolean;
  defaultSort?: { key: string; direction: 'asc' | 'desc' };
  stickyHeader?: boolean;
  compact?: boolean;
  className?: string;
  mobileCardRenderer?: (row: T, index: number) => React.ReactNode;
}

function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  keyExtractor,
  loading = false,
  emptyState,
  onRowClick,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  sortable = true,
  defaultSort,
  stickyHeader = false,
  compact = false,
  className = '',
  mobileCardRenderer,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(
    defaultSort || null
  );

  const handleSort = useCallback((columnKey: string) => {
    if (!sortable) return;
    setSort(prev => {
      if (prev?.key !== columnKey) return { key: columnKey, direction: 'asc' };
      if (prev.direction === 'asc') return { key: columnKey, direction: 'desc' };
      return null;
    });
  }, [sortable]);

  const sortedData = useMemo(() => {
    if (!sort) return data;
    
    const column = columns.find(c => c.key === sort.key);
    if (!column) return data;

    return [...data].sort((a, b) => {
      const accessor = column.accessor;
      const aValue = typeof accessor === 'function' ? accessor(a) : a[accessor];
      const bValue = typeof accessor === 'function' ? accessor(b) : b[accessor];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const comparison = String(aValue).localeCompare(String(bValue), undefined, { numeric: true });
      return sort.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sort, columns]);

  const handleSelectAll = useCallback(() => {
    if (!onSelectionChange) return;
    const allKeys = data.map(keyExtractor);
    const allSelected = allKeys.every(key => selectedRows.includes(key));
    onSelectionChange(allSelected ? [] : allKeys);
  }, [data, keyExtractor, selectedRows, onSelectionChange]);

  const handleSelectRow = useCallback((key: string) => {
    if (!onSelectionChange) return;
    const isSelected = selectedRows.includes(key);
    onSelectionChange(
      isSelected 
        ? selectedRows.filter(k => k !== key)
        : [...selectedRows, key]
    );
  }, [selectedRows, onSelectionChange]);

  const getCellValue = (row: T, column: Column<T>): React.ReactNode => {
    if (typeof column.accessor === 'function') {
      return column.accessor(row);
    }
    const value = row[column.accessor];
    if (value === null || value === undefined) return '-';
    return String(value);
  };

  if (loading) {
    return (
      <div className={`bg-brand-gray-800 rounded-lg border border-brand-gray-700 overflow-hidden ${className}`}>
        <div className="hidden md:block">
          <table className="w-full">
            <thead className="bg-brand-gray-900">
              <tr>
                {columns.map(col => (
                  <th key={col.key} className="px-4 py-3 text-left">
                    <Skeleton width={80} height={16} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="border-t border-brand-gray-700">
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-3">
                      <Skeleton height={16} width="80%" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="md:hidden space-y-3 p-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="bg-brand-gray-900 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <Skeleton width={40} height={40} rounded="full" />
                <div className="flex-1 space-y-2">
                  <Skeleton height={16} width="60%" />
                  <Skeleton height={14} width="40%" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton height={14} />
                <Skeleton height={14} width="70%" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0 && emptyState) {
    return (
      <div className={`bg-brand-gray-800 rounded-lg border border-brand-gray-700 ${className}`}>
        <EmptyState
          variant="no-data"
          title={emptyState.title}
          description={emptyState.description}
          action={emptyState.action}
        />
      </div>
    );
  }

  const visibleColumns = columns.filter(col => !col.hideOnMobile);

  return (
    <div className={`bg-brand-gray-800 rounded-lg border border-brand-gray-700 overflow-hidden ${className}`}>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className={`bg-brand-gray-900 ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
            <tr>
              {selectable && (
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={data.length > 0 && data.every(row => selectedRows.includes(keyExtractor(row)))}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-brand-gray-600 bg-brand-gray-800 text-brand-cyan-500 focus:ring-brand-cyan-500 focus:ring-offset-brand-gray-900"
                  />
                </th>
              )}
              {columns.map(column => (
                <th
                  key={column.key}
                  className={`
                    px-4 py-3 text-xs font-semibold text-brand-gray-400 uppercase tracking-wider
                    ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'}
                    ${column.sortable !== false && sortable ? 'cursor-pointer hover:text-brand-gray-200 select-none' : ''}
                    ${column.hideOnMobile ? 'hidden lg:table-cell' : ''}
                  `}
                  style={{ width: column.width }}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                >
                  <div className="flex items-center gap-1">
                    <span>{column.header}</span>
                    {sortable && column.sortable !== false && sort?.key === column.key && (
                      <svg className={`w-4 h-4 transition-transform ${sort.direction === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-gray-700">
            {sortedData.map((row, idx) => {
              const key = keyExtractor(row);
              const isSelected = selectedRows.includes(key);

              return (
                <tr
                  key={key}
                  onClick={() => onRowClick?.(row)}
                  className={`
                    transition-colors
                    ${onRowClick ? 'cursor-pointer hover:bg-brand-gray-700/50' : ''}
                    ${isSelected ? 'bg-brand-cyan-500/10' : ''}
                  `}
                >
                  {selectable && (
                    <td className="w-12 px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(key)}
                        className="w-4 h-4 rounded border-brand-gray-600 bg-brand-gray-800 text-brand-cyan-500 focus:ring-brand-cyan-500 focus:ring-offset-brand-gray-900"
                      />
                    </td>
                  )}
                  {columns.map(column => (
                    <td
                      key={column.key}
                      className={`
                        px-4 ${compact ? 'py-2' : 'py-3'} text-sm text-white
                        ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'}
                        ${column.hideOnMobile ? 'hidden lg:table-cell' : ''}
                      `}
                    >
                      {getCellValue(row, column)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="md:hidden divide-y divide-brand-gray-700">
        {sortedData.map((row, idx) => {
          const key = keyExtractor(row);
          const isSelected = selectedRows.includes(key);

          if (mobileCardRenderer) {
            return (
              <div
                key={key}
                onClick={() => onRowClick?.(row)}
                className={`
                  ${onRowClick ? 'cursor-pointer active:bg-brand-gray-700/50' : ''}
                  ${isSelected ? 'bg-brand-cyan-500/10' : ''}
                `}
              >
                {mobileCardRenderer(row, idx)}
              </div>
            );
          }

          return (
            <div
              key={key}
              onClick={() => onRowClick?.(row)}
              className={`
                p-4
                ${onRowClick ? 'cursor-pointer active:bg-brand-gray-700/50' : ''}
                ${isSelected ? 'bg-brand-cyan-500/10' : ''}
              `}
            >
              <div className="flex items-start gap-3">
                {selectable && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSelectRow(key)}
                    onClick={e => e.stopPropagation()}
                    className="mt-1 w-4 h-4 rounded border-brand-gray-600 bg-brand-gray-800 text-brand-cyan-500 focus:ring-brand-cyan-500"
                  />
                )}
                <div className="flex-1 min-w-0">
                  {visibleColumns.slice(0, 1).map(column => (
                    <div key={column.key} className="text-sm font-medium text-white truncate">
                      {column.renderMobile ? column.renderMobile(row) : getCellValue(row, column)}
                    </div>
                  ))}
                  {visibleColumns.slice(1, 2).map(column => (
                    <div key={column.key} className="text-xs text-brand-gray-400 truncate mt-0.5">
                      {column.renderMobile ? column.renderMobile(row) : getCellValue(row, column)}
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    {visibleColumns.slice(2).map(column => (
                      <div key={column.key} className="text-xs text-brand-gray-400">
                        <span className="text-brand-gray-500">{column.header}: </span>
                        {column.renderMobile ? column.renderMobile(row) : getCellValue(row, column)}
                      </div>
                    ))}
                  </div>
                </div>
                {onRowClick && (
                  <svg className="w-5 h-5 text-brand-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default DataTable;
