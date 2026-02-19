import type { SessionSummary, ParsedSession } from '../types';

export async function fetchSessions(): Promise<SessionSummary[]> {
  const res = await fetch('/api/sessions');
  if (!res.ok) throw new Error('Failed to fetch sessions');
  return res.json();
}

export async function fetchSession(id: string): Promise<ParsedSession> {
  const res = await fetch('/api/sessions/' + encodeURIComponent(id));
  if (!res.ok) throw new Error('Failed to fetch session');
  return res.json();
}

export async function refreshSessions(): Promise<{ count: number }> {
  const res = await fetch('/api/refresh', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to refresh');
  return res.json();
}
