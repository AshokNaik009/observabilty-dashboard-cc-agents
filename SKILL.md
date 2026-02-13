---
name: agent-team-performance-insights
description: "Monitor AI agent team performance in coding projects. Analyzes multi-agent sessions for utilization, efficiency patterns, and provides optimization recommendations."
---

# Agent Team Performance Insights

Are your AI agent teams performing up to the mark? This tool scans `~/.claude/projects/` for multi-agent sessions and generates performance analytics with optimization recommendations.

## Capabilities

- Profile stats: total sessions, agents, communications, tasks across all projects
- Project breakdown: sessions grouped by project with activity timelines
- Tool usage analysis: most frequently used tools across all sessions
- Time-based trends: daily/weekly/monthly patterns with sparkline charts
- Team optimization: optimal team size, agent utilization, efficiency patterns, recommendations

## Usage

```bash
# Development
npm run dev

# Production
npm run build && npm start
```

### Options

```
--project, -p   Filter by project path (partial match)
--last, -l      Time range filter (7d, 30d, 3m)
--json          Output raw JSON
--export, -e    Export JSON to file
--help, -h      Show help
```

### Examples

```bash
npm run dev -- --last 7d
npm run dev -- --project my-project
npm run dev -- --json
```

## Requirements

- Node.js >= 16
- Claude Code sessions in `~/.claude/projects/`
- Sessions must use team protocol (TeamCreate/SendMessage)

## How It Works

1. **Discovery**: Scans `~/.claude/projects/*/subagents/` for agent JSONL files
2. **Verification**: Checks lead session files for TeamCreate or SendMessage
3. **Parsing**: Reads JSONL files to extract events, tool usage, communications, tasks
4. **Analytics**: Aggregates stats, trends, and project breakdowns
5. **Optimization**: Calculates team size efficiency, agent utilization, workflow patterns
6. **Display**: Renders formatted terminal output with tables, charts, and recommendations
