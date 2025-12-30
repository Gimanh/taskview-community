module.exports = {
    apps: [
        {
            name: 'taskview-server',
            script: 'taskview-server.js',
            instances: 'max',
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
