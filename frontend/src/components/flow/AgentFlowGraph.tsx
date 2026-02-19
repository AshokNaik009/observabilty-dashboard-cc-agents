import { useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { ParsedSession } from '../../types';
import { useSessionStore } from '../../hooks/useSessionStore';
import { useGraphLayout } from './useGraphLayout';
import { AgentNode } from './AgentNode';
import { CommunicationEdge } from './CommunicationEdge';
import type { AgentNodeData } from '../../lib/graph';

const nodeTypes = { agentNode: AgentNode };
const edgeTypes = { communicationEdge: CommunicationEdge };

interface Props {
  session: ParsedSession;
}

export function AgentFlowGraph({ session }: Props) {
  const { nodes, edges } = useGraphLayout(session);
  const setTimelineFilter = useSessionStore((s) => s.setTimelineFilter);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: { data: Record<string, unknown> }) => {
      const data = node.data as unknown as AgentNodeData;
      setTimelineFilter({ agentId: data.agentId });
    },
    [setTimelineFilter],
  );

  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: { source: string; target: string }) => {
      setTimelineFilter({ agentPair: [edge.source, edge.target] });
    },
    [setTimelineFilter],
  );

  return (
    <div className="h-[400px]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.3}
        maxZoom={3}
      >
        <Controls />
        <MiniMap
          nodeColor="#2a2d3a"
          maskColor="rgba(15, 17, 23, 0.7)"
          style={{ background: '#1a1d27' }}
        />
        <Background variant={BackgroundVariant.Dots} color="#2a2d3a" gap={20} />
      </ReactFlow>
    </div>
  );
}
