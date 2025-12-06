import React from 'react';
import { Wifi, WifiOff, RefreshCw, Cloud, CloudOff } from 'lucide-react';
import { useCrewSync } from '../../contexts/CrewSyncContext';

const OfflineIndicator: React.FC = () => {
  const { isOnline, syncing, pendingActions, syncPendingActions } = useCrewSync();

  const pendingCount = pendingActions.length;
  const hasPending = pendingCount > 0;

  if (isOnline && !hasPending && !syncing) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {!isOnline && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/20 border border-red-500/30 rounded-lg">
          <WifiOff className="w-4 h-4 text-red-400" />
          <span className="text-xs font-medium text-red-400">Offline</span>
        </div>
      )}

      {hasPending && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/20 border border-amber-500/30 rounded-lg">
          <CloudOff className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-medium text-amber-400">
            {pendingCount} pending
          </span>
        </div>
      )}

      {syncing && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-brand-cyan-500/20 border border-brand-cyan-500/30 rounded-lg">
          <RefreshCw className="w-4 h-4 text-brand-cyan-400 animate-spin" />
          <span className="text-xs font-medium text-brand-cyan-400">Syncing...</span>
        </div>
      )}

      {isOnline && hasPending && !syncing && (
        <button
          onClick={() => syncPendingActions()}
          className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30 transition-colors"
          title="Sync pending changes"
        >
          <Cloud className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-medium text-emerald-400">Sync</span>
        </button>
      )}
    </div>
  );
};

export default OfflineIndicator;
