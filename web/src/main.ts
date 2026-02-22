import './assets/css/main.css'
import { addCollection } from '@iconify/vue'
import lucide from '@iconify-json/lucide/icons.json'
import mdi from '@iconify-json/mdi/icons.json'
import carbon from '@iconify-json/carbon/icons.json'
import { createPinia } from 'pinia'
import type { Plugin } from 'vue'
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import ui from '@nuxt/ui/vue-plugin'
import { i18n, restoreSavedLocale } from './plugins/i18n'

addCollection(lucide)
addCollection(mdi)
addCollection(carbon)

import App from './App.vue'
import authenticated from './middleware/authenticated'
import syncSelectedProject from './middleware/syncSelectedProject'
import api from './plugins/axios'
import LoginPage from './pages/login.vue'

const app = createApp(App)

app.use(createPinia())
app.use(api)
app.use(i18n as unknown as Plugin)

const router = createRouter({
  routes: [
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
    {
      path: '/:user',
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
          path: ':projectId/collaboration',
          name: 'collaboration',
          component: () => import('./pages/user/collaboration.vue'),
        },
        {
          path: 'account',
          name: 'account',
          component: () => import('./pages/user/account.vue'),
        },
        {
          path: ':projectId?/:listId?/:taskId?',
          name: 'user',
          component: () => import('./pages/user/index.vue'),
        },
      ],
    },
  ],
  history: createWebHistory(),
})


router.beforeEach(syncSelectedProject)

app.use(router)
app.use(ui as unknown as Plugin)

app.mount('#app')
restoreSavedLocale()
