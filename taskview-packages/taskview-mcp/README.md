# TaskView MCP Server

[![npm version](https://img.shields.io/npm/v/taskview-mcp.svg)](https://www.npmjs.com/package/taskview-mcp)

MCP (Model Context Protocol) server for [TaskView](https://taskview.tech). Lets AI assistants like Claude Code and Claude Desktop manage projects and tasks via the TaskView API.

```
AI client  ──stdio──▶  taskview-mcp  ──HTTPS──▶  TaskView API
```

## Requirements

- Node.js >= 24
- A TaskView API token (`tvk_...`) — generate one in your TaskView account settings [Read about API tokens](https://taskview.tech/docs/features/api-tokens)

## Quick start

No installation needed — use `npx` directly in your MCP client config.

### Claude Code

You can set your `URL` to your TaskView instance in `TASKVIEW_URL`.  
Add to `.claude/settings.json` (project) or `~/.claude.json` (global):

```json
{
  "mcpServers": {
    "taskview": {
      "command": "npx",
      "args": ["-y", "taskview-mcp"],
      "env": {
        "TASKVIEW_URL": "https://api.taskview.tech",
        "TASKVIEW_TOKEN": "tvk_your_token_here"
      }
    }
  }
}
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "taskview": {
      "command": "npx",
      "args": ["-y", "taskview-mcp"],
      "env": {
        "TASKVIEW_URL": "https://api.taskview.tech",
        "TASKVIEW_TOKEN": "tvk_your_token_here"
      }
    }
  }
}
```

### Global install (optional)

If you prefer a pinned install over `npx`:

```bash
npm install -g taskview-mcp
```

Then use `"command": "taskview-mcp"` (no `args` needed).

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `TASKVIEW_URL` | yes | TaskView API server URL (e.g. `https://api.taskview.tech`) |
| `TASKVIEW_TOKEN` | yes | API token with `tvk_` prefix |

## Available tools

37 tools covering the full TaskView surface.

**Projects (Goals)** — `list_goals`, `create_goal`, `update_goal`, `delete_goal`

**Lists** — `list_lists`, `create_list`, `update_list`, `delete_list`

**Tasks** — `list_tasks`, `get_task`, `create_task`, `update_task`, `delete_task`, `toggle_task_assignees`, `get_task_history`

**Tags** — `list_tags`, `create_tag`, `update_tag`, `delete_tag`, `toggle_task_tag`

**Kanban** — `list_kanban_columns`, `create_kanban_column`, `update_kanban_column`, `delete_kanban_column`

**Collaboration** — `list_collaborators`, `list_collaborators_for_goal`, `invite_collaborator`, `remove_collaborator`, `toggle_collaborator_roles`, `list_roles`, `create_role`, `delete_role`, `list_permissions`, `toggle_role_permission`

**Task dependencies (graph)** — `list_task_dependencies`, `add_task_dependency`, `delete_task_dependency`

**Notifications** — `list_notifications`, `mark_notification_read`, `mark_all_notifications_read`

## How it works

The MCP server uses the `taskview-api` client under the hood. Every tool call goes through the full API stack — authentication, permission checks, and validation. The MCP process itself is stateless; your token never leaves your machine except in `Authorization: Bearer ...` headers to your TaskView API server.

## Development (from monorepo)

If you're working on the package from the TaskView monorepo:

```bash
# from repo root
pnpm build:packages
cd community/taskview-packages/taskview-mcp
pnpm build

# run directly for debugging
TASKVIEW_URL=http://localhost:3000 TASKVIEW_TOKEN=tvk_... node dist/index.js
```

## License

See [LICENSE.md](https://github.com/Gimanh/taskview-community/blob/main/LICENSE.md) in the TaskView repository.

## Links

- [TaskView](https://github.com/Gimanh/taskview-community) — project repository
- [Model Context Protocol](https://modelcontextprotocol.io) — protocol specification
- [Issues](https://github.com/Gimanh/taskview-community/issues) — bug reports & feature requests
