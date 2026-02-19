import type { ParsedSession } from '../../types';
import { StatCard } from './StatCard';
import { formatDuration } from '../../lib/format';

interface Props {
  session: ParsedSession;
}

export function StatsBar({ session }: Props) {
  const agentCount = Object.keys(session.agents).length;
  const commCount = session.communications.length;
  const dur = session.duration ? formatDuration(session.duration) : 'N/A';

  return (
    <div className="flex gap-4">
      <StatCard label="Agents" value={agentCount} />
      <StatCard label="Messages" value={commCount} />
      <StatCard label="Duration" value={dur} />
      <StatCard label="Events" value={session.stats.totalEvents} />
    </div>
  );
}
