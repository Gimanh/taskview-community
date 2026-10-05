import { eq, and, desc, inArray } from 'drizzle-orm';
import { Database } from '../../modules/db';
import {
    StrategicObjectivesSchema,
    StrategicInitiativesSchema,
    InitiativeProjectsSchema,
    StrategicKpisSchema,
    GoalsSchema,
    TasksSchema,
    type StrategicObjectivesTypeForSelect,
    type StrategicInitiativesTypeForSelect,
    type StrategicKpisTypeForSelect,
} from 'taskview-db-schemas';
import { ensureEnterpriseTables } from '../enterprise/ensureEnterpriseTables';

export class StrategyRepository {
    private db = Database.getInstance();

    // ----------------- Objectives -----------------
    async listObjectives(orgId: number, year?: number): Promise<any[]> {
        await ensureEnterpriseTables();
        let query = this.db.dbDrizzle
            .select()
            .from(StrategicObjectivesSchema)
            .where(eq(StrategicObjectivesSchema.organizationId, orgId));

        const objectives = await query;
        const filtered = year ? objectives.filter(o => o.targetYear === year) : objectives;

        // Enrich with initiatives and KPIs count
        const result: any[] = [];
        for (const obj of filtered) {
            const initiatives = await this.listInitiativesByObjective(obj.id);
            const kpis = await this.db.dbDrizzle
                .select()
                .from(StrategicKpisSchema)
                .where(eq(StrategicKpisSchema.objectiveId, obj.id));

            // Calculate objective progress from initiatives
            const totalInitiatives = initiatives.length;
            const completedInitiatives = initiatives.filter((i: any) => i.status === 'completed').length;
            const activeInitiatives = initiatives.filter((i: any) => i.status === 'active').length;
            const progressPercent = totalInitiatives > 0
                ? Math.round((completedInitiatives / totalInitiatives) * 100)
                : 0;

            result.push({
                ...obj,
                progressPercent,
                initiativesCount: totalInitiatives,
                activeInitiativesCount: activeInitiatives,
                kpisCount: kpis.length,
                initiatives,
                kpis,
            });
        }
        return result;
    }

    async createObjective(data: {
        organizationId: number;
        title: string;
        description?: string;
        targetYear?: number;
        status?: 'on_track' | 'at_risk' | 'behind' | 'achieved';
        ownerId?: number;
        targetDate?: string | Date;
        weight?: number;
    }): Promise<any> {
        await ensureEnterpriseTables();
        const inserted = await this.db.dbDrizzle
            .insert(StrategicObjectivesSchema)
            .values({
                organizationId: data.organizationId,
                title: data.title,
                description: data.description || '',
                targetYear: data.targetYear ?? 2026,
                status: data.status || 'on_track',
                ownerId: data.ownerId || null,
                targetDate: data.targetDate ? new Date(data.targetDate) : null,
                weight: data.weight ?? 1,
            })
            .returning();

        return inserted[0];
    }

    async updateObjective(id: number, data: any): Promise<any> {
        await ensureEnterpriseTables();
        const updateData: any = { ...data, updatedDate: new Date() };
        if (data.targetDate) updateData.targetDate = new Date(data.targetDate);
        const updated = await this.db.dbDrizzle
            .update(StrategicObjectivesSchema)
            .set(updateData)
            .where(eq(StrategicObjectivesSchema.id, id))
            .returning();

        return updated[0] || null;
    }

    async deleteObjective(id: number): Promise<boolean> {
        await ensureEnterpriseTables();
        const deleted = await this.db.dbDrizzle
            .delete(StrategicObjectivesSchema)
            .where(eq(StrategicObjectivesSchema.id, id))
            .returning();

        return deleted.length > 0;
    }

    // ----------------- Initiatives -----------------
    async listInitiativesByObjective(objectiveId: number): Promise<any[]> {
        await ensureEnterpriseTables();
        const initiatives = await this.db.dbDrizzle
            .select()
            .from(StrategicInitiativesSchema)
            .where(eq(StrategicInitiativesSchema.objectiveId, objectiveId));

        const result: any[] = [];
        for (const init of initiatives) {
            const projects = await this.getLinkedProjects(init.id);
            const kpis = await this.db.dbDrizzle
                .select()
                .from(StrategicKpisSchema)
                .where(eq(StrategicKpisSchema.initiativeId, init.id));

            result.push({
                ...init,
                projects,
                kpis,
            });
        }
        return result;
    }

