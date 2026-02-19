import type { SessionSummary } from '../../types';
import { SessionItem } from './SessionItem';
import { useSessionStore } from '../../hooks/useSessionStore';

interface Props {
  sessions: SessionSummary[];
}

export function SessionList({ sessions }: Props) {
  const searchQuery = useSessionStore((s) => s.searchQuery);

  const filtered = searchQuery
    ? sessions.filter((s) => {
        const q = searchQuery.toLowerCase();
        return (
          s.projectName.toLowerCase().includes(q) ||
          (s.gitBranch && s.gitBranch.toLowerCase().includes(q))
        );
      })
    : sessions;

  if (!filtered.length) {
    return (
      <div className="text-sm text-muted py-8 text-center">
        {searchQuery ? 'No matching sessions' : 'No team sessions found'}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {filtered.map((s) => (
        <SessionItem key={s.id} session={s} />
      ))}
    </div>
  );
}
