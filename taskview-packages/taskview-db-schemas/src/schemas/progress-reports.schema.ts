import { boolean, integer, pgSchema, timestamp, varchar } from 'drizzle-orm/pg-core';
import { GoalsSchema } from './goals.schema';
import { UsersSchema } from './users.schema';
import { OrganizationsSchema } from './organizations.schema';

export const ProgressReportsPgSchema = pgSchema('tasks');

export const ProgressReportCadencesSchema = ProgressReportsPgSchema.table('progress_report_cadences', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer('organization_id').notNull().references(() => OrganizationsSchema.id, { onDelete: 'cascade' }),
    goalId: integer('goal_id').notNull().references(() => GoalsSchema.id, { onDelete: 'cascade' }),
    frequency: varchar({ length: 50 }).$type<'weekly' | 'biweekly' | 'monthly'>().notNull().default('weekly'),
    dayOfWeek: integer('day_of_week').notNull().default(5), // 5 = Friday
    hourUtc: integer('hour_utc').notNull().default(14),
    reminderChannel: varchar('reminder_channel', { length: 50 }).$type<'in_app' | 'slack' | 'telegram' | 'email'>().notNull().default('in_app'),
    isActive: boolean('is_active').notNull().default(true),
    lastReminderSentAt: timestamp('last_reminder_sent_at'),
    createdDate: timestamp('created_date').defaultNow(),
    updatedDate: timestamp('updated_date').defaultNow(),
});

export const ProjectProgressReportsSchema = ProgressReportsPgSchema.table('project_progress_reports', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    goalId: integer('goal_id').notNull().references(() => GoalsSchema.id, { onDelete: 'cascade' }),
    reportedBy: integer('reported_by').notNull().references(() => UsersSchema.id, { onDelete: 'cascade' }),
    reportDate: timestamp('report_date').notNull().defaultNow(),
    overallHealth: varchar('overall_health', { length: 50 }).$type<'green' | 'amber' | 'red'>().notNull().default('green'),
    stagegateHealth: varchar('stagegate_health', { length: 50 }).$type<'green' | 'amber' | 'red'>().notNull().default('green'),
    budgetHealth: varchar('budget_health', { length: 50 }).$type<'green' | 'amber' | 'red'>().notNull().default('green'),
    scheduleHealth: varchar('schedule_health', { length: 50 }).$type<'green' | 'amber' | 'red'>().notNull().default('green'),
    executiveSummary: varchar('executive_summary', { length: 4000 }).notNull(),
    keyAccomplishments: varchar('key_accomplishments', { length: 4000 }).default(''),
    nextPeriodPlans: varchar('next_period_plans', { length: 4000 }).default(''),
    blockersRisks: varchar('blockers_risks', { length: 4000 }).default(''),
    createdDate: timestamp('created_date').defaultNow(),
});

export type ProgressReportCadencesTypeForSelect = typeof ProgressReportCadencesSchema.$inferSelect;
export type ProgressReportCadencesTypeForInsert = typeof ProgressReportCadencesSchema.$inferInsert;
export type ProjectProgressReportsTypeForSelect = typeof ProjectProgressReportsSchema.$inferSelect;
export type ProjectProgressReportsTypeForInsert = typeof ProjectProgressReportsSchema.$inferInsert;
