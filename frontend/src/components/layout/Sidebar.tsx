import { useSessions } from '../../hooks/useSessions';
import { SessionList } from '../sessions/SessionList';

export function Sidebar() {
  const { data: sessions, isLoading } = useSessions();

  return (
    <aside className="w-72 border-r border-border bg-panel overflow-y-auto scrollbar-thin shrink-0">
      <div className="p-4">
        <h2 className="text-xs font-medium text-muted uppercase tracking-wider mb-3">
          Sessions
        </h2>
        {isLoading ? (
          <div className="text-sm text-muted py-8 text-center">Loading...</div>
        ) : (
          <SessionList sessions={sessions ?? []} />
        )}
      </div>
    </aside>
  );
}
