import { boolean, integer, jsonb, pgSchema, timestamp, varchar } from 'drizzle-orm/pg-core';
import { GoalsSchema } from './goals.schema';
import { UsersSchema } from './users.schema';
import { TasksSchema } from './tasks.schema';

export const StagegatesPgSchema = pgSchema('tasks');

export const ProjectStagegatesSchema = StagegatesPgSchema.table('project_stagegates', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    goalId: integer('goal_id').notNull().references(() => GoalsSchema.id, { onDelete: 'cascade' }),
    name: varchar({ length: 255 }).notNull(),
    description: varchar({ length: 2000 }).default(''),
    orderIndex: integer('order_index').notNull().default(0),
    status: varchar({ length: 50 }).$type<'not_started' | 'in_progress' | 'ready_for_review' | 'approved' | 'rejected'>().notNull().default('not_started'),
    gateDate: timestamp('gate_date'),
    approvedAt: timestamp('approved_at'),
    approvedBy: integer('approved_by').references(() => UsersSchema.id, { onDelete: 'set null' }),
    rejectionReason: varchar('rejection_reason', { length: 2000 }),
    exitCriteria: jsonb('exit_criteria').$type<Array<{ id: string; title: string; required: boolean; completed: boolean }>>().default([]),
    createdDate: timestamp('created_date').defaultNow(),
    updatedDate: timestamp('updated_date').defaultNow(),
});

export const StagegateApprovalsSchema = StagegatesPgSchema.table('stagegate_approvals', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    stagegateId: integer('stagegate_id').notNull().references(() => ProjectStagegatesSchema.id, { onDelete: 'cascade' }),
    approverId: integer('approver_id').notNull().references(() => UsersSchema.id, { onDelete: 'cascade' }),
    status: varchar({ length: 50 }).$type<'pending' | 'approved' | 'rejected'>().notNull().default('pending'),
    comments: varchar({ length: 2000 }).default(''),
    decidedAt: timestamp('decided_at'),
    createdDate: timestamp('created_date').defaultNow(),
});

export const StagegateTasksSchema = StagegatesPgSchema.table('stagegate_tasks', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    stagegateId: integer('stagegate_id').notNull().references(() => ProjectStagegatesSchema.id, { onDelete: 'cascade' }),
    taskId: integer('task_id').notNull().references(() => TasksSchema.id, { onDelete: 'cascade' }),
    isMandatoryExitCriterion: boolean('is_mandatory_exit_criterion').notNull().default(false),
    createdDate: timestamp('created_date').defaultNow(),
});

export type ProjectStagegatesTypeForSelect = typeof ProjectStagegatesSchema.$inferSelect;
export type ProjectStagegatesTypeForInsert = typeof ProjectStagegatesSchema.$inferInsert;
export type StagegateApprovalsTypeForSelect = typeof StagegateApprovalsSchema.$inferSelect;
export type StagegateApprovalsTypeForInsert = typeof StagegateApprovalsSchema.$inferInsert;
export type StagegateTasksTypeForSelect = typeof StagegateTasksSchema.$inferSelect;
export type StagegateTasksTypeForInsert = typeof StagegateTasksSchema.$inferInsert;
