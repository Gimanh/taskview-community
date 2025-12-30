export default async function teardown() {
    await cleanDatabase();
    console.log('Database cleaned teardown');
}

async function cleanDatabase() {
    const tables = ['tasks.goals', 'tasks.goals', 'collaboration.users', 'history.tasks_tasks', 'collaboration.users'];

    for (const table of tables) {
        await (global as any).__TEST_DB_CLIENT__.query(`TRUNCATE TABLE ${table} CASCADE;`);
    }

    (global as any).__TEST_DB_CLIENT__.end();
}
