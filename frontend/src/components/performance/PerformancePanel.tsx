import type { ParsedSession } from '../../types';
import { useSessionStore } from '../../hooks/useSessionStore';
import { AgentGanttChart } from './AgentGanttChart';
import { ToolBreakdownChart } from './ToolBreakdownChart';

interface Props {
  session: ParsedSession;
}

export function PerformancePanel({ session }: Props) {
  const isOpen = useSessionStore((s) => s.performancePanelOpen);
  const toggle = useSessionStore((s) => s.togglePerformancePanel);

  return (
    <div className="bg-panel border border-border rounded-lg overflow-hidden">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
      >
        <h3 className="text-xs font-medium text-muted uppercase tracking-wider">
          Agent Activity & Performance
        </h3>
        <svg
          className={`w-4 h-4 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 space-y-6">
          {/* Gantt Chart */}
          <div>
            <h4 className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-3">
              Activity Timeline
            </h4>
            <AgentGanttChart session={session} />
          </div>

          {/* Tool Breakdown */}
          <div>
            <h4 className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-3">
              Tool Usage Breakdown
            </h4>
            <ToolBreakdownChart session={session} />
          </div>
        </div>
      )}
    </div>
  );
}
