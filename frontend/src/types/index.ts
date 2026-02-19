export interface AgentInfo {
  id: string;
  name: string;
  eventCount: number;
  startTime: string | null;
  endTime: string | null;
  toolsUsed: Record<string, number>;
  messageCount: number;
  isLead?: boolean;
}

export interface Communication {
  timestamp: string;
  from: string;
  to: string;
  content: string;
  direction: 'incoming' | 'outgoing';
}

export interface TaskInfo {
  subject: string;
  createdBy: string;
  createdAt: string;
  status: string;
  id?: string;
}

export interface SessionStats {
  totalEvents: number;
  userEvents: number;
  assistantEvents: number;
  toolUsages: number;
  agentCount: number;
  toolBreakdown: Record<string, number>;
}

export interface ParsedSession {
  id: string;
  projectName: string;
  gitBranch: string | null;
  startTime: string | null;
  endTime: string | null;
  duration: number | null;
  agents: Record<string, AgentInfo>;
  events: SessionEvent[];
  communications: Communication[];
  tasks: TaskInfo[];
  stats: SessionStats;
}

export interface SessionEvent {
  agentId: string;
  type: string;
  role: string;
  timestamp: string;
  textContent: string;
  hasText: boolean;
  toolUse: { name: string; id: string; input: Record<string, any> }[];
  model: string;
}

export interface SessionSummary {
  id: string;
  projectName: string;
  startTime: string | null;
  endTime: string | null;
  duration: number | null;
  agentCount: number;
  gitBranch: string | null;
}
