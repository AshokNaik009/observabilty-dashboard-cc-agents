import { Handle, Position } from '@xyflow/react';
import { COLOR_MAP, type AgentColor } from '../../lib/colors';
import type { AgentNodeData } from '../../lib/graph';

export function AgentNode({ data }: { data: AgentNodeData }) {
  const c = COLOR_MAP[data.color as AgentColor];

  return (
    <>
      <Handle type="target" position={Position.Left} className="!bg-transparent !border-0 !w-2 !h-2" />
      <div
        className="rounded-lg px-4 py-3 min-w-[160px] cursor-pointer select-none"
        style={{
          background: c.bgHex,
          border: `1.5px solid ${c.hex}55`,
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-[12px] font-medium leading-tight"
            style={{ color: c.hex }}
          >
            {data.label}
          </span>
          {data.isLead && (
            <span
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: `${c.hex}33`, color: c.hex }}
            >
              LEAD
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-[10px] text-gray-400">
            {data.eventCount} events
          </span>
          <span className="text-[10px] text-gray-400">
            {data.messageCount} msgs
          </span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-transparent !border-0 !w-2 !h-2" />
    </>
  );
}
