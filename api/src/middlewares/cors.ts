import cors from 'cors';

const allow = new Set([
    ...(process.env.CORS_REMOVE_DEFAULT_ALLOWED_ORIGINS === 'true' ? [] : [
        'https://app.taskview.tech',
        'https://taskview.handscream.com',
        'capacitor://taskview.handscream.com',
        'capacitor://app.taskview.tech',
        'https://appleid.apple.com',
    ]),
    ...(process.env.CORS_ALLOWED_ORIGINS?.split(',') || []),
]);

export const corsMiddleware = cors({
    credentials: true,
    maxAge: 600,
    origin(origin, cb) {
        if (!origin || origin === 'null') return cb(null, true);
        if (allow.has(origin)) return cb(null, true);
        return cb(new Error(`CORS blocked origin: ${origin}`), false);
    },
});
