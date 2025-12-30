import type { AppUser } from './src/core/AppUser';

declare global {
    namespace Express {
        interface Request {
            appUser: AppUser;
        }

        interface Response {
            tvJson<T extends any>(data: T): void;
        }
    }
}
