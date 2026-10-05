import { eq, and, desc } from 'drizzle-orm';
import { Database } from '../../modules/db';
import {
    AnnualPlanningCyclesSchema,
    PlanningProposalsSchema,
    GoalsSchema,
    ProjectStagegatesSchema,
    type AnnualPlanningCyclesTypeForSelect,
    type PlanningProposalsTypeForSelect,
} from 'taskview-db-schemas';
import { ensureEnterpriseTables } from '../enterprise/ensureEnterpriseTables';

export class AnnualPlanningRepository {
    private db = Database.getInstance();

    // ----------------- Planning Cycles -----------------
    async listCycles(orgId: number): Promise<any[]> {
        await ensureEnterpriseTables();
        const cycles = await this.db.dbDrizzle
            .select()
            .from(AnnualPlanningCyclesSchema)
            .where(eq(AnnualPlanningCyclesSchema.organizationId, orgId))
            .orderBy(desc(AnnualPlanningCyclesSchema.year));

        const result: any[] = [];
        for (const cycle of cycles) {
            const proposals = await this.listProposals(cycle.id);
            const totalRequested = proposals.reduce((acc, p) => acc + (p.requestedBudget || 0), 0);
            const approvedBudget = proposals
                .filter(p => p.status === 'approved')
                .reduce((acc, p) => acc + (p.requestedBudget || 0), 0);

            result.push({
                ...cycle,
                proposalsCount: proposals.length,
                totalRequestedBudget: totalRequested,
                allocatedBudget: approvedBudget,
                remainingCapitalBudget: (cycle.totalCapitalBudget || 0) - approvedBudget,
            });
        }
        return result;
    }

    async createCycle(data: {
        organizationId: number;
        year: number;
        title: string;
        status?: 'draft' | 'intake_open' | 'scoring' | 'approved' | 'closed';
        startDate?: string | Date;
        submissionDeadline?: string | Date;
        totalCapitalBudget?: number;
        totalOperatingBudget?: number;
    }): Promise<any> {
        await ensureEnterpriseTables();
        const inserted = await this.db.dbDrizzle
            .insert(AnnualPlanningCyclesSchema)
            .values({
                organizationId: data.organizationId,
                year: data.year,
                title: data.title,
                status: data.status || 'intake_open',
                startDate: data.startDate ? new Date(data.startDate) : null,
                submissionDeadline: data.submissionDeadline ? new Date(data.submissionDeadline) : null,
                totalCapitalBudget: data.totalCapitalBudget ?? 0,
                totalOperatingBudget: data.totalOperatingBudget ?? 0,
            })
            .returning();

        return inserted[0];
    }

    async updateCycle(id: number, data: any): Promise<any> {
        await ensureEnterpriseTables();
        const updateData: any = { ...data };
        if (data.startDate) updateData.startDate = new Date(data.startDate);
        if (data.submissionDeadline) updateData.submissionDeadline = new Date(data.submissionDeadline);

        const updated = await this.db.dbDrizzle
            .update(AnnualPlanningCyclesSchema)
            .set(updateData)
            .where(eq(AnnualPlanningCyclesSchema.id, id))
            .returning();

        return updated[0] || null;
    }

    async deleteCycle(id: number): Promise<boolean> {
        await ensureEnterpriseTables();
        const deleted = await this.db.dbDrizzle
            .delete(AnnualPlanningCyclesSchema)
            .where(eq(AnnualPlanningCyclesSchema.id, id))
            .returning();

        return deleted.length > 0;
    }

    // ----------------- Proposals -----------------
    async listProposals(cycleId: number): Promise<any[]> {
        await ensureEnterpriseTables();
        const proposals = await this.db.dbDrizzle
            .select()
            .from(PlanningProposalsSchema)
            .where(eq(PlanningProposalsSchema.cycleId, cycleId))
            .orderBy(desc(PlanningProposalsSchema.priorityScore));

        return proposals;
    }

