---
name: taskview
description: Conventions for browsing and managing TaskView projects, lists, and tasks through the bundled taskview MCP tools
---

# Working with TaskView

This plugin connects Claude Code to a TaskView instance through the `taskview`
MCP server. Use it to let the user view and manage their work without leaving
the terminal.

## Terminology

- A **goal** IS a **project** — the words are interchangeable. Every tool/param
  that says "goal" (`goalId`, `list_goals`, `create_goal`) means a project. When
  the user says "project", use the `*_goal` tools.

## Data model (top → bottom)

- **Organization** — workspace grouping projects and members.
- **Project (goal)** — `goalId`; `list_goals` / `create_goal` / `update_goal`.
- **List (component)** — a section inside a project; pass `componentId` to
  `list_tasks` to scope to one list, omit it to see all tasks.
- **Task** — unit of work; supports subtasks, assignees, tags, priority
  (1=low, 2=medium, 3=high), deadlines, and dependencies.

## Rules that prevent mistakes

- **Resolve IDs first, never guess them.** Map a name to its numeric id with the
  matching `list_*` tool (project → `list_goals`, list → `list_lists`,
  members → `list_collaborators_for_goal`, columns → `list_kanban_columns`,
  tags → `list_tags`), then pass that id to create/update/delete tools.
- **`list_tasks` is paginated** — `page` is 0-based (~30/page). Keep requesting
  the next page until one returns fewer than 30. Completed tasks are hidden
  unless `showCompleted` is set. Use `sortBy` (`date` | `priority`) with
  `descending` to order.
- **Ask before destructive actions** (`delete_*`) and before creating duplicates
  — check with a `list_*` call first.

## Presenting results

- Show tasks as a concise checklist: status, description, priority, deadline.
- When something is ambiguous (which project/list/org), ask one short question
  rather than guessing.

## Logging completed work

When the user asks to record what was done, create **one top-level task per
finished unit of work** in the relevant project (resolve it first), with a clear
description and, if known, the list and priority. Do not bury the summary as a
subtask unless the user asks for that.
