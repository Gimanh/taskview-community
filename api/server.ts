import { config } from 'dotenv';
import App from './src/App';
import { Database } from './src/modules/db';
import { AppEnvSchema } from './src/types/app.types';

config({ override: true });

const valid = AppEnvSchema.safeParse(process.env);
if (!valid.success) {
    console.log(valid);
    console.log(valid.error);
    throw new Error('Invalid environment variables');
}

const app = new App((process.env.APP_PORT as unknown as number) || 1401);

app.listen();

Database.getInstance().testDBConnection();

export const viteNodeApp = app.app;
