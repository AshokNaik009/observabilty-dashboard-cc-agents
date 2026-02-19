import { useEffect, useMemo } from 'react';
import type { ParsedSession, Communication } from '../../types';
import { useSessionStore } from '../../hooks/useSessionStore';

interface Props {
  session: ParsedSession | null;
}

export function MessageDetailPanel({ session }: Props) {
  const panelOpen = useSessionStore((s) => s.panelOpen);
  const panelMessageIndex = useSessionStore((s) => s.panelMessageIndex);
  const closePanel = useSessionStore((s) => s.closePanel);
  const timelineFilter = useSessionStore((s) => s.timelineFilter);
  const searchQuery = useSessionStore((s) => s.searchQuery);
  const activeAgentFilters = useSessionStore((s) => s.activeAgentFilters);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [closePanel]);

  const resolveAgentName = (id: string): string => {
    if (!session) return id;
    const agent = session.agents[id];
    return agent ? agent.name || id.slice(0, 12) : id.slice(0, 12);
  };

  const filteredComms = useMemo(() => {
    if (!session) return [];
    let comms: Communication[] = session.communications;

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

    if (activeAgentFilters.size > 0) {
      comms = comms.filter(
        (c) => activeAgentFilters.has(c.from) || activeAgentFilters.has(c.to),
      );
    }

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

  const comm = panelMessageIndex !== null ? filteredComms[panelMessageIndex] : null;

  const fromName = comm ? resolveAgentName(comm.from) : '';
  const toName = comm ? resolveAgentName(comm.to) : '';

  return (
    <>
      {panelOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={closePanel}
        />
      )}
      <div
        className={`fixed top-0 right-0 h-full w-[40vw] max-w-2xl bg-panel border-l border-border z-50 flex flex-col transition-transform duration-250 ${
          panelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <span className="text-sm font-medium text-white">
            {fromName} &rarr; {toName}
          </span>
          <button
            onClick={closePanel}
            className="text-muted hover:text-white text-lg"
          >
            &times;
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-5">
          <pre className="text-sm text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
            {comm?.content || '(no content captured)'}
          </pre>
        </div>
      </div>
    </>
  );
}
