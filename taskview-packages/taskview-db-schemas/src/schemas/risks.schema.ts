import { integer, pgSchema, timestamp, varchar } from 'drizzle-orm/pg-core';
import { GoalsSchema } from './goals.schema';
import { UsersSchema } from './users.schema';
import { OrganizationsSchema } from './organizations.schema';

export const RisksPgSchema = pgSchema('tasks');

export const ProjectRisksSchema = RisksPgSchema.table('project_risks', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer('organization_id').notNull().references(() => OrganizationsSchema.id, { onDelete: 'cascade' }),
    goalId: integer('goal_id').references(() => GoalsSchema.id, { onDelete: 'cascade' }), // null for portfolio/enterprise level
    title: varchar({ length: 255 }).notNull(),
    description: varchar({ length: 2000 }).default(''),
    category: varchar({ length: 50 }).$type<'technical' | 'financial' | 'operational' | 'schedule' | 'strategic' | 'external'>().notNull().default('operational'),
    probability: integer().notNull().default(3), // 1 - 5
    impact: integer().notNull().default(3), // 1 - 5
    severityScore: integer('severity_score').notNull().default(9), // probability * impact (1 - 25)
    status: varchar({ length: 50 }).$type<'identified' | 'analyzed' | 'mitigating' | 'accepted' | 'closed'>().notNull().default('identified'),
    responseStrategy: varchar('response_strategy', { length: 50 }).$type<'avoid' | 'mitigate' | 'transfer' | 'accept'>().notNull().default('mitigate'),
    mitigationPlan: varchar('mitigation_plan', { length: 4000 }).default(''),
    contingencyPlan: varchar('contingency_plan', { length: 4000 }).default(''),
    ownerUserId: integer('owner_user_id').references(() => UsersSchema.id, { onDelete: 'set null' }),
    reviewDate: timestamp('review_date'),
    createdDate: timestamp('created_date').defaultNow(),
    updatedDate: timestamp('updated_date').defaultNow(),
});

export type ProjectRisksTypeForSelect = typeof ProjectRisksSchema.$inferSelect;
export type ProjectRisksTypeForInsert = typeof ProjectRisksSchema.$inferInsert;
