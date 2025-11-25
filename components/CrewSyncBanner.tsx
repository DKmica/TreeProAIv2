import React from 'react';
import WifiIcon from './icons/WifiIcon';
import ExclamationTriangleIcon from './icons/ExclamationTriangleIcon';
import SpinnerIcon from './icons/SpinnerIcon';
import { useCrewSync } from '../contexts/CrewSyncContext';

const CrewSyncBanner: React.FC = () => {
  const { isOnline, pendingActions, syncing, lastSyncAt, syncPendingActions } = useCrewSync();

  const pendingCount = pendingActions.length;
  const statusColor = isOnline ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800';

  return (
    <div className={`rounded-lg border px-4 py-3 flex items-center justify-between gap-4 ${statusColor}`}>
      <div className="flex items-center gap-3">
        {isOnline ? (
          <WifiIcon className="h-5 w-5 text-emerald-500" />
        ) : (
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
        )}
        <div>
          <p className="font-semibold text-sm">
            {isOnline ? 'Online — syncing crew activity' : 'Offline mode — actions will sync once back online'}
          </p>
          <p className="text-xs text-brand-gray-600">
            {pendingCount > 0
              ? `${pendingCount} action${pendingCount === 1 ? '' : 's'} waiting to sync`
              : isOnline
                ? `Last synced ${lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString() : 'just now'}`
                : 'Continue working — nothing will be lost'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!isOnline && pendingCount > 0 && (
          <span className="text-xs font-semibold rounded-full bg-amber-100 text-amber-700 px-2 py-1">
            Pending: {pendingCount}
          </span>
        )}
        <button
          onClick={syncPendingActions}
          disabled={!isOnline || syncing || pendingCount === 0}
          className="inline-flex items-center gap-2 rounded-md border border-brand-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-gray-800 shadow-sm hover:bg-brand-gray-50 disabled:bg-brand-gray-100 disabled:text-brand-gray-400"
        >
          {syncing ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <WifiIcon className="h-4 w-4" />}
          {syncing ? 'Syncing...' : 'Sync now'}
        </button>
      </div>
    </div>
  );
};

export default CrewSyncBanner;
