#!/usr/bin/env node

import ora from 'ora';
import yargs from 'yargs';
import fs from 'fs-extra';
import path from 'path';

import { SessionParser } from './session-parser';
import { AnalyticsEngine } from './analytics-engine';
import { CLIFormatter } from './cli-formatter';
import { FilterOptions, ParsedSession, Session } from './types';

async function main(): Promise<void> {
  const argv = await yargs
    .usage('Usage: agent-insights [options]')
    .option('project', {
      type: 'string',
      describe: 'Filter by project path (partial match)',
      alias: 'p'
    })
    .option('last', {
      type: 'string',
      describe: 'Time range filter (e.g., 7d, 30d, 3m)',
      alias: 'l'
    })
    .option('json', {
      type: 'boolean',
      describe: 'Output raw JSON',
      default: false
    })
    .option('export', {
      type: 'string',
      describe: 'Export JSON to file',
      alias: 'e'
    })
    .help()
    .alias('help', 'h')
    .argv;

  const parser = new SessionParser();
  const engine = new AnalyticsEngine();
  const formatter = new CLIFormatter();

  // Phase 1: Discover sessions
  const spinner = ora('Scanning for agent team sessions...').start();

  let sessions: Session[];
  try {
    sessions = await parser.discoverTeamSessions();
  } catch (error: any) {
    spinner.fail('Failed to scan sessions');
    formatter.renderError(error.message);
    process.exit(1);
  }

  if (sessions.length === 0) {
    spinner.warn('No team sessions found');
    formatter.renderNoSessions();
    process.exit(0);
  }

  spinner.succeed(`Found ${sessions.length} team sessions`);

  // Phase 2: Deep-parse sessions
  const parseSpinner = ora('Analyzing agent performance...').start();

  const parsedSessions: ParsedSession[] = [];
  let parseCount = 0;
  for (const session of sessions) {
    try {
      const parsed = await parser.parseFullSession(session);
      parsedSessions.push(parsed);
      parseCount++;
      parseSpinner.text = `Analyzing agent performance... (${parseCount}/${sessions.length})`;
    } catch {
      // Skip unparseable sessions
    }
  }

  parseSpinner.succeed(`Analyzed ${parsedSessions.length} sessions`);

  // Phase 3: Calculate analytics + optimization
  const options: FilterOptions = {};
  if (argv.project) options.project = argv.project;
  if (argv.last) options.last = argv.last;

  const stats = engine.calculate(sessions, parsedSessions, options);

  // Phase 4: Output
  if (argv.json) {
    formatter.renderJSON(stats);
  } else if (argv.export) {
    const exportPath = path.resolve(argv.export);
    await fs.writeJson(exportPath, stats, { spaces: 2 });
    console.log(`\nExported to ${exportPath}`);
  } else {
    formatter.render(stats);
  }
}

main().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
