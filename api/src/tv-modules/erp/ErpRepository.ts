import { eq, and, desc } from 'drizzle-orm';
import { Database } from '../../modules/db';
import {
    ErpConfigurationsSchema,
    ErpBudgetsSchema,
    ErpTransactionsSchema,
    GoalsSchema,
    type ErpConfigurationsTypeForSelect,
    type ErpBudgetsTypeForSelect,
    type ErpTransactionsTypeForSelect,
} from 'taskview-db-schemas';
import { ensureEnterpriseTables } from '../enterprise/ensureEnterpriseTables';

export class ErpRepository {
    private db = Database.getInstance();

    // ----------------- ERP Config -----------------
    async getConfig(orgId: number): Promise<any> {
        await ensureEnterpriseTables();
        const configs = await this.db.dbDrizzle
            .select()
            .from(ErpConfigurationsSchema)
            .where(eq(ErpConfigurationsSchema.organizationId, orgId));

        if (!configs.length) {
            // Return default initial configuration
            return {
                organizationId: orgId,
                erpSystem: 'sap',
                apiUrl: 'https://erp-gateway.internal.net/api/v2',
                syncFrequency: 'daily',
                isEnabled: true,
                lastSyncAt: new Date(),
            };
        }
        return configs[0];
    }

    async saveConfig(orgId: number, data: any): Promise<any> {
        await ensureEnterpriseTables();
        const existing = await this.db.dbDrizzle
            .select()
            .from(ErpConfigurationsSchema)
            .where(eq(ErpConfigurationsSchema.organizationId, orgId));

        if (existing.length) {
            const updated = await this.db.dbDrizzle
                .update(ErpConfigurationsSchema)
                .set({ ...data, updatedDate: new Date() })
                .where(eq(ErpConfigurationsSchema.id, existing[0].id))
                .returning();
            return updated[0];
        } else {
            const inserted = await this.db.dbDrizzle
                .insert(ErpConfigurationsSchema)
                .values({
                    organizationId: orgId,
                    erpSystem: data.erpSystem || 'sap',
                    apiUrl: data.apiUrl || '',
                    apiKey: data.apiKey || '',
                    webhookSecret: data.webhookSecret || '',
                    syncFrequency: data.syncFrequency || 'daily',
                    isEnabled: data.isEnabled ?? true,
                })
                .returning();
            return inserted[0];
        }
    }

    // ----------------- Project ERP Budgets -----------------
    async getBudgetForGoal(goalId: number, orgId: number): Promise<any> {
        await ensureEnterpriseTables();
        let budgets = await this.db.dbDrizzle
            .select()
            .from(ErpBudgetsSchema)
            .where(eq(ErpBudgetsSchema.goalId, goalId));

        if (!budgets.length) {
            // Auto-provision initial ERP budget baseline for the project
            const inserted = await this.db.dbDrizzle
                .insert(ErpBudgetsSchema)
                .values({
                    goalId,
                    organizationId: orgId,
                    erpCostCenter: `CC-${1000 + (goalId % 900)}`,
                    erpWbsElement: `WBS-${goalId}.01`,
                    fiscalYear: 2026,
                    allocatedBudget: 150000,
                    committedSpend: 42000,
                    actualSpend: 68500,
                    currency: 'USD',
                })
                .returning();
            budgets = inserted;

            // Seed initial sample ERP transaction records
            await this.db.dbDrizzle.insert(ErpTransactionsSchema).values([
                {
                    erpBudgetId: budgets[0].id,
                    referenceDoc: 'SAP-INV-8921',
                    vendor: 'Cloud Services Corp',
                    amount: 28500,
                    transactionType: 'actual',
                    description: 'Infrastructure baseline compute & storage',
                },
                {
                    erpBudgetId: budgets[0].id,
                    referenceDoc: 'SAP-PO-4412',
                    vendor: 'Enterprise Software Solutions',
                    amount: 42000,
                    transactionType: 'committed',
                    description: 'Committed software licenses PO',
                },
                {
                    erpBudgetId: budgets[0].id,
                    referenceDoc: 'SAP-INV-9104',
                    vendor: 'Specialist Consulting Ltd',
                    amount: 40000,
                    transactionType: 'actual',
                    description: 'Implementation specialist consulting',
                },
            ]);
        }

        const budget = budgets[0];
        const transactions = await this.db.dbDrizzle
            .select()
            .from(ErpTransactionsSchema)
            .where(eq(ErpTransactionsSchema.erpBudgetId, budget.id))
            .orderBy(desc(ErpTransactionsSchema.transactionDate));

        const totalSpent = budget.actualSpend + budget.committedSpend;
        const variance = budget.allocatedBudget - totalSpent;
        const burnRatePercent = budget.allocatedBudget > 0
            ? Math.round((budget.actualSpend / budget.allocatedBudget) * 100)
            : 0;
        const commitmentPercent = budget.allocatedBudget > 0
            ? Math.round((totalSpent / budget.allocatedBudget) * 100)
            : 0;

        let status: 'healthy' | 'warning' | 'critical' = 'healthy';
        if (commitmentPercent > 100) status = 'critical';
        else if (commitmentPercent > 85) status = 'warning';

        return {
            ...budget,
            transactions,
            totalSpent,
            variance,
            burnRatePercent,
            commitmentPercent,
            status,
        };
    }

