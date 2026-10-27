import path from 'path';
import pino from 'pino';
import { createStream } from 'rotating-file-stream';
import { LOG_LEVELS, resolveLogLevel } from './log-level';

const generator = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = `${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    const day = `${date.getDate().toString().padStart(2, '0')}`;
    return `log-${year}-${month}-${day}.log`;
};

const logStream = createStream(generator, {
    interval: '1d',
    path: path.join('./logs'),
});

const { level, invalidValue } = resolveLogLevel(process.env);

export const $logger = pino({ level }, logStream);

if (invalidValue !== null) {
    const message = `[logger] LOG_LEVEL="${invalidValue}" is not supported (${LOG_LEVELS.join(', ')}) - using ${level}`;
    console.warn(message);
    $logger.warn(message);
}
