// https://github.com/Gimanh/taskview-community/issues/88
// GH-88: one worker per core ('max') multiplied by the per-worker DB pool
// (DB_POOL_MAX, default 20) exhausts Postgres max_connections (default 100)
// on many-core hosts. Default to 2 workers; scale explicitly via PM2_INSTANCES.
// If you set PM2_INSTANCES to 'max', size DB_POOL_MAX yourself so that
// workers × DB_POOL_MAX stays below the Postgres max_connections limit.
const rawInstances = process.env.PM2_INSTANCES;
const instances = rawInstances === 'max'
    ? 'max'
    : Number(rawInstances) > 0
        ? Number(rawInstances)
        : 2;

const poolMax = Number(process.env.DB_POOL_MAX) > 0 ? Number(process.env.DB_POOL_MAX) : 20;

if (instances === 'max') {
    console.warn(
        '[taskview] PM2_INSTANCES=max spawns one worker per CPU core, each with its own '
        + `DB pool (${poolMax} connections). Make sure workers x DB_POOL_MAX stays below `
        + 'the Postgres max_connections limit (default 100).'
    );
} else if (instances * poolMax > 80) {
    console.warn(
        `[taskview] DB connection budget: ${instances} worker(s) x ${poolMax} pool connections = `
        + `${instances * poolMax} potential connections. Postgres default max_connections is 100 - `
        + 'lower PM2_INSTANCES or DB_POOL_MAX if the database rejects connections.'
    );
}

module.exports = {
    apps: [
        {
            name: 'taskview-server',
            script: 'taskview-server.js',
            instances,
            watch: true,
            ignore_watch: ['logs'],
            autorestart: true,
            max_memory_restart: '1G',
            env_production: {
                NODE_ENV: 'production',
            },
        },
    ],
};
