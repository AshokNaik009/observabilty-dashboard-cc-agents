# Implementation Guide

## Architecture

```
src/
├── index.ts              # CLI entry point, orchestrates the pipeline
├── session-parser.ts     # Discovers & parses JSONL session files
├── analytics-engine.ts   # Stats, trends, and optimization algorithms
├── cli-formatter.ts      # Terminal output rendering
└── types/
    └── index.ts          # Shared TypeScript interfaces
```

### Data Flow

```
~/.claude/projects/ → SessionParser.discoverTeamSessions() → SessionParser.parseFullSession()
    → AnalyticsEngine.calculate() → CLIFormatter.render()
```

## Components

### SessionParser

Handles all file I/O and JSONL parsing. Key methods:

- `discoverTeamSessions()` - Scans project directories for sessions with `subagents/` folders containing `agent-*.jsonl` files. Verifies team protocol by checking for `TeamCreate` or `SendMessage` in the lead session file.
- `parseFullSession(session)` - Deep-parses a session: reads all JSONL files, extracts events, resolves agent names, extracts communications and tasks. Results are cached.
- `parseJSONLFile(filePath, agentId)` - Parses individual JSONL files into structured events with tool usage, text content, and timestamps.

File reading is optimized: `readFirstNLines()` uses streaming to avoid loading entire files, and `readLastLine()` reads from the end of the file using a buffer.

### AnalyticsEngine

Pure computation, no I/O. Takes parsed data and produces analytics:

- `calculateProfileStats()` - Aggregates totals across all sessions
- `calculateProjectBreakdown()` - Groups sessions by project path
- `calculateTrends()` - Daily/weekly/monthly counts, sparkline data, peak activity
- `generateInsights()` - General observations about usage
- `calculateOptimization()` - The core differentiator:
  - `findOptimalTeamSize()` - Correlates agent count with task completion rates
  - `calculatePerformanceScore()` - Composite of utilization, communication, throughput
  - `analyzeAgentUtilization()` - Per-agent scoring by tool usage relative to team average
  - `detectEfficiencyPatterns()` - Finds common consecutive tool pairs
  - `generateRecommendations()` - Actionable suggestions based on all metrics

Supports filtering by project path (partial match) and time range (e.g., `7d`, `30d`, `3m`).

### CLIFormatter

Renders analytics to the terminal using chalk for colors and cli-table3 for tables:

- Box-bordered header with tagline
- Labeled stat rows with right-aligned values
- Bar charts for tool usage
- Table for project breakdown
- Sparkline characters for 7-day trends
- Team optimization section with utilization bars, workflow patterns, recommendations
- General insights section

Also handles JSON output and no-data states.

## Session Data Model

A team session is identified by:
1. A directory under `~/.claude/projects/<encoded-project-path>/`
2. A `subagents/` subdirectory containing `agent-*.jsonl` files
3. A lead session `.jsonl` file containing `"TeamCreate"` or `"SendMessage"`

Each JSONL file contains one JSON object per line with fields:
- `type` - "user" or "assistant"
- `timestamp` - ISO 8601 timestamp
- `message.content` - String or array of content blocks
- Content blocks can be `text`, `tool_use`, or `tool_result`

## Optimization Algorithms

### Optimal Team Size
Groups sessions by agent count, calculates average tasks-per-agent for each group, and picks the group with the highest rate.

### Performance Score (0-100)
Weighted composite:
- 40% utilization (active agents / total agents)
- 30% communication balance (3-10 messages/agent is ideal)
- 30% throughput (tool uses per agent)

### Agent Utilization
Aggregates each agent name across all sessions. Scores by tool usage rate relative to the top performer. Status: high (>=60), normal (>=30), low (<30).

### Efficiency Patterns
Counts consecutive tool pairs across all events. Reports the top 5 most frequent workflows.

## Extending

### Adding a new metric

1. Add the type in `types/index.ts`
2. Add calculation in `analytics-engine.ts`
3. Add rendering in `cli-formatter.ts`
4. Call the new render method from `CLIFormatter.render()`

### Adding a new filter

1. Add the CLI option in `index.ts` via yargs
2. Add filter logic in `AnalyticsEngine.applyFilters()`

### Adding export formats

1. Add the CLI flag in `index.ts`
2. Add a new render method in `cli-formatter.ts`
3. Add the output branch in `index.ts` main function
