import { create } from 'zustand';

interface TimelineFilter {
  agentId?: string;
  agentPair?: [string, string];
}

interface SessionStore {
  selectedSessionId: string | null;
  selectSession: (id: string) => void;

  timelineFilter: TimelineFilter | null;
  setTimelineFilter: (filter: TimelineFilter | null) => void;

  searchQuery: string;
  setSearchQuery: (q: string) => void;

  activeAgentFilters: Set<string>;
  toggleAgentFilter: (agentId: string) => void;
  clearAgentFilters: () => void;
  setAgentFilters: (ids: Set<string>) => void;

  panelOpen: boolean;
  panelMessageIndex: number | null;
  openPanel: (index: number) => void;
  closePanel: () => void;

  performancePanelOpen: boolean;
  togglePerformancePanel: () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  selectedSessionId: null,
  selectSession: (id) =>
    set({
      selectedSessionId: id,
      timelineFilter: null,
      searchQuery: '',
      activeAgentFilters: new Set(),
      panelOpen: false,
      panelMessageIndex: null,
    }),

  timelineFilter: null,
  setTimelineFilter: (filter) => set({ timelineFilter: filter }),

  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),

  activeAgentFilters: new Set(),
  toggleAgentFilter: (agentId) =>
    set((state) => {
      const next = new Set(state.activeAgentFilters);
      if (next.has(agentId)) next.delete(agentId);
      else next.add(agentId);
      return { activeAgentFilters: next };
    }),
  clearAgentFilters: () => set({ activeAgentFilters: new Set() }),
  setAgentFilters: (ids) => set({ activeAgentFilters: ids }),

  panelOpen: false,
  panelMessageIndex: null,
  openPanel: (index) => set({ panelOpen: true, panelMessageIndex: index }),
  closePanel: () => set({ panelOpen: false, panelMessageIndex: null }),

  performancePanelOpen: false,
  togglePerformancePanel: () =>
    set((state) => ({ performancePanelOpen: !state.performancePanelOpen })),
}));
