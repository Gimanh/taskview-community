import { integer, pgSchema, time, varchar } from "drizzle-orm/pg-core";
import { GoalsSchema } from "./goals.schema";
import { PermissionsSchema } from "./users.schema";

export const CollaborationUsersSchema = pgSchema('collaboration').table('users', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    email: varchar().notNull(),
    invitationDate: time('invitation_date').defaultNow()
});

export const CollaborationRolesSchema = pgSchema('collaboration').table('roles', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar().notNull(),
    goalId: integer('goal_id').notNull().references(() => GoalsSchema.id, { onDelete: 'cascade' }),
    created: time().defaultNow(),
});

export type CollaborationRolesSchemaTypeForSelect = typeof CollaborationRolesSchema.$inferSelect;
export type CollaborationRolesSchemaTypeForInsert = typeof CollaborationRolesSchema.$inferInsert;

export const CollaborationPermissionsToRoleSchema = pgSchema('collaboration').table('permissions_to_role', {
    roleId: integer('role_id').notNull().references(() => CollaborationRolesSchema.id, { onDelete: 'cascade' }),
    permissionId: integer('permission_id').notNull().references(() => PermissionsSchema.id, { onDelete: 'cascade' }),
});

export const CollaborationUsersToGoalsSchema = pgSchema('collaboration').table('users_to_goals', {
    userId: integer('user_id').notNull().references(() => CollaborationUsersSchema.id, { onDelete: 'cascade' }),
    goalId: integer('goal_id').notNull().references(() => GoalsSchema.id, { onDelete: 'cascade' }),
});

export const CollaborationUsersToRolesSchema = pgSchema('collaboration').table('users_to_roles', {
    userId: integer('user_id').notNull().references(() => CollaborationUsersSchema.id, { onDelete: 'cascade' }),
    roleId: integer('role_id').notNull().references(() => CollaborationRolesSchema.id, { onDelete: 'cascade' }),
});


export type CollaborationUsersSchemaTypeForSelect = typeof CollaborationUsersSchema.$inferSelect;
export type CollaborationUsersSchemaTypeForInsert = typeof CollaborationUsersSchema.$inferInsert;

