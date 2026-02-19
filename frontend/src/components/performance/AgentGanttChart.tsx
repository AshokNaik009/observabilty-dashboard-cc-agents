import { useMemo } from 'react';
import type { ParsedSession } from '../../types';
import { buildAgentColorMap, COLOR_MAP } from '../../lib/colors';
import { formatDuration } from '../../lib/format';

interface Props {
  session: ParsedSession;
}

interface ActivityBar {
  startMs: number;
  endMs: number;
}

interface AgentLane {
  agentId: string;
  name: string;
  bars: ActivityBar[];
  commMarkers: number[]; // timestamps as ms
  totalActiveMs: number;
  messageCount: number;
}

const MERGE_GAP_MS = 30_000; // 30 seconds

export function AgentGanttChart({ session }: Props) {
  const agentIds = Object.keys(session.agents);
  const colorMap = useMemo(() => buildAgentColorMap(agentIds), [agentIds.join(',')]);

  const { lanes, timeRange } = useMemo(() => {
    const sessionStart = session.startTime ? new Date(session.startTime).getTime() : 0;
    const sessionEnd = session.endTime ? new Date(session.endTime).getTime() : 0;
    if (!sessionStart || !sessionEnd) return { lanes: [], timeRange: { start: 0, end: 1 } };

    const lanes: AgentLane[] = agentIds.map((agentId) => {
      const agent = session.agents[agentId];

      // Collect event timestamps for this agent
      const eventTimes = session.events
        .filter((e) => e.agentId === agentId && e.timestamp)
        .map((e) => new Date(e.timestamp).getTime())
        .sort((a, b) => a - b);

      // Group events within MERGE_GAP_MS into bars
      const bars: ActivityBar[] = [];
      if (eventTimes.length > 0) {
        let barStart = eventTimes[0];
        let barEnd = eventTimes[0];
        for (let i = 1; i < eventTimes.length; i++) {
          if (eventTimes[i] - barEnd <= MERGE_GAP_MS) {
            barEnd = eventTimes[i];
          } else {
            bars.push({ startMs: barStart, endMs: barEnd + 1000 }); // +1s min width
            barStart = eventTimes[i];
            barEnd = eventTimes[i];
          }
        }
        bars.push({ startMs: barStart, endMs: barEnd + 1000 });
      }

      // Communication markers
      const commMarkers = session.communications
        .filter((c) => (c.from === agentId || c.to === agentId) && c.timestamp)
        .map((c) => new Date(c.timestamp).getTime());

      const totalActiveMs = bars.reduce((sum, b) => sum + (b.endMs - b.startMs), 0);

      return {
        agentId,
        name: agent.name || agentId.slice(0, 12),
        bars,
        commMarkers,
        totalActiveMs,
        messageCount: agent.messageCount,
      };
    });

    return {
      lanes,
      timeRange: { start: sessionStart, end: sessionEnd },
    };
  }, [session, agentIds]);

  if (lanes.length === 0) {
    return <div className="text-sm text-muted py-4 text-center">No timeline data</div>;
  }

  const totalDuration = timeRange.end - timeRange.start;
  const toPercent = (ms: number) => ((ms - timeRange.start) / totalDuration) * 100;

  return (
    <div className="space-y-1">
      {/* Time axis */}
      <div className="flex justify-between text-[9px] text-gray-500 px-1 mb-2">
        <span>{new Date(timeRange.start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
        <span>{new Date(timeRange.end).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>

      {lanes.map((lane) => {
        const color = colorMap[lane.agentId];
        const c = COLOR_MAP[color];
        const idlePct = totalDuration > 0
          ? Math.round(((totalDuration - lane.totalActiveMs) / totalDuration) * 100)
          : 0;
        const msgsPerMin = totalDuration > 0
          ? ((lane.messageCount / totalDuration) * 60_000).toFixed(1)
          : '0';

        return (
          <div key={lane.agentId} className="flex items-center gap-3">
            {/* Agent label */}
            <div className="w-28 shrink-0 text-right">
              <span className={`text-[11px] font-medium ${c.text}`}>
                {lane.name}
              </span>
            </div>

            {/* Swim lane */}
            <div className="flex-1 relative h-6 bg-white/5 rounded overflow-hidden">
              {lane.bars.map((bar, i) => (
                <div
                  key={i}
                  className="absolute top-0.5 bottom-0.5 rounded-sm"
                  style={{
                    left: `${toPercent(bar.startMs)}%`,
                    width: `${Math.max(toPercent(bar.endMs) - toPercent(bar.startMs), 0.5)}%`,
                    background: `${c.hex}66`,
                    border: `1px solid ${c.hex}44`,
                  }}
                />
              ))}
              {/* Communication markers */}
              {lane.commMarkers.map((ts, i) => (
                <div
                  key={`m-${i}`}
                  className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rotate-45"
                  style={{
                    left: `${toPercent(ts)}%`,
                    background: c.hex,
                    opacity: 0.8,
                  }}
                />
              ))}
            </div>

            {/* Summary */}
            <div className="w-44 shrink-0 flex gap-3 text-[10px] text-gray-500">
              <span>{formatDuration(lane.totalActiveMs)} active</span>
              <span>{idlePct}% idle</span>
              <span>{msgsPerMin}/min</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
