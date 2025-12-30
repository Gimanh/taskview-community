import { createRouter, createWebHistory } from 'vue-router';
import authenticated from '@/middleware/authenticated';
import IndexPage from '@/pages/IndexPage';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            name: 'home',
            component: IndexPage,
            children: [],
        },
        {
            path: '/:user',
            name: 'user',
            component: () => import('@/pages/UserPage'),
            children: [
                {
                    path: ':goalId',
                    name: 'goal-lists',
                    component: () => import('@/components/GoalLists'),
                    children: [
                        {
                            path: ':listId',
                            name: 'goal-list-tasks',
                            component: () => import('@/components/Tasks'),
                            children: [
                                {
                                    path: ':taskId',
                                    name: 'goal-list-tasks-task',
                                    component: () => import('@/components/Tasks/components/TaskDialog/TaskDialog.vue'),
                                    children: [],
                                },
                            ],
                        },
                        {
                            path: 'collaboration',
                            name: 'project-collaboration-page',
                            component: () => import('@/components/Collaboration/CollaborationDialog.vue'),
                        },
                    ],
                },
                {
                    path: ':goalId/kanban',
                    name: 'kanban',
                    component: () => import('@/components/Kanban/KanbanBoard.vue'),
                },
                {
                    path: 'projects',
                    name: 'user-projects',
                    component: () => import('@/components/Screens/BoardUserProjects.vue'),
                },
                {
                    path: 'projects-users',
                    name: 'user-projects-users',
                    component: () => import('@/components/Screens/components/ProjectUsers/UsersByProject.vue'),
                },
                {
                    path: ':goalId/graph',
                    name: 'user-graph',
                    component: () => import('@/components/Graph/ProjectGraph.vue'),
                },
            ],
            beforeEnter: [authenticated],
        },
        {
            path: '/login',
            name: 'login',
            component: () => import('@/pages/LoginPage'),
            children: [],
        },
    ],
});

export default router;
