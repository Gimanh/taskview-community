# Outgoing Webhooks

## Overview

TaskView fires HTTP POST requests to external services when things happen with tasks.
User registers a webhook URL, picks which events to listen to, gets a secret for signature verification.

No auth tokens, no OAuth, no API keys for consumers — just signed payloads.

## How it works

### Registration

User with `WEBHOOKS_CAN_MANAGE` permission goes to project settings (or a new "Webhooks" tab in the integrations panel).
Fills in:
- **URL** — where to send events (`https://ops.company.com/hooks/taskview`)
- **Events** — checkboxes: `task.created`, `task.updated`, `task.completed`, `task.deleted`
- **Description** (optional) — "Slack notifications", "PagerDuty alerts", etc.

On save, the server generates a **webhook secret** (random 32-byte hex, like we already do for GitHub/GitLab webhooks).
The secret is shown to the user once. Stored encrypted in DB (same `encrypt()` we use for integration tokens).

### Payload

When an event fires, TaskView POSTs JSON to the registered URL:

```
POST https://ops.company.com/hooks/taskview
Content-Type: application/json
X-TaskView-Event: task.completed
X-TaskView-Signature: sha256=abc123...
X-TaskView-Delivery: <uuid>

{
  "event": "task.completed",
  "timestamp": "2026-03-09T14:30:00Z",
  "deliveryId": "550e8400-e29b-41d4-a716-446655440000",
  "projectId": 42,
  "task": {
    "id": 123,
    "description": "Fix login bug",
    "complete": true,
    "goalListId": 5,
    "priorityId": 2,
    "statusId": 3,
    "assignedUsers": [1, 7],
    "tags": [10, 11]
  }
}
```

### Signature verification

The consumer verifies the request is really from TaskView using the shared secret:

```python
import hmac, hashlib

def verify(payload_body, signature_header, secret):
    expected = 'sha256=' + hmac.new(
        secret.encode(), payload_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header)
```

Same approach GitHub uses. No OAuth needed — if the signature matches, it's from TaskView.
This is simpler than API keys because the consumer doesn't need to store credentials for calling TaskView back.

### Why not API keys / OAuth?

Outgoing webhooks are **push-only**. TaskView pushes data to the consumer.
The consumer doesn't call TaskView API — it just receives events.

If we later want consumers to call TaskView back (e.g. update a task from Slack), that's a separate feature (incoming API + API keys).
Don't mix the two — outgoing webhooks are simple and should stay simple.

## Database

New table `tasks.webhooks`:

```sql
CREATE TABLE tasks.webhooks (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES tasks.goals(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    description TEXT,
    secret_encrypted TEXT NOT NULL,
    events TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_triggered_at TIMESTAMP,
    last_status_code INTEGER
);
```

`last_triggered_at` and `last_status_code` — so user can see if webhooks are actually working from the UI.

## Server-side architecture

### Where to fire events

`TasksManager` is where all task mutations go through. After a successful mutation, call the webhook dispatcher:

```
TasksManager.addTaskNew()     → dispatch('task.created', task)
TasksManager.updateTask()     → dispatch('task.updated', task)
TasksManager.deleteTask()     → dispatch('task.deleted', { id: taskId })
TasksManager.completeTask()   → dispatch('task.completed', task)
```

### Dispatcher

```
WebhookDispatcher.dispatch(event, payload, projectId):
  1. Fetch active webhooks for projectId where events[] contains event
  2. For each webhook:
     - Build JSON payload
     - Sign with HMAC-SHA256 using decrypted secret
     - POST async (fire-and-forget with .catch())
     - Update last_triggered_at and last_status_code
```

**Important**: fire-and-forget. Never await webhook delivery in the request path.
If the external service is down, the task still gets created instantly.

### Retries

Simple retry: 3 attempts with delays of 5s, 30s, 5min.
Use `setTimeout` — no need for a job queue at this scale.
If all 3 fail, log it and move on. User can see `last_status_code` in the UI.

No dead letter queue, no persistent retry storage. Keep it simple.
If someone needs guaranteed delivery, they should use a proper message broker on their end.

## Permissions

Two new permissions (same pattern as integrations):

- `WEBHOOKS_CAN_MANAGE` — create, edit, delete, toggle webhooks
- `WEBHOOKS_CAN_VIEW` — see registered webhooks and their status

Owner gets both automatically (like all other permissions).

## UI

Add a "Webhooks" tab in the integrations panel (or a separate section).

List view shows:
- URL (truncated)
- Description
- Events (badges)
- Status: green dot if last_status_code is 2xx, red if 4xx/5xx, gray if never triggered
- Toggle switch (active/inactive)
- Delete button

Add form:
- URL input
- Event checkboxes
- Description input
- On save: show the secret once in a modal ("copy this, you won't see it again")

## Events to support (Phase 1)

| Event | When |
|-------|------|
| `task.created` | New task added |
| `task.updated` | Task title, note, deadline, priority, status, list changed |
| `task.completed` | Task marked as complete or reopened |
| `task.deleted` | Task deleted |

Phase 2 (later): `list.created`, `list.deleted`, `member.added`, `member.removed`

## What this does NOT cover

- **Incoming API** — external services calling TaskView to create/update tasks. That's a separate feature with API keys and rate limiting.
- **Custom fields** — separate RFC, much bigger scope.
- **Plugin UI** — separate RFC, needs sandboxing and component API.
- **Real-time / WebSocket** — separate feature, different use case.

## Example integrations

### Slack notification
Register webhook for `task.created`. Consumer receives payload, formats a Slack message, posts to Slack API.
5 lines of code in any language.

### Zapier
Register webhook URL from Zapier's "Catch Hook" trigger. Zapier handles the rest — send to Google Sheets, email, whatever.
Zero code.

### Custom monitoring
Register webhook for `task.completed`. Consumer checks if task has "incident" tag, updates status page.
Small Python/Node script.
