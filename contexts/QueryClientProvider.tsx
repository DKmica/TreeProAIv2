import React, { ReactNode } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { get, set, del } from 'idb-keyval';

const IDB_CACHE_KEY = 'treepro-react-query-cache';

const asyncStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const value = await get(key);
      return value ?? null;
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await set(key, value);
    } catch (error) {
      console.warn('Failed to persist query cache to IndexedDB:', error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await del(key);
    } catch (error) {
      console.warn('Failed to remove query cache from IndexedDB:', error);
    }
  },
};

const asyncPersister = createAsyncStoragePersister({
  storage: asyncStorage,
  key: IDB_CACHE_KEY,
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

interface QueryProviderProps {
  children: ReactNode;
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: asyncPersister,
        maxAge: 24 * 60 * 60 * 1000,
        buster: 'v1',
      }}
    >
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </PersistQueryClientProvider>
  );
};
