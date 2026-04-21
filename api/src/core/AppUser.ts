import { AuthManager } from '../tv-modules/auth/AuthManager';
import { CollaborationManager } from '../tv-modules/collaboration/CollaborationManager';
import CollaborationRolesManager from '../tv-modules/collaboration-roles/CollaborationRolesManager';
import GoalsManager from '../tv-modules/goals/GoalsManager';
import { GraphManager } from '../tv-modules/graph/GraphManager';
import { KanbanManager } from '../tv-modules/kanban/KanbanManager';
import { GoalListManager } from '../tv-modules/lists/GoalListManager';
import { StartManager } from '../tv-modules/start/StartManager';
import { TagsManager } from '../tv-modules/tags/TagsManager';
import { IntegrationsManager } from '../tv-modules/integrations/IntegrationsManager';
import { NotificationsManager } from '../tv-modules/notifications/NotificationsManager';
import { OrganizationManager } from '../tv-modules/organizations/OrganizationManager';
import { SsoManager } from '../tv-modules/sso/SsoManager';
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
    private apiTokenAuth: boolean = false;
    private tokenPermissions?: string[];
    private allowedGoalIds?: number[];
    private userDataFromDb?: UserDbRecord;
    public readonly startManager: StartManager;
    public readonly kanbanManager: KanbanManager;
    public readonly graphManager: GraphManager;
    public readonly integrationsManager: IntegrationsManager;
    public readonly notificationsManager: NotificationsManager;
    public readonly organizationManager: OrganizationManager;
    public readonly ssoManager: SsoManager;

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
        this.integrationsManager = new IntegrationsManager(this);
        this.notificationsManager = new NotificationsManager(this);
        this.organizationManager = new OrganizationManager(this);
        this.ssoManager = new SsoManager(this);
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

    /**
     * Use it for API token authentication.
     * @param permissions Permissions that the API token has
     */
    setApiTokenAuth(permissions: string[], goalIds: number[]) {
        this.apiTokenAuth = true;
        this.tokenPermissions = permissions;
        this.allowedGoalIds = goalIds;
    }

    isApiTokenAuth(): boolean {
        return this.apiTokenAuth;
    }

    getAllowedGoalIds(): number[] | undefined {
        return this.allowedGoalIds;
    }

    getTokenPermissions(): string[] | undefined {
        return this.tokenPermissions;
    }
}
