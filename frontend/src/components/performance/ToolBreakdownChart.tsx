import { useMemo } from 'react';
import type { ParsedSession } from '../../types';
import { buildAgentColorMap, COLOR_MAP } from '../../lib/colors';

interface Props {
  session: ParsedSession;
}

// Top N tools to show, rest grouped as "Other"
const MAX_TOOLS = 8;

// Consistent tool colors
const TOOL_COLORS = [
  '#818cf8', '#34d399', '#fbbf24', '#fb7185', '#22d3ee',
  '#a78bfa', '#f472b6', '#38bdf8', '#4ade80', '#facc15',
];

export function ToolBreakdownChart({ session }: Props) {
  const agentIds = Object.keys(session.agents);
  const colorMap = useMemo(() => buildAgentColorMap(agentIds), [agentIds.join(',')]);

  // Get all unique tools and their total counts
  const { toolOrder, agentData, maxTotal } = useMemo(() => {
    const toolTotals: Record<string, number> = {};
    agentIds.forEach((id) => {
      const tools = session.agents[id].toolsUsed;
      for (const [tool, count] of Object.entries(tools)) {
        toolTotals[tool] = (toolTotals[tool] || 0) + count;
      }
    });

    const sorted = Object.entries(toolTotals)
      .sort((a, b) => b[1] - a[1]);

    const topTools = sorted.slice(0, MAX_TOOLS).map(([name]) => name);
    const hasOther = sorted.length > MAX_TOOLS;
    const toolOrder = hasOther ? [...topTools, 'Other'] : topTools;

    const agentData = agentIds.map((id) => {
      const agent = session.agents[id];
      const tools = agent.toolsUsed;
      const segments: { tool: string; count: number }[] = [];

      topTools.forEach((tool) => {
        if (tools[tool]) segments.push({ tool, count: tools[tool] });
      });

      if (hasOther) {
        let otherCount = 0;
        for (const [tool, count] of Object.entries(tools)) {
          if (!topTools.includes(tool)) otherCount += count;
        }
        if (otherCount > 0) segments.push({ tool: 'Other', count: otherCount });
      }

      const total = segments.reduce((s, seg) => s + seg.count, 0);
      return { agentId: id, name: agent.name || id.slice(0, 12), segments, total };
    });

    const maxTotal = Math.max(...agentData.map((a) => a.total), 1);

    return { toolOrder, agentData, maxTotal };
  }, [session, agentIds]);

  if (agentData.length === 0) return null;

  const toolColorMap: Record<string, string> = {};
  toolOrder.forEach((tool, i) => {
    toolColorMap[tool] = TOOL_COLORS[i % TOOL_COLORS.length];
  });

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-2">
        {toolOrder.map((tool) => (
          <div key={tool} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-sm"
              style={{ background: toolColorMap[tool] }}
            />
            <span className="text-[10px] text-gray-400">{tool}</span>
          </div>
        ))}
      </div>

      {/* Bars */}
      {agentData.map((agent) => {
        const c = COLOR_MAP[colorMap[agent.agentId]];
        const widthPct = (agent.total / maxTotal) * 100;

        return (
          <div key={agent.agentId} className="flex items-center gap-3">
            <div className="w-28 shrink-0 text-right">
              <span className={`text-[11px] font-medium ${c.text}`}>
                {agent.name}
              </span>
            </div>
            <div className="flex-1 relative h-5 bg-white/5 rounded overflow-hidden">
              <div className="absolute inset-y-0 left-0 flex" style={{ width: `${widthPct}%` }}>
                {agent.segments.map((seg, i) => {
                  const segPct = agent.total > 0 ? (seg.count / agent.total) * 100 : 0;
                  return (
                    <div
                      key={seg.tool}
                      className="h-full relative group"
                      style={{
                        width: `${segPct}%`,
                        background: toolColorMap[seg.tool],
                        opacity: 0.7,
                      }}
                      title={`${seg.tool}: ${seg.count}`}
                    />
                  );
                })}
              </div>
            </div>
            <span className="text-[10px] text-gray-500 w-10 shrink-0">{agent.total}</span>
          </div>
        );
      })}
    </div>
  );
}
