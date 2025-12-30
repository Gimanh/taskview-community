import { z } from 'zod';
import { StringToNumber } from './app.types';

export const FetchAnalyticsDataSchema = z.object({
    startDate: z.string(),
    endDate: z.string(),
});

export type FetchAnalyticsDataArg = z.infer<typeof FetchAnalyticsDataSchema>;

export const FetchAnalyticsDataForProjectScheme = z.object({
    goalId: StringToNumber,
    dates: FetchAnalyticsDataSchema,
});

export type FetchAnalyticsDataForProjectScheme = z.infer<typeof FetchAnalyticsDataForProjectScheme>;
