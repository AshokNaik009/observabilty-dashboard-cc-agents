export interface ToolUse {
  name: string;
  id: string;
  input: Record<string, any>;
}

export interface SessionEvent {
  agentId: string;
  type: string;
  role: string;
  timestamp: string;
  textContent: string;
  hasText: boolean;
  toolUse: ToolUse[];
  model: string;
}

export interface SessionMetadata {
  startTime: string | null;
  endTime: string | null;
  gitBranch: string | null;
  leadAgentId: string | null;
  teammateNames: Record<string, string>;
  duration: number | null;
}

export interface Session extends SessionMetadata {
  id: string;
  projectDir: string;
  projectName: string;
  path: string;
  subagentsDir: string;
  agentFiles: string[];
  agentCount: number;
}

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

export interface ProfileStats {
  totalSessions: number;
  totalAgents: number;
  totalCommunications: number;
  totalTasks: number;
  totalEvents: number;
  mostUsedTools: [string, number][];
  averageDuration: number;
  averageAgentsPerSession: number;
  longestSession: { id: string; duration: number; project: string } | null;
  dateRange: { first: Date | null; last: Date | null };
}

export interface ProjectBreakdown {
  name: string;
  sessions: number;
  agents: number;
  communications: number;
  tasks: number;
  lastActivity: Date | null;
  totalDuration: number;
}

export interface Trends {
  daily: Record<string, number>;
  weekly: Record<string, number>;
  monthly: Record<string, number>;
  last7Days: number[];
  last30DaysTotal: number;
  peakActivity: { hour: number; day: string };
}

// --- Team Optimization Types ---

export interface AgentUtilization {
  agentName: string;
  taskCount: number;
  toolUseCount: number;
  messageCount: number;
  utilizationScore: number; // 0-100
  status: 'high' | 'normal' | 'low';
}

export interface EfficiencyPattern {
  pattern: string;
  frequency: number;
  description: string;
}

export interface OptimizationInsight {
  icon: string;       // *, !, >
  severity: 'success' | 'warning' | 'info';
  message: string;
}

export interface TeamOptimization {
  optimalTeamSize: number;
  currentAvgTeamSize: number;
  performanceScore: number;         // 0-100, relative to own history
  agentUtilization: AgentUtilization[];
  efficiencyPatterns: EfficiencyPattern[];
  recommendations: OptimizationInsight[];
}

export interface AnalyticsResult {
  profile: ProfileStats;
  projects: ProjectBreakdown[];
  trends: Trends;
  insights: string[];
  optimization: TeamOptimization;
}

export interface FilterOptions {
  project?: string;
  last?: string;
}
