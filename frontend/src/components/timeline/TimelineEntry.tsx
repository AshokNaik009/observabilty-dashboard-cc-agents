import type { Communication } from '../../types';
import { COLOR_MAP, type AgentColor } from '../../lib/colors';
import { formatTime, truncate } from '../../lib/format';

interface Props {
  comm: Communication;
  index: number;
  agentColorMap: Record<string, AgentColor>;
  resolveAgentName: (id: string) => string;
  onOpen: (index: number) => void;
  highlightQuery?: string;
}

function highlightText(text: string, query: string): string {
  if (!query) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const queryEscaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${queryEscaped})`, 'gi');
  return escaped.replace(re, '<mark class="bg-amber-500/30 text-amber-200 rounded px-0.5">$1</mark>');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function TimelineEntry({
  comm,
  index,
  agentColorMap,
  resolveAgentName,
  onOpen,
  highlightQuery,
}: Props) {
  const time = formatTime(comm.timestamp);
  const fromColor = agentColorMap[comm.from] || 'indigo';
  const toColor = agentColorMap[comm.to] || 'emerald';
  const fc = COLOR_MAP[fromColor];
  const tc = COLOR_MAP[toColor];
  const fromName = resolveAgentName(comm.from);
  const toName = resolveAgentName(comm.to);
  const preview = comm.content ? comm.content.slice(0, 160) : '';
  const hasMore = comm.content && comm.content.length > 160;

  return (
    <div
      className="flex gap-3 px-3 py-2.5 rounded-md hover:bg-white/5 cursor-pointer transition-colors animate-in"
      onClick={() => onOpen(index)}
      style={{ animationDelay: `${Math.min(index * 20, 300)}ms` }}
    >
      <span className="text-xs text-muted whitespace-nowrap mt-0.5 w-20 shrink-0">
        {time}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-sm">
          <span
            className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-medium ${fc.bg} ${fc.text}`}
          >
            {truncate(fromName, 14)}
          </span>
          <span className="text-muted text-xs">&rarr;</span>
          <span
            className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-medium ${tc.bg} ${tc.text}`}
          >
            {truncate(toName, 14)}
          </span>
        </div>
        {preview && (
          <div
            className="text-xs text-gray-400 mt-1 truncate"
            dangerouslySetInnerHTML={{
              __html: highlightText(preview, highlightQuery ?? '') + (hasMore ? '...' : ''),
            }}
          />
        )}
      </div>
    </div>
  );
}
