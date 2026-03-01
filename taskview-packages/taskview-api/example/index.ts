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
