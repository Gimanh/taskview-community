import { AuthManager } from '../tv-modules/auth/AuthManager';
import { CollaborationManager } from '../tv-modules/collaboration/CollaborationManager';
import CollaborationRolesManager from '../tv-modules/collaboration-roles/CollaborationRolesManager';
import GoalsManager from '../tv-modules/goals/GoalsManager';
import { GraphManager } from '../tv-modules/graph/GraphManager';
import { KanbanManager } from '../tv-modules/kanban/KanbanManager';
import { GoalListManager } from '../tv-modules/lists/GoalListManager';
import { StartManager } from '../tv-modules/start/StartManager';
import { TagsManager } from '../tv-modules/tags/TagsManager';
import { TasksManager } from '../tv-modules/tasks/TasksManager';
import type { UserDbRecord, UserJwtPayload } from '../types/auth.types';
import { GoalPermissionsFetcher } from './GoalPermissionsFetcher';

export class AppUser {
    private readonly userData?: UserJwtPayload;
    public readonly permissionsFetcher: GoalPermissionsFetcher;
    public readonly goalsManager: GoalsManager;
    public readonly goalListManager: GoalListManager;
    public readonly tasksManager: TasksManager;
    public readonly collaborationManager: CollaborationManager;
    public readonly collaborationRolesManager: CollaborationRolesManager;
    public readonly tagsManager: TagsManager;
    public readonly authManager: AuthManager;
    private hasActiveToken: boolean = false;
    private userDataFromDb?: UserDbRecord;
    public readonly startManager: StartManager;
    public readonly kanbanManager: KanbanManager;
    public readonly graphManager: GraphManager;

    constructor(userData?: UserJwtPayload) {
        this.userData = userData;
        this.permissionsFetcher = new GoalPermissionsFetcher(this);
        this.goalsManager = new GoalsManager(this);
        this.goalListManager = new GoalListManager(this);
        this.tasksManager = new TasksManager(this);
        this.collaborationManager = new CollaborationManager(this);
        this.collaborationRolesManager = new CollaborationRolesManager(this);
        this.tagsManager = new TagsManager(this);
        this.authManager = new AuthManager(this);
        this.startManager = new StartManager(this);
        this.kanbanManager = new KanbanManager(this);
        this.graphManager = new GraphManager(this);
    }

    getTokenId(): number | undefined {
        return this.userData?.id;
    }

    getUserData(): UserJwtPayload['userData'] | undefined {
        return this.userData?.userData;
    }

    setHasActiveToken(val: boolean) {
        this.hasActiveToken = val;
    }

    getHasActiveToken() {
        return this.hasActiveToken;
    }

    setUserDataFromDb(val: UserDbRecord) {
        this.userDataFromDb = val;
    }

    getUserDataFromDb(): UserDbRecord | undefined {
        return this.userDataFromDb;
    }

    isBlocked(): boolean {
        return this.userDataFromDb?.block !== 0;
    }
}
