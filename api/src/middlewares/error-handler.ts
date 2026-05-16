import type { NextFunction, Request, Response } from 'express';
import { corsMiddleware } from './cors';

interface CustomError extends Error {
    status?: number;
}

const sendError = (err: CustomError, res: Response) => {
    const statusCode = err.status || 500;
    const isProduction = process.env.NODE_ENV === 'production';
    const userMessage = isProduction ? 'Internal Server Error' : err.message || 'Something went wrong';
    res.status(statusCode).json({ message: userMessage });
};

const errorHandler = (err: CustomError, req: Request, res: Response, _next: NextFunction) => {
    // Re-run the same cors middleware so error responses get CORS headers even when
    // the original pass was bypassed (error thrown before it ran). Reusing the actual
    // middleware preserves the allowlist policy — disallowed origins still get no headers.
    if (res.getHeader('Access-Control-Allow-Origin')) {
        sendError(err, res);
        return;
    }
    corsMiddleware(req, res, () => sendError(err, res));
};

export default errorHandler;
