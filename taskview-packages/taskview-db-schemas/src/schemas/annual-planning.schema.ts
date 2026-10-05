import { doublePrecision, integer, pgSchema, timestamp, varchar } from 'drizzle-orm/pg-core';
import { GoalsSchema } from './goals.schema';
import { UsersSchema } from './users.schema';
import { OrganizationsSchema } from './organizations.schema';
import { StrategicInitiativesSchema } from './strategic-portfolio.schema';

export const AnnualPlanningPgSchema = pgSchema('tasks');

export const AnnualPlanningCyclesSchema = AnnualPlanningPgSchema.table('annual_planning_cycles', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer('organization_id').notNull().references(() => OrganizationsSchema.id, { onDelete: 'cascade' }),
    year: integer('year').notNull(),
    title: varchar({ length: 255 }).notNull(),
    status: varchar({ length: 50 }).$type<'draft' | 'intake_open' | 'scoring' | 'approved' | 'closed'>().notNull().default('intake_open'),
    startDate: timestamp('start_date'),
    submissionDeadline: timestamp('submission_deadline'),
    totalCapitalBudget: doublePrecision('total_capital_budget').default(0),
    totalOperatingBudget: doublePrecision('total_operating_budget').default(0),
    createdDate: timestamp('created_date').defaultNow(),
});

export const PlanningProposalsSchema = AnnualPlanningPgSchema.table('planning_proposals', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    cycleId: integer('cycle_id').notNull().references(() => AnnualPlanningCyclesSchema.id, { onDelete: 'cascade' }),
    organizationId: integer('organization_id').notNull().references(() => OrganizationsSchema.id, { onDelete: 'cascade' }),
    initiativeId: integer('initiative_id').references(() => StrategicInitiativesSchema.id, { onDelete: 'set null' }),
    title: varchar({ length: 255 }).notNull(),
    description: varchar({ length: 2000 }).default(''),
    businessCase: varchar('business_case', { length: 4000 }).default(''),
    strategicAlignmentScore: integer('strategic_alignment_score').notNull().default(5), // 1-10
    financialScore: integer('financial_score').notNull().default(5), // 1-10
    riskScore: integer('risk_score').notNull().default(3), // 1-5 (1=low risk, 5=high risk)
    priorityScore: doublePrecision('priority_score').default(50), // computed score
    estimatedCost: doublePrecision('estimated_cost').default(0),
    requestedBudget: doublePrecision('requested_budget').default(0),
    sponsorUserId: integer('sponsor_user_id').references(() => UsersSchema.id, { onDelete: 'set null' }),
    status: varchar({ length: 50 }).$type<'draft' | 'submitted' | 'under_review' | 'approved' | 'deferred' | 'rejected'>().notNull().default('draft'),
    convertedGoalId: integer('converted_goal_id').references(() => GoalsSchema.id, { onDelete: 'set null' }),
    createdDate: timestamp('created_date').defaultNow(),
    updatedDate: timestamp('updated_date').defaultNow(),
});

export type AnnualPlanningCyclesTypeForSelect = typeof AnnualPlanningCyclesSchema.$inferSelect;
export type AnnualPlanningCyclesTypeForInsert = typeof AnnualPlanningCyclesSchema.$inferInsert;
export type PlanningProposalsTypeForSelect = typeof PlanningProposalsSchema.$inferSelect;
export type PlanningProposalsTypeForInsert = typeof PlanningProposalsSchema.$inferInsert;
