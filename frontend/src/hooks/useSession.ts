import { useQuery } from '@tanstack/react-query';
import { fetchSession } from '../api/sessions';

export function useSession(id: string | null) {
  return useQuery({
    queryKey: ['session', id],
    queryFn: () => fetchSession(id!),
    enabled: !!id,
  });
}
