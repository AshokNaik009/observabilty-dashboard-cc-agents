import {
  Session,
  ParsedSession,
  ProfileStats,
  ProjectBreakdown,
  Trends,
  AnalyticsResult,
  FilterOptions,
  TeamOptimization,
  AgentUtilization,
  EfficiencyPattern,
  OptimizationInsight
} from './types';

export class AnalyticsEngine {
  calculate(sessions: Session[], parsedSessions: ParsedSession[], options: FilterOptions = {}): AnalyticsResult {
    const filtered = this.applyFilters(sessions, parsedSessions, options);

    return {
      profile: this.calculateProfileStats(filtered.sessions, filtered.parsed),
      projects: this.calculateProjectBreakdown(filtered.sessions, filtered.parsed),
      trends: this.calculateTrends(filtered.sessions),
      insights: this.generateInsights(filtered.sessions, filtered.parsed),
      optimization: this.calculateOptimization(filtered.sessions, filtered.parsed)
    };
  }

  // --- Filtering ---

  private applyFilters(
    sessions: Session[],
    parsedSessions: ParsedSession[],
    options: FilterOptions
  ): { sessions: Session[]; parsed: ParsedSession[] } {
    let filteredSessions = [...sessions];
    let filteredParsed = [...parsedSessions];

    if (options.project) {
      const projectFilter = options.project.toLowerCase();
      filteredSessions = filteredSessions.filter(s =>
        s.projectName.toLowerCase().includes(projectFilter)
      );
      const ids = new Set(filteredSessions.map(s => s.id));
      filteredParsed = filteredParsed.filter(p => ids.has(p.id));
    }

    if (options.last) {
      const cutoff = this.parseTimeRange(options.last);
      if (cutoff) {
        filteredSessions = filteredSessions.filter(s =>
          s.startTime && new Date(s.startTime) >= cutoff
        );
        const ids = new Set(filteredSessions.map(s => s.id));
        filteredParsed = filteredParsed.filter(p => ids.has(p.id));
      }
    }

    return { sessions: filteredSessions, parsed: filteredParsed };
  }

  private parseTimeRange(range: string): Date | null {
    const match = range.match(/^(\d+)(d|w|m)$/);
    if (!match) return null;

    const amount = parseInt(match[1]);
    const unit = match[2];
    const now = new Date();

    switch (unit) {
      case 'd': return new Date(now.getTime() - amount * 24 * 60 * 60 * 1000);
      case 'w': return new Date(now.getTime() - amount * 7 * 24 * 60 * 60 * 1000);
      case 'm': {
        const d = new Date(now);
        d.setMonth(d.getMonth() - amount);
        return d;
      }
      default: return null;
    }
  }

  // --- Profile Stats ---

  private calculateProfileStats(sessions: Session[], parsedSessions: ParsedSession[]): ProfileStats {
    const totalSessions = sessions.length;
    const totalAgents = sessions.reduce((sum, s) => sum + s.agentCount, 0);

    let totalCommunications = 0;
    let totalTasks = 0;
    let totalEvents = 0;
    const toolCounts: Record<string, number> = {};

    for (const parsed of parsedSessions) {
      totalCommunications += parsed.communications?.length || 0;
      totalTasks += parsed.tasks?.length || 0;
      totalEvents += parsed.stats?.totalEvents || 0;

      const breakdown = parsed.stats?.toolBreakdown || {};
      for (const [tool, count] of Object.entries(breakdown)) {
        toolCounts[tool] = (toolCounts[tool] || 0) + (count as number);
      }
    }

    const mostUsedTools: [string, number][] = Object.entries(toolCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const durations = sessions
      .filter(s => s.duration && s.duration > 0)
      .map(s => s.duration!);

    const avgDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    const longestSession = sessions
      .filter(s => s.duration)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))[0] || null;

    const timestamps = sessions
      .filter(s => s.startTime)
      .map(s => new Date(s.startTime!).getTime());
    const firstDate = timestamps.length > 0 ? new Date(Math.min(...timestamps)) : null;
    const lastDate = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null;

