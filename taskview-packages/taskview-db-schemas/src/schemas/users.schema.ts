import { integer, jsonb, pgSchema, varchar } from "drizzle-orm/pg-core";

export const UsersSchema = pgSchema('tv_auth').table('users', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    login: varchar().notNull(),
    email: varchar().notNull(),
    password: varchar().notNull(),
    block: integer().notNull().default(0),
    confirmEmailCode: varchar('confirm_email_code'),
    remindPasswordCode: varchar('remind_password_code'),
    remindPasswordTime: integer('remind_password_time'),
    rememberToken: varchar('remember_token'),
});

export const PermissionsSchema = pgSchema('tv_auth').table('permissions', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar().notNull(),
    description: varchar(),
    permissionGroup: integer('permission_group'),
    descriptionLocales: jsonb('description_locales'),
});

export type PermissionsSchemaTypeForSelect = typeof PermissionsSchema.$inferSelect;
export type PermissionsSchemaTypeForInsert = typeof PermissionsSchema.$inferInsert;