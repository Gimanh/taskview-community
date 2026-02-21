import { defineStore } from 'pinia'
import type { AppStoreState, TaskDetailDisplayMode } from '@/types/global-app.types'
import { $ls } from '@/plugins/axios'

const TASK_DETAIL_MODE_KEY = 'taskview:taskDetailDisplayMode'

export const useAppStore = defineStore('app', {
  state(): AppStoreState {
    return {
      drawer: false,
      taskDetailDisplayMode: 'modal',
    }
  },
  actions: {
    async initTaskDetailDisplayMode() {
      const stored = await $ls.getValue(TASK_DETAIL_MODE_KEY)
      if (stored === 'slideover' || stored === 'modal') {
        this.taskDetailDisplayMode = stored
      }
    },
    setDrawer(state: boolean) {
      this.drawer = state
    },
    setTaskDetailDisplayMode(mode: TaskDetailDisplayMode) {
      this.taskDetailDisplayMode = mode
      $ls.setValue(TASK_DETAIL_MODE_KEY, mode)
    },
  },
})
