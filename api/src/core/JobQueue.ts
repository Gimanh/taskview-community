import { PgBoss } from 'pg-boss';
import { $logger } from '../modules/logget';
import { Database } from '../modules/db';

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

/** Cancel jobs by singletonKey — finds and deletes matching queued jobs */
export async function cancelJobBySingletonKey(queueName: string, singletonKey: string): Promise<void> {
    if (!boss) return;
    const db = Database.getInstance();
    const result = await db.query<{ id: string }>(
        `SELECT id FROM pgboss.job WHERE name = $1 AND singleton_key = $2 AND state IN ('created', 'retry')`,
        [queueName, singletonKey],
    );

    const count = result?.rows?.length ?? 0;
    if (count === 0) {
        $logger.info(`[JobQueue] Cancel: no jobs found for key="${singletonKey}"`);
        return;
    }

    for (const row of result!.rows) {
        await boss.deleteJob(queueName, row.id);
        $logger.info(`[JobQueue] Deleted job id=${row.id} key="${singletonKey}"`);
    }
}
