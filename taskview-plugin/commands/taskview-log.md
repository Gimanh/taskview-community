---
description: Log the work done in this session as a TaskView task
---

Record what was accomplished in the current Claude Code session as a TaskView task, using the `taskview` MCP tools.

1. Summarize the concrete work completed in this session in 1–3 short lines.
2. Ask the user which project to log it under (or use the one they name in $ARGUMENTS), and resolve its id with `list_goals`.
3. Create **one top-level task** with `create_task` — description = the summary. Set priority/deadline only if the user asks.
4. Show the created task and ask whether to break it into subtasks or add tags.
5. Add task note if needed.

Confirm the project before creating. Do not create the task in a guessed project, and do not create duplicates — check `list_tasks` if unsure.
