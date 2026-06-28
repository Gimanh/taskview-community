---
description: Create a task in TaskView
---

Create a TaskView task using the `taskview` MCP tools.

Request: $ARGUMENTS

1. Parse the request for: task description, target project, optional list, priority (1=low, 2=medium, 3=high), and deadline.
2. Resolve the project id with `list_goals` (and the list id with `list_lists` if a list is named). If the project is missing or ambiguous, ask — do not guess.
3. Call `create_task` with the resolved ids and parsed fields.
4. Confirm what was created (project, description, priority, deadline) and offer to add tags or assignees.

Never create a task in a guessed/unconfirmed project.
