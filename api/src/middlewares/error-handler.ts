import type { NextFunction, Request, Response } from 'express';

interface CustomError extends Error {
    status?: number;
}

const errorHandler = (err: CustomError, _req: Request, res: Response, _next: NextFunction) => {
    const statusCode = err.status || 500;

    const isProduction = process.env.NODE_ENV === 'production';
    const userMessage = isProduction ? 'Internal Server Error' : err.message || 'Something went wrong';

    res.status(statusCode).json({
        message: userMessage,
    });
};

export default errorHandler;
