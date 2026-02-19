import { useMemo } from 'react';
import type { ParsedSession, Communication } from '../../types';
import { useSessionStore } from '../../hooks/useSessionStore';
import { buildAgentColorMap } from '../../lib/colors';
import { TimelineEntry } from './TimelineEntry';

interface Props {
  session: ParsedSession;
}

export function CommunicationTimeline({ session }: Props) {
  const timelineFilter = useSessionStore((s) => s.timelineFilter);
  const setTimelineFilter = useSessionStore((s) => s.setTimelineFilter);
  const searchQuery = useSessionStore((s) => s.searchQuery);
  const activeAgentFilters = useSessionStore((s) => s.activeAgentFilters);
  const openPanel = useSessionStore((s) => s.openPanel);

  const agentIds = Object.keys(session.agents);
  const agentColorMap = useMemo(() => buildAgentColorMap(agentIds), [agentIds.join(',')]);

  const resolveAgentName = (id: string): string => {
    const agent = session.agents[id];
    return agent ? agent.name || id.slice(0, 12) : id.slice(0, 12);
  };

  const filtered = useMemo(() => {
    let comms: Communication[] = session.communications;

    // Filter by graph click (agent or pair)
    if (timelineFilter) {
      if (timelineFilter.agentPair) {
        const [a, b] = timelineFilter.agentPair;
        comms = comms.filter(
          (c) =>
            (c.from === a && c.to === b) || (c.from === b && c.to === a),
        );
      } else if (timelineFilter.agentId) {
        const aid = timelineFilter.agentId;
        comms = comms.filter((c) => c.from === aid || c.to === aid);
      }
    }

    // Filter by active agent chips
    if (activeAgentFilters.size > 0) {
      comms = comms.filter(
        (c) => activeAgentFilters.has(c.from) || activeAgentFilters.has(c.to),
      );
    }

    // Filter by search query (within timeline)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      comms = comms.filter((c) => {
        const fromName = resolveAgentName(c.from).toLowerCase();
        const toName = resolveAgentName(c.to).toLowerCase();
        return (
          fromName.includes(q) ||
          toName.includes(q) ||
          (c.content && c.content.toLowerCase().includes(q))
        );
      });
    }

    return comms;
  }, [session, timelineFilter, activeAgentFilters, searchQuery]);

  const hasFilter = timelineFilter !== null;

  return (
    <div className="bg-panel border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-muted uppercase tracking-wider">
          Communication Timeline
        </h3>
        {hasFilter && (
          <button
            onClick={() => setTimelineFilter(null)}
            className="text-xs text-indigo-400 hover:text-indigo-300"
          >
            Clear filter
          </button>
        )}
      </div>
      <div className="space-y-2 max-h-[50vh] overflow-y-auto scrollbar-thin">
        {filtered.length === 0 ? (
          <div className="text-sm text-muted py-4 text-center">
            No communications
          </div>
        ) : (
          filtered.map((c, i) => (
            <TimelineEntry
              key={`${c.timestamp}-${c.from}-${c.to}-${i}`}
              comm={c}
              index={i}
              agentColorMap={agentColorMap}
              resolveAgentName={resolveAgentName}
              onOpen={openPanel}
              highlightQuery={searchQuery}
            />
          ))
        )}
      </div>
    </div>
  );
}
