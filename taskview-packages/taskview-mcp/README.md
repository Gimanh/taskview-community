# TaskView MCP Server

MCP (Model Context Protocol) server for TaskView. Enables AI clients (Claude Code, Claude Desktop) to manage projects and tasks via the API.

## Requirements

- Node.js >= 24
- TaskView API token (`tvk_...`) — generated in account settings

## Setup

```bash
pnpm build:packages
cd community/taskview-packages/taskview-mcp
pnpm build
```

## Configuration

### Claude Code

Add to `.claude/settings.json` or `~/.claude.json`:

```json
{
  "mcpServers": {
    "taskview": {
      "command": "node",
      "args": ["/path/to/taskview-mcp/dist/index.js"],
      "env": {
        "TASKVIEW_URL": "https://api.taskview.tech",
        "TASKVIEW_TOKEN": "tvk_your_token"
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
      "command": "node",
      "args": ["/path/to/taskview-mcp/dist/index.js"],
      "env": {
        "TASKVIEW_URL": "https://api.taskview.tech",
        "TASKVIEW_TOKEN": "tvk_your_token"
      }
    }
  }
}
```

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `TASKVIEW_URL` | TaskView API server URL | `https://api.taskview.tech` |
| `TASKVIEW_TOKEN` | API token with `tvk_` prefix | `tvk_abc123...` |

## Available Tools

### Projects (Goals)

| Tool | Description |
|---|---|
| `list_goals` | List all accessible projects |
| `create_goal` | Create a new project |
| `update_goal` | Update a project |
| `delete_goal` | Delete a project |

### Lists

| Tool | Description |
|---|---|
| `list_lists` | Get task lists within a project |
| `create_list` | Create a task list |
| `update_list` | Update a task list |
| `delete_list` | Delete a task list |

### Tasks

| Tool | Description |
|---|---|
| `list_tasks` | List tasks with filters and pagination |
| `get_task` | Get a task by ID |
| `create_task` | Create a task |
| `update_task` | Update a task |
| `delete_task` | Delete a task |
| `toggle_task_assignees` | Assign or unassign users |
| `get_task_history` | Get task change history |

### Tags

| Tool | Description |
|---|---|
| `list_tags` | List all user tags |
| `create_tag` | Create a tag |
| `update_tag` | Update a tag |
| `delete_tag` | Delete a tag |
| `toggle_task_tag` | Add or remove a tag from a task |

### Kanban

| Tool | Description |
|---|---|
| `list_kanban_columns` | Get kanban board columns |
| `create_kanban_column` | Create a column |
| `update_kanban_column` | Update a column |
| `delete_kanban_column` | Delete a column |

### Collaboration

| Tool | Description |
|---|---|
| `list_collaborators` | List all collaborators |
| `list_collaborators_for_goal` | List project collaborators |
| `invite_collaborator` | Invite a user by email |
| `remove_collaborator` | Remove a user from a project |
| `toggle_collaborator_roles` | Update user roles |
| `list_roles` | List project roles |
| `create_role` | Create a role |
| `delete_role` | Delete a role |
| `list_permissions` | List available permissions |
| `toggle_role_permission` | Toggle a permission for a role |

### Task Dependencies (Graph)

| Tool | Description |
|---|---|
| `list_task_dependencies` | List dependency edges in a project |
| `add_task_dependency` | Create a dependency between tasks |
| `delete_task_dependency` | Delete a dependency edge |

### Notifications

| Tool | Description |
|---|---|
| `list_notifications` | Get user notifications |
| `mark_notification_read` | Mark a notification as read |
| `mark_all_notifications_read` | Mark all notifications as read |

## Architecture

```
Claude Code/Desktop
  -> stdio -> taskview-mcp
    -> HTTP (Authorization: Bearer tvk_...) -> TaskView API
```

The MCP server uses the `taskview-api` package as an HTTP client. All requests go through the full API stack — authentication, permission checks, and validation.

## Development

```bash
# Rebuild after changes
cd community/taskview-packages/taskview-mcp
pnpm build

# Run directly (for debugging)
TASKVIEW_URL=http://localhost:3000 TASKVIEW_TOKEN=tvk_... node dist/index.js
```
