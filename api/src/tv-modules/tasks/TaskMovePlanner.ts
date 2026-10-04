import { GoalPermissions } from '../../types/auth.types';
import type { GoalPermissionsChecker } from '../../core/GoalPermissionsChecker';
import type { TaskMoveRepository } from './TaskMoveRepository';
import type {
    TaskArgMove,
    TaskMoveDecision,
    TaskMovePlannerArgs,
    TaskMovePreviewDto,
    TaskMoveTimeEntryCountArgs,
} from './task-move.types';

export class TaskMovePlanner {
    private readonly repository: TaskMoveRepository;
    private readonly userId: number;
    private readonly checkerForGoal: (goalId: number) => Promise<GoalPermissionsChecker>;

    constructor(args: TaskMovePlannerArgs) {
        this.repository = args.repository;
        this.userId = args.userId;
        this.checkerForGoal = args.checkerForGoal;
    }

    async plan(args: TaskArgMove): Promise<TaskMoveDecision> {
        const context = await this.repository.fetchContext(args);
        if (!context || !context.target) return { ok: false, reason: 'not_found' };
        const { task, target } = context;

        // No access to the task itself is reported as "not found", so the task's existence is not revealed
        const source = await this.checkerForGoal(task.goalId);
        if (!source.hasPermissions(GoalPermissions.COMPONENT_CAN_WATCH_CONTENT)) return { ok: false, reason: 'not_found' };
        if (task.parentId !== null) return { ok: false, reason: 'is_subtask' };
        if (target.id === task.goalId) return { ok: false, reason: 'same_project' };
        if (context.sourceOrganizationId === null || context.sourceOrganizationId !== target.organizationId) {
            return { ok: false, reason: 'other_organization' };
        }

        const destination = await this.checkerForGoal(target.id);
        if (!destination.hasPermissions(GoalPermissions.COMPONENT_CAN_ADD_TASKS)) return { ok: false, reason: 'no_target_permission' };

        // Without the right to delete tasks in the source project the original stays and a copy is created
        const mode = source.hasPermissions(GoalPermissions.TASKS_CAN_DELETE) ? 'move' : 'copy';

        const subtaskIds = await this.repository.fetchSubtaskIds(task.id);
        const withSubtasks = destination.hasPermissions(GoalPermissions.TASKS_CAN_ADD_SUBTASKS);
        const taskIds = [task.id, ...(withSubtasks ? subtaskIds : [])];
        const leftBehindSubtaskIds = withSubtasks ? [] : subtaskIds;

        // Logged time is never duplicated: a copy starts without it, a move takes the entries the user may log there
        const timeEntryUserIds = mode === 'move' ? this.timeEntryUsers(destination) : [];
        const counted: TaskMoveTimeEntryCountArgs = { taskIds, userIds: timeEntryUserIds };
        const movedTimeEntries = mode === 'move' ? await this.repository.countTimeEntries(counted) : 0;
        const allTimeEntries = mode === 'move' ? await this.repository.countTimeEntries({ taskIds, userIds: null }) : 0;

        return {
            ok: true,
            plan: {
                mode,
                rootTaskId: task.id,
                sourceGoalId: task.goalId,
                targetGoalId: target.id,
                targetGoalOwnerId: target.ownerId,
                taskIds,
                leftBehindSubtaskIds,
                timeEntryUserIds,
                removals: await this.repository.countRemovals({ taskIds }),
                leftBehind: { subtasks: leftBehindSubtaskIds.length, timeEntries: allTimeEntries - movedTimeEntries },
                movedTimeEntries,
            },
        };
    }

    toPreview(decision: TaskMoveDecision): TaskMovePreviewDto {
        if (!decision.ok) {
            return { allowed: false, reason: decision.reason, mode: null, tasks: 0, timeEntries: 0, removals: null, leftBehind: null };
        }
        const { plan } = decision;
        return {
            allowed: true,
            reason: null,
            mode: plan.mode,
            tasks: plan.taskIds.length,
            timeEntries: plan.movedTimeEntries,
            removals: plan.removals,
            leftBehind: plan.leftBehind,
        };
    }

    private timeEntryUsers(destination: GoalPermissionsChecker): number[] | null {
        if (destination.hasPermissions(GoalPermissions.TIMETRACKING_CAN_MANAGE_ALL)) return null;
        if (destination.hasPermissions(GoalPermissions.TIMETRACKING_CAN_LOG)) return [this.userId];
        return [];
    }
}
