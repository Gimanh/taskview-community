import { eq, and, desc, sql } from 'drizzle-orm';
import { Database } from '../../modules/db';
import {
    ProgressReportCadencesSchema,
    ProjectProgressReportsSchema,
    GoalsSchema,
    UsersSchema,
    NotificationsSchema,
    type ProgressReportCadencesTypeForSelect,
    type ProjectProgressReportsTypeForSelect,
} from 'taskview-db-schemas';
import { ensureEnterpriseTables } from '../enterprise/ensureEnterpriseTables';

export class ProgressReportsRepository {
    private db = Database.getInstance();

    // ----------------- Cadence Config -----------------
    async getCadence(goalId: number, orgId: number): Promise<any> {
        await ensureEnterpriseTables();
        let cadences = await this.db.dbDrizzle
            .select()
            .from(ProgressReportCadencesSchema)
            .where(eq(ProgressReportCadencesSchema.goalId, goalId));

        if (!cadences.length) {
            const inserted = await this.db.dbDrizzle
                .insert(ProgressReportCadencesSchema)
                .values({
                    goalId,
                    organizationId: orgId,
                    frequency: 'weekly',
                    dayOfWeek: 5, // Friday
                    hourUtc: 14,
                    reminderChannel: 'in_app',
                    isActive: true,
                })
                .returning();
            return inserted[0];
        }

        return cadences[0];
    }

    async saveCadence(goalId: number, orgId: number, data: any): Promise<any> {
        await ensureEnterpriseTables();
        const existing = await this.db.dbDrizzle
            .select()
            .from(ProgressReportCadencesSchema)
            .where(eq(ProgressReportCadencesSchema.goalId, goalId));

        if (existing.length) {
            const updated = await this.db.dbDrizzle
                .update(ProgressReportCadencesSchema)
                .set({ ...data, updatedDate: new Date() })
                .where(eq(ProgressReportCadencesSchema.id, existing[0].id))
                .returning();
            return updated[0];
        } else {
            const inserted = await this.db.dbDrizzle
                .insert(ProgressReportCadencesSchema)
                .values({
                    goalId,
                    organizationId: orgId,
                    ...data,
                })
                .returning();
            return inserted[0];
        }
    }

    // ----------------- Progress Reports -----------------
    async listReports(goalId: number): Promise<any[]> {
        await ensureEnterpriseTables();
        const reports = await this.db.dbDrizzle
            .select({
                id: ProjectProgressReportsSchema.id,
                goalId: ProjectProgressReportsSchema.goalId,
                reportedBy: ProjectProgressReportsSchema.reportedBy,
                reporterEmail: UsersSchema.email,
                reporterLogin: UsersSchema.login,
                reportDate: ProjectProgressReportsSchema.reportDate,
                overallHealth: ProjectProgressReportsSchema.overallHealth,
                stagegateHealth: ProjectProgressReportsSchema.stagegateHealth,
                budgetHealth: ProjectProgressReportsSchema.budgetHealth,
                scheduleHealth: ProjectProgressReportsSchema.scheduleHealth,
                executiveSummary: ProjectProgressReportsSchema.executiveSummary,
                keyAccomplishments: ProjectProgressReportsSchema.keyAccomplishments,
                nextPeriodPlans: ProjectProgressReportsSchema.nextPeriodPlans,
                blockersRisks: ProjectProgressReportsSchema.blockersRisks,
                createdDate: ProjectProgressReportsSchema.createdDate,
            })
            .from(ProjectProgressReportsSchema)
            .innerJoin(UsersSchema, eq(ProjectProgressReportsSchema.reportedBy, UsersSchema.id))
            .where(eq(ProjectProgressReportsSchema.goalId, goalId))
            .orderBy(desc(ProjectProgressReportsSchema.reportDate));

        return reports;
    }

    async createReport(data: {
        goalId: number;
        reportedBy: number;
        overallHealth: 'green' | 'amber' | 'red';
        stagegateHealth: 'green' | 'amber' | 'red';
        budgetHealth: 'green' | 'amber' | 'red';
        scheduleHealth: 'green' | 'amber' | 'red';
        executiveSummary: string;
        keyAccomplishments?: string;
        nextPeriodPlans?: string;
        blockersRisks?: string;
    }): Promise<any> {
        await ensureEnterpriseTables();
        const inserted = await this.db.dbDrizzle
            .insert(ProjectProgressReportsSchema)
            .values({
                goalId: data.goalId,
                reportedBy: data.reportedBy,
                overallHealth: data.overallHealth,
                stagegateHealth: data.stagegateHealth,
                budgetHealth: data.budgetHealth,
                scheduleHealth: data.scheduleHealth,
                executiveSummary: data.executiveSummary,
                keyAccomplishments: data.keyAccomplishments || '',
                nextPeriodPlans: data.nextPeriodPlans || '',
                blockersRisks: data.blockersRisks || '',
            })
            .returning();

        return inserted[0];
    }

    // Trigger progress report automated reminder
    async triggerReminder(goalId: number, senderUserId?: number): Promise<any> {
        await ensureEnterpriseTables();
        const goals = await this.db.dbDrizzle
            .select()
            .from(GoalsSchema)
            .where(eq(GoalsSchema.id, goalId));

        if (!goals.length) throw new Error('Project not found');
        const project = goals[0];

        // Send in-app notification to the project owner
        if (project.owner) {
            await this.db.dbDrizzle.insert(NotificationsSchema).values({
                userId: project.owner,
                type: 'progress_report_due',
                title: `Progress Report Due: ${project.name}`,
                body: `Your scheduled periodic progress report is due for project "${project.name}". Please submit the executive summary and RAG health metrics.`,
            });
        }

        // Update cadence last reminder timestamp
        await this.db.dbDrizzle
            .update(ProgressReportCadencesSchema)
            .set({ lastReminderSentAt: new Date() })
            .where(eq(ProgressReportCadencesSchema.goalId, goalId));

        return {
            success: true,
            recipientUserId: project.owner,
            timestamp: new Date().toISOString(),
            message: `Automated progress report reminder sent to project owner for "${project.name}".`,
        };
    }
}
