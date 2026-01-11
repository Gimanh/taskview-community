import cors from 'cors';
import express, { type Request, type Response } from 'express';
import helmet from 'helmet';
import { appUserMiddleware } from './middlewares/app-user-middleware';
import errorHandler from './middlewares/error-handler';
import routes from './routes';
import passport, { initPassportLogin } from './tv-modules/auth/strategies/passport-login';

const VRS = '1.18.0';

export default class App {
    public app: express.Application;
    public port: number;

    constructor(port: number) {
        this.app = express();
        this.port = port;

        this.initializeMiddlewares();
        this.initializeRoutes();
        this.app.use(errorHandler);
        this.app.use(passport.initialize());
        initPassportLogin();
    }

    private initializeMiddlewares() {
        //add tvJson method, clien need response format like {response: data}
        this.app.use((_req: Request, res: Response, next) => {
            res.tvJson = function (data: any) {
                this.json({ response: data });
            };
            next();
        });

        this.app.use(appUserMiddleware);
        this.app.use(cors());
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
            console.log(`Server version is ${VRS}`);
        });
    }
}
