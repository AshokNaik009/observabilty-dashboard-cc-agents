# Agent Team Performance Insights

Monitor AI agent team performance in coding projects and get optimization recommendations.

**Core Question:** Are my AI agent teams performing up to the mark?

## Quick Start

```bash
# Install dependencies
npm install

# Run in development (no build needed)
npm run dev

# Or build and run
npm run build
npm start
```

## What It Does

Scans `~/.claude/projects/` for multi-agent sessions (TeamCreate/SendMessage) and generates:

1. **Profile Stats** - Total sessions, agents, communications, tasks, duration
2. **Tool Usage** - Most used tools with bar charts
3. **Project Breakdown** - Sessions grouped by project
4. **Trends** - 7-day sparkline, 30-day totals, peak activity
5. **Team Optimization Insights** - The core feature:
   - Optimal team size for your workflow
   - Per-agent utilization scores (high/normal/low)
   - Efficiency patterns (common tool workflows)
   - Actionable recommendations
   - Overall performance score (0-100)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run directly from TypeScript (uses `tsx`) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled JavaScript from `dist/` |
| `npm run type-check` | Type-check without emitting files |

## CLI Options

```
--project, -p   Filter by project path (partial match)
--last, -l      Time range (7d, 30d, 3m)
--json          Output raw JSON
--export, -e    Export to JSON file
--help, -h      Show help
```

### Examples

```bash
# Full report
npm run dev

# Last 7 days
npm run dev -- --last 7d

# Filter to a specific project
npm run dev -- --project my-project

# Export as JSON
npm run dev -- --json
npm run dev -- --export stats.json

# Production (after build)
npm run build
node dist/index.js --last 30d
```

## Project Structure

```
src/
├── index.ts              # CLI entry point
├── session-parser.ts     # Discovers & parses JSONL session files
├── analytics-engine.ts   # Stats, trends, and optimization algorithms
├── cli-formatter.ts      # Terminal output rendering
└── types/
    └── index.ts          # TypeScript interfaces
```

## Optimization Algorithms

- **Optimal team size** - Correlates agent count with task completion rates across your sessions
- **Agent utilization** - Scores each agent role by tool usage relative to the team average
- **Efficiency patterns** - Detects frequent tool workflow pairs (e.g., Read -> Edit)
- **Performance score** - Composite of utilization, communication balance, and throughput
- **Recommendations** - Actionable suggestions for team size, consolidation, and communication

## Tech Stack

- **TypeScript** - Type-safe source
- **tsx** - Direct TypeScript execution for dev
- **chalk** - Terminal colors
- **cli-table3** - Formatted tables
- **ora** - Loading spinners
- **yargs** - CLI argument parsing
- **fs-extra** - Enhanced file system operations

## License

MIT
# observabilty-dashboard-cc-agents
