import { defineStore } from 'pinia'
import { $tvApi } from '@/plugins/axios'
import type { TaskHistoryState } from '@/types/task-history.types'
import type { TaskItem } from '@/types/tasks.types'

export const useTaskHistory = defineStore('taskHistory', {
  state(): TaskHistoryState {
    return {
      history: [],
    }
  },

  actions: {
    async fetchHistoryForTask(taskId: TaskItem['id']): Promise<void> {
      const result = await $tvApi.tasks.fetchTaskHistory(taskId)
      if (!result) return
      this.history = result.history
    },

    async recoverState(historyId: number, taskId: TaskItem['id']): Promise<boolean> {
      const result = await $tvApi.tasks.recoveryTaskHistory(historyId, taskId)
      if (!result) return false
      return result.recovery
    },
  },
})
