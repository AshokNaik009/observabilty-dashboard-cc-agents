import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchSessions, refreshSessions } from '../api/sessions';

export function useSessions() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['sessions'],
    queryFn: fetchSessions,
  });

  const refresh = async () => {
    await refreshSessions();
    queryClient.invalidateQueries({ queryKey: ['sessions'] });
  };

  return { ...query, refresh };
}
