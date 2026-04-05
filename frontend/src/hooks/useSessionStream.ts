import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ParsedSession, Communication, TaskInfo } from '../types';

export function useSessionStream(sessionId: string | null, isActive: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!sessionId || !isActive) return;

    const es = new EventSource(`/api/sessions/${encodeURIComponent(sessionId)}/stream`);

    es.addEventListener('communication', (e: MessageEvent) => {
      try {
        const { communication } = JSON.parse(e.data) as { communication: Communication };
        queryClient.setQueryData<ParsedSession>(['session', sessionId], (old) => {
          if (!old) return old;
          const exists = old.communications.some(
            c =>
              c.timestamp === communication.timestamp &&
              c.from === communication.from &&
              c.to === communication.to
          );
          if (exists) return old;
          return {
            ...old,
            communications: [...old.communications, communication],
            stats: { ...old.stats, totalEvents: old.stats.totalEvents + 1 },
          };
        });
      } catch {}
    });

    es.addEventListener('task_update', (e: MessageEvent) => {
      try {
        const { task } = JSON.parse(e.data) as { task: TaskInfo };
        queryClient.setQueryData<ParsedSession>(['session', sessionId], (old) => {
          if (!old) return old;
          return { ...old, tasks: [...old.tasks, task] };
        });
      } catch {}
    });

    es.addEventListener('agent_event', (e: MessageEvent) => {
      try {
        const { agentId } = JSON.parse(e.data) as { agentId: string };
        queryClient.setQueryData<ParsedSession>(['session', sessionId], (old) => {
          if (!old || !old.agents[agentId]) return old;
          return {
            ...old,
            agents: {
              ...old.agents,
              [agentId]: {
                ...old.agents[agentId],
                eventCount: old.agents[agentId].eventCount + 1,
              },
            },
            stats: { ...old.stats, totalEvents: old.stats.totalEvents + 1 },
          };
        });
      } catch {}
    });

    es.addEventListener('session_end', () => {
      es.close();
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    });

    es.onerror = () => {
      // Connection error or session ended — close cleanly
      es.close();
    };

    return () => {
      es.close();
    };
  }, [sessionId, isActive, queryClient]);
}
