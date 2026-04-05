# PRD: Agent Observability Dashboard — v2 Feature Set

## Problem Statement

Developers using Claude Code's Agent Teams feature have no easy way to understand how their multi-agent systems are collaborating in practice. After running an agent team session, it is difficult to answer questions like: which agents were most active, how did tasks flow between agents, what did agents say to each other, and how well did the team perform overall? There is also no low-friction way for a developer to try agent teams for the first time — they have to write prompts from scratch without knowing what good team prompts look like.

## Solution

Extend the existing Agent Observability Dashboard with five targeted improvements:

1. **Real-time session monitoring** — watch a live agent team session as it unfolds, seeing the graph and timeline update automatically as agents communicate.
2. **Task nodes in the flow graph** — visualize not just agent-to-agent messages but also task creation and completion, showing the full flow of work through the team.
3. **Health score badges on session cards** — surface the computed performance score directly in the session list so users can compare sessions at a glance without clicking in.
4. **Prompt Library in Getting Started** — provide 4 ready-to-use, copy-paste prompts that spin up different agent team configurations in Claude Code, lowering the barrier for first-time users and demos.
5. **Tasks Completed stat card** — add a fifth stat card to the session stats bar showing how many tasks were completed in the session.

## User Stories

1. As a developer, I want to see the agent flow graph update in real time, so that I can watch my agent team collaborate as it happens.
2. As a developer, I want the communication timeline to append new messages live during an active session, so that I can follow the conversation without manually refreshing.
3. As a developer, I want the stats bar to update live as events stream in, so that I always see current counts during an active session.
4. As a developer, I want the session list to show a "live" indicator on currently running sessions, so that I can distinguish active from completed sessions.
5. As a developer, I want task creation events shown as nodes in the flow graph, so that I can see which agent initiated which tasks.
6. As a developer, I want task completion events shown on the flow graph, so that I can see which agent finished each task and whether it was completed successfully.
7. As a developer, I want task nodes to be visually distinct from agent nodes in the graph, so that I can quickly differentiate communication relationships from work assignments.
8. As a developer, I want to click a task node in the graph and see related events highlighted in the timeline, so that I can trace the lifecycle of a specific task.
9. As a developer, I want to see a health score badge (e.g. 87/100) on each session card in the sidebar, so that I can compare session performance without opening each one.
10. As a developer, I want the health score badge to use color coding (green/yellow/red), so that I can instantly spot underperforming sessions.
11. As a developer, I want to see a tooltip on the health score badge explaining what factors contributed to the score, so that I understand why a session scored high or low.
12. As a developer, I want to see a "Tasks Completed" count in the stats bar at the top of the session view, so that I have a quick summary of output alongside messages and duration.
13. As a demo attendee, I want to see a Prompt Library section in Getting Started, so that I can copy a ready-made prompt and immediately try agent teams myself.
14. As a demo attendee, I want a "Code Review Team" prompt that creates a lead agent plus two reviewer agents, so that I can see a realistic multi-agent code review workflow.
15. As a demo attendee, I want a "Research Team" prompt that creates a lead plus a researcher and a writer, so that I can see agents producing a document collaboratively.
16. As a demo attendee, I want a "Bug Hunt Team" prompt that creates a lead plus a debugger and a tester, so that I can see agents tracking down an issue together.
17. As a demo attendee, I want a "Feature Build Team" prompt that creates a lead, architect, coder, and tester, so that I can see a full 4-agent build workflow.
18. As a demo attendee, I want a one-click copy button next to each prompt template, so that I can paste it into Claude Code immediately without selecting text.
19. As a developer, I want the Prompt Library to be part of the Getting Started page, so that I always know where to find example prompts regardless of whether I have sessions loaded.
20. As a developer, I want each prompt template to include a brief description of what the team will do, so that I can choose the right template for my goal.

## Implementation Decisions

### Modules to Build or Modify

**1. Real-Time Monitoring Module (new — backend)**
- A file-system watcher (using `chokidar`) that monitors `~/.claude/projects/` for new JSONL lines appended to active session files.
- A Server-Sent Events (SSE) endpoint on the existing Express server that streams incremental session events to the frontend.
- The watcher reuses the existing session parser for incremental event extraction — only newly appended lines are parsed on each file change event.
- Interface: `GET /api/sessions/:id/stream` — returns an SSE stream of `{ type, payload }` event objects.