    async listAllInitiatives(orgId: number): Promise<any[]> {
        await ensureEnterpriseTables();
        const initiatives = await this.db.dbDrizzle
            .select()
            .from(StrategicInitiativesSchema)
            .where(eq(StrategicInitiativesSchema.organizationId, orgId));

        const result: any[] = [];
        for (const init of initiatives) {
            const projects = await this.getLinkedProjects(init.id);
            const kpis = await this.db.dbDrizzle
                .select()
                .from(StrategicKpisSchema)
                .where(eq(StrategicKpisSchema.initiativeId, init.id));

            result.push({
                ...init,
                projects,
                kpis,
            });
        }
        return result;
    }

    async createInitiative(data: {
        objectiveId: number;
        organizationId: number;
        title: string;
        description?: string;
        leadId?: number;
        startDate?: string | Date;
        targetDate?: string | Date;
        status?: 'planning' | 'active' | 'completed' | 'on_hold';
        budget?: number;
    }): Promise<any> {
        await ensureEnterpriseTables();
        const inserted = await this.db.dbDrizzle
            .insert(StrategicInitiativesSchema)
            .values({
                objectiveId: data.objectiveId,
                organizationId: data.organizationId,
                title: data.title,
                description: data.description || '',
                leadId: data.leadId || null,
                startDate: data.startDate ? new Date(data.startDate) : null,
                targetDate: data.targetDate ? new Date(data.targetDate) : null,
                status: data.status || 'planning',
                budget: data.budget ?? 0,
            })
            .returning();

        return inserted[0];
    }

    async updateInitiative(id: number, data: any): Promise<any> {
        await ensureEnterpriseTables();
        const updateData: any = { ...data, updatedDate: new Date() };
        if (data.startDate) updateData.startDate = new Date(data.startDate);
        if (data.targetDate) updateData.targetDate = new Date(data.targetDate);
        const updated = await this.db.dbDrizzle
            .update(StrategicInitiativesSchema)
            .set(updateData)
            .where(eq(StrategicInitiativesSchema.id, id))
            .returning();

        return updated[0] || null;
    }

    async deleteInitiative(id: number): Promise<boolean> {
        await ensureEnterpriseTables();
        const deleted = await this.db.dbDrizzle
            .delete(StrategicInitiativesSchema)
            .where(eq(StrategicInitiativesSchema.id, id))
            .returning();

        return deleted.length > 0;
    }

    async linkProjectToInitiative(initiativeId: number, goalId: number): Promise<any> {
        await ensureEnterpriseTables();
        const inserted = await this.db.dbDrizzle
            .insert(InitiativeProjectsSchema)
            .values({
                initiativeId,
                goalId,
            })
            .returning();

        return inserted[0];
    }

    async unlinkProjectFromInitiative(initiativeId: number, goalId: number): Promise<boolean> {
        await ensureEnterpriseTables();
        const deleted = await this.db.dbDrizzle
            .delete(InitiativeProjectsSchema)
            .where(and(eq(InitiativeProjectsSchema.initiativeId, initiativeId), eq(InitiativeProjectsSchema.goalId, goalId)))
            .returning();

        return deleted.length > 0;
    }

    async getLinkedProjects(initiativeId: number): Promise<any[]> {
        await ensureEnterpriseTables();
        const linked = await this.db.dbDrizzle
            .select({
                id: GoalsSchema.id,
                name: GoalsSchema.name,
                description: GoalsSchema.description,
                color: GoalsSchema.color,
                archive: GoalsSchema.archive,
            })
            .from(InitiativeProjectsSchema)
            .innerJoin(GoalsSchema, eq(InitiativeProjectsSchema.goalId, GoalsSchema.id))
            .where(eq(InitiativeProjectsSchema.initiativeId, initiativeId));

        return linked;
    }

    // ----------------- Strategic KPIs -----------------
    async listKpis(orgId: number, filters?: { objectiveId?: number; initiativeId?: number; goalId?: number }): Promise<any[]> {
        await ensureEnterpriseTables();
        const kpis = await this.db.dbDrizzle
            .select()
            .from(StrategicKpisSchema)
            .where(eq(StrategicKpisSchema.organizationId, orgId));

        return kpis.filter(k => {
            if (filters?.objectiveId && k.objectiveId !== filters.objectiveId) return false;
            if (filters?.initiativeId && k.initiativeId !== filters.initiativeId) return false;
            if (filters?.goalId && k.goalId !== filters.goalId) return false;
            return true;
        });
    }

