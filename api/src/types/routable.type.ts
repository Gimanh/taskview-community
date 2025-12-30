import type { Router } from 'express';

export interface Routable {
    getRouter(): Router;
}
