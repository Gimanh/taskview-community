import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type QueryResult, type QueryResultRow } from 'pg';
import { $logger } from './logget';

export class Database {
    private static instance: Database;
    private pool: InstanceType<typeof Pool>;
    public dbDrizzle: ReturnType<typeof drizzle>;

    private constructor() {
        this.pool = new Pool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: +process.env.DB_PORT!,
            idleTimeoutMillis: 30000,
        });

        this.dbDrizzle = drizzle({ client: this.pool, casing: 'camelCase' });
    }

    public async testDBConnection() {
        try {
            const res = await this.pool.query('SELECT 1');
            console.log('✅ Database connected:', res.rows);
            // ONLY DEBUG
            // $logger.error(res.rows, '✅ Database connected:');
        } catch (err: any) {
            console.error('❌ Database connection error:', err.message);
            // ONLY DEBUG
            // $logger.error(err.message, '❌ Database connection error:');
        } finally {
            // await this.pool.end();
        }
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
            $logger.info('executed query', { text, duration, rows: res.rowCount });
            // console.log('executed query', { text, duration, rows: res.rowCount });
            return res;
        } catch (err) {
            $logger.error(err, 'Database query error:');
            // console.error('Database query error:', err);
            throw err;
        } finally {
            client.release();
        }
    }

    public async getClient() {
        const client = await this.pool.connect();
        const query = client.query;
        const release = client.release;

        // set a timeout of 5 seconds, after which we will log this client's last query
        const timeout = setTimeout(() => {
            console.error('A client has been checked out for more than 20 seconds!');

            console.error(
                //@ts-expect-error
                `The last executed query on this client was: ${client.lastQuery}`
            );
        }, 20000);

        // monkey patch the query method to keep track of the last query executed
        //@ts-expect-error
        client.query = (...args) => {
            //@ts-expect-error
            client.lastQuery = args;
            //@ts-expect-error
            return query.apply(client, args);
        };

        client.release = () => {
            // clear our timeout
            clearTimeout(timeout);
            // set the methods back to their old un-monkey-patched version
            client.query = query;
            client.release = release;
            return release.apply(client);
        };
        return client;
    }
}