    async createKpi(data: {
        organizationId: number;
        title: string;
        description?: string;
        objectiveId?: number;
        initiativeId?: number;
        goalId?: number;
        targetValue: number;
        currentValue?: number;
        unit?: string;
        cadence?: 'monthly' | 'quarterly' | 'annual';
        status?: 'green' | 'amber' | 'red';
    }): Promise<any> {
        await ensureEnterpriseTables();
        const currentVal = data.currentValue ?? 0;
        const initialStatus = this.calculateKpiStatus(currentVal, data.targetValue);
        const inserted = await this.db.dbDrizzle
            .insert(StrategicKpisSchema)
            .values({
                organizationId: data.organizationId,
                title: data.title,
                description: data.description || '',
                objectiveId: data.objectiveId || null,
                initiativeId: data.initiativeId || null,
                goalId: data.goalId || null,
                targetValue: data.targetValue,
                currentValue: currentVal,
                unit: data.unit || '%',
                cadence: data.cadence || 'quarterly',
                status: data.status || initialStatus,
                history: [{ date: new Date().toISOString(), value: currentVal }],
            })
            .returning();

        return inserted[0];
    }

    async updateKpi(id: number, data: any): Promise<any> {
        await ensureEnterpriseTables();
        const existing = await this.db.dbDrizzle
            .select()
            .from(StrategicKpisSchema)
            .where(eq(StrategicKpisSchema.id, id));

        if (!existing.length) return null;

        const updateData: any = { ...data, updatedDate: new Date() };
        if (data.currentValue !== undefined) {
            const hist = (existing[0].history as any[]) || [];
            hist.push({ date: new Date().toISOString(), value: data.currentValue, comment: data.comment });
            updateData.history = hist;
            const target = data.targetValue !== undefined ? data.targetValue : existing[0].targetValue;
            updateData.status = this.calculateKpiStatus(data.currentValue, target);
        }

        const updated = await this.db.dbDrizzle
            .update(StrategicKpisSchema)
            .set(updateData)
            .where(eq(StrategicKpisSchema.id, id))
            .returning();

        return updated[0] || null;
    }

    async deleteKpi(id: number): Promise<boolean> {
        await ensureEnterpriseTables();
        const deleted = await this.db.dbDrizzle
            .delete(StrategicKpisSchema)
            .where(eq(StrategicKpisSchema.id, id))
            .returning();

        return deleted.length > 0;
    }

    private calculateKpiStatus(current: number, target: number): 'green' | 'amber' | 'red' {
        if (target <= 0) return 'green';
        const ratio = current / target;
        if (ratio >= 0.9) return 'green';
        if (ratio >= 0.7) return 'amber';
        return 'red';
    }

    // ----------------- Multi-tier Dashboards -----------------
    async getMultiTierDashboard(orgId: number): Promise<any> {
        await ensureEnterpriseTables();
        const objectives = await this.listObjectives(orgId);
        const initiatives = await this.listAllInitiatives(orgId);
        const kpis = await this.listKpis(orgId);

        // Tier 1: Executive Strategic Level
        const totalObjectives = objectives.length;
        const onTrackObjectives = objectives.filter(o => o.status === 'on_track' || o.status === 'achieved').length;
        const atRiskObjectives = objectives.filter(o => o.status === 'at_risk').length;
        const behindObjectives = objectives.filter(o => o.status === 'behind').length;
        const strategicAlignmentHealth = totalObjectives > 0
            ? Math.round((onTrackObjectives / totalObjectives) * 100)
            : 100;

        const kpiGreen = kpis.filter(k => k.status === 'green').length;
        const kpiAmber = kpis.filter(k => k.status === 'amber').length;
        const kpiRed = kpis.filter(k => k.status === 'red').length;

        // Tier 2: Portfolio / Initiative Level
        const totalInitiatives = initiatives.length;
        const activeInitiatives = initiatives.filter(i => i.status === 'active').length;
        const totalBudget = initiatives.reduce((sum, i) => sum + (i.budget || 0), 0);

        // Tier 3: Linked Projects
        const allLinkedProjectIds = new Set<number>();
        initiatives.forEach(i => {
            (i.projects || []).forEach((p: any) => allLinkedProjectIds.add(p.id));
        });

        // Hierarchy Alignment Map
        const hierarchy = objectives.map(obj => ({
            id: obj.id,
            title: obj.title,
            status: obj.status,
            progress: obj.progressPercent,
            kpis: obj.kpis,
            initiatives: (obj.initiatives || []).map((init: any) => ({
                id: init.id,
                title: init.title,
                status: init.status,
                budget: init.budget,
                kpis: init.kpis,
                projects: init.projects,
            })),
        }));

        return {
            executiveTier: {
                totalObjectives,
                onTrackObjectives,
                atRiskObjectives,
                behindObjectives,
                strategicAlignmentHealth,
                kpiSummary: { green: kpiGreen, amber: kpiAmber, red: kpiRed, total: kpis.length },
            },
            portfolioTier: {
                totalInitiatives,
                activeInitiatives,
                totalBudget,
                totalLinkedProjects: allLinkedProjectIds.size,
                initiatives,
            },
            operationalTier: {
                linkedProjectsCount: allLinkedProjectIds.size,
                activeKpiCount: kpis.length,
            },
            hierarchy,
        };
    }
}
