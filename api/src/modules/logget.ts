import path from 'path';
import pino from 'pino';
import { createStream } from 'rotating-file-stream';

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


export const $logger = pino(
    {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
    logStream
);
