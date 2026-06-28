---
description: List your TaskView projects (goals)
---

List the user's TaskView projects using the `taskview` MCP tools.

1. If the user has more than one organization, resolve it with `list_organizations` and ask which one if unclear.
2. Call `list_goals` and present the projects as a short list: name, and a hint of activity if available.
3. Offer next actions — e.g. "view tasks in a project" (`/taskview-tasks`) or "create a task" (`/taskview-new-task`).

Do not invent project names or ids — only show what the tools return.
