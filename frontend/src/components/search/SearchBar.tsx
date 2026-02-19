import { useEffect, useRef, useMemo } from 'react';
import { useSessionStore } from '../../hooks/useSessionStore';
import type { ParsedSession } from '../../types';
import { buildAgentColorMap, COLOR_MAP } from '../../lib/colors';

export function SearchBar() {
  const searchQuery = useSessionStore((s) => s.searchQuery);
  const setSearchQuery = useSessionStore((s) => s.setSearchQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search sessions & messages..."
        className="w-64 px-3 py-1.5 text-sm bg-surface border border-border rounded-md text-gray-300 placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
      />
      <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 bg-surface border border-border rounded px-1.5 py-0.5 pointer-events-none">
        {navigator.platform.includes('Mac') ? '\u2318' : 'Ctrl'}K
      </kbd>
    </div>
  );
}

interface AgentFilterChipsProps {
  session: ParsedSession;
}

export function AgentFilterChips({ session }: AgentFilterChipsProps) {
  const activeAgentFilters = useSessionStore((s) => s.activeAgentFilters);
  const toggleAgentFilter = useSessionStore((s) => s.toggleAgentFilter);
  const clearAgentFilters = useSessionStore((s) => s.clearAgentFilters);

  const agentIds = Object.keys(session.agents);
  const colorMap = useMemo(() => buildAgentColorMap(agentIds), [agentIds.join(',')]);

  if (agentIds.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] text-muted uppercase tracking-wider">
        Filter agents:
      </span>
      {agentIds.map((id) => {
        const agent = session.agents[id];
        const color = colorMap[id];
        const c = COLOR_MAP[color];
        const isActive = activeAgentFilters.has(id);

        return (
          <button
            key={id}
            onClick={() => toggleAgentFilter(id)}
            className={`px-2 py-1 rounded-full text-[11px] font-medium transition-all border ${
              isActive
                ? `${c.bg} ${c.text} ${c.border}`
                : 'bg-transparent text-gray-500 border-border hover:border-gray-400'
            }`}
          >
            {agent.name || id.slice(0, 12)}
          </button>
        );
      })}
      {activeAgentFilters.size > 0 && (
        <button
          onClick={clearAgentFilters}
          className="text-[11px] text-indigo-400 hover:text-indigo-300 ml-1"
        >
          Clear
        </button>
      )}
    </div>
  );
}
