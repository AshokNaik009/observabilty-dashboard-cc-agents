import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { useSessionStore } from './hooks/useSessionStore';
import { useSession } from './hooks/useSession';
import { StatsBar } from './components/stats/StatsBar';
import { AgentFlowGraph } from './components/flow/AgentFlowGraph';
import { CommunicationTimeline } from './components/timeline/CommunicationTimeline';
import { MessageDetailPanel } from './components/panel/MessageDetailPanel';
import { PerformancePanel } from './components/performance/PerformancePanel';
import { AgentFilterChips } from './components/search/SearchBar';
import { GettingStarted } from './components/guide/GettingStarted';

export default function App() {
  const selectedId = useSessionStore((s) => s.selectedSessionId);
  const { data: session, isLoading } = useSession(selectedId);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-surface text-gray-200">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto scrollbar-thin p-6">
          {!selectedId ? (
            <GettingStarted />
          ) : isLoading ? (
            <div className="flex items-center justify-center h-full text-muted text-sm">
              Loading session...
            </div>
          ) : session ? (
            <div className="space-y-6">
              <StatsBar session={session} />
              <AgentFilterChips session={session} />
              <div className="bg-panel border border-border rounded-lg p-4">
                <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-3">
                  Agent Flow
                </h3>
                <AgentFlowGraph session={session} />
              </div>
              <PerformancePanel session={session} />
              <CommunicationTimeline session={session} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted text-sm">
              Session not found
            </div>
          )}
        </main>
      </div>
      <MessageDetailPanel session={session ?? null} />
    </div>
  );
}
