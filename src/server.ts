import express from 'express';
import path from 'path';
import fs from 'fs-extra';
import chokidar from 'chokidar';
import { SessionParser } from './session-parser';
import { Session, ParsedSession } from './types';
import { computeSessionHealthScore } from './analytics-engine';

const app = express();
const PORT = 3456;

const parser = new SessionParser();
let sessionsCache: Session[] | null = null;
let parsedCache: Map<string, ParsedSession> = new Map();

async function getSessions(): Promise<Session[]> {
  if (!sessionsCache) {
    sessionsCache = await parser.discoverTeamSessions();
  }
  return sessionsCache;
}

async function getParsedSession(sessionId: string): Promise<ParsedSession | null> {
  if (parsedCache.has(sessionId)) {
    return parsedCache.get(sessionId)!;
  }
  const sessions = await getSessions();
  const session = sessions.find(s => s.id === sessionId);
  if (!session) return null;

  const parsed = await parser.parseFullSession(session);
  parsedCache.set(sessionId, parsed);
  return parsed;
}

// API routes
app.get('/api/sessions', async (_req, res) => {
  try {
    const sessions = await getSessions();
    const list = await Promise.all(sessions.map(async s => {
      let healthScore: number | null = null;
      try {
        const parsed = await getParsedSession(s.id);
        if (parsed) healthScore = computeSessionHealthScore(parsed);
      } catch { /* skip */ }
      return {
        id: s.id,
        projectName: s.projectName,
        startTime: s.startTime,
        endTime: s.endTime,
        duration: s.duration,
        agentCount: s.agentCount,
        gitBranch: s.gitBranch,
        healthScore
      };
    }));
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sessions/:id', async (req, res) => {
  try {
    const parsed = await getParsedSession(req.params.id);
    if (!parsed) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/refresh', async (_req, res) => {
  sessionsCache = null;
  parsedCache = new Map();
  try {
    const sessions = await getSessions();
    res.json({ count: sessions.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Real-time SSE streaming endpoint
app.get('/api/sessions/:id/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sessionId = req.params.id;
  const sessions = await getSessions();
  const session = sessions.find(s => s.id === sessionId);

  if (!session) {
    res.write('event: error\ndata: {"error":"session not found"}\n\n');
    res.end();
    return;
  }

  const leadFile = session.path + '.jsonl';
  const subagentFiles = session.agentFiles.map(f =>
    path.join(session.subagentsDir, f)
  );
  const filesToWatch = [leadFile, ...subagentFiles].filter(f => {
    try { return require('fs').existsSync(f); } catch { return false; }
  });

  if (filesToWatch.length === 0) {
    res.write('event: error\ndata: {"error":"no files found"}\n\n');
    res.end();
    return;
  }

  // Track processed line counts per file
  const lineOffsets = new Map<string, number>();
  for (const file of filesToWatch) {
    try {
      const content = await fs.readFile(file, 'utf8');
      lineOffsets.set(file, content.split('\n').filter((l: string) => l.trim()).length);
    } catch {
      lineOffsets.set(file, 0);
    }
  }

  const sendEvent = (type: string, data: object) => {
    try {
      res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch {}
  };

  const heartbeat = setInterval(() => {
    try { res.write(':heartbeat\n\n'); } catch {}
  }, 15000);

  const processFile = async (filePath: string) => {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n').filter((l: string) => l.trim());
      const prevOffset = lineOffsets.get(filePath) ?? 0;
      if (lines.length <= prevOffset) return;

      const newLines = lines.slice(prevOffset);
      lineOffsets.set(filePath, lines.length);

      const isLead = filePath === leadFile;
      const agentId = isLead
        ? 'lead'
        : path.basename(filePath, '.jsonl').replace('agent-', '');

      for (const line of newLines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.type === 'file-history-snapshot') continue;

          const msg = parsed.message || {};
          const contentBlocks = Array.isArray(msg.content) ? msg.content : [];
          const textContent = typeof msg.content === 'string'
            ? msg.content
            : contentBlocks.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n');
          const toolUseBlocks = contentBlocks.filter((b: any) => b.type === 'tool_use');

          if (parsed.type === 'user' && textContent.trim().startsWith('<teammate-message')) {
            const match = textContent.match(
              /<teammate-message\s+teammate_id="([^"]+)"(?:\s+color="([^"]*)")?>\n?([\s\S]*?)\n?<\/teammate-message>/
            );
            if (match) {
              sendEvent('communication', {
                type: 'communication',
                communication: {
                  timestamp: parsed.timestamp,
                  from: match[1],
                  to: parsed.agentId || agentId,
                  content: match[3] || '',
                  direction: 'incoming'
                }
              });
            }
          }

          for (const tool of toolUseBlocks) {
            if (tool.name === 'SendMessage' && tool.input) {
              const rawContent = tool.input.message ?? tool.input.content ?? tool.input;
              sendEvent('communication', {
                type: 'communication',
                communication: {
                  timestamp: parsed.timestamp,
                  from: parsed.agentId || agentId,
                  to: tool.input.recipient || 'unknown',
                  content: typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent),
                  direction: 'outgoing'
                }
              });
            }
            if (tool.name === 'TaskCreate' && tool.input) {
              sendEvent('task_update', {
                type: 'task_update',
                task: {
                  subject: tool.input.subject,
                  createdBy: parsed.agentId || agentId,
                  createdAt: parsed.timestamp,
                  status: 'pending'
                }
              });
            }
          }

          sendEvent('agent_event', {
            type: 'agent_event',
            agentId: parsed.agentId || agentId,
            event: {
              type: parsed.type,
              timestamp: parsed.timestamp,
              toolCount: toolUseBlocks.length
            }
          });
        } catch { /* skip malformed */ }
      }
    } catch { /* skip file errors */ }
  };

  const watcher = chokidar.watch(filesToWatch, {
    persistent: true,
    ignoreInitial: true,
  });

  watcher.on('change', processFile);

  const cleanup = () => {
    clearInterval(heartbeat);
    watcher.close().catch(() => {});
  };

  req.on('close', cleanup);
  req.on('error', cleanup);
});

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));

app.listen(PORT, () => {
  console.log(`Agent Observability UI running at http://localhost:${PORT}`);
});
