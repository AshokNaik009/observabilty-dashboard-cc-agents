import chalk from 'chalk';
import Table from 'cli-table3';

import {
  AnalyticsResult,
  ProfileStats,
  ProjectBreakdown,
  Trends,
  TeamOptimization,
  OptimizationInsight
} from './types';

export class CLIFormatter {
  render(stats: AnalyticsResult): void {
    this.renderHeader();
    this.renderProfileStats(stats.profile);
    this.renderToolUsage(stats.profile.mostUsedTools);
    this.renderProjectBreakdown(stats.projects);
    this.renderTrends(stats.trends);
    this.renderOptimization(stats.optimization);
    this.renderInsights(stats.insights);
    console.log('');
  }

  private renderHeader(): void {
    console.log('');
    console.log(chalk.cyan('\u250C' + '\u2500'.repeat(50) + '\u2510'));
    console.log(chalk.cyan('\u2502') + chalk.bold.white('  AGENT TEAM PERFORMANCE INSIGHTS'.padEnd(50)) + chalk.cyan('\u2502'));
    console.log(chalk.cyan('\u2502') + chalk.gray('  Are your AI teams performing up to mark?'.padEnd(50)) + chalk.cyan('\u2502'));
    console.log(chalk.cyan('\u2514' + '\u2500'.repeat(50) + '\u2518'));
  }

  private renderProfileStats(profile: ProfileStats): void {
    console.log('');
    console.log(chalk.bold.yellow(' PROFILE STATS (ALL-TIME)'));
    console.log(chalk.gray(' ' + '\u2501'.repeat(50)));

    const stats: [string, string | number][] = [
      ['Total Sessions', profile.totalSessions],
      ['Total Agents Spawned', profile.totalAgents],
      ['Total Communications', profile.totalCommunications],
      ['Total Tasks Created', profile.totalTasks],
      ['', ''],
      ['Average Session', this.formatDuration(profile.averageDuration)],
      ['Agents per Session', profile.averageAgentsPerSession.toFixed(1)],
    ];

    if (profile.dateRange.first && profile.dateRange.last) {
      stats.push([
        'Date Range',
        `${this.formatDate(profile.dateRange.first)} \u2192 ${this.formatDate(profile.dateRange.last)}`
      ]);
    }

    for (const [label, value] of stats) {
      if (label === '') {
        console.log('');
        continue;
      }
      console.log(`   ${chalk.white(label.padEnd(25))} ${chalk.green(String(value))}`);
    }
  }

  private renderToolUsage(tools: [string, number][]): void {
    if (tools.length === 0) return;

    console.log('');
    console.log(chalk.bold.yellow(' MOST USED TOOLS'));
    console.log(chalk.gray(' ' + '\u2501'.repeat(50)));

    const maxCount = tools.length > 0 ? tools[0][1] : 1;

    for (let i = 0; i < tools.length; i++) {
      const [name, count] = tools[i];
      const barLen = Math.max(1, Math.round((count / maxCount) * 20));
      const bar = chalk.green('\u2588'.repeat(barLen));
      const rank = String(i + 1).padStart(3) + '.';
      console.log(`  ${chalk.gray(rank)} ${chalk.white(name.padEnd(18))} ${bar} ${chalk.cyan(String(count))}`);
    }
  }

  private renderProjectBreakdown(projects: ProjectBreakdown[]): void {
    if (projects.length === 0) return;

    console.log('');
    console.log(chalk.bold.yellow(' PROJECT BREAKDOWN'));
    console.log(chalk.gray(' ' + '\u2501'.repeat(50)));

    const table = new Table({
      head: [
        chalk.white('Project'),
        chalk.white('Sessions'),
        chalk.white('Agents'),
        chalk.white('Comms'),
        chalk.white('Last Active')
      ],
      style: { head: [], border: ['gray'] },
      colWidths: [25, 10, 9, 8, 14]
    });

    for (const project of projects) {
      const shortName = project.name.split('/').filter(Boolean).pop() || project.name;
      const displayName = shortName.length > 22 ? shortName.substring(0, 19) + '...' : shortName;

      table.push([
        chalk.white(displayName),
        chalk.green(String(project.sessions)),
        chalk.cyan(String(project.agents)),
        chalk.yellow(String(project.communications)),
        chalk.gray(project.lastActivity ? this.formatRelativeTime(project.lastActivity) : 'N/A')
      ]);
    }

    console.log(table.toString());
  }