    return {
      totalSessions,
      totalAgents,
      totalCommunications,
      totalTasks,
      totalEvents,
      mostUsedTools,
      averageDuration: avgDuration,
      averageAgentsPerSession: totalSessions > 0 ? totalAgents / totalSessions : 0,
      longestSession: longestSession ? {
        id: longestSession.id,
        duration: longestSession.duration!,
        project: longestSession.projectName
      } : null,
      dateRange: { first: firstDate, last: lastDate }
    };
  }

  // --- Project Breakdown ---

  private calculateProjectBreakdown(sessions: Session[], parsedSessions: ParsedSession[]): ProjectBreakdown[] {
    const projects: Record<string, ProjectBreakdown> = {};

    for (const session of sessions) {
      const name = session.projectName;
      if (!projects[name]) {
        projects[name] = {
          name,
          sessions: 0,
          agents: 0,
          communications: 0,
          tasks: 0,
          lastActivity: null,
          totalDuration: 0
        };
      }

      projects[name].sessions++;
      projects[name].agents += session.agentCount;

      if (session.duration) {
        projects[name].totalDuration += session.duration;
      }

      if (session.startTime) {
        const ts = new Date(session.startTime);
        if (!projects[name].lastActivity || ts > projects[name].lastActivity!) {
          projects[name].lastActivity = ts;
        }
      }
    }

    for (const parsed of parsedSessions) {
      const session = sessions.find(s => s.id === parsed.id);
      if (!session) continue;
      const name = session.projectName;
      if (projects[name]) {
        projects[name].communications += parsed.communications?.length || 0;
        projects[name].tasks += parsed.tasks?.length || 0;
      }
    }

    return Object.values(projects).sort((a, b) => b.sessions - a.sessions);
  }

  // --- Trends ---

  private calculateTrends(sessions: Session[]): Trends {
    const daily: Record<string, number> = {};
    const weekly: Record<string, number> = {};
    const monthly: Record<string, number> = {};
    const hourCounts = new Array(24).fill(0) as number[];
    const dayCounts = new Array(7).fill(0) as number[];

    for (const session of sessions) {
      if (!session.startTime) continue;
      const date = new Date(session.startTime);

      const dayKey = date.toISOString().split('T')[0];
      daily[dayKey] = (daily[dayKey] || 0) + 1;

      const weekKey = this.getISOWeek(date);
      weekly[weekKey] = (weekly[weekKey] || 0) + 1;

      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthly[monthKey] = (monthly[monthKey] || 0) + 1;

      hourCounts[date.getHours()]++;
      dayCounts[date.getDay()]++;
    }

    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
    const peakDay = dayCounts.indexOf(Math.max(...dayCounts));
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const last7Days: number[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      last7Days.push(daily[key] || 0);
    }

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last30DaysTotal = sessions.filter(s =>
      s.startTime && new Date(s.startTime) >= thirtyDaysAgo
    ).length;

    return {
      daily, weekly, monthly, last7Days, last30DaysTotal,
      peakActivity: { hour: peakHour, day: dayNames[peakDay] }
    };
  }

  // --- General Insights ---

  private generateInsights(sessions: Session[], parsedSessions: ParsedSession[]): string[] {
    const insights: string[] = [];

    if (sessions.length === 0) {
      return ['No team sessions found. Start a multi-agent session to see analytics.'];
    }

    const projectCounts: Record<string, number> = {};
    for (const s of sessions) {
      projectCounts[s.projectName] = (projectCounts[s.projectName] || 0) + 1;
    }
    const topProject = Object.entries(projectCounts).sort((a, b) => b[1] - a[1])[0];
    if (topProject) {
      const shortName = topProject[0].split('/').pop() || topProject[0];
      insights.push(`Most active project: ${shortName} (${topProject[1]} sessions)`);
    }

    const longest = sessions
      .filter(s => s.duration)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))[0];
    if (longest) {
      const shortName = longest.projectName.split('/').pop() || longest.projectName;
      insights.push(`Longest session: ${this.formatDuration(longest.duration!)} (${shortName})`);
    }

    if (sessions.length >= 2) {
      const first = new Date(sessions[sessions.length - 1].startTime!);
      const last = new Date(sessions[0].startTime!);
      const daySpan = Math.max(1, (last.getTime() - first.getTime()) / (24 * 60 * 60 * 1000));
      const perWeek = (sessions.length / daySpan * 7).toFixed(1);
      insights.push(`Average frequency: ${perWeek} sessions/week`);
    }

    return insights;
  }

  // --- Team Optimization (the core differentiator) ---

  private calculateOptimization(sessions: Session[], parsedSessions: ParsedSession[]): TeamOptimization {
    const currentAvgTeamSize = sessions.length > 0
      ? sessions.reduce((s, x) => s + x.agentCount, 0) / sessions.length
      : 0;

    return {
      optimalTeamSize: this.findOptimalTeamSize(sessions, parsedSessions),
      currentAvgTeamSize,
      performanceScore: this.calculatePerformanceScore(sessions, parsedSessions),
      agentUtilization: this.analyzeAgentUtilization(parsedSessions),
      efficiencyPatterns: this.detectEfficiencyPatterns(parsedSessions),
      recommendations: this.generateRecommendations(sessions, parsedSessions)
    };
  }

  /**
   * Find optimal team size by correlating agent count with task completion rate.
   * Sessions with higher tasks-per-agent ratios indicate better utilization.
   */
  private findOptimalTeamSize(sessions: Session[], parsedSessions: ParsedSession[]): number {
    if (parsedSessions.length === 0) return 3;

    // Group sessions by team size bucket and calculate efficiency per bucket
    const sizeEfficiency: Record<number, { totalTasks: number; totalEvents: number; count: number }> = {};

    for (const parsed of parsedSessions) {
      const agentCount = parsed.stats.agentCount;
      if (agentCount <= 0) continue;

      if (!sizeEfficiency[agentCount]) {
        sizeEfficiency[agentCount] = { totalTasks: 0, totalEvents: 0, count: 0 };
      }
      sizeEfficiency[agentCount].totalTasks += parsed.tasks.length;
      sizeEfficiency[agentCount].totalEvents += parsed.stats.totalEvents;
      sizeEfficiency[agentCount].count++;
    }

    // Find team size with highest average tasks-per-agent
    let bestSize = 3;
    let bestRate = 0;

    for (const [size, data] of Object.entries(sizeEfficiency)) {
      const sizeNum = parseInt(size);
      if (data.count < 1) continue;
      const avgTasksPerAgent = data.totalTasks / (sizeNum * data.count);
      if (avgTasksPerAgent > bestRate) {
        bestRate = avgTasksPerAgent;
        bestSize = sizeNum;
      }
    }

    return bestSize;
  }

  /**
   * Score 0-100 based on utilization, communication efficiency, and task throughput.
   */
  private calculatePerformanceScore(sessions: Session[], parsedSessions: ParsedSession[]): number {
    if (parsedSessions.length === 0) return 0;

    let utilizationScore = 0;
    let communicationScore = 0;
    let throughputScore = 0;

    for (const parsed of parsedSessions) {
      const agentCount = parsed.stats.agentCount;
      if (agentCount <= 0) continue;

      // Utilization: do agents actually produce events?
      const agents = Object.values(parsed.agents);
      const activeAgents = agents.filter(a => a.eventCount > 2).length;
      utilizationScore += (activeAgents / agentCount) * 100;

      // Communication: messages per agent (sweet spot is 3-10)
      const commsPerAgent = parsed.communications.length / agentCount;
      if (commsPerAgent >= 3 && commsPerAgent <= 10) {
        communicationScore += 100;
      } else if (commsPerAgent > 0) {
        communicationScore += 50;
      }

      // Throughput: tool uses per agent
      const toolsPerAgent = parsed.stats.toolUsages / agentCount;
      throughputScore += Math.min(100, toolsPerAgent * 5);
    }

    const n = parsedSessions.length;
    const avgUtilization = utilizationScore / n;
    const avgComms = communicationScore / n;
    const avgThroughput = throughputScore / n;

    return Math.round((avgUtilization * 0.4) + (avgComms * 0.3) + (avgThroughput * 0.3));
  }

  /**
   * Analyze per-agent utilization across all sessions.
   * Aggregates by agent name to find consistently underutilized roles.
   */
  private analyzeAgentUtilization(parsedSessions: ParsedSession[]): AgentUtilization[] {
    const agentAgg: Record<string, { tasks: number; tools: number; messages: number; sessions: number }> = {};

    for (const parsed of parsedSessions) {
      for (const agent of Object.values(parsed.agents)) {
        const name = agent.name;
        if (!agentAgg[name]) {
          agentAgg[name] = { tasks: 0, tools: 0, messages: 0, sessions: 0 };
        }
        const totalTools = Object.values(agent.toolsUsed).reduce((a, b) => a + b, 0);
        agentAgg[name].tools += totalTools;
        agentAgg[name].messages += agent.messageCount;
        agentAgg[name].sessions++;
      }
    }

    // Add tasks by creator
    for (const parsed of parsedSessions) {
      for (const task of parsed.tasks) {
        const creatorAgent = Object.values(parsed.agents).find(a => a.id === task.createdBy);
        if (creatorAgent && agentAgg[creatorAgent.name]) {
          agentAgg[creatorAgent.name].tasks++;
        }
      }
    }

    // Calculate utilization scores
    const allToolCounts = Object.values(agentAgg).map(a => a.tools / Math.max(1, a.sessions));
    const maxToolRate = Math.max(...allToolCounts, 1);

    return Object.entries(agentAgg)
      .map(([name, data]) => {
        const toolRate = data.tools / Math.max(1, data.sessions);
        const score = Math.round((toolRate / maxToolRate) * 100);
        return {
          agentName: name,
          taskCount: data.tasks,
          toolUseCount: data.tools,
          messageCount: data.messages,
          utilizationScore: score,
          status: (score >= 60 ? 'high' : score >= 30 ? 'normal' : 'low') as 'high' | 'normal' | 'low'
        };
      })
      .sort((a, b) => b.utilizationScore - a.utilizationScore);
  }

  /**
   * Detect common tool workflow patterns (e.g., Read -> Edit, Grep -> Read).
   */
  private detectEfficiencyPatterns(parsedSessions: ParsedSession[]): EfficiencyPattern[] {
    const pairCounts: Record<string, number> = {};

    for (const parsed of parsedSessions) {
      const toolSequence: string[] = [];
      for (const event of parsed.events) {
        for (const tool of event.toolUse || []) {
          toolSequence.push(tool.name);
        }
      }

      // Count consecutive tool pairs
      for (let i = 0; i < toolSequence.length - 1; i++) {
        const pair = `${toolSequence[i]} -> ${toolSequence[i + 1]}`;
        pairCounts[pair] = (pairCounts[pair] || 0) + 1;
      }
    }

    const descriptions: Record<string, string> = {
      'Read -> Edit': 'Read-then-edit workflow (review before change)',
      'Grep -> Read': 'Search-then-read workflow (find then inspect)',
      'Read -> Write': 'Read-then-write workflow (understand before create)',
      'Bash -> Read': 'Execute-then-verify workflow',
      'Edit -> Bash': 'Edit-then-run workflow (change then test)',
      'Glob -> Read': 'Find-then-read workflow (locate then inspect)',
    };

    return Object.entries(pairCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pattern, frequency]) => ({
        pattern,
        frequency,
        description: descriptions[pattern] || `${pattern} pattern`
      }));
  }

  /**
   * Generate actionable optimization recommendations.
   */
  private generateRecommendations(sessions: Session[], parsedSessions: ParsedSession[]): OptimizationInsight[] {
    const recs: OptimizationInsight[] = [];
    if (sessions.length === 0) return recs;

    const avgTeamSize = sessions.reduce((s, x) => s + x.agentCount, 0) / sessions.length;
    const optimalSize = this.findOptimalTeamSize(sessions, parsedSessions);

    // Optimal team size
    if (Math.abs(avgTeamSize - optimalSize) > 0.5) {
      if (avgTeamSize > optimalSize) {
        recs.push({
          icon: '>',
          severity: 'warning',
          message: `Consider reducing team size from ~${avgTeamSize.toFixed(1)} to ${optimalSize} agents for better throughput`
        });
      } else {
        recs.push({
          icon: '>',
          severity: 'info',
          message: `Scaling up to ${optimalSize} agents may improve throughput (currently ~${avgTeamSize.toFixed(1)})`
        });
      }
    } else {
      recs.push({
        icon: '*',
        severity: 'success',
        message: `Team size (~${avgTeamSize.toFixed(1)} agents) is near optimal (${optimalSize})`
      });
    }

    // Underutilized agents
    const utilization = this.analyzeAgentUtilization(parsedSessions);
    const underutilized = utilization.filter(a => a.status === 'low' && a.agentName !== 'Lead');
    if (underutilized.length > 0) {
      const names = underutilized.slice(0, 3).map(a => a.agentName).join(', ');
      recs.push({
        icon: '!',
        severity: 'warning',
        message: `Underutilized agents detected: ${names} (consider consolidating)`
      });
    }

    // Communication balance
    let totalComms = 0;
    let totalAgents = 0;
    for (const parsed of parsedSessions) {
      totalComms += parsed.communications.length;
      totalAgents += parsed.stats.agentCount;
    }
    const commsPerAgent = totalAgents > 0 ? totalComms / totalAgents : 0;
    if (commsPerAgent < 1) {
      recs.push({
        icon: '!',
        severity: 'warning',
        message: `Low inter-agent communication (${commsPerAgent.toFixed(1)}/agent). Agents may be working in isolation`
      });
    } else if (commsPerAgent > 15) {
      recs.push({
        icon: '!',
        severity: 'warning',
        message: `High communication overhead (${commsPerAgent.toFixed(1)}/agent). Consider clearer task boundaries`
      });
    } else {
      recs.push({
        icon: '*',
        severity: 'success',
        message: `Communication balance is healthy (${commsPerAgent.toFixed(1)} messages/agent)`
      });
    }

    // Performance trend
    if (sessions.length >= 10) {
      const recentSessions = sessions.slice(0, 5);
      const olderSessions = sessions.slice(5, 10);
      const recentAvgAgents = recentSessions.reduce((s, x) => s + x.agentCount, 0) / recentSessions.length;
      const olderAvgAgents = olderSessions.reduce((s, x) => s + x.agentCount, 0) / olderSessions.length;
      const change = ((recentAvgAgents - olderAvgAgents) / Math.max(1, olderAvgAgents) * 100);

      if (Math.abs(change) > 10) {
        recs.push({
          icon: change > 0 ? '>' : '>',
          severity: 'info',
          message: `Team size trend: ${change > 0 ? '+' : ''}${change.toFixed(0)}% over recent sessions`
        });
      }
    }

    // Efficiency pattern insight
    const patterns = this.detectEfficiencyPatterns(parsedSessions);
    if (patterns.length > 0) {
      const top = patterns[0];
      recs.push({
        icon: '*',
        severity: 'success',
        message: `Top workflow: ${top.pattern} (${top.frequency}x) - ${top.description}`
      });
    }

    // Performance score
    const score = this.calculatePerformanceScore(sessions, parsedSessions);
    recs.push({
      icon: score >= 60 ? '*' : '!',
      severity: score >= 60 ? 'success' : score >= 40 ? 'info' : 'warning',
      message: `Overall performance score: ${score}/100`
    });

    return recs;
  }

  // --- Utility ---

  private getISOWeek(date: Date): string {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
    return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
  }

  private formatDuration(ms: number): string {
    if (!ms || ms <= 0) return '0s';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
}
