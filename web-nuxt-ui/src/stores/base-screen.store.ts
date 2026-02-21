import { useDateFormat } from '@vueuse/core'
import { defineStore } from 'pinia'
import { logError } from '@/helpers/Helper'
import $api from '@/helpers/axios'
import { $tvApi } from '@/plugins/axios'
import { useTagsStore } from '@/stores/tag.store'
import {
  type BaseScreenSearchResponse,
  type BaseScreenState,
  FILTER_DEFAULT,
  type GoalAndListsResp,
  type MainScreenAllStateResponse,
} from '@/types/base-screen.types'
import type { AppResponse } from '@/types/global-app.types'
import type { TaskItem } from '@/types/tasks.types'

export const useBaseScreenStore = defineStore('base-screen-store', {
  state(): BaseScreenState {
    return {
      activeWidgetInMobile: 'today',
      wasCalled: false,
      tasks: [], //all tasks in the app
      tasksToday: [],
      tasksUpcoming: [],
      tasksLastCompleted: [],
      //todo rename "users" to "usersByProject"
      users: [], //show users by project
      searchTask: '',
      // addTaskDialog: false,//shoud we offer add goals
      lists: [],
      // listToGoal: {},
      loading: false,
      //todo rename "assignees" to "assigneesByTask"
      assignees: [],
      filterAndSorting: {
        sort: 'new',
        filters: {
          ...FILTER_DEFAULT,
        },
      },
      taskIdToUser: {},
    }
  },
  actions: {
    async fetchAllState() {
      this.taskIdToUser = {}
      this.loading = true
      const result = await $api
        .get<AppResponse<MainScreenAllStateResponse>>(
          `/module/about/fetchallstate?tz=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`,
        )
        .catch((err) => console.log(err))

      const tagsStore = useTagsStore()
      tagsStore.fetchAllTags()
      this.wasCalled = true
      if (result) {
        this.tasks = result.data.response.tasks
        this.users = result.data.response.users
        this.tasksToday = result.data.response.tasksToday
        this.tasksUpcoming = result.data.response.tasksUpcoming
        this.tasksLastCompleted = result.data.response.tasksLastCompleted
        // this.listToGoal = result.data.response.listToGoal;
        this.assignees = result.data.response.assignees

        this.assignees.forEach((assignee) => {
          if (!this.taskIdToUser[assignee.taskId]) {
            this.taskIdToUser[assignee.taskId] = [assignee]
          } else {
            this.taskIdToUser[assignee.taskId].push(assignee)
          }
        })
      }
      setTimeout(() => {
        this.loading = false
      }, 100)
    },

    async fetchAllAvailableLists() {
      const result = await $api
        .get<AppResponse<GoalAndListsResp>>('/module/about/fetch/lists')
        .catch((err) => console.log(err))
      if (result) {
        this.lists = result.data.response
      }
    },

    async updateTaskStatusNew(
      data: { status: boolean; taskId: TaskItem['id'] },
      prop: 'tasksToday' | 'tasksUpcoming' | 'tasksLastCompleted' | 'tasks',
    ) {
      const task = await $tvApi.tasks.updateTask({
        id: data.taskId,
        complete: data.status,
      })

      if (!task) return

      const localTask = this[prop].find((tsk) => tsk.id === data.taskId)
      if (localTask) {
        localTask.complete = task.complete

        switch (prop) {
        case 'tasks':
          this.processLastAdded(task)
          break
        case 'tasksToday':
          this.processToday(task)
          break
        case 'tasksUpcoming':
          this.processUpcoming(task)
          break
        case 'tasksLastCompleted':
          this.processLastCompleted(task)
          break
        }
      }
    },

    processLastAdded(task: TaskItem) {
      if (task.complete) {
        this.tasksLastCompleted.unshift(task)
        this.tasks = this.tasks.filter((t) => t.id !== task.id)
      } else {
        this.processLastCompleted(task)
      }
    },

    processUpcoming(task: TaskItem) {
      if (task.complete) {
        this.tasksLastCompleted.unshift(task)
      } else {
        this.processLastCompleted(task)
      }
    },

    processToday(task: TaskItem) {
      if (task.complete) {
        this.tasksLastCompleted.unshift(task)
      } else {
        this.processLastCompleted(task)
      }
    },

    processLastCompleted(task: TaskItem) {
      if (task.complete) return

      const deadline = new Date(useDateFormat(new Date(task.endDate || ''), 'YYYY-MM-DD').value)
      const today = new Date(useDateFormat(new Date(), 'YYYY-MM-DD').value)

      const removeTask = () => {
        this.tasksLastCompleted = this.tasksLastCompleted.filter((t) => t.id !== task.id)
      }

      const key = !task.endDate ? 'tasks' : deadline <= today ? 'tasksToday' : 'tasksUpcoming'

      const existingTask = this[key].find((tsk) => tsk.id === task.id)

      if (existingTask) {
        existingTask.complete = task.complete
      } else {
        this[key].unshift(task)
      }

      removeTask()
    },

    async updateTaskStatus(taskId: TaskItem['id']) {
      const task = await $tvApi.tasks.updateTask({
        id: taskId,
        complete: true,
      })

      if (!task) return

      const index = this.tasks.findIndex((tsk) => tsk.id === taskId)
      if (index !== -1) {
        this.tasks.splice(index, 1)
      }
    },

    async searchTaskRequest(taskDescription: string): Promise<BaseScreenSearchResponse> {
      const result = await $api
        .get<AppResponse<BaseScreenSearchResponse>>(`/module/about/search-task?description=${taskDescription}`)
        .catch(logError)
      if (!result) return []
      return result.data.response
    },

    syncTask(task: TaskItem) {
      if (!this.wasCalled) return

      const lists = ['tasks', 'tasksToday', 'tasksUpcoming', 'tasksLastCompleted'] as const
      for (const list of lists) {
        const index = this[list].findIndex((t) => t.id === task.id)
        if (index !== -1) {
          Object.assign(this[list][index], task)
        }
      }
    },

    removeTask(taskId: number) {
      const lists = ['tasks', 'tasksToday', 'tasksUpcoming', 'tasksLastCompleted'] as const
      for (const list of lists) {
        const index = this[list].findIndex((t) => t.id === taskId)
        if (index !== -1) {
          this[list].splice(index, 1)
        }
      }
    },

    async removeTasksByGoalId(goalId: number) {
      const filterFunc = (task: TaskItem) => task.goalId !== goalId
      this.tasks = this.tasks.filter(filterFunc)
      this.tasksToday = this.tasksToday.filter(filterFunc)
      this.tasksUpcoming = this.tasksUpcoming.filter(filterFunc)
      this.tasksLastCompleted = this.tasksLastCompleted.filter(filterFunc)
    },
  },
})