**2. Real-Time Frontend Hook (new — frontend)**
- A React hook (`useSessionStream`) that connects to the SSE endpoint for the currently selected session and merges incoming events into the Zustand store.
- Automatically activates when a session's end time is null (active session) and deactivates when the session ends.
- Triggers re-renders only for the affected components (timeline, graph, stats bar).

**3. Task Node Graph Extension (modify — frontend)**
- Extend the existing `AgentFlowGraph` component and Dagre layout builder to include task nodes alongside agent nodes.
- Task nodes are a new node type with a distinct visual style (e.g. rounded rectangle vs circle for agents).
- Edges from agent → task represent creation; edges from task → agent represent completion/assignment.
- Clicking a task node filters the timeline to events related to that task (reuses existing click-filter mechanism).

**4. Health Score Badge (modify — frontend + backend)**
- The backend `/api/sessions` endpoint already computes a performance score inside the analytics engine; expose it in the session list response payload.
- Modify the `SessionItem` sidebar component to render a color-coded badge using the score (green ≥70, yellow ≥40, red <40).
- Add a tooltip (on hover) showing the three score components: utilization, communication balance, throughput.

**5. Tasks Completed Stat Card (modify — frontend)**
- Add a fifth card to the existing `StatsBar` component using the task count already present in the parsed session data.
- No backend changes needed — the data is already returned in the session detail response.

**6. Prompt Library (modify — frontend)**
- Add a new section to the existing `GettingStarted` component with 4 prompt templates.
- Each template has: a title, a one-line description, the full prompt text, and a copy-to-clipboard button.
- Prompts are static strings defined in a constants file — no backend involvement.
- Copy button uses the browser Clipboard API and shows a brief "Copied!" confirmation state.

### Architectural Decisions

- SSE is chosen over WebSockets because it is unidirectional (server → client), simpler to implement, and sufficient for streaming append-only log events.
- `chokidar` is chosen for file watching because it normalises OS-level differences (FSEvents on macOS, inotify on Linux) and handles rapid writes gracefully.
- Task nodes are added to the existing React Flow graph rather than a separate view to keep the relationship between agents and tasks visible in one place.
- The Prompt Library lives in Getting Started (not a new route) to avoid over-engineering navigation for a proof-of-concept.

### API Contract Addition

```
GET /api/sessions/:id/stream
Content-Type: text/event-stream

event: agent_event
data: { "type": "agent_event", "agentId": "...", "event": { ... } }

event: communication
data: { "type": "communication", "communication": { ... } }

event: task_update
data: { "type": "task_update", "task": { ... } }

event: session_end
data: { "type": "session_end" }
```

## Testing Decisions

**What makes a good test here:** Test external behavior (what data comes out given what input), not implementation details (internal parsing steps, private methods). Tests should be runnable without a real `~/.claude/projects/` directory by injecting mock JSONL content.

**Modules to test:**

- **Incremental JSONL parser** — given a sequence of appended lines, verify the correct events are extracted in order without duplicates. This is the core correctness guarantee for real-time mode.
- **Health score computation** — given known session stats, verify the score formula produces the expected value and that the three components sum correctly. The analytics engine already has this logic; add unit tests to pin it.
- **Prompt Library copy button** — integration test that clicking copy writes the correct string to the clipboard mock.

**Out of scope for testing:** React Flow graph layout (visual regression), SSE transport layer (integration with OS file events), Gantt chart rendering.

## Out of Scope

- **Session Comparison view** — side-by-side comparison of two sessions is a natural follow-on but excluded from this iteration to keep scope tight.
- **Authentication / multi-user support** — the dashboard reads local files only and is single-user by design.
- **Cloud sync or remote session ingestion** — all data is sourced from the local `~/.claude/projects/` directory.
- **Agent-level drill-down pages** — clicking an agent could open a dedicated agent profile page, but this is deferred.
- **Export to PDF/PNG** — exporting the graph or timeline as an image is deferred.
- **Mobile / responsive layout** — the dashboard targets desktop-width screens only.

## Further Notes

- This is a proof-of-concept project whose primary goal is to demonstrate the value of Claude Code's Agent Teams feature. Features should be implemented to "demo quality" — compelling and correct for the happy path, not necessarily hardened for all edge cases.
- The Prompt Library is the highest-leverage feature for demos: it removes the biggest barrier (knowing how to write a team prompt) and directly feeds the dashboard with live data when combined with real-time monitoring.
- A "Future Ideas" section should be added to the README covering: session comparison view, agent profile drill-downs, cloud sync, and export options.
