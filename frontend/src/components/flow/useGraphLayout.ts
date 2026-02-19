import { useMemo } from 'react';
import type { ParsedSession } from '../../types';
import { buildGraphLayout } from '../../lib/graph';

export function useGraphLayout(session: ParsedSession) {
  return useMemo(() => buildGraphLayout(session), [session]);
}
