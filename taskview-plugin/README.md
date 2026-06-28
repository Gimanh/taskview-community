# TaskView plugin for Claude Code

Browse and manage your [TaskView](https://taskview.tech) projects and tasks directly from Claude Code. The plugin bundles the [`taskview-mcp`](https://www.npmjs.com/package/taskview-mcp) server plus skills and slash commands, so setup is just "install and paste a token" — no manual config editing.

## What you get

- **Bundled MCP server** — the full TaskView tool surface (projects, lists, tasks, tags, kanban, collaboration, dependencies, notifications), no separate install.
- **Slash commands:**
  - `/taskview-projects` — list your projects
  - `/taskview-tasks [project]` — show tasks in a project
  - `/taskview-new-task <description>` — create a task
  - `/taskview-log [project]` — log the work done this session as a task
- **Skill** — conventions so the assistant resolves ids correctly, paginates, and logs completed work as top-level tasks.

## Requirements

- Node.js >= 24 (the bundled MCP server runs via `npx`)
- A TaskView API token (`tvk_...`) from your account settings — see [API tokens](https://taskview.tech/docs/features/api-tokens)

## Install

```text
/plugin marketplace add Gimanh/taskview-community
/plugin install taskview@taskview
```

On install you'll be prompted for two values:

| Setting | Example | Notes |
|---|---|---|
| **TaskView API URL** | `https://api.taskview.tech` | TaskView Cloud, or your self-hosted instance URL |
| **TaskView API token** | `tvk_...` | Stored securely in your system keychain. Scope it to the minimum permissions/projects needed. |

That's it — the `taskview` MCP server and the commands become available after the plugin is enabled.

## Security

The token is supplied via the plugin's secure `userConfig` (marked sensitive → stored in the OS keychain, not in plaintext settings) and passed to the MCP server only as an environment variable. Every tool call still goes through the full TaskView API stack — authentication, permission checks, and token-scope intersection. Give the token only the scope the assistant should have.
