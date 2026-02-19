import type { SessionSummary } from '../../types';
import { useSessionStore } from '../../hooks/useSessionStore';
import { formatDate } from '../../lib/format';

interface Props {
  session: SessionSummary;
}

export function SessionItem({ session }: Props) {
  const selectedId = useSessionStore((s) => s.selectedSessionId);
  const selectSession = useSessionStore((s) => s.selectSession);
  const isSelected = selectedId === session.id;

  const segments = session.projectName.split('/').filter(Boolean);
  const folderName = segments.slice(-2).join('/');
  const branch = session.gitBranch?.trim();
  const hasMeaningfulBranch = branch && branch !== 'HEAD' && branch !== 'main' && branch !== 'master';

  const displayName = hasMeaningfulBranch
    ? `${branch} \u2022 ${segments.pop() || session.projectName}`
    : folderName;

  return (
    <button
      onClick={() => selectSession(session.id)}
      className={`w-full text-left px-3 py-2.5 rounded-md hover:bg-white/5 transition-colors group ${
        isSelected ? 'bg-white/10' : ''
      }`}
    >
      <div className="text-sm text-gray-300 group-hover:text-white truncate">
        {displayName}
      </div>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs text-muted">{formatDate(session.startTime)}</span>
        <span className="text-xs text-muted">
          {session.agentCount} agent{session.agentCount !== 1 ? 's' : ''}
        </span>
      </div>
    </button>
  );
}
