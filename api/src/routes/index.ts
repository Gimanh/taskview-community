import AuthRoutes from '../tv-modules/auth/AuthRoutes';
import CollaborationRoutes from '../tv-modules/collaboration/CollaborationRoutes';
import CollaborationRolesRoutes from '../tv-modules/collaboration-roles/CollaborationRolesRoutes';
import GoalsRoutes from '../tv-modules/goals/GoalsRoutes';
import GraphRoutes from '../tv-modules/graph/GraphRoutes';
import KanbanRoutes from '../tv-modules/kanban/KanbanRoutes';
import GoalListRoutes from '../tv-modules/lists/GoalListRoutes';
import StartRoutes from '../tv-modules/start/StartRoutes';
import TagsRouter from '../tv-modules/tags/TagsRouter';
import TasksRoutes from '../tv-modules/tasks/TasksRoutes';
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
};

export default routes;
