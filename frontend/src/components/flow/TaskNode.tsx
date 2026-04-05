import { Handle, Position } from '@xyflow/react';
import type { TaskNodeData } from '../../lib/graph';

const STATUS_COLORS: Record<string, string> = {
  completed: '#10b981',
  in_progress: '#f59e0b',
  pending: '#6366f1',
};

export function TaskNode({ data }: { data: TaskNodeData }) {
  const color = STATUS_COLORS[data.status] ?? STATUS_COLORS.pending;

  return (
    <>
      <Handle type="target" position={Position.Left} className="!bg-transparent !border-0 !w-2 !h-2" />
      <div
        className="rounded-md px-3 py-2 min-w-[140px] max-w-[160px] cursor-pointer select-none"
        style={{
          background: '#1e1f2e',
          border: `1.5px dashed ${color}77`,
        }}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] shrink-0" style={{ color }}>■</span>
          <span className="text-[11px] text-gray-300 leading-tight truncate">{data.label}</span>
        </div>
        <div className="mt-1">
          <span
            className="text-[9px] font-medium uppercase tracking-wide"
            style={{ color: `${color}aa` }}
          >
            {data.status}
          </span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-transparent !border-0 !w-2 !h-2" />
    </>
  );
}
