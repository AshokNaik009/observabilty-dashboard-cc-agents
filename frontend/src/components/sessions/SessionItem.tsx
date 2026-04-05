import type { SessionSummary } from '../../types';
import { useSessionStore } from '../../hooks/useSessionStore';
import { formatDate } from '../../lib/format';

interface Props {
  session: SessionSummary;
}

function healthColor(score: number): string {
  if (score >= 70) return '#10b981'; // green
  if (score >= 40) return '#f59e0b'; // yellow
  return '#ef4444'; // red
}

export function SessionItem({ session }: Props) {
  const selectedId = useSessionStore((s) => s.selectedSessionId);
  const selectSession = useSessionStore((s) => s.selectSession);
  const isSelected = selectedId === session.id;
  const isLive = session.endTime === null;

  const segments = session.projectName.split('/').filter(Boolean);
  const folderName = segments.slice(-2).join('/');
  const branch = session.gitBranch?.trim();
  const hasMeaningfulBranch = branch && branch !== 'HEAD' && branch !== 'main' && branch !== 'master';

  const displayName = hasMeaningfulBranch
    ? `${branch} \u2022 ${segments.pop() || session.projectName}`
    : folderName;

  const score = session.healthScore;
  const badgeHex = score !== null && score !== undefined ? healthColor(score) : null;

  return (
    <button
      onClick={() => selectSession(session.id)}
      className={`w-full text-left px-3 py-2.5 rounded-md hover:bg-white/5 transition-colors group ${
        isSelected ? 'bg-white/10' : ''
      }`}
    >
      <div className="flex items-center gap-1.5">
        {isLive && (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        )}
        <div className="text-sm text-gray-300 group-hover:text-white truncate">
          {displayName}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-1">
        {isLive && (
          <span className="text-[10px] text-emerald-400 font-medium">Live</span>
        )}
        <span className="text-xs text-muted">{formatDate(session.startTime)}</span>
        <span className="text-xs text-muted">
          {session.agentCount} agent{session.agentCount !== 1 ? 's' : ''}
        </span>
        {badgeHex !== null && score !== null && score !== undefined && (
          <span
            title={`Health score: ${score}/100 — based on agent utilization (40%), communication balance (30%), and task throughput (30%)`}
            className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full cursor-help shrink-0"
            style={{
              background: `${badgeHex}22`,
              color: badgeHex,
              border: `1px solid ${badgeHex}44`,
            }}
          >
            {score}
          </span>
        )}
      </div>
    </button>
  );
}
