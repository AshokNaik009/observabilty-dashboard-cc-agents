export const AGENT_COLORS = ['indigo', 'emerald', 'amber', 'rose', 'cyan', 'violet'] as const;

export type AgentColor = (typeof AGENT_COLORS)[number];

export const COLOR_MAP: Record<
  AgentColor,
  { bg: string; text: string; border: string; hex: string; bgHex: string }
> = {
  indigo: {
    bg: 'bg-indigo-500/20',
    text: 'text-indigo-400',
    border: 'border-indigo-500/30',
    hex: '#818cf8',
    bgHex: '#818cf822',
  },
  emerald: {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    hex: '#34d399',
    bgHex: '#34d39922',
  },
  amber: {
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    hex: '#fbbf24',
    bgHex: '#fbbf2422',
  },
  rose: {
    bg: 'bg-rose-500/20',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
    hex: '#fb7185',
    bgHex: '#fb718522',
  },
  cyan: {
    bg: 'bg-cyan-500/20',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
    hex: '#22d3ee',
    bgHex: '#22d3ee22',
  },
  violet: {
    bg: 'bg-violet-500/20',
    text: 'text-violet-400',
    border: 'border-violet-500/30',
    hex: '#a78bfa',
    bgHex: '#a78bfa22',
  },
};

export function getAgentColor(index: number): AgentColor {
  return AGENT_COLORS[index % AGENT_COLORS.length];
}

export function buildAgentColorMap(agentIds: string[]): Record<string, AgentColor> {
  const map: Record<string, AgentColor> = {};
  agentIds.forEach((id, i) => {
    map[id] = getAgentColor(i);
  });
  return map;
}
