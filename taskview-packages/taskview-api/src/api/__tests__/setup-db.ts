import { DB_CREDENTIALS } from "./db-credentials";
import { Client } from 'pg';

let dbClient: Client;

export default async function setup() {
    dbClient = new Client({
        host: DB_CREDENTIALS.DB_HOST || 'localhost',
        port: parseInt(DB_CREDENTIALS.DB_PORT || '5454'),
        database: DB_CREDENTIALS.DB_NAME || 'task_view_test_db',
        user: DB_CREDENTIALS.DB_USER || 'tv-test-db-user',
        password: DB_CREDENTIALS.DB_PASSWORD || 'tv-test-db-password',
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

async function cleanDatabase() {
    const tables = ['tasks.goals', 'tasks.goals', 'collaboration.users', 'history.tasks_tasks', 'collaboration.users'];

    for (const table of tables) {
        await dbClient.query(`TRUNCATE TABLE ${table} CASCADE;`);
        console.log(`Truncated table ${table}`);
    }
}

async function addUsersIfNotExists() {
    const users = await dbClient.query(`SELECT * FROM tv_auth.users where login = 'user2';`);
    if (users.rows.length === 0) {
        await dbClient.query(`INSERT INTO tv_auth.users (login,email,password,block) VALUES ('user2','test2@mail.dest','$2y$10$q8SLauZ0Syz9aEFdiq0i8.jIlafLj5T0ujXYD7RmRzyNkZ2hR7uhO', 0);`);
    }
}
