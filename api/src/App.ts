import cors from 'cors';
import express, { type Request, type Response } from 'express';
import helmet from 'helmet';
import { appUserMiddleware } from './middlewares/app-user-middleware';
import errorHandler from './middlewares/error-handler';
import routes from './routes';
import passport, { initPassportLogin } from './tv-modules/auth/strategies/passport-login';
import cookieParser from 'cookie-parser';

const allow = new Set([
    ...(process.env.CORS_REMOVE_DEFAULT_ALLOWED_ORIGINS === 'true' ? [] : [
        // default allowed origins for official TaskView apps
        "https://app.taskview.tech",
        "https://taskview.handscream.com",
        "capacitor://taskview.handscream.com",
        "capacitor://app.taskview.tech",
    ]),
]);

export default class App {
    public app: express.Application;
    public port: number;

    constructor(port: number) {
        this.app = express();
        this.port = port;

        this.extendApp();

        this.initializeMiddlewares();
        this.initializeRoutes();
        this.app.use(errorHandler);
        this.app.use(passport.initialize());
        initPassportLogin();

        this.extendMiddlewares();
    }

    protected extendApp(): void { }
    protected extendMiddlewares(): void { }

    private initializeMiddlewares() {
        //add tvJson method, clien need response format like {response: data}
        this.app.use((_req: Request, res: Response, next) => {
            res.tvJson = function (data: any) {
                this.json({ response: data });
            };
            next();
        });

        this.app.use(cookieParser());
        this.app.use(appUserMiddleware);

        this.app.use(cors({
            credentials: true,
            origin(origin, cb) {
                if (!origin) return cb(null, true);
                if (allow.has(origin)) return cb(null, true);
                return cb(new Error(`CORS blocked origin: ${origin}`), false);
            },
        }));

        this.app.use(helmet());
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
    }

    private initializeRoutes() {
        for (const i in routes) {
            this.app.use(i, new routes[i]().getRouter());
        }
    }

    public listen() {
        return this.app.listen(this.port, '0.0.0.0', () => {
            console.log(`Server is running on port ${this.port}`);
        });
    }
}
