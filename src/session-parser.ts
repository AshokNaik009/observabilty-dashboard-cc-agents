import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import readline from 'readline';
import nativeFs from 'fs';

import {
  Session,
  SessionMetadata,
  SessionEvent,
  AgentInfo,
  Communication,
  TaskInfo,
  SessionStats,
  ParsedSession
} from './types';

export class SessionParser {
  private homeDir: string;
  private claudeDir: string;
  private projectsDir: string;
  private sessionCache: Map<string, ParsedSession>;

  constructor() {
    this.homeDir = os.homedir();
    this.claudeDir = path.join(this.homeDir, '.claude');
    this.projectsDir = path.join(this.claudeDir, 'projects');
    this.sessionCache = new Map();
  }

  async discoverTeamSessions(): Promise<Session[]> {
    const sessions: Session[] = [];

    if (!(await fs.pathExists(this.projectsDir))) {
      return sessions;
    }

    try {
      const projectDirs = await fs.readdir(this.projectsDir);

      for (const projectDir of projectDirs) {
        const projectPath = path.join(this.projectsDir, projectDir);
        const stat = await fs.stat(projectPath);
        if (!stat.isDirectory()) continue;

        const entries = await fs.readdir(projectPath);

        for (const entry of entries) {
          const entryPath = path.join(projectPath, entry);
          const entryStat = await fs.stat(entryPath);
          if (!entryStat.isDirectory()) continue;

          const subagentsDir = path.join(entryPath, 'subagents');
          if (!(await fs.pathExists(subagentsDir))) continue;

          const agentFiles = (await fs.readdir(subagentsDir))
            .filter(f => f.startsWith('agent-') && f.endsWith('.jsonl')
              && !f.includes('acompact-'));

          if (agentFiles.length === 0) continue;

          const leadFile = entryPath + '.jsonl';
          const isTeam = await this.detectTeamProtocol(leadFile);
          if (!isTeam) continue;

          const metadata = await this.readSessionMetadata(entryPath, subagentsDir, agentFiles);

          sessions.push({
            id: entry,
            projectDir,
            projectName: this.decodeProjectDir(projectDir),
            path: entryPath,
            subagentsDir,
            agentFiles,
            agentCount: agentFiles.length,
            ...metadata
          });
        }
      }
    } catch {
      // Silently skip errors during discovery
    }

    sessions.sort((a, b) =>
      new Date(b.startTime || 0).getTime() - new Date(a.startTime || 0).getTime()
    );
    return sessions;
  }

  private decodeProjectDir(encoded: string): string {
    return encoded.replace(/^-/, '/').replace(/-/g, '/');
  }

  private async detectTeamProtocol(leadFilePath: string): Promise<boolean> {
    if (!(await fs.pathExists(leadFilePath))) return false;
    try {
      const content = await fs.readFile(leadFilePath, 'utf8');
      return content.includes('"TeamCreate"') || content.includes('"SendMessage"');
    } catch {
      return false;
    }
  }

