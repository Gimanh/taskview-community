import { z } from 'zod';

export const AppEnvSchema = z.object({
    LIC_PASSWORD: z.string().optional(),
    DB_HOST: z.string(),
    DB_USER: z.string(),
    DB_PASSWORD: z.string(),
    DB_NAME: z.string(),
    DB_PORT: z.string(),
    APP_PORT: z.string(),
    JWT_ALG: z.string(),
    JWT_SIGN: z.string(),

    ACCESS_LIFE_TIME: z.string(),
    REFRESH_LIFE_TIME: z.string(),

    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.string().optional(),
    SMTP_USERNAME: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    SMTP_ENCRYPTION: z.string().optional(),
    SMTP_FROM_NAME: z.string().optional(),
    SMTP_FROM_EMAIL: z.string().optional(),
    APP_URL: z.string(),

    // How account password changes are confirmed: code sent by email (default) or current password
    PASSWORD_CHANGE_CONFIRMATION: z.enum(['email', 'password']).optional(),

    TELEGRAM_BOT_TOKEN: z.string().optional(),
    TELEGRAM_BOT_USERNAME: z.string().optional(),
    TELEGRAM_WEBHOOK_SECRET: z.string().optional(),

    SLACK_CLIENT_ID: z.string().optional(),
    SLACK_CLIENT_SECRET: z.string().optional(),
    SLACK_CALLBACK_URL: z.string().optional(),
    SLACK_SIGNING_SECRET: z.string().optional(),
});

export const StringToNumber = z
    .union([z.string(), z.number()])
    .transform((value) => Number(value))
    .refine((val) => !isNaN(val), { message: 'Invalid number' });

export const StringToNumberOrNull = z
    .union([z.string(), z.number(), z.null()])
    .transform((value) => (value === null ? null : Number(value)))
    .refine((val) => val === null || !isNaN(val), { message: 'Invalid number' });

export const LicTypeScheme = z.object({
    version: z.string(),
    features: z.string(),
    owner: z.string().email(),
    company: z.string(),
});
