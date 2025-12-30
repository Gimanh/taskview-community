import { config } from 'dotenv';
import fs from 'fs/promises';
import { join, resolve } from 'path';

config();

type MigrateStructure = Record<
    string,
    {
        version: string;
        name: string;
        releaseDate: string;
        scripts: string[];
        description: string[];
    }
>;

import { Pool, type QueryResult, type QueryResultRow } from 'pg';

class Database {
    private static instance: Database;
    private pool: InstanceType<typeof Pool>;

    private constructor() {
        console.log(process.env.DB_HOST, process.env.DB_NAME);
        if (!process.env.DB_HOST || !process.env.DB_NAME) {
            throw new Error('Define process.env.DB_HOST and process.env.DB_NAME');
        }
        this.pool = new Pool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: +process.env.DB_PORT!,
            idleTimeoutMillis: 30000,
        });
    }

    public static getInstance(): Database {
        if (!Database.instance) {
            Database.instance = new Database();
        }
        return Database.instance;
    }

    public async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
        const start = Date.now();
        const client = await this.pool.connect();
        try {
            const res = await client.query(text, params);
            const duration = Date.now() - start;
            console.log('executed query', { text, duration, rows: res.rowCount });
            return res;
        } catch (err) {
            console.error(err, 'Database query error:');
            throw err;
        } finally {
            client.release();
        }
    }

    public async getClient() {
        const client = await this.pool.connect();
        const query = client.query;
        const release = client.release;

        const timeout = setTimeout(() => {
            console.error('A client has been checked out for more than 20 seconds!');

            console.error(
                `The last executed query on this client was: ${client.lastQuery}`
            );
        }, 20000);

        client.query = (...args) => {
            
            client.lastQuery = args;
            
            return query.apply(client, args);
        };

        client.release = () => {
            clearTimeout(timeout);
            client.query = query;
            client.release = release;
            return release.apply(client);
        };
        return client;
    }
}

async function migrate() {
    const CURRENT_VERSION_IS_LESS = -1;

    let createDbData: { scripts: string[] } = { scripts: [] };
    let migrationData: MigrateStructure = {};
    const db = Database.getInstance();
    const client = await db.getClient();

    async function fetchVersion() {
        const result = await client.query<{ version: string }>('SELECT * FROM app.version WHERE id = $1;', [1]);
        return result.rows[0].version;
    }

    async function setEnvironment() {
        createDbData = JSON.parse(await fs.readFile(resolve(__dirname, 'taskview/install.json'), 'utf-8'));
        migrationData = JSON.parse(await fs.readFile(resolve(__dirname, 'taskview/migrate.json'), 'utf-8'));
    }

    async function disconnectOthers() {
        await client.query(
            `SELECT pg_terminate_backend(pg_stat_activity.pid)
                    FROM pg_stat_activity
                    WHERE pg_stat_activity.datname = $1
                      AND pid <> pg_backend_pid();`,
            [process.env.DB_NAME]
        );
    }

    function compareVersions(version1: string, version2: string) {
        const v1 = version1.split('.').map(Number);
        const v2 = version2.split('.').map(Number);

        const maxLength = Math.max(v1.length, v2.length);

        for (let i = 0; i < maxLength; i++) {
            const num1 = v1[i] || 0;
            const num2 = v2[i] || 0;

            if (num1 > num2) return 1; 
            if (num1 < num2) return -1; 
        }

        return 0;
    }

    async function execScripts(scripts: MigrateStructure[string]['scripts']) {
        for (const script of scripts) {
            console.info(`>>>>>>>>>>>>>>_____Exec script ${script}`);
            const data = await fs.readFile(join(__dirname, 'taskview', 'sql', script), 'utf-8');
            await client.query(data).catch((err) => {
                console.error(`Message: ${err.message}`);
                console.error(`Detail: ${err.detail}`);
            });
        }
    }

    async function updateDescription(item: MigrateStructure[keyof MigrateStructure]) {
        const result = await client
            .query(`INSERT INTO about.versions (version, description, date) VALUES ($1,$2,$3) RETURNING id;`, [
                item.version,
                item.name,
                item.releaseDate,
            ])
            .catch((err) => {
                console.error(`Message: ${err.message}`);
                console.error(`Detail: ${err.detail}`);
            });

        if (result) {
            item.description.forEach(async (desc) => {
                await client
                    .query(`INSERT INTO about.version_description (version_id, description) VALUES ($1,$2);`, [
                        result.rows[0].id,
                        desc,
                    ])
                    .catch((err) => {
                        console.error(`Message: ${err.message}`);
                        console.error(`Detail: ${err.detail}`);
                    });
            });
        }
    }

    async function updateVersion(version: string) {
        await client.query(`UPDATE app.version SET version = $1 WHERE id = $2;`, [version, 1]);
    }

    async function update() {
        console.log('\x1b[32m%s\x1b[0m', 'Update start');

        await setEnvironment();
        try {
            await client.query('BEGIN');
            await disconnectOthers();

            if (process.argv.includes('--create')) {
                console.log('\x1b[32m%s\x1b[0m', 'Start creating DB structure');
                await execScripts(createDbData.scripts);
                console.log('\x1b[32m%s\x1b[0m', 'End creating DB structure');
            }
            await client.query('COMMIT');
            await client.query('BEGIN');
            const currentVersion = await fetchVersion();

            console.log('\x1b[32m%s\x1b[0m', 'Start migration');

            for (const k in migrationData) {
                const item = migrationData[k];
                if (compareVersions(currentVersion, item.version) === CURRENT_VERSION_IS_LESS) {
                    console.info('\x1b[32m%s\x1b[0m', `Run update database for version ${item.version}`);
                    await execScripts(item.scripts);
                    await updateDescription(item);
                    await updateVersion(item.version);
                }
            }
            console.log('\x1b[32m%s\x1b[0m', 'End migration');
            await client.query('COMMIT');
        } catch (e: unknown) {
            await client.query('ROLLBACK');
            console.error('Transaction rolled back due to an error', (e as Error).message);
            process.exit(1);
        } finally {
            client.release();
        }
        process.exit(0);
    }
    
    await update();
}

migrate();