  private renderTrends(trends: Trends): void {
    console.log('');
    console.log(chalk.bold.yellow(' TRENDS'));
    console.log(chalk.gray(' ' + '\u2501'.repeat(50)));

    const sparkChars = '\u2581\u2582\u2583\u2584\u2585\u2586\u2587\u2588';
    const max = Math.max(...trends.last7Days, 1);
    const sparkline = trends.last7Days.map(v => {
      const idx = Math.round((v / max) * (sparkChars.length - 1));
      return sparkChars[idx];
    }).join('');

    const weekTotal = trends.last7Days.reduce((a, b) => a + b, 0);
    console.log(`   ${chalk.white('Last 7 Days:'.padEnd(18))} ${chalk.green(sparkline)}  ${chalk.cyan(`(${weekTotal} sessions)`)}`);
    console.log(`   ${chalk.white('Last 30 Days:'.padEnd(18))} ${chalk.cyan(trends.last30DaysTotal + ' sessions')}`);

    if (trends.peakActivity) {
      console.log(`   ${chalk.white('Peak Activity:'.padEnd(18))} ${chalk.cyan(`${trends.peakActivity.day}s at ${this.formatHour(trends.peakActivity.hour)}`)}`);
    }
  }

  private renderOptimization(opt: TeamOptimization): void {
    console.log('');
    console.log(chalk.bold.magenta(' TEAM OPTIMIZATION INSIGHTS'));
    console.log(chalk.gray(' ' + '\u2501'.repeat(50)));

    // Summary line
    const scoreColor = opt.performanceScore >= 60 ? chalk.green : opt.performanceScore >= 40 ? chalk.yellow : chalk.red;
    console.log(`   ${chalk.white('Optimal Team Size:'.padEnd(25))} ${chalk.cyan(String(opt.optimalTeamSize) + ' agents')}`);
    console.log(`   ${chalk.white('Current Avg Size:'.padEnd(25))} ${chalk.cyan(opt.currentAvgTeamSize.toFixed(1) + ' agents')}`);
    console.log(`   ${chalk.white('Performance Score:'.padEnd(25))} ${scoreColor(opt.performanceScore + '/100')}`);

    // Agent utilization
    if (opt.agentUtilization.length > 0) {
      console.log('');
      console.log(chalk.gray('   Agent Utilization:'));
      for (const agent of opt.agentUtilization.slice(0, 6)) {
        const statusIcon = agent.status === 'high' ? chalk.green('*')
          : agent.status === 'normal' ? chalk.yellow('-')
          : chalk.red('!');
        const bar = this.miniBar(agent.utilizationScore);
        console.log(`   ${statusIcon} ${chalk.white(agent.agentName.padEnd(16))} ${bar} ${chalk.gray(agent.utilizationScore + '%')}`);
      }
    }

    // Efficiency patterns
    if (opt.efficiencyPatterns.length > 0) {
      console.log('');
      console.log(chalk.gray('   Top Workflows:'));
      for (const p of opt.efficiencyPatterns.slice(0, 3)) {
        console.log(`     ${chalk.cyan(p.pattern.padEnd(22))} ${chalk.gray(p.frequency + 'x')} ${chalk.gray(p.description)}`);
      }
    }

    // Recommendations
    if (opt.recommendations.length > 0) {
      console.log('');
      console.log(chalk.gray('   Recommendations:'));
      for (const rec of opt.recommendations) {
        const icon = this.getRecIcon(rec);
        console.log(`   ${icon} ${chalk.white(rec.message)}`);
      }
    }
  }

  private miniBar(score: number): string {
    const filled = Math.round(score / 10);
    const empty = 10 - filled;
    const color = score >= 60 ? chalk.green : score >= 30 ? chalk.yellow : chalk.red;
    return color('\u2588'.repeat(filled)) + chalk.gray('\u2591'.repeat(empty));
  }

  private getRecIcon(rec: OptimizationInsight): string {
    switch (rec.severity) {
      case 'success': return chalk.green('*');
      case 'warning': return chalk.yellow('!');
      case 'info': return chalk.cyan('>');
      default: return chalk.gray('-');
    }
  }

  private renderInsights(insights: string[]): void {
    if (insights.length === 0) return;

    console.log('');
    console.log(chalk.bold.yellow(' GENERAL INSIGHTS'));
    console.log(chalk.gray(' ' + '\u2501'.repeat(50)));

    for (const insight of insights) {
      console.log(`   ${chalk.green('*')} ${chalk.white(insight)}`);
    }
  }

  renderJSON(stats: AnalyticsResult): void {
    console.log(JSON.stringify(stats, null, 2));
  }

  renderNoSessions(): void {
    console.log('');
    console.log(chalk.yellow(' No team sessions found.'));
    console.log('');
    console.log(chalk.gray(' Team sessions are created when Claude Code uses'));
    console.log(chalk.gray(' TeamCreate or SendMessage to coordinate agents.'));
    console.log('');
    console.log(chalk.gray(' Check that sessions exist in:'));
    console.log(chalk.cyan('   ~/.claude/projects/*/subagents/'));
    console.log('');
  }

  renderError(message: string): void {
    console.log('');
    console.log(chalk.red(` Error: ${message}`));
    console.log('');
  }

  // --- Utility ---

  private formatDuration(ms: number): string {
    if (!ms || ms <= 0) return '0s';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  private formatDate(date: Date): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }

  private formatRelativeTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (weeks < 4) return `${weeks}w ago`;
    return this.formatDate(date);
  }

  private formatHour(hour: number): string {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  }
}
