import express, { type Request, type Response } from 'express';
import helmet from 'helmet';
import { appUserMiddleware } from './middlewares/app-user-middleware';
import { corsMiddleware } from './middlewares/cors';
import errorHandler from './middlewares/error-handler';
import routes from './routes';
import passport, { initPassportLogin } from './tv-modules/auth/strategies/passport-login';
import { LoginMethods } from './tv-modules/auth/LoginMethods';
import { PublicApiUrl } from './modules/public-url';
import cookieParser from 'cookie-parser';
import { registerAllEventHandlers, startAllWorkers } from './core/all-events';

export default class App {
    public app: express.Application;
    public port: number;

    constructor(port: number) {
        LoginMethods.validateOnStartup();
        PublicApiUrl.validateOnStartup();

        this.app = express();
        this.port = port;

        this.extendApp();

        this.initializeMiddlewares();
        registerAllEventHandlers();
        this.initializeRoutes();
        this.app.use(errorHandler);
        this.app.use(passport.initialize());
        initPassportLogin();

        this.extendMiddlewares();
    }

    protected extendApp(): void { }
    protected extendMiddlewares(): void { }

    private resolveTrustProxy(): boolean | number | string {
        const raw = process.env.TRUST_PROXY?.trim();
        if (!raw || raw.toLowerCase() === 'false') return false;
        if (raw.toLowerCase() === 'true') return true;
        if (/^\d+$/.test(raw)) return Number(raw);
        return raw;
    }

    private initializeMiddlewares() {
        this.app.set('trust proxy', this.resolveTrustProxy());

        //add tvJson method, clien need response format like {response: data}
        this.app.use((_req: Request, res: Response, next) => {
            res.tvJson = function (data: any) {
                this.json({ response: data });
            };
            next();
        });

        this.app.use(helmet());
        this.app.use(corsMiddleware);
        this.app.use(cookieParser());
        this.app.use(express.json({
            verify: (req: any, _res, buf) => {
                // Store raw body for webhook signature verification github and gitlab integrations
                if (req.url?.includes('/webhook/')) {
                    req.rawBody = buf;
                }
            },
        }));
        this.app.use(express.urlencoded({
            extended: true,
            verify: (req: any, _res, buf) => {
                // Slack sends slash commands / interactivity as urlencoded; keep the raw body
                // for HMAC signature verification (VerifySlackRequest).
                if (req.url?.includes('/messaging/slack/')) {
                    req.rawBody = buf;
                }
            },
        }));
        this.app.use(appUserMiddleware);
    }

    private initializeRoutes() {
        for (const i in routes) {
            this.app.use(i, new routes[i]().getRouter());
        }
    }

    public listen() {
        return this.app.listen(this.port, '0.0.0.0', async () => {
            console.log(`Server is running on port ${this.port}`);
            await startAllWorkers();
        });
    }
}
