import { doublePrecision, integer, jsonb, pgSchema, timestamp, varchar } from 'drizzle-orm/pg-core';
import { GoalsSchema } from './goals.schema';
import { UsersSchema } from './users.schema';
import { OrganizationsSchema } from './organizations.schema';

export const StrategyPgSchema = pgSchema('tasks');

export const StrategicObjectivesSchema = StrategyPgSchema.table('strategic_objectives', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer('organization_id').notNull().references(() => OrganizationsSchema.id, { onDelete: 'cascade' }),
    title: varchar({ length: 255 }).notNull(),
    description: varchar({ length: 2000 }).default(''),
    targetYear: integer('target_year').notNull().default(2026),
    status: varchar({ length: 50 }).$type<'on_track' | 'at_risk' | 'behind' | 'achieved'>().notNull().default('on_track'),
    ownerId: integer('owner_id').references(() => UsersSchema.id, { onDelete: 'set null' }),
    targetDate: timestamp('target_date'),
    weight: integer('weight').notNull().default(1),
    createdDate: timestamp('created_date').defaultNow(),
    updatedDate: timestamp('updated_date').defaultNow(),
});

export const StrategicInitiativesSchema = StrategyPgSchema.table('strategic_initiatives', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    objectiveId: integer('objective_id').notNull().references(() => StrategicObjectivesSchema.id, { onDelete: 'cascade' }),
    organizationId: integer('organization_id').notNull().references(() => OrganizationsSchema.id, { onDelete: 'cascade' }),
    title: varchar({ length: 255 }).notNull(),
    description: varchar({ length: 2000 }).default(''),
    leadId: integer('lead_id').references(() => UsersSchema.id, { onDelete: 'set null' }),
    startDate: timestamp('start_date'),
    targetDate: timestamp('target_date'),
    status: varchar({ length: 50 }).$type<'planning' | 'active' | 'completed' | 'on_hold'>().notNull().default('planning'),
    budget: doublePrecision('budget').default(0),
    createdDate: timestamp('created_date').defaultNow(),
    updatedDate: timestamp('updated_date').defaultNow(),
});

export const InitiativeProjectsSchema = StrategyPgSchema.table('initiative_projects', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    initiativeId: integer('initiative_id').notNull().references(() => StrategicInitiativesSchema.id, { onDelete: 'cascade' }),
    goalId: integer('goal_id').notNull().references(() => GoalsSchema.id, { onDelete: 'cascade' }),
    createdDate: timestamp('created_date').defaultNow(),
});

export const StrategicKpisSchema = StrategyPgSchema.table('strategic_kpis', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer('organization_id').notNull().references(() => OrganizationsSchema.id, { onDelete: 'cascade' }),
    objectiveId: integer('objective_id').references(() => StrategicObjectivesSchema.id, { onDelete: 'set null' }),
    initiativeId: integer('initiative_id').references(() => StrategicInitiativesSchema.id, { onDelete: 'set null' }),
    goalId: integer('goal_id').references(() => GoalsSchema.id, { onDelete: 'set null' }),
    title: varchar({ length: 255 }).notNull(),
    description: varchar({ length: 2000 }).default(''),
    targetValue: doublePrecision('target_value').notNull().default(100),
    currentValue: doublePrecision('current_value').notNull().default(0),
    unit: varchar({ length: 50 }).notNull().default('%'),
    cadence: varchar({ length: 50 }).$type<'monthly' | 'quarterly' | 'annual'>().notNull().default('quarterly'),
    status: varchar({ length: 50 }).$type<'green' | 'amber' | 'red'>().notNull().default('green'),
    history: jsonb('history').$type<Array<{ date: string; value: number; comment?: string }>>().default([]),
    updatedDate: timestamp('updated_date').defaultNow(),
    createdDate: timestamp('created_date').defaultNow(),
});

export type StrategicObjectivesTypeForSelect = typeof StrategicObjectivesSchema.$inferSelect;
export type StrategicObjectivesTypeForInsert = typeof StrategicObjectivesSchema.$inferInsert;
export type StrategicInitiativesTypeForSelect = typeof StrategicInitiativesSchema.$inferSelect;
export type StrategicInitiativesTypeForInsert = typeof StrategicInitiativesSchema.$inferInsert;
export type InitiativeProjectsTypeForSelect = typeof InitiativeProjectsSchema.$inferSelect;
export type InitiativeProjectsTypeForInsert = typeof InitiativeProjectsSchema.$inferInsert;
export type StrategicKpisTypeForSelect = typeof StrategicKpisSchema.$inferSelect;
export type StrategicKpisTypeForInsert = typeof StrategicKpisSchema.$inferInsert;
