import './assets/css/main.css'
import { addCollection } from '@iconify/vue'
import lucide from '@iconify-json/lucide/icons.json'
import mdi from '@iconify-json/mdi/icons.json'
import carbon from '@iconify-json/carbon/icons.json'
import { createPinia } from 'pinia'
import type { Plugin } from 'vue'
import { createApp } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import ui from '@nuxt/ui/vue-plugin'
import { i18n, restoreSavedLocale } from './plugins/i18n'
import { storeResetPlugin } from './plugins/pinia'
import App from './App.vue'
import authenticated from './middleware/authenticated'
import syncSelectedProject from './middleware/syncSelectedProject'
import api from './plugins/axios'
import LoginPage from './pages/login.vue'
import { registerExtensionOutlets } from './extensions/registry'
import type { CreateTaskviewAppOptions, TvWebExtension } from './extensions/types'
import type { Locale } from './locales'

function buildRoutes(extensions: TvWebExtension[]): RouteRecordRaw[] {
  const extensionRoutes = extensions.flatMap((extension) => extension.routes ?? [])
  const extensionOrgRoutes = extensions.flatMap((extension) => extension.orgRoutes ?? [])

  return [
    {
      path: '/',
      name: 'login',
      alias: '/login',
      component: LoginPage,
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('./pages/reset-password.vue'),
    },
    ...extensionRoutes,
    {
      path: '/:orgSlug',
      component: () => import('./layouts/UserLayout.vue'),
      beforeEnter: [authenticated],
      children: [
        {
          path: ':projectId/kanban',
          name: 'kanban',
          component: () => import('./pages/user/kanban.vue'),
        },
        {
          path: ':projectId/graph',
          name: 'graph',
          component: () => import('./pages/user/graph.vue'),
        },
        {
          path: ':projectId/sprints',
          name: 'sprints',
          component: () => import('./pages/user/sprints.vue'),
        },
        {
          path: ':projectId/collaboration',
          name: 'collaboration',
          component: () => import('./pages/user/collaboration.vue'),
        },
        {
          path: ':projectId/integrations',
          name: 'integrations',
          component: () => import('./pages/user/integrations.vue'),
        },
        {
          path: ':projectId/webhooks',
          name: 'webhooks',
          component: () => import('./pages/user/webhooks.vue'),
        },
        {
          path: ':projectId/messaging',
          name: 'messaging',
          component: () => import('./pages/user/messaging.vue'),
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('./pages/user/settings.vue'),
        },
        {
          path: 'account',
          name: 'account',
          component: () => import('./pages/user/account.vue'),
        },
        {
          path: 'organizations',
          name: 'organizations',
          component: () => import('./pages/user/organizations.vue'),
        },
        {
          path: 'analytics',
          name: 'analytics',
          component: () => import('./pages/user/analytics.vue'),
        },
        {
          path: 'ui-customization',
          name: 'ui-customization',
          component: () => import('./pages/user/ui-customization.vue'),
        },
        {
          path: 'time-reports',
          name: 'time-reports',
          component: () => import('./pages/user/time-reports.vue'),
        },
        {
          path: ':projectId/time-reports',
          name: 'project-time-reports',
          component: () => import('./pages/user/project-time-reports.vue'),
        },
        ...extensionOrgRoutes,
        {
          path: ':projectId?/:listId?/:taskId?',
          name: 'user',
          component: () => import('./pages/user/index.vue'),
        },
      ],
    },
  ]
}

function applyExtensionMessages(extensions: TvWebExtension[]) {
  for (const extension of extensions) {
    for (const [locale, messages] of Object.entries(extension.i18nMessages ?? {})) {
      i18n.global.mergeLocaleMessage(locale as Locale, messages ?? {})
    }
  }
}

export async function createTaskviewApp(options: CreateTaskviewAppOptions = {}) {
  const extensions = options.extensions ?? []

  addCollection(lucide)
  addCollection(mdi)
  addCollection(carbon)

  const app = createApp(App)

  const pinia = createPinia()
  pinia.use(storeResetPlugin)
  app.use(pinia)
  await api.install(app)
  app.use(i18n as unknown as Plugin)

  applyExtensionMessages(extensions)
  for (const extension of extensions) {
    registerExtensionOutlets(extension)
  }

  const router = createRouter({
    routes: buildRoutes(extensions),
    history: createWebHistory(),
  })

  router.beforeEach(syncSelectedProject)

  app.use(router)
  app.use(ui as unknown as Plugin)

  app.mount('#app')
  restoreSavedLocale()

  return { app, router }
}
