import { eq, and, desc, asc, inArray } from 'drizzle-orm';
import { Database } from '../../modules/db';
import {
    ProjectStagegatesSchema,
    StagegateApprovalsSchema,
    StagegateTasksSchema,
    TasksSchema,
    type ProjectStagegatesTypeForInsert,
    type ProjectStagegatesTypeForSelect,
} from 'taskview-db-schemas';
import { ensureEnterpriseTables } from '../enterprise/ensureEnterpriseTables';

export class StagegatesRepository {
    private db = Database.getInstance();

    async listForGoal(goalId: number): Promise<any[]> {
        await ensureEnterpriseTables();
        const stagegates = await this.db.dbDrizzle
            .select()
            .from(ProjectStagegatesSchema)
            .where(eq(ProjectStagegatesSchema.goalId, goalId))
            .orderBy(asc(ProjectStagegatesSchema.orderIndex));

        const result: any[] = [];
        for (const gate of stagegates) {
            const progress = await this.getProgress(gate.id);
            const approvals = await this.db.dbDrizzle
                .select()
                .from(StagegateApprovalsSchema)
                .where(eq(StagegateApprovalsSchema.stagegateId, gate.id))
                .orderBy(desc(StagegateApprovalsSchema.createdDate));

            result.push({
                ...gate,
                progress,
                approvals,
            });
        }

        return result;
    }

    async getById(id: number): Promise<any | null> {
        await ensureEnterpriseTables();
        const rows = await this.db.dbDrizzle
            .select()
            .from(ProjectStagegatesSchema)
            .where(eq(ProjectStagegatesSchema.id, id));

        if (!rows.length) return null;
        const gate = rows[0];
        const progress = await this.getProgress(gate.id);
        const approvals = await this.db.dbDrizzle
            .select()
            .from(StagegateApprovalsSchema)
            .where(eq(StagegateApprovalsSchema.stagegateId, gate.id))
            .orderBy(desc(StagegateApprovalsSchema.createdDate));

        return { ...gate, progress, approvals };
    }

    async create(data: {
        goalId: number;
        name: string;
        description?: string;
        orderIndex?: number;
        gateDate?: string | Date;
        exitCriteria?: any[];
    }): Promise<any> {
        await ensureEnterpriseTables();
        const inserted = await this.db.dbDrizzle
            .insert(ProjectStagegatesSchema)
            .values({
                goalId: data.goalId,
                name: data.name,
                description: data.description || '',
                orderIndex: data.orderIndex ?? 0,
                gateDate: data.gateDate ? new Date(data.gateDate) : null,
                exitCriteria: data.exitCriteria || [],
                status: 'not_started',
            })
            .returning();

        return inserted[0];
    }

    async update(id: number, data: Partial<{
        name: string;
        description: string;
        orderIndex: number;
        status: 'not_started' | 'in_progress' | 'ready_for_review' | 'approved' | 'rejected';
        gateDate: string | Date | null;
        exitCriteria: any[];
    }>): Promise<any> {
        await ensureEnterpriseTables();
        const updateValues: any = {
            ...data,
            updatedDate: new Date(),
        };
        if (data.gateDate !== undefined) {
            updateValues.gateDate = data.gateDate ? new Date(data.gateDate) : null;
        }

        const updated = await this.db.dbDrizzle
            .update(ProjectStagegatesSchema)
            .set(updateValues)
            .where(eq(ProjectStagegatesSchema.id, id))
            .returning();

        return updated[0] || null;
    }

    async delete(id: number): Promise<boolean> {
        await ensureEnterpriseTables();
        const deleted = await this.db.dbDrizzle
            .delete(ProjectStagegatesSchema)
            .where(eq(ProjectStagegatesSchema.id, id))
            .returning();

        return deleted.length > 0;
    }

    async getProgress(stagegateId: number): Promise<{
        totalTasks: number;
        completedTasks: number;
        progressPercent: number;
        mandatoryCriteriaTotal: number;
        mandatoryCriteriaMet: number;
        health: 'green' | 'amber' | 'red';
    }> {
        await ensureEnterpriseTables();
        // Get linked tasks
        const linkedTasks = await this.db.dbDrizzle
            .select({
                taskId: StagegateTasksSchema.taskId,
                isMandatory: StagegateTasksSchema.isMandatoryExitCriterion,
                complete: TasksSchema.complete,
            })
            .from(StagegateTasksSchema)
            .innerJoin(TasksSchema, eq(StagegateTasksSchema.taskId, TasksSchema.id))
            .where(eq(StagegateTasksSchema.stagegateId, stagegateId));

        const totalTasks = linkedTasks.length;
        const completedTasks = linkedTasks.filter(t => t.complete === true).length;
        const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        const mandatory = linkedTasks.filter(t => t.isMandatory);
        const mandatoryTotal = mandatory.length;
        const mandatoryMet = mandatory.filter(t => t.complete === true).length;

        let health: 'green' | 'amber' | 'red' = 'green';
        if (mandatoryTotal > 0 && mandatoryMet < mandatoryTotal) {
            health = progressPercent > 50 ? 'amber' : 'red';
        } else if (progressPercent < 40 && totalTasks > 0) {
            health = 'amber';
        }

        return {
            totalTasks,
            completedTasks,
            progressPercent,
            mandatoryCriteriaTotal: mandatoryTotal,
            mandatoryCriteriaMet: mandatoryMet,
            health,
        };
    }

    async assignTask(stagegateId: number, taskId: number, isMandatory = false): Promise<any> {
        await ensureEnterpriseTables();
        const inserted = await this.db.dbDrizzle
            .insert(StagegateTasksSchema)
            .values({
                stagegateId,
                taskId,
                isMandatoryExitCriterion: isMandatory,
            })
            .returning();

        return inserted[0];
    }

    async unassignTask(stagegateId: number, taskId: number): Promise<boolean> {
        await ensureEnterpriseTables();
        const deleted = await this.db.dbDrizzle
            .delete(StagegateTasksSchema)
            .where(and(eq(StagegateTasksSchema.stagegateId, stagegateId), eq(StagegateTasksSchema.taskId, taskId)))
            .returning();

        return deleted.length > 0;
    }

    async submitForReview(id: number): Promise<any> {
        await ensureEnterpriseTables();
        return this.update(id, { status: 'ready_for_review' });
    }

    async decideApproval(stagegateId: number, approverId: number, decision: 'approved' | 'rejected', comments: string): Promise<any> {
        await ensureEnterpriseTables();
        // Record in stagegate_approvals
        await this.db.dbDrizzle.insert(StagegateApprovalsSchema).values({
            stagegateId,
            approverId,
            status: decision,
            comments: comments || '',
            decidedAt: new Date(),
        });

        // Update stagegate
        const updateData: any = {
            status: decision,
            updatedDate: new Date(),
        };

        if (decision === 'approved') {
            updateData.approvedAt = new Date();
            updateData.approvedBy = approverId;
            updateData.rejectionReason = null;
        } else {
            updateData.rejectionReason = comments || 'Rejected during approval cycle';
        }

        const updated = await this.db.dbDrizzle
            .update(ProjectStagegatesSchema)
            .set(updateData)
            .where(eq(ProjectStagegatesSchema.id, stagegateId))
            .returning();

        return updated[0];
    }
}