    async createProposal(data: {
        cycleId: number;
        organizationId: number;
        initiativeId?: number;
        title: string;
        description?: string;
        businessCase?: string;
        strategicAlignmentScore?: number;
        financialScore?: number;
        riskScore?: number;
        estimatedCost?: number;
        requestedBudget?: number;
        sponsorUserId?: number;
    }): Promise<any> {
        await ensureEnterpriseTables();
        const strat = data.strategicAlignmentScore ?? 5; // 1-10
        const fin = data.financialScore ?? 5; // 1-10
        const risk = data.riskScore ?? 3; // 1-5 (lower risk is better: 6 - risk)
        // Score on a 0-100 scale: Strat(40%) + Fin(40%) + Risk(20%)
        const priorityScore = Math.round((strat * 4) + (fin * 4) + ((6 - risk) * 4));

        const inserted = await this.db.dbDrizzle
            .insert(PlanningProposalsSchema)
            .values({
                cycleId: data.cycleId,
                organizationId: data.organizationId,
                initiativeId: data.initiativeId || null,
                title: data.title,
                description: data.description || '',
                businessCase: data.businessCase || '',
                strategicAlignmentScore: strat,
                financialScore: fin,
                riskScore: risk,
                priorityScore,
                estimatedCost: data.estimatedCost ?? 0,
                requestedBudget: data.requestedBudget ?? 0,
                sponsorUserId: data.sponsorUserId || null,
                status: 'submitted',
            })
            .returning();

        return inserted[0];
    }

    async updateProposal(id: number, data: any): Promise<any> {
        await ensureEnterpriseTables();
        const existing = await this.db.dbDrizzle
            .select()
            .from(PlanningProposalsSchema)
            .where(eq(PlanningProposalsSchema.id, id));

        if (!existing.length) return null;

        const strat = data.strategicAlignmentScore ?? existing[0].strategicAlignmentScore;
        const fin = data.financialScore ?? existing[0].financialScore;
        const risk = data.riskScore ?? existing[0].riskScore;
        const priorityScore = Math.round((strat * 4) + (fin * 4) + ((6 - risk) * 4));

        const updated = await this.db.dbDrizzle
            .update(PlanningProposalsSchema)
            .set({
                ...data,
                priorityScore,
                updatedDate: new Date(),
            })
            .where(eq(PlanningProposalsSchema.id, id))
            .returning();

        return updated[0] || null;
    }

    async deleteProposal(id: number): Promise<boolean> {
        await ensureEnterpriseTables();
        const deleted = await this.db.dbDrizzle
            .delete(PlanningProposalsSchema)
            .where(eq(PlanningProposalsSchema.id, id))
            .returning();

        return deleted.length > 0;
    }

    // 1-Click Promote Approved Proposal into Active Project with Stagegates
    async promoteToProject(proposalId: number, ownerId: number): Promise<any> {
        await ensureEnterpriseTables();
        const rows = await this.db.dbDrizzle
            .select()
            .from(PlanningProposalsSchema)
            .where(eq(PlanningProposalsSchema.id, proposalId));

        if (!rows.length) throw new Error('Proposal not found');
        const proposal = rows[0];

        // 1. Create Project in Goals table
        const newGoal = await this.db.dbDrizzle
            .insert(GoalsSchema)
            .values({
                name: proposal.title,
                description: proposal.description || proposal.businessCase || '',
                color: '#3b82f6',
                owner: ownerId,
                organizationId: proposal.organizationId,
                estimateUnit: 'hours',
            })
            .returning();

        const createdProject = newGoal[0];

        // 2. Automatically generate default Enterprise Stagegates for the new Project
        const standardPhases = [
            { name: 'Phase 1: Project Charter & Feasibility', orderIndex: 1, description: 'Formalize business case, scope, and stakeholder sign-off.' },
            { name: 'Phase 2: Detailed Planning & Architecture', orderIndex: 2, description: 'Work breakdown structure, schedule, architecture review, and budget baseline.' },
            { name: 'Phase 3: Execution, Build & Testing', orderIndex: 3, description: 'Deliverable development, integration testing, and quality verification.' },
            { name: 'Phase 4: Launch & Operational Handover', orderIndex: 4, description: 'Production deployment, training, acceptance sign-off, and lessons learned.' },
        ];

        for (const phase of standardPhases) {
            await this.db.dbDrizzle.insert(ProjectStagegatesSchema).values({
                goalId: createdProject.id,
                name: phase.name,
                description: phase.description,
                orderIndex: phase.orderIndex,
                status: phase.orderIndex === 1 ? 'in_progress' : 'not_started',
                exitCriteria: [
                    { id: 'crit-1', title: 'Phase Deliverables Sign-off', required: true, completed: false },
                    { id: 'crit-2', title: 'Budget & Schedule Review', required: true, completed: false },
                ],
            });
        }

        // 3. Mark proposal as approved and record converted project
        await this.db.dbDrizzle
            .update(PlanningProposalsSchema)
            .set({
                status: 'approved',
                convertedGoalId: createdProject.id,
                updatedDate: new Date(),
            })
            .where(eq(PlanningProposalsSchema.id, proposalId));

        return {
            proposalId,
            project: createdProject,
            message: 'Proposal successfully promoted to active project with automated stagegates.',
        };
    }
}