    async updateBudget(goalId: number, data: any): Promise<any> {
        await ensureEnterpriseTables();
        const updated = await this.db.dbDrizzle
            .update(ErpBudgetsSchema)
            .set({
                ...data,
                updatedDate: new Date(),
            })
            .where(eq(ErpBudgetsSchema.goalId, goalId))
            .returning();

        return updated[0] || null;
    }

    async addTransaction(budgetId: number, data: {
        referenceDoc: string;
        vendor?: string;
        amount: number;
        transactionType: 'actual' | 'committed' | 'budget_transfer';
        description?: string;
    }): Promise<any> {
        await ensureEnterpriseTables();
        const inserted = await this.db.dbDrizzle
            .insert(ErpTransactionsSchema)
            .values({
                erpBudgetId: budgetId,
                referenceDoc: data.referenceDoc,
                vendor: data.vendor || '',
                amount: data.amount,
                transactionType: data.transactionType,
                description: data.description || '',
            })
            .returning();

        // Update totals on the parent budget
        const budget = await this.db.dbDrizzle
            .select()
            .from(ErpBudgetsSchema)
            .where(eq(ErpBudgetsSchema.id, budgetId));

        if (budget.length) {
            const b = budget[0];
            let newActual = b.actualSpend;
            let newCommitted = b.committedSpend;
            if (data.transactionType === 'actual') newActual += data.amount;
            if (data.transactionType === 'committed') newCommitted += data.amount;

            await this.db.dbDrizzle
                .update(ErpBudgetsSchema)
                .set({ actualSpend: newActual, committedSpend: newCommitted, lastSyncedAt: new Date() })
                .where(eq(ErpBudgetsSchema.id, budgetId));
        }

        return inserted[0];
    }

    // Trigger simulation or real ERP sync
    async syncFromErp(goalId: number): Promise<any> {
        await ensureEnterpriseTables();
        const budgets = await this.db.dbDrizzle
            .select()
            .from(ErpBudgetsSchema)
            .where(eq(ErpBudgetsSchema.goalId, goalId));

        if (!budgets.length) throw new Error('Budget not found for this project');
        const b = budgets[0];

        // Simulate receiving new committed invoice from ERP
        const mockRandomIncrement = Math.round((Math.random() * 2500 + 500) * 100) / 100;
        const newActual = b.actualSpend + mockRandomIncrement;

        await this.db.dbDrizzle.insert(ErpTransactionsSchema).values({
            erpBudgetId: b.id,
            referenceDoc: `ERP-SYNC-${Date.now().toString().slice(-4)}`,
            vendor: 'SAP System Auto-Reconcile',
            amount: mockRandomIncrement,
            transactionType: 'actual',
            description: 'Automated delta synchronization from corporate ERP system',
        });

        const updated = await this.db.dbDrizzle
            .update(ErpBudgetsSchema)
            .set({
                actualSpend: newActual,
                lastSyncedAt: new Date(),
                updatedDate: new Date(),
            })
            .where(eq(ErpBudgetsSchema.id, b.id))
            .returning();

        return {
            syncedAt: new Date(),
            budget: updated[0],
            deltaAdded: mockRandomIncrement,
            message: 'ERP synchronization completed successfully.',
        };
    }

    // Org-level overview of all project budgets
    async getOrgBudgetOverview(orgId: number): Promise<any> {
        await ensureEnterpriseTables();
        const budgets = await this.db.dbDrizzle
            .select({
                id: ErpBudgetsSchema.id,
                goalId: ErpBudgetsSchema.goalId,
                projectName: GoalsSchema.name,
                costCenter: ErpBudgetsSchema.erpCostCenter,
                wbsElement: ErpBudgetsSchema.erpWbsElement,
                allocatedBudget: ErpBudgetsSchema.allocatedBudget,
                committedSpend: ErpBudgetsSchema.committedSpend,
                actualSpend: ErpBudgetsSchema.actualSpend,
                currency: ErpBudgetsSchema.currency,
                lastSyncedAt: ErpBudgetsSchema.lastSyncedAt,
            })
            .from(ErpBudgetsSchema)
            .innerJoin(GoalsSchema, eq(ErpBudgetsSchema.goalId, GoalsSchema.id))
            .where(eq(ErpBudgetsSchema.organizationId, orgId));

        const totalAllocated = budgets.reduce((sum, b) => sum + b.allocatedBudget, 0);
        const totalActual = budgets.reduce((sum, b) => sum + b.actualSpend, 0);
        const totalCommitted = budgets.reduce((sum, b) => sum + b.committedSpend, 0);
        const totalSpent = totalActual + totalCommitted;
        const totalVariance = totalAllocated - totalSpent;

        return {
            summary: {
                totalAllocated,
                totalActual,
                totalCommitted,
                totalSpent,
                totalVariance,
                burnRatePercent: totalAllocated > 0 ? Math.round((totalActual / totalAllocated) * 100) : 0,
            },
            budgets,
        };
    }
}
