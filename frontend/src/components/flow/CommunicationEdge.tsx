import {
  getBezierPath,
  EdgeLabelRenderer,
  type EdgeProps,
} from '@xyflow/react';
import { COLOR_MAP, type AgentColor } from '../../lib/colors';
import type { CommEdgeData } from '../../lib/graph';

export function CommunicationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const edgeData = data as CommEdgeData | undefined;
  const color = edgeData?.color || 'indigo';
  const count = edgeData?.count || 0;
  const c = COLOR_MAP[color as AgentColor];
  const strokeWidth = Math.min(1.5 + count * 0.5, 5);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <>
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={c.hex}
        strokeWidth={strokeWidth}
        strokeOpacity={0.6}
        className="transition-all hover:!stroke-opacity-100"
      />
      <EdgeLabelRenderer>
        <div
          className="absolute text-[10px] text-gray-400 bg-panel px-1.5 py-0.5 rounded border border-border pointer-events-none"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
        >
          {count} msg
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
