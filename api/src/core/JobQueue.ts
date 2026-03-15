import { PgBoss } from 'pg-boss';
import { $logger } from '../modules/logget';

let boss: PgBoss | null = null;

export async function startJobQueue(): Promise<PgBoss> {
    boss = new PgBoss({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: +process.env.DB_PORT!,
        schema: 'pgboss',
    });

    boss.on('error', (err) => {
        $logger.error(err, '[JobQueue] Error');
    });

    await boss.start();
    $logger.info('[JobQueue] Started');

    return boss;
}

export function getJobQueue(): PgBoss {
    if (!boss) {
        throw new Error('JobQueue not started. Call startJobQueue() first.');
    }
    return boss;
}
