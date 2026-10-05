import { eq, and, desc, isNull, or } from 'drizzle-orm';
import { Database } from '../../modules/db';
import {
    ProjectRisksSchema,
    GoalsSchema,
    UsersSchema,
    type ProjectRisksTypeForSelect,
    type ProjectRisksTypeForInsert,
} from 'taskview-db-schemas';
import { ensureEnterpriseTables } from '../enterprise/ensureEnterpriseTables';

export class RisksRepository {
    private db = Database.getInstance();

    async listRisks(orgId: number, goalId?: number): Promise<any[]> {
        await ensureEnterpriseTables();
        const query = this.db.dbDrizzle
            .select({
                id: ProjectRisksSchema.id,
                organizationId: ProjectRisksSchema.organizationId,
                goalId: ProjectRisksSchema.goalId,
                projectName: GoalsSchema.name,
                title: ProjectRisksSchema.title,
                description: ProjectRisksSchema.description,
                category: ProjectRisksSchema.category,
                probability: ProjectRisksSchema.probability,
                impact: ProjectRisksSchema.impact,
                severityScore: ProjectRisksSchema.severityScore,
                status: ProjectRisksSchema.status,
                responseStrategy: ProjectRisksSchema.responseStrategy,
                mitigationPlan: ProjectRisksSchema.mitigationPlan,
                contingencyPlan: ProjectRisksSchema.contingencyPlan,
                ownerUserId: ProjectRisksSchema.ownerUserId,
                ownerEmail: UsersSchema.email,
                reviewDate: ProjectRisksSchema.reviewDate,
                createdDate: ProjectRisksSchema.createdDate,
                updatedDate: ProjectRisksSchema.updatedDate,
            })
            .from(ProjectRisksSchema)
            .leftJoin(GoalsSchema, eq(ProjectRisksSchema.goalId, GoalsSchema.id))
            .leftJoin(UsersSchema, eq(ProjectRisksSchema.ownerUserId, UsersSchema.id))
            .where(
                goalId
                    ? and(eq(ProjectRisksSchema.organizationId, orgId), eq(ProjectRisksSchema.goalId, goalId))
                    : eq(ProjectRisksSchema.organizationId, orgId)
            )
            .orderBy(desc(ProjectRisksSchema.severityScore));

        const risks = await query;
        return risks.map(r => ({
            ...r,
            severityLevel: this.getSeverityLevel(r.severityScore),
        }));
    }

    async getById(id: number): Promise<any | null> {
        await ensureEnterpriseTables();
        const rows = await this.db.dbDrizzle
            .select()
            .from(ProjectRisksSchema)
            .where(eq(ProjectRisksSchema.id, id));

        if (!rows.length) return null;
        return {
            ...rows[0],
            severityLevel: this.getSeverityLevel(rows[0].severityScore),
        };
    }

    async createRisk(data: {
        organizationId: number;
        goalId?: number;
        title: string;
        description?: string;
        category?: 'technical' | 'financial' | 'operational' | 'schedule' | 'strategic' | 'external';
        probability?: number;
        impact?: number;
        status?: 'identified' | 'analyzed' | 'mitigating' | 'accepted' | 'closed';
        responseStrategy?: 'avoid' | 'mitigate' | 'transfer' | 'accept';
        mitigationPlan?: string;
        contingencyPlan?: string;
        ownerUserId?: number;
        reviewDate?: string | Date;
    }): Promise<any> {
        await ensureEnterpriseTables();
        const prob = Math.min(5, Math.max(1, data.probability ?? 3));
        const imp = Math.min(5, Math.max(1, data.impact ?? 3));
        const severityScore = prob * imp;

        const inserted = await this.db.dbDrizzle
            .insert(ProjectRisksSchema)
            .values({
                organizationId: data.organizationId,
                goalId: data.goalId || null,
                title: data.title,
                description: data.description || '',
                category: data.category || 'operational',
                probability: prob,
                impact: imp,
                severityScore,
                status: data.status || 'identified',
                responseStrategy: data.responseStrategy || 'mitigate',
                mitigationPlan: data.mitigationPlan || '',
                contingencyPlan: data.contingencyPlan || '',
                ownerUserId: data.ownerUserId || null,
                reviewDate: data.reviewDate ? new Date(data.reviewDate) : null,
            })
            .returning();

        return {
            ...inserted[0],
            severityLevel: this.getSeverityLevel(severityScore),
        };
    }

    async updateRisk(id: number, data: any): Promise<any> {
        await ensureEnterpriseTables();
        const existing = await this.db.dbDrizzle
            .select()
            .from(ProjectRisksSchema)
            .where(eq(ProjectRisksSchema.id, id));

        if (!existing.length) return null;

        const prob = data.probability !== undefined ? Math.min(5, Math.max(1, data.probability)) : existing[0].probability;
        const imp = data.impact !== undefined ? Math.min(5, Math.max(1, data.impact)) : existing[0].impact;
        const severityScore = prob * imp;

        const updateData: any = {
            ...data,
            probability: prob,
            impact: imp,
            severityScore,
            updatedDate: new Date(),
        };
        if (data.reviewDate !== undefined) {
            updateData.reviewDate = data.reviewDate ? new Date(data.reviewDate) : null;
        }

        const updated = await this.db.dbDrizzle
            .update(ProjectRisksSchema)
            .set(updateData)
            .where(eq(ProjectRisksSchema.id, id))
            .returning();

        return {
            ...updated[0],
            severityLevel: this.getSeverityLevel(severityScore),
        };
    }

    async deleteRisk(id: number): Promise<boolean> {
        await ensureEnterpriseTables();
        const deleted = await this.db.dbDrizzle
            .delete(ProjectRisksSchema)
            .where(eq(ProjectRisksSchema.id, id))
            .returning();

        return deleted.length > 0;
    }

    // 5x5 Matrix Analysis
    async getRiskMatrix(orgId: number, goalId?: number): Promise<any> {
        await ensureEnterpriseTables();
        const risks = await this.listRisks(orgId, goalId);

        // Build 5x5 heatmap grid
        const matrix: { probability: number; impact: number; count: number; risks: any[] }[][] = [];
        for (let p = 5; p >= 1; p--) {
            const row: { probability: number; impact: number; count: number; risks: any[] }[] = [];
            for (let i = 1; i <= 5; i++) {
                const cellRisks = risks.filter(r => r.probability === p && r.impact === i && r.status !== 'closed');
                row.push({
                    probability: p,
                    impact: i,
                    count: cellRisks.length,
                    risks: cellRisks,
                });
            }
            matrix.push(row);
        }

        const openRisks = risks.filter(r => r.status !== 'closed');
        const criticalCount = openRisks.filter(r => r.severityScore >= 15).length;
        const mediumCount = openRisks.filter(r => r.severityScore >= 8 && r.severityScore < 15).length;
        const lowCount = openRisks.filter(r => r.severityScore < 8).length;

        return {
            totalOpenRisks: openRisks.length,
            criticalCount,
            mediumCount,
            lowCount,
            matrix,
            risks,
        };
    }

    private getSeverityLevel(score: number): 'critical' | 'medium' | 'low' {
        if (score >= 15) return 'critical';
        if (score >= 8) return 'medium';
        return 'low';
    }
}
