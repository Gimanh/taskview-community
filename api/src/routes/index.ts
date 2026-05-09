import AuthRoutes from '../tv-modules/auth/AuthRoutes';
import CollaborationRoutes from '../tv-modules/collaboration/CollaborationRoutes';
import CollaborationRolesRoutes from '../tv-modules/collaboration-roles/CollaborationRolesRoutes';
import GoalsRoutes from '../tv-modules/goals/GoalsRoutes';
import GraphRoutes from '../tv-modules/graph/GraphRoutes';
import IntegrationsRoutes from '../tv-modules/integrations/IntegrationsRoutes';
import NotificationsRoutes from '../tv-modules/notifications/NotificationsRoutes';
import WebhooksRoutes from '../tv-modules/webhooks/WebhooksRoutes';
import ApiTokensRoutes from '../tv-modules/api-tokens/ApiTokensRoutes';
import SessionsRoutes from '../tv-modules/sessions/SessionsRoutes';
import KanbanRoutes from '../tv-modules/kanban/KanbanRoutes';
import GoalListRoutes from '../tv-modules/lists/GoalListRoutes';
import StartRoutes from '../tv-modules/start/StartRoutes';
import TagsRouter from '../tv-modules/tags/TagsRouter';
import TasksRoutes from '../tv-modules/tasks/TasksRoutes';
import OrganizationRoutes from '../tv-modules/organizations/OrganizationRoutes';
import SsoRoutes from '../tv-modules/sso/SsoRoutes';
import ScimRoutes from '../tv-modules/scim/ScimRoutes';
import AnalyticsRoutes from '../tv-modules/analytics/AnalyticsRoutes';
import type { Routable } from '../types/routable.type';

type RoutableConstructor = new (...args: any[]) => Routable;

const routes: Record<string, RoutableConstructor> = {
    '/module/auth': AuthRoutes,
    '/module/goals': GoalsRoutes,
    '/module/goal_lists': GoalListRoutes,
    '/module/tasks': TasksRoutes,
    '/module/collaboration': CollaborationRoutes,
    '/module/collaborationroles': CollaborationRolesRoutes,
    '/module/tags': TagsRouter,
    '/module/about': StartRoutes,
    '/module/kanban': KanbanRoutes,
    '/module/graph': GraphRoutes,
    '/module/integrations': IntegrationsRoutes,
    '/module/notifications': NotificationsRoutes,
    '/module/webhooks': WebhooksRoutes,
    '/module/api-tokens': ApiTokensRoutes,
    '/module/sessions': SessionsRoutes,
    '/module/organizations': OrganizationRoutes,
    '/module/sso': SsoRoutes,
    '/module/analytics': AnalyticsRoutes,
    '/scim/v2': ScimRoutes,
};

export default routes;
