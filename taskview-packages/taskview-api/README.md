# TaskView API

TypeScript/JavaScript SDK for the [TaskView](https://taskview.tech) API. Provides a typed interface for managing goals, task lists, tasks, tags, kanban boards, team collaboration, and task dependencies.

## Installation

```bash
npm install taskview-api axios
```

`axios` is a peer dependency — you provide your own configured instance.

## Quick Start

```typescript
import axios from 'axios';
import { TvApi } from 'taskview-api';

const $axios = axios.create({
    baseURL: 'https://api.taskview.app',
});
$axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

const api = new TvApi($axios);
```

You can change the base URL at any time:

```typescript
api.setBaseUrl('https://other-api.example.com');
```

## Authentication

All API requests (except auth endpoints) require a Bearer token in the `Authorization` header. Below is how to obtain and manage tokens.

### Login

**With email or username and password:**

```typescript
const response = await $axios.post('/module/auth/login', {
    login: 'user@example.com', // email or username
    password: 'securePassword123',
});

const { access, refresh, userData } = response.data;
```

**Passwordless login (email code):**

```typescript
// 1. Request a login code
await $axios.post('/module/auth/send-login-code', {
    email: 'user@example.com',
});

// 2. User receives a code via email, then submit it
const response = await $axios.post('/module/auth/login-by-code', {
    email: 'user@example.com',
    code: '123456',
});

const { access, refresh, userData } = response.data;
```

### Using Tokens

Once you have the access token, pass it to `TvApi` via the axios instance:

```typescript
import axios from 'axios';
import { TvApi } from 'taskview-api';

const $axios = axios.create({
    baseURL: 'https://api.taskview.tech',
});
$axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;

const api = new TvApi($axios);
```

Store the refresh token securely (e.g. `httpOnly` cookie or secure storage). The access token has a short lifetime; the refresh token lives longer (up to 30 days).

### Refreshing Tokens

When the access token expires the server returns `401 Unauthorized`. Use the refresh token to obtain a new pair:

```typescript
const response = await $axios.post('/module/auth/refresh/token', {
    refreshToken: refresh,
});

const { access: newAccess, refresh: newRefresh } = response.data;

// Update the axios header with the new access token
$axios.defaults.headers.common['Authorization'] = `Bearer ${newAccess}`;
```

### Logout

```typescript
await $axios.post('/module/auth/logout');
// Clear stored tokens on the client side
```


### OAuth Providers

TaskView supports OAuth login via **Google**, **GitHub**, and **Apple**. Redirect the user to:

```
GET /module/auth/provider/google
GET /module/auth/provider/github
GET /module/auth/provider/apple
```

After successful authentication the user is redirected back with a login code that can be exchanged for tokens via the `login-by-code` endpoint.

### JWT Payload Structure

The decoded access token contains:

```typescript
{
    exp: number;           // Expiration timestamp
    id: number;            // Token ID
    type: 'jwt';
    userData: {
        id: number;        // User ID
        email: string;
        login: string;
        permissions: {
            [key: string]: {
                id: number;
                name: string;
                description: string;
            };
        };
    };
}
```

## API Modules

The `TvApi` instance exposes the following modules:

| Module              | Access               | Description                            |
|---------------------|----------------------|----------------------------------------|
| Goals               | `api.goals`          | Create, update, delete, fetch goals    |
| Goal Lists          | `api.goalLists`      | Task lists within a goal               |
| Tasks               | `api.tasks`          | Full task CRUD, history, assignments   |
| Tags                | `api.tags`           | Tag management and task tagging        |
| Kanban              | `api.kanban`         | Columns, task ordering, pagination     |
| Graph               | `api.graph`          | Task dependency edges                  |
| Collaboration       | `api.collaboration`  | Users, roles, permissions              |

---

### Goals

```typescript
// Fetch all goals
const goals = await api.goals.fetchGoals();

// Create a goal
const goal = await api.goals.createGoal({
    name: 'Sprint 1',
    description: 'First sprint tasks',
    color: '#4A90D9',
});

// Update a goal
await api.goals.updateGoal({
    id: goal.id,
    name: 'Sprint 1 (updated)',
    archive: 0,
});

// Delete a goal
await api.goals.deleteGoal(goal.id);
```

### Goal Lists

Goal lists are task lists that belong to a goal.

```typescript
// Fetch lists for a goal
const lists = await api.goalLists.fetchLists({ goalId: goal.id });

// Create a list
const list = await api.goalLists.createList({
    goalId: goal.id,
    name: 'Backlog',
    description: 'Upcoming work',
});

// Update a list
await api.goalLists.updateList({
    id: list.id,
    name: 'Backlog (v2)',
});

// Delete a list
await api.goalLists.deleteList(list.id);
```

### Tasks

```typescript
// Fetch tasks with pagination and filters
const tasks = await api.tasks.fetch({
    goalId: goal.id,
    componentId: list.id,   // list ID, or -1401 for all tasks
    page: 1,
    showCompleted: 0,       // 0 = hide completed, 1 = show
    firstNew: 0,            // 0 = oldest first, 1 = newest first
    searchText: 'bug',      // optional text search
    filters: {              // optional filters
        selectedUser: 5,
        priority: 1,
        selectedTags: { '12': true, '15': true },
    },
});

// Create a task
const task = await api.tasks.createTask({
    goalId: goal.id,
    description: 'Fix login bug',
    priorityId: 1,          // 1 = low, 2 = medium, 3 = high
    goalListId: list.id,
    note: 'Details here',
    startDate: '2025-03-01',
    endDate: '2025-03-05',
});

// Update a task
await api.tasks.updateTask({
    id: task.id,
    description: 'Fix login bug (critical)',
    complete: true,
    priorityId: 3,
});

// Delete a task
await api.tasks.deleteTask(task.id);

// Fetch a single task by ID
const single = await api.tasks.fetchTaskById(task.id);

// Toggle user assignment
await api.tasks.toggleTasksAssignee({
    taskId: task.id,
    userId: 42,
});

// Task history
const history = await api.tasks.fetchTaskHistory(task.id);
await api.tasks.recoveryTaskHistory(history.history[0].historyId, task.id);
```

### Tags

```typescript
// Fetch all tags
const tags = await api.tags.fetchAllTagsForUser();

// Create a tag
const tag = await api.tags.createTag({
    name: 'urgent',
    color: '#FF0000',
    goalId: goal.id,
});

// Toggle tag on a task (adds if missing, removes if present)
await api.tags.toggleTag({ tagId: tag.id, taskId: task.id });

// Update a tag
await api.tags.updateTag({ id: tag.id, name: 'critical', color: '#CC0000' });

// Delete a tag
await api.tags.deleteTag({ tagId: tag.id });
```

### Kanban

```typescript
// Fetch all columns for a goal
const columns = await api.kanban.fetchAllColumns(goal.id);

// Add a column
const column = await api.kanban.addColumn({
    goalId: goal.id,
    name: 'In Progress',
});

// Fetch tasks for a column (cursor-based pagination)
const result = await api.kanban.fetchTasksForColumn(goal.id, column.id, null);
// result.tasks, result.nextCursor, result.columnVersion

// Move a task between columns / reorder
await api.kanban.updateTasksOrderAndColumn({
    goalId: goal.id,
    columnId: column.id,
    taskId: task.id,
    prevTaskId: null,
    nextTaskId: 10,
});

// Update a column
await api.kanban.updateColumn({ id: column.id, goalId: goal.id, name: 'Review' });

// Delete a column
await api.kanban.deleteColumn({ id: column.id, goalId: goal.id });
```

### Graph (Task Dependencies)

```typescript
// Add a dependency edge (source -> target)
const edge = await api.graph.addEdge({ source: 1, target: 2 });

// Fetch all edges for a goal
const edges = await api.graph.fetchAllEdges(goal.id);

// Delete an edge
await api.graph.deleteEdge(edge.id);
```

### Collaboration

```typescript
// Invite a user by email
await api.collaboration.inviteUserToGoal({
    goalId: goal.id,
    email: 'user@example.com',
});

// Fetch goal members
const members = await api.collaboration.fetchUsersForGoal(goal.id);

// Remove a user
await api.collaboration.deleteUserFromGoal({
    goalId: goal.id,
    userId: 5,
});

// Roles
const roles = await api.collaboration.fetchRolesForGoal(goal.id);
const newRole = await api.collaboration.createRoleForGoal({
    goalId: goal.id,
    name: 'Developer',
});
await api.collaboration.toggleUserRoles({
    goalId: goal.id,
    userId: 5,
    roleId: newRole.id,
});

// Permissions
const allPermissions = await api.collaboration.fetchAllPermissions();
await api.collaboration.toggleRolePermission({
    goalId: goal.id,
    roleId: newRole.id,
    permissionId: 3,
});
await api.collaboration.deleteRoleFromGoal({
    goalId: goal.id,
    roleId: newRole.id,
});
```

## Permissions

The package exports `TvPermissions` — a map of all permission constants:

```typescript
import { TvPermissions } from 'taskview-api';

TvPermissions.GOAL_CAN_DELETE           // 'goal_can_delete'
TvPermissions.GOAL_CAN_EDIT            // 'goal_can_edit'
TvPermissions.GOAL_CAN_MANAGE_USERS    // 'goal_can_manage_users'
TvPermissions.GOAL_CAN_WATCH_CONTENT   // 'goal_can_watch_content'
TvPermissions.GOAL_CAN_ADD_TASK_LIST   // 'goal_can_add_task_list'

TvPermissions.COMPONENT_CAN_DELETE     // 'component_can_delete'
TvPermissions.COMPONENT_CAN_EDIT       // 'component_can_edit'
TvPermissions.COMPONENT_CAN_WATCH_CONTENT // 'component_can_watch_content'
TvPermissions.COMPONENT_CAN_ADD_TASKS  // 'component_can_add_tasks'

TvPermissions.TASK_CAN_DELETE          // 'task_can_delete'
TvPermissions.TASK_CAN_EDIT_DESCRIPTION // 'task_can_edit_description'
TvPermissions.TASK_CAN_EDIT_STATUS     // 'task_can_edit_status'
TvPermissions.TASK_CAN_EDIT_NOTE       // 'task_can_edit_note'
TvPermissions.TASK_CAN_EDIT_DEADLINE   // 'task_can_edit_deadline'
TvPermissions.TASK_CAN_EDIT_TAGS       // 'task_can_edit_tags'
TvPermissions.TASK_CAN_EDIT_PRIORITY   // 'task_can_edit_priority'
TvPermissions.TASK_CAN_ASSIGN_USERS    // 'task_can_assign_users'
TvPermissions.TASK_CAN_ACCESS_HISTORY  // 'task_can_access_history'
// ... and more

TvPermissions.KANBAN_CAN_MANAGE       // 'kanban_can_manage'
TvPermissions.KANBAN_CAN_VIEW         // 'kanban_can_view'

TvPermissions.GRAPH_CAN_MANAGE        // 'graph_can_manage'
TvPermissions.GRAPH_CAN_VIEW          // 'graph_can_view'
```

## Build Formats

The library ships in three formats:

- **ES Module** — `taskview-api.es.js`
- **CommonJS** — `taskview-api.cjs.js`
- **UMD** — `taskview-api.umd.js`
- **TypeScript declarations** — `index.d.ts`

## Example

```typescript
import axios from 'axios';
import { TvApi } from 'taskview-api';

const BASE_URL = 'http://localhost:1401';

const $axios = axios.create({ baseURL: BASE_URL });

async function login(): Promise<{ access: string; refresh: string }> {
    const { data } = await $axios.post('/module/auth/login', {
        login: 'test@mail.dest',
        password: 'user1!#Q',
    });
    return data;
}

async function main() {
    // 1. Authenticate
    console.log('Logging in...');
    const { access, refresh } = await login();
    console.log('Logged in. Access token received.');

    // 2. Set auth header and create API instance
    $axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
    const api = new TvApi($axios);

    // 3. Goals
    console.log('\n--- Goals ---');
    const goals = await api.goals.fetchGoals();
    console.log(`Found ${goals.length} goal(s)`);

    const goal = await api.goals.createGoal({
        name: `Example Goal ${Date.now()}`,
        description: 'Created by taskview-api example',
        color: '#4A90D9',
    });
    console.log(`Created goal: id=${goal!.id}, name="${goal!.name}"`);

    // 4. Goal Lists
    console.log('\n--- Goal Lists ---');
    const list = await api.goalLists.createList({
        goalId: goal!.id,
        name: 'Backlog',
        description: 'Example task list',
    });
    console.log(`Created list: id=${list!.id}, name="${list!.name}"`);

    const lists = await api.goalLists.fetchLists({ goalId: goal!.id });
    console.log(`Goal has ${lists.length} list(s)`);

    // 5. Tasks
    console.log('\n--- Tasks ---');
    const task1 = await api.tasks.createTask({
        goalId: goal!.id,
        description: 'First task',
        priorityId: 1,
        goalListId: list!.id,
    });
    console.log(`Created task: id=${task1!.id}, "${task1!.description}"`);

    const task2 = await api.tasks.createTask({
        goalId: goal!.id,
        description: 'Second task (high priority)',
        priorityId: 3,
        goalListId: list!.id,
        note: 'This is an important task',
    });
    console.log(`Created task: id=${task2!.id}, "${task2!.description}"`);

    const tasks = await api.tasks.fetch({
        goalId: goal!.id,
        componentId: list!.id,
        page: 1,
        showCompleted: 0,
        firstNew: 0,
    });
    console.log(`Fetched ${tasks.length} task(s) from list`);

    // 6. Update a task
    await api.tasks.updateTask({
        id: task1!.id,
        description: 'First task (updated)',
        complete: true,
    });
    console.log(`Marked task ${task1!.id} as complete`);

    // 7. Tags
    console.log('\n--- Tags ---');
    const tag = await api.tags.createTag({
        name: 'example-tag',
        color: '#FF5733',
        goalId: goal!.id,
    });
    console.log(`Created tag: id=${tag!.id}, name="${tag!.name}"`);

    await api.tags.toggleTag({ tagId: tag!.id, taskId: task2!.id });
    console.log(`Added tag "${tag!.name}" to task ${task2!.id}`);

    // 8. Kanban
    console.log('\n--- Kanban ---');
    const column = await api.kanban.addColumn({
        goalId: goal!.id,
        name: 'In Progress',
    });
    console.log(`Created kanban column: id=${column.id}, name="${column.name}"`);

    const columns = await api.kanban.fetchAllColumns(goal!.id);
    console.log(`Goal has ${columns.length} kanban column(s)`);

    // 9. Graph (task dependencies)
    console.log('\n--- Graph ---');
    const edge = await api.graph.addEdge({
        source: task1!.id,
        target: task2!.id,
    });
    console.log(`Created dependency: task ${edge.fromTaskId} → task ${edge.toTaskId}`);

    const edges = await api.graph.fetchAllEdges(goal!.id);
    console.log(`Goal has ${edges.length} dependency edge(s)`);

    // 10. Cleanup
    console.log('\n--- Cleanup ---');
    await api.graph.deleteEdge(edge.id);
    console.log('Deleted dependency edge');

    await api.kanban.deleteColumn({ id: column.id, goalId: goal!.id });
    console.log('Deleted kanban column');

    await api.tags.deleteTag({ tagId: tag!.id });
    console.log('Deleted tag');

    await api.tasks.deleteTask(task2!.id);
    await api.tasks.deleteTask(task1!.id);
    console.log('Deleted tasks');

    await api.goalLists.deleteList(list!.id);
    console.log('Deleted list');

    await api.goals.deleteGoal(goal!.id);
    console.log('Deleted goal');

    console.log('\nDone! All examples completed successfully.');
}

main().catch((err) => {
    console.error('Error:', err.response?.data || err.message);
    process.exit(1);
});

```