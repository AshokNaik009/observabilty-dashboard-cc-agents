export function GettingStarted() {
  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-3xl mx-auto py-10 px-6 space-y-8">
        {/* Hero */}
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-bold text-white">Agent Observability</h2>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Monitor, debug, and optimize your Claude Code multi-agent teams.
            Select a session from the sidebar to start, or follow the guide below
            to create your first agent team.
          </p>
        </div>

        {/* Quick Start */}
        <Section title="Creating an Agent Team">
          <p className="text-sm text-gray-400 mb-4">
            Claude Code can spawn multiple agents that collaborate on complex tasks.
            Use the <Code>TeamCreate</Code> tool to set up a team, then assign tasks
            to teammates.
          </p>
          <CodeBlock>{`// In Claude Code, ask:
"Create a team of agents to build a REST API with tests"

// Or be specific:
"Create a team called api-project with 3 agents:
 - backend: implement Express routes
 - tester: write integration tests
 - reviewer: review code quality"`}</CodeBlock>
        </Section>

        <Section title="How Agent Teams Work">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StepCard
              step="1"
              title="Team Lead"
              description="The lead agent creates the team, defines tasks, and coordinates work. It spawns teammates and assigns them specific responsibilities."
            />
            <StepCard
              step="2"
              title="Task Assignment"
              description="Tasks are created with TaskCreate and assigned via TaskUpdate. Teammates pick up tasks, work independently, and report back when done."
            />
            <StepCard
              step="3"
              title="Communication"
              description="Agents communicate via SendMessage for direct messages or broadcasts. The timeline here shows all inter-agent communication."
            />
          </div>
        </Section>

        <Section title="Example: Multi-Agent Workflow">
          <CodeBlock>{`# Step 1 — Ask Claude to use a team
You: "Use a team to refactor the auth module and add tests"

# Step 2 — Claude creates the team
Claude uses TeamCreate → creates "auth-refactor" team
Claude uses TaskCreate → defines tasks for each agent
Claude uses Task tool  → spawns teammates

# Step 3 — Agents collaborate
backend-agent:  Refactors auth module, marks task complete
test-agent:     Writes tests in parallel, sends results to lead
lead:           Reviews work, creates follow-up tasks if needed

# Step 4 — Review here
Open this dashboard → select the session → see the flow graph,
timeline, and performance metrics for the entire team run.`}</CodeBlock>
        </Section>

        <Section title="Tips for Effective Teams">
          <div className="space-y-3">
            <Tip title="Be specific about roles">
              Instead of "create a team", say "create a team with a backend agent
              and a test agent". Clear roles lead to less overlap and better results.
            </Tip>
            <Tip title="Keep teams small">
              2-4 agents is the sweet spot. Larger teams have more coordination
              overhead. The performance panel here shows utilization per agent.
            </Tip>
            <Tip title="Use task dependencies">
              Set <Code>blockedBy</Code> to ensure agents work in the right order.
              e.g., testing should be blocked by implementation tasks.
            </Tip>
            <Tip title="Check the Gantt chart">
              The Activity Timeline below the flow graph shows when each agent was
              active. Large idle gaps indicate coordination bottlenecks.
            </Tip>
          </div>
        </Section>

        <Section title="Key Claude Code Commands">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CommandCard
              command="TeamCreate"
              description="Create a new team with a name and description"
            />
            <CommandCard
              command="TaskCreate"
              description="Add a task to the team's shared task list"
            />
            <CommandCard
              command="TaskUpdate"
              description="Assign, complete, or update tasks"
            />
            <CommandCard
              command="SendMessage"
              description="Send direct or broadcast messages between agents"
            />
            <CommandCard
              command="TaskList"
              description="View all tasks and their status"
            />
            <CommandCard
              command="Task (spawn)"
              description="Spawn a new teammate agent to join the team"
            />
          </div>
        </Section>

        <Section title="Reading the Dashboard">
          <div className="space-y-3">
            <Feature
              title="Agent Flow Graph"
              description="Visual map of agents and their communication links. Click a node to filter the timeline to that agent. Click an edge to filter to that pair."
            />
            <Feature
              title="Communication Timeline"
              description="Chronological list of all messages between agents. Use search (Cmd+K) to find specific content. Click an entry to see the full message."
            />
            <Feature
              title="Activity Timeline (Gantt)"
              description="Shows when each agent was active. Colored bars are activity periods, diamonds are message events. Summary shows active time and idle %."
            />
            <Feature
              title="Tool Breakdown"
              description="Stacked bar chart showing which tools each agent used most. Helps identify if agents are spending too much time on specific operations."
            />
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-panel border border-border rounded-lg p-5">
      <h3 className="text-sm font-semibold text-white mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-[12px] bg-indigo-500/15 text-indigo-300 px-1.5 py-0.5 rounded">
      {children}
    </code>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="text-[12px] text-gray-300 bg-surface border border-border rounded-lg p-4 overflow-x-auto leading-relaxed">
      {children}
    </pre>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center">
          {step}
        </span>
        <span className="text-sm font-medium text-white">{title}</span>
      </div>
      <p className="text-xs text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}

function Tip({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 bg-surface border border-border rounded-lg p-3">
      <span className="text-indigo-400 text-sm mt-0.5 shrink-0">*</span>
      <div>
        <span className="text-sm font-medium text-gray-200">{title}</span>
        <p className="text-xs text-gray-400 mt-1 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

function CommandCard({
  command,
  description,
}: {
  command: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 bg-surface border border-border rounded-lg p-3">
      <code className="text-[11px] bg-emerald-500/15 text-emerald-300 px-1.5 py-0.5 rounded shrink-0">
        {command}
      </code>
      <span className="text-xs text-gray-400">{description}</span>
    </div>
  );
}

function Feature({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="bg-surface border border-border rounded-lg p-3">
      <span className="text-sm font-medium text-gray-200">{title}</span>
      <p className="text-xs text-gray-400 mt-1 leading-relaxed">{description}</p>
    </div>
  );
}
