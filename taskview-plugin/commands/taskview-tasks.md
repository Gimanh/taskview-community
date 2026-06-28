---
description: Show tasks in a TaskView project
---

Show the user's TaskView tasks using the `taskview` MCP tools.

Arguments (optional): a project name to scope to — $ARGUMENTS

1. Resolve the project: call `list_goals` and match $ARGUMENTS to a project. If empty or ambiguous, ask which project.
2. Optionally scope to a list with `list_lists` + the `componentId` if the user names one.
3. Call `list_tasks` (0-based `page`, ~30/page) — page through until a page returns fewer than 30. Pass `showCompleted` only if the user wants completed tasks. Use `sortBy` with `descending` when ordering by date or priority.
4. Present a concise checklist: status, description, priority (1=low/2=med/3=high), deadline.

Resolve every id first — never guess project/list ids.
