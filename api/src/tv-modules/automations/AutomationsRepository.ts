import { and, asc, count, eq, inArray } from 'drizzle-orm';
import { AutomationRulesSchema, TagsSchema, type TagsSchemaTypeForSelect } from 'taskview-db-schemas';
import { Database } from '../../modules/db';
import { callWithCatch } from '../../utils/helpers';
import type { AutomationRuleInsertArgs, AutomationRuleRow, AutomationRulesDisableArgs, AutomationRuleUpdateArgs } from './types';

export class AutomationsRepository {
    private readonly db: Database;

    constructor() {
        this.db = Database.getInstance();
    }

    async getById(ruleId: number): Promise<AutomationRuleRow | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(AutomationRulesSchema).where(eq(AutomationRulesSchema.id, ruleId)).limit(1)
        );
        return result?.[0] ?? null;
    }

    async listForGoal(goalId: number): Promise<AutomationRuleRow[]> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select()
                .from(AutomationRulesSchema)
                .where(eq(AutomationRulesSchema.goalId, goalId))
                .orderBy(asc(AutomationRulesSchema.id))
        );
        return result ?? [];
    }

    async listEnabledForGoal(goalId: number): Promise<AutomationRuleRow[] | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select()
                .from(AutomationRulesSchema)
                .where(and(eq(AutomationRulesSchema.goalId, goalId), eq(AutomationRulesSchema.enabled, true)))
                .orderBy(asc(AutomationRulesSchema.id))
        );
        return result;
    }

    async countForGoal(goalId: number): Promise<number> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select({ value: count() }).from(AutomationRulesSchema).where(eq(AutomationRulesSchema.goalId, goalId))
        );
        return result?.[0]?.value ?? 0;
    }

    async insert(args: AutomationRuleInsertArgs): Promise<AutomationRuleRow | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .insert(AutomationRulesSchema)
                .values({
                    goalId: args.goalId,
                    creatorId: args.creatorId,
                    name: args.name,
                    enabled: args.enabled,
                    triggerModule: args.triggerModule,
                    triggerEvent: args.triggerEvent,
                    triggerParams: args.triggerParams,
                    actionModule: args.actionModule,
                    actionName: args.actionName,
                    actionParams: args.actionParams,
                })
                .returning()
        );
        return result?.[0] ?? null;
    }

    async update(args: AutomationRuleUpdateArgs): Promise<AutomationRuleRow | null> {
        const { patch } = args;
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .update(AutomationRulesSchema)
                .set({
                    creatorId: patch.creatorId,
                    name: patch.name,
                    enabled: patch.enabled,
                    triggerModule: patch.triggerModule,
                    triggerEvent: patch.triggerEvent,
                    triggerParams: patch.triggerParams,
                    actionModule: patch.actionModule,
                    actionName: patch.actionName,
                    actionParams: patch.actionParams,
                    editedAt: new Date(),
                })
                .where(eq(AutomationRulesSchema.id, args.ruleId))
                .returning()
        );
        return result?.[0] ?? null;
    }

    async disableMany(args: AutomationRulesDisableArgs): Promise<number[]> {
        if (args.ruleIds.length === 0) return [];
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .update(AutomationRulesSchema)
                .set({ enabled: false, editedAt: new Date() })
                .where(
                    and(
                        eq(AutomationRulesSchema.goalId, args.goalId),
                        eq(AutomationRulesSchema.enabled, true),
                        inArray(AutomationRulesSchema.id, args.ruleIds)
                    )
                )
                .returning({ id: AutomationRulesSchema.id })
        );
        return result?.map((row) => row.id) ?? [];
    }

    async deleteById(ruleId: number): Promise<boolean> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.delete(AutomationRulesSchema).where(eq(AutomationRulesSchema.id, ruleId)).returning({ id: AutomationRulesSchema.id })
        );
        return (result?.length ?? 0) > 0;
    }

    async fetchGoalTags(goalId: number): Promise<TagsSchemaTypeForSelect[]> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(TagsSchema).where(eq(TagsSchema.goalId, goalId)).orderBy(asc(TagsSchema.name))
        );
        return result ?? [];
    }
}
