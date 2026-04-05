import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';
import type { ParsedSession, AgentInfo } from '../types';
import { buildAgentColorMap, COLOR_MAP, type AgentColor } from './colors';

export interface AgentNodeData {
  [key: string]: unknown;
  label: string;
  eventCount: number;
  messageCount: number;
  isLead: boolean;
  color: AgentColor;
  agentId: string;
}

export interface TaskNodeData {
  [key: string]: unknown;
  label: string;
  status: string;
  taskIndex: number;
  createdBy: string;
}

export interface CommEdgeData {
  [key: string]: unknown;
  count: number;
  color: AgentColor;
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 70;
const TASK_NODE_WIDTH = 160;
const TASK_NODE_HEIGHT = 52;
const MAX_TASK_NODES = 8;

export function buildGraphLayout(session: ParsedSession): {
  nodes: Node[];
  edges: Edge[];
} {
  const agents = Object.values(session.agents);
  const agentIds = Object.keys(session.agents);
  const colorMap = buildAgentColorMap(agentIds);

  // Build name-to-ID lookup
  const nameToId: Record<string, string> = {};
  agents.forEach((a) => {
    if (a.name) nameToId[a.name] = a.id;
  });
  const resolveId = (ref: string): string | null => {
    if (session.agents[ref]) return ref;
    if (nameToId[ref]) return nameToId[ref];
    return null;
  };

  // Count communications between pairs (bidirectional merged)
  const pairCount: Record<string, number> = {};
  for (const c of session.communications) {
    const fromId = resolveId(c.from);
    const toId = resolveId(c.to);
    if (!fromId || !toId || fromId === toId) continue;
    const key = [fromId, toId].sort().join('|');
    pairCount[key] = (pairCount[key] || 0) + 1;
  }

  // Tasks to render (cap at MAX_TASK_NODES)
  const tasksToShow = session.tasks.slice(0, MAX_TASK_NODES);

  // Create Dagre graph
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 60, ranksep: 120 });
  g.setDefaultEdgeLabel(() => ({}));

  // Add agent nodes
  agents.forEach((agent) => {
    g.setNode(agent.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  // Add task nodes
  tasksToShow.forEach((task, i) => {
    const taskId = `task-${i}`;
    g.setNode(taskId, { width: TASK_NODE_WIDTH, height: TASK_NODE_HEIGHT });
  });

  // Add agent-agent edges
  const edgeKeys = Object.keys(pairCount);
  edgeKeys.forEach((key) => {
    const [a, b] = key.split('|');
    const aAgent = session.agents[a];
    const bAgent = session.agents[b];
    if (aAgent?.isLead) {
      g.setEdge(a, b);
    } else if (bAgent?.isLead) {
      g.setEdge(b, a);
    } else {
      g.setEdge(a, b);
    }
  });

  // Add agent → task creation edges
  tasksToShow.forEach((task, i) => {
    const taskId = `task-${i}`;
    const creatorId = resolveId(task.createdBy) || task.createdBy;
    if (session.agents[creatorId]) {
      g.setEdge(creatorId, taskId);
    } else {
      // Fallback: connect from lead
      const leadId = agentIds.find(id => session.agents[id].isLead) || agentIds[0];
      if (leadId) g.setEdge(leadId, taskId);
    }
  });

  dagre.layout(g);

  // Convert agent nodes to React Flow nodes
  const nodes: Node[] = agents.map((agent) => {
    const nodeData = g.node(agent.id);
    return {
      id: agent.id,
      type: 'agentNode',
      position: {
        x: nodeData.x - NODE_WIDTH / 2,
        y: nodeData.y - NODE_HEIGHT / 2,
      },
      data: {
        label: agent.name || agent.id.slice(0, 12),
        eventCount: agent.eventCount,
        messageCount: agent.messageCount,
        isLead: agent.isLead ?? false,
        color: colorMap[agent.id],
        agentId: agent.id,
      } satisfies AgentNodeData,
    };
  });

  // Convert task nodes to React Flow nodes
  tasksToShow.forEach((task, i) => {
    const taskId = `task-${i}`;
    const nodeData = g.node(taskId);
    if (!nodeData) return;
    nodes.push({
      id: taskId,
      type: 'taskNode',
      position: {
        x: nodeData.x - TASK_NODE_WIDTH / 2,
        y: nodeData.y - TASK_NODE_HEIGHT / 2,
      },
      data: {
        label: task.subject ? task.subject.slice(0, 38) : `Task ${i + 1}`,
        status: task.status || 'pending',
        taskIndex: i,
        createdBy: task.createdBy,
      } satisfies TaskNodeData,
    });
  });

  // Convert agent-agent communications to React Flow edges
  const edges: Edge[] = edgeKeys.map((key) => {
    const [a, b] = key.split('|');
    const aAgent = session.agents[a];
    const bAgent = session.agents[b];
    let source: string, target: string;
    if (aAgent?.isLead) {
      source = a;
      target = b;
    } else if (bAgent?.isLead) {
      source = b;
      target = a;
    } else {
      source = a;
      target = b;
    }
    const targetColor = colorMap[target] || 'indigo';
    return {
      id: `e-${key}`,
      source,
      target,
      type: 'communicationEdge',
      data: {
        count: pairCount[key],
        color: targetColor,
      } satisfies CommEdgeData,
    };
  });

  // Add task creation edges
  tasksToShow.forEach((task, i) => {
    const taskId = `task-${i}`;
    const creatorId = resolveId(task.createdBy) || task.createdBy;
    const sourceId = session.agents[creatorId]
      ? creatorId
      : agentIds.find(id => session.agents[id].isLead) || agentIds[0];
    if (!sourceId) return;
    edges.push({
      id: `task-edge-${i}`,
      source: sourceId,
      target: taskId,
      type: 'default',
      style: { strokeDasharray: '4 2', stroke: '#6366f155', strokeWidth: 1.5 },
    });
  });

  return { nodes, edges };
}
