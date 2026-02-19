import { useSessions } from '../../hooks/useSessions';
import { useState } from 'react';
import { SearchBar } from '../search/SearchBar';

export function Header() {
  const { refresh } = useSessions();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-panel shrink-0">
      <h1 className="text-lg font-semibold tracking-tight text-white">
        Agent Observability
      </h1>
      <div className="flex items-center gap-3">
        <SearchBar />
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-md transition-colors"
        >
          {refreshing ? '...' : 'Refresh'}
        </button>
      </div>
    </header>
  );
}
