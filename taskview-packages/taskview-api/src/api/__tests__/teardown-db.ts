export default async function teardown() {
    await cleanDatabase();
    console.log('Database cleaned teardown');
}

async function tableExists(client: any, table: string) {
    const [schema, name] = table.split('.');
    const result = await client.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2`,
        [schema, name]
    );
    return result.rowCount! > 0;
}

async function cleanDatabase() {
    const client = (global as any).__TEST_DB_CLIENT__;

    // Delete non-personal organizations (preserves personal workspaces)
    if (await tableExists(client, 'tv_auth.organization_members')) {
        await client.query(`DELETE FROM tv_auth.organization_members WHERE organization_id IN (SELECT id FROM tv_auth.organizations WHERE is_personal = 0);`);
        await client.query(`DELETE FROM tv_auth.organizations WHERE is_personal = 0;`);
    }

    const tables = [
        'tv_auth.api_tokens',
        'history.tasks_tasks',
        'collaboration.users',
        'tasks.goals',
    ];

    for (const table of tables) {
        if (await tableExists(client, table)) {
            await client.query(`TRUNCATE TABLE ${table} CASCADE;`);
        }
    }

    (global as any).__TEST_DB_CLIENT__.end();
}
