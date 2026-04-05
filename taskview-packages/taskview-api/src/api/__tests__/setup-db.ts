import { DB_CREDENTIALS } from "./db-credentials";
import { Client } from 'pg';

let dbClient: Client;

export default async function setup() {
    dbClient = new Client({
        host: DB_CREDENTIALS.DB_HOST || 'localhost',
        port: parseInt(DB_CREDENTIALS.DB_PORT || '15432'),
        database: DB_CREDENTIALS.DB_NAME || 'taskviewdb',
        user: DB_CREDENTIALS.DB_USER || 'tvdbuser',
        password: DB_CREDENTIALS.DB_PASSWORD || 'tvdbpass',
    });

    await dbClient.connect();

    await cleanDatabase();

    await addUsersIfNotExists();

    (global as any).__TEST_DB_CLIENT__ = dbClient;

    // Возвращаем функцию teardown, которая будет вызвана после всех тестов
    return async function teardown() {
        await cleanDatabase();
        await dbClient.end();
        console.log('Database cleaned and connection closed');
    };
}

async function tableExists(table: string) {
    const [schema, name] = table.split('.');
    const result = await dbClient.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2`,
        [schema, name]
    );
    return result.rowCount! > 0;
}

async function cleanDatabase() {
    // Delete non-personal organizations (preserves personal workspaces)
    if (await tableExists('tv_auth.organization_members')) {
        await dbClient.query(`DELETE FROM tv_auth.organization_members WHERE organization_id IN (SELECT id FROM tv_auth.organizations WHERE is_personal = 0);`);
        await dbClient.query(`DELETE FROM tv_auth.organizations WHERE is_personal = 0;`);
        console.log('Cleaned non-personal organizations');
    }

    const tables = [
        'tv_auth.api_tokens',
        'history.tasks_tasks',
        'collaboration.users',
        'tasks.goals',
    ];

    for (const table of tables) {
        if (await tableExists(table)) {
            await dbClient.query(`TRUNCATE TABLE ${table} CASCADE;`);
            console.log(`Truncated table ${table}`);
        }
    }
}

async function addUsersIfNotExists() {
    // Password for both: user1!#Q
    const hash = '$2a$10$oGfwSbhvI.8I.RfW5oUayOUk61O50aGy5xzMC56UMEWDr.E0o09NK';
    await dbClient.query(`
        INSERT INTO tv_auth.users (login, email, password, block)
        VALUES
            ('user', 'user@test.com', '${hash}', 0),
            ('user2', 'user2@test.com', '${hash}', 0)
        ON CONFLICT DO NOTHING;
    `);

    // Create personal workspaces if organizations table exists
    if (await tableExists('tv_auth.organizations')) {
        await dbClient.query(`
            INSERT INTO tv_auth.organizations (name, slug, owner_id, is_personal)
            SELECT
                u.login || '''s workspace',
                'org-' || substr(md5(random()::text), 1, 8),
                u.id,
                1
            FROM tv_auth.users u
            WHERE u.login IN ('user', 'user2')
              AND NOT EXISTS (
                SELECT 1 FROM tv_auth.organizations o
                WHERE o.owner_id = u.id AND o.is_personal = 1
              );
        `);

        await dbClient.query(`
            INSERT INTO tv_auth.organization_members (organization_id, email, role)
            SELECT o.id, u.email, 'owner'
            FROM tv_auth.organizations o
            JOIN tv_auth.users u ON u.id = o.owner_id
            WHERE o.is_personal = 1
            ON CONFLICT (organization_id, email) DO NOTHING;
        `);
        console.log('Created personal workspaces for test users');
    }
}
