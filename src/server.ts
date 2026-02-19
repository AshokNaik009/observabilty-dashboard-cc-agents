import express from 'express';
import path from 'path';
import { SessionParser } from './session-parser';
import { Session, ParsedSession } from './types';

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
    const list = sessions.map(s => ({
      id: s.id,
      projectName: s.projectName,
      startTime: s.startTime,
      endTime: s.endTime,
      duration: s.duration,
      agentCount: s.agentCount,
      gitBranch: s.gitBranch
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

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));

app.listen(PORT, () => {
  console.log(`Agent Observability UI running at http://localhost:${PORT}`);
});
