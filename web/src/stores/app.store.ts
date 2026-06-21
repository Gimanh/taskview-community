import { defineStore } from 'pinia'
import type { AppStoreState, SidebarView, TaskDetailDisplayMode } from '@/types/global-app.types'
import { $ls } from '@/plugins/axios'

const TASK_DETAIL_MODE_KEY = 'taskview:taskDetailDisplayMode'
const SIDEBAR_VIEW_KEY = 'taskview:sidebarView'

export const useAppStore = defineStore('app', {
  state(): AppStoreState {
    return {
      drawer: false,
      taskDetailDisplayMode: 'modal',
      sidebarView: 'second',
    }
  },
  actions: {
    async initTaskDetailDisplayMode() {
      const stored = await $ls.getValue(TASK_DETAIL_MODE_KEY)
      if (stored === 'slideover' || stored === 'modal') {
        this.taskDetailDisplayMode = stored
      }
    },
    async initSidebarView() {
      const stored = await $ls.getValue(SIDEBAR_VIEW_KEY)
      if (stored === 'first' || stored === 'second') {
        this.sidebarView = stored
      }
    },
    setDrawer(state: boolean) {
      this.drawer = state
    },
    setTaskDetailDisplayMode(mode: TaskDetailDisplayMode) {
      this.taskDetailDisplayMode = mode
      $ls.setValue(TASK_DETAIL_MODE_KEY, mode)
    },
    setSidebarView(view: SidebarView) {
      this.sidebarView = view
      $ls.setValue(SIDEBAR_VIEW_KEY, view)
    },
  },
})
