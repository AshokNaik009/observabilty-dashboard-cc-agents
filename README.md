# Agent Observability Dashboard

Monitor, debug, and optimize your Claude Code multi-agent team sessions with an interactive web dashboard.

## Quick Start

```bash
npm install
npm run dev
```

Open **http://localhost:5173** (frontend dev) or **http://localhost:3456** (production build).

## What It Does

Scans `~/.claude/projects/` for multi-agent sessions (TeamCreate / Agent / SendMessage) and renders an interactive dashboard with:

- **Agent Flow Graph** — React Flow visualization of agents and their communication links
- **Communication Timeline** — Chronological list of all inter-agent messages, searchable and filterable
- **Task Nodes in the Graph** — Task creation events rendered as distinct nodes connected to the agent that created them
- **Activity Timeline (Gantt)** — Per-agent activity bars showing when each agent was active and idle
- **Tool Breakdown Chart** — Stacked bar showing which tools each agent used most
- **Stats Bar** — Agents, Messages, Duration, Events, and Tasks Completed at a glance
- **Health Score Badge** — Per-session 0–100 score on every session card, color-coded green/yellow/red
- **Prompt Library** — Four ready-to-use copy-paste prompts to spin up agent teams in Claude Code
- **Real-time Monitoring** — Live updates as an active session runs (SSE stream + file watcher)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Compile backend + run Express server and Vite dev server concurrently |
| `npm run dev:server` | Backend only (port 3456) |
| `npm run dev:frontend` | Frontend Vite dev server only |
| `npm run build` | Compile backend + build frontend into `frontend/dist/` |
| `npm start` | Serve the production build |
| `npm run cli` | Run the CLI analytics tool |
| `npm run type-check` | Type-check without emitting |

## CLI Options

```
--project, -p   Filter by project path (partial match)
--last, -l      Time range (7d, 30d, 3m)
--json          Output raw JSON
--export, -e    Export to JSON file
--help, -h      Show help
```

```bash
npm run cli -- --last 7d
npm run cli -- --project my-project
npm run cli -- --export stats.json
```

## Dashboard Features

### Agent Flow Graph
Visual map of agents and their communication relationships, laid out with Dagre (left-to-right). Includes:
- **Agent nodes** — colored by role, with event and message counts
- **Task nodes** — dashed-border rectangles showing created tasks, color-coded by status (pending/in_progress/completed), positioned downstream of their creator
- Click an agent node or edge to filter the communication timeline to that agent or pair
- Click a task node to filter the timeline to its creator's messages

### Health Score Badge
Each session card in the sidebar shows a 0–100 badge:
- **Green (≥70)** — healthy utilization, good communication balance, strong throughput
- **Yellow (40–69)** — moderate performance
- **Red (<40)** — underutilized agents or communication issues

Hover the badge to see a tooltip explaining the three score components: utilization (40%), communication balance (30%), task throughput (30%).

### Live Sessions
Sessions that are still running show a pulsing green dot and **Live** label in the sidebar. The dashboard automatically streams new communications, tasks, and agent events via Server-Sent Events and updates the graph, timeline, and stats bar without a page refresh.

### Prompt Library
The Getting Started page includes four ready-to-use prompts:
- **Code Review Team** — lead + style-reviewer + security-reviewer
- **Research Team** — lead + researcher + writer
- **Bug Hunt Team** — lead + debugger + tester
- **Feature Build Team** — lead + architect + coder + tester

Each has a one-click **Copy** button. Paste directly into Claude Code to spin up a team.

## API

| Endpoint | Description |
|----------|-------------|
| `GET /api/sessions` | List all discovered sessions with health scores |
| `GET /api/sessions/:id` | Full parsed session (agents, events, communications, tasks, stats) |
| `GET /api/sessions/:id/stream` | SSE stream of live events for an active session |
| `POST /api/refresh` | Clear cache and rediscover sessions |

### SSE Event Types

```
event: agent_event     — new event from an agent (increments event count)
event: communication   — new inter-agent message
event: task_update     — new task created
event: session_end     — session has ended (triggers full refresh)
```

## Project Structure

```
src/                         # Backend (Node.js / Express / TypeScript)
├── server.ts                # Express API + SSE streaming endpoint
├── session-parser.ts        # Discovers & parses JSONL session files
├── analytics-engine.ts      # Stats, trends, optimization, health score
├── cli-formatter.ts         # Terminal output rendering
├── index.ts                 # CLI entry point
└── types/index.ts

frontend/src/                # React + Vite frontend
├── App.tsx                  # Root layout + real-time hook
├── api/sessions.ts          # Fetch helpers
├── hooks/
│   ├── useSession.ts        # React Query hook for single session
│   ├── useSessions.ts       # React Query hook for session list
│   ├── useSessionStore.ts   # Zustand global state (selection, filters)
│   └── useSessionStream.ts  # EventSource hook for live sessions
├── components/
│   ├── flow/                # AgentFlowGraph, AgentNode, TaskNode, CommunicationEdge
│   ├── timeline/            # CommunicationTimeline, TimelineEntry
│   ├── performance/         # PerformancePanel, AgentGanttChart, ToolBreakdownChart
│   ├── stats/               # StatsBar, StatCard
│   ├── sessions/            # SessionItem (with health badge + live indicator)
│   ├── guide/               # GettingStarted + Prompt Library
│   ├── search/              # SearchBar / AgentFilterChips
│   ├── panel/               # MessageDetailPanel
│   └── layout/              # Header, Sidebar
└── lib/
    ├── graph.ts             # Dagre layout builder (agent + task nodes)
    ├── colors.ts            # Agent color palette
    └── format.ts            # Duration, date, truncate helpers
```

## Tech Stack

**Backend**
- Express — API server
- chokidar — File watching for real-time session monitoring
- fs-extra — File system helpers
- TypeScript

**Frontend**
- React + Vite
- React Flow (@xyflow/react) — Agent flow graph
- Dagre — Graph layout algorithm
- Zustand — Global UI state
- TanStack React Query — Data fetching and cache management
- Tailwind CSS

## Agent Name Resolution

The parser resolves agent names using two strategies:

1. **Spawn-time matching** — correlates `Agent` or `Task` tool call names with the timing of subagent file creation
2. **Prompt extraction** — falls back to extracting the role from the initial `<teammate-message>` prompt (`"You are the style-reviewer on the..."`)

This handles both classic Task-based spawning and the newer Agent tool team pattern.

## Future Ideas

- **Session Comparison** — side-by-side diff of two sessions' graphs and stats
- **Agent Profile Drill-downs** — dedicated page per agent with full event log and tool heatmap
- **Cloud Sync** — ingest sessions from remote machines or CI runs
- **Export** — save the flow graph as PNG or the full session report as PDF
- **Mobile Layout** — responsive design for smaller screens

## License

MIT