  private async readSessionMetadata(
    sessionPath: string,
    subagentsDir: string,
    agentFiles: string[]
  ): Promise<SessionMetadata> {
    let startTime: string | null = null;
    let endTime: string | null = null;
    let leadAgentId: string | null = null;
    let gitBranch: string | null = null;
    const teammateNames = new Map<string, string>();

    const leadFile = sessionPath + '.jsonl';
    if (await fs.pathExists(leadFile)) {
      try {
        const firstLines = await this.readFirstNLines(leadFile, 5);
        for (const line of firstLines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.timestamp && (parsed.type === 'user' || parsed.type === 'assistant')) {
              if (!startTime) startTime = parsed.timestamp;
              if (!gitBranch) gitBranch = parsed.gitBranch;
              break;
            }
          } catch { /* skip malformed */ }
        }
        const lastLine = await this.readLastLine(leadFile);
        if (lastLine) {
          const parsed = JSON.parse(lastLine);
          if (parsed.timestamp && (!endTime || new Date(parsed.timestamp) > new Date(endTime))) {
            endTime = parsed.timestamp;
          }
        }
      } catch { /* skip */ }
    }

    for (const agentFile of agentFiles) {
      const filePath = path.join(subagentsDir, agentFile);
      try {
        const firstLine = await this.readFirstLine(filePath);
        if (firstLine) {
          const parsed = JSON.parse(firstLine);
          const agentId = parsed.agentId || agentFile.replace('agent-', '').replace('.jsonl', '');

          if (!leadAgentId) leadAgentId = agentId;

          const content = parsed.message?.content || '';
          const nameMatch = content.match(/teammate_id="([^"]+)"/);
          if (nameMatch) {
            teammateNames.set(agentId, nameMatch[1]);
          }

          if (!startTime || new Date(parsed.timestamp) < new Date(startTime)) {
            startTime = parsed.timestamp;
          }
        }

        const lastLine = await this.readLastLine(filePath);
        if (lastLine) {
          const parsed = JSON.parse(lastLine);
          if (!endTime || new Date(parsed.timestamp) > new Date(endTime)) {
            endTime = parsed.timestamp;
          }
        }
      } catch { /* skip */ }
    }

    return {
      startTime,
      endTime,
      gitBranch,
      leadAgentId,
      teammateNames: Object.fromEntries(teammateNames),
      duration: startTime && endTime
        ? new Date(endTime).getTime() - new Date(startTime).getTime()
        : null
    };
  }

  async parseFullSession(session: Session): Promise<ParsedSession> {
    if (this.sessionCache.has(session.id)) {
      return this.sessionCache.get(session.id)!;
    }

    const events: SessionEvent[] = [];
    const agents = new Map<string, AgentInfo>();

    const leadFile = session.path + '.jsonl';
    if (await fs.pathExists(leadFile)) {
      const leadEvents = await this.parseJSONLFile(leadFile, 'lead');
      events.push(...leadEvents);

      const leadStart = leadEvents.length > 0 ? leadEvents[0].timestamp : null;
      const leadEnd = leadEvents.length > 0 ? leadEvents[leadEvents.length - 1].timestamp : null;
      agents.set('lead', {
        id: 'lead',
        name: 'Lead',
        eventCount: leadEvents.length,
        startTime: leadStart,
        endTime: leadEnd,
        toolsUsed: this.countToolsUsed(leadEvents),
        messageCount: leadEvents.filter(e => e.type === 'assistant' && e.hasText).length,
        isLead: true
      });
    }

    const agentEventMap = new Map<string, SessionEvent[]>();
    for (const agentFile of session.agentFiles) {
      const filePath = path.join(session.subagentsDir, agentFile);
      const agentId = agentFile.replace('agent-', '').replace('.jsonl', '');
      const agentEvents = await this.parseJSONLFile(filePath, agentId);
      events.push(...agentEvents);
      agentEventMap.set(agentId, agentEvents);
    }

    const nameMap = this.resolveAgentNames(events, agentEventMap);

    for (const [agentId, agentEvents] of agentEventMap) {
      const agentStart = agentEvents.length > 0 ? agentEvents[0].timestamp : null;
      const agentEnd = agentEvents.length > 0 ? agentEvents[agentEvents.length - 1].timestamp : null;
      const resolvedName = nameMap.get(agentId);

      agents.set(agentId, {
        id: agentId,
        name: resolvedName || agentId.substring(0, 7),
        eventCount: agentEvents.length,
        startTime: agentStart,
        endTime: agentEnd,
        toolsUsed: this.countToolsUsed(agentEvents),
        messageCount: agentEvents.filter(e => e.type === 'assistant' && e.hasText).length
      });
    }

    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const result: ParsedSession = {
      id: session.id,
      projectName: session.projectName,
      gitBranch: session.gitBranch,
      startTime: session.startTime,
      endTime: session.endTime,
      duration: session.duration,
      agents: Object.fromEntries(agents),
      events,
      communications: this.extractCommunications(events),
      tasks: this.extractTasks(events),
      stats: this.calculateSessionStats(events, agents)
    };

    this.sessionCache.set(session.id, result);
    return result;
  }

  private resolveAgentNames(
    allEvents: SessionEvent[],
    agentEventMap: Map<string, SessionEvent[]>
  ): Map<string, string> {
    const nameMap = new Map<string, string>();

    const spawns: { name: string; timestamp: number }[] = [];
    for (const event of allEvents) {
      for (const tool of event.toolUse || []) {
        if (tool.name === 'Task' && tool.input?.name) {
          spawns.push({ name: tool.input.name, timestamp: new Date(event.timestamp).getTime() });
        }
      }
    }
    spawns.sort((a, b) => a.timestamp - b.timestamp);

    const agentStarts: { id: string; timestamp: number }[] = [];
    for (const [agentId, events] of agentEventMap) {
      if (events.length > 0) {
        agentStarts.push({ id: agentId, timestamp: new Date(events[0].timestamp).getTime() });
      }
    }
    agentStarts.sort((a, b) => a.timestamp - b.timestamp);

    const usedAgents = new Set<string>();
    for (const spawn of spawns) {
      let bestId: string | null = null;
      let bestDiff = Infinity;
      for (const agent of agentStarts) {
        if (usedAgents.has(agent.id)) continue;
        const diff = agent.timestamp - spawn.timestamp;
        if (diff >= -2000 && diff < bestDiff && diff < 120000) {
          bestDiff = diff;
          bestId = agent.id;
        }
      }
      if (bestId) {
        nameMap.set(bestId, spawn.name);
        usedAgents.add(bestId);
      }
    }

    return nameMap;
  }

  private async parseJSONLFile(filePath: string, agentId: string): Promise<SessionEvent[]> {
    const events: SessionEvent[] = [];
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.type === 'file-history-snapshot') continue;

          const msg = parsed.message || {};
          const contentBlocks = Array.isArray(msg.content) ? msg.content : [];
          const textContent = typeof msg.content === 'string'
            ? msg.content
            : contentBlocks.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n');

          const toolUseBlocks = contentBlocks.filter((b: any) => b.type === 'tool_use');

          events.push({
            agentId: parsed.agentId || agentId,
            type: parsed.type,
            role: msg.role,
            timestamp: parsed.timestamp,
            textContent: textContent.substring(0, 2000),
            hasText: textContent.length > 0,
            toolUse: toolUseBlocks.map((t: any) => ({
              name: t.name,
              id: t.id,
              input: t.input
            })),
            model: msg.model
          });
        } catch { /* skip malformed lines */ }
      }
    } catch { /* skip unreadable files */ }

    return events;
  }

  private extractCommunications(events: SessionEvent[]): Communication[] {
    const communications: Communication[] = [];

    for (const event of events) {
      if (event.type === 'user' && event.textContent && event.textContent.trim().startsWith('<teammate-message')) {
        const match = event.textContent.match(
          /<teammate-message\s+teammate_id="([^"]+)"(?:\s+color="([^"]*)")?>\n?([\s\S]*?)\n?<\/teammate-message>/
        );
        if (match) {
          communications.push({
            timestamp: event.timestamp,
            from: match[1],
            to: event.agentId,
            content: match[3] || '',
            direction: 'incoming'
          });
        }
      }

      for (const tool of event.toolUse || []) {
        if (tool.name === 'SendMessage' && tool.input) {
          communications.push({
            timestamp: event.timestamp,
            from: event.agentId,
            to: tool.input.recipient || 'unknown',
            content: tool.input.message || tool.input.content || JSON.stringify(tool.input),
            direction: 'outgoing'
          });
        }
      }
    }

    communications.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return communications;
  }

  private extractTasks(events: SessionEvent[]): TaskInfo[] {
    const tasks: TaskInfo[] = [];

    for (const event of events) {
      for (const tool of event.toolUse || []) {
        if (tool.name === 'TaskCreate' && tool.input) {
          tasks.push({
            subject: tool.input.subject,
            createdBy: event.agentId,
            createdAt: event.timestamp,
            status: 'pending'
          });
        }
        if (tool.name === 'TaskUpdate' && tool.input?.status) {
          const existing = tasks.find((_t, idx) =>
            idx.toString() === tool.input.taskId
          );
          if (existing) {
            existing.status = tool.input.status;
          }
        }
      }
    }

    return tasks;
  }

  private countToolsUsed(events: SessionEvent[]): Record<string, number> {
    const toolCounts: Record<string, number> = {};
    for (const event of events) {
      for (const tool of event.toolUse || []) {
        toolCounts[tool.name] = (toolCounts[tool.name] || 0) + 1;
      }
    }
    return toolCounts;
  }

  private calculateSessionStats(events: SessionEvent[], agents: Map<string, AgentInfo>): SessionStats {
    const totalEvents = events.length;
    const userEvents = events.filter(e => e.type === 'user').length;
    const assistantEvents = events.filter(e => e.type === 'assistant').length;
    const toolUsages = events.reduce((sum, e) => sum + (e.toolUse?.length || 0), 0);

    const toolBreakdown: Record<string, number> = {};
    for (const event of events) {
      for (const tool of event.toolUse || []) {
        toolBreakdown[tool.name] = (toolBreakdown[tool.name] || 0) + 1;
      }
    }

    return {
      totalEvents,
      userEvents,
      assistantEvents,
      toolUsages,
      agentCount: agents.size,
      toolBreakdown
    };
  }

  // --- File reading utilities ---

  private async readFirstLine(filePath: string): Promise<string | null> {
    const lines = await this.readFirstNLines(filePath, 1);
    return lines.length > 0 ? lines[0] : null;
  }

  private async readFirstNLines(filePath: string, n: number): Promise<string[]> {
    return new Promise((resolve) => {
      const lines: string[] = [];
      const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
      const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
      rl.on('line', (line: string) => {
        lines.push(line.trim());
        if (lines.length >= n) {
          rl.close();
          stream.destroy();
          resolve(lines);
        }
      });
      rl.on('close', () => resolve(lines));
      rl.on('error', () => resolve(lines));
    });
  }

  private async readLastLine(filePath: string): Promise<string | null> {
    try {
      const stats = await fs.stat(filePath);
      const bufferSize = Math.min(8192, stats.size);
      if (bufferSize === 0) return null;

      const fd = nativeFs.openSync(filePath, 'r');
      const buffer = Buffer.alloc(bufferSize);
      nativeFs.readSync(fd, buffer, 0, bufferSize, stats.size - bufferSize);
      nativeFs.closeSync(fd);

      const content = buffer.toString('utf8');
      const lines = content.split('\n').filter(l => l.trim());
      return lines.length > 0 ? lines[lines.length - 1].trim() : null;
    } catch {
      return null;
    }
  }
}
