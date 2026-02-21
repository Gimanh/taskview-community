import { defineStore } from 'pinia'
import type {
  GoalListItem,
  GoalListItemArgAdd,
  GoalListItemArgDelete,
  GoalListItemArgFetch,
  GoalListItemArgUpdate,
} from 'taskview-api'
import { $tvApi } from '@/plugins/axios'
import type { GoalListsStoreState } from '@/types/goal-lists.types'

export const useGoalListsStore = defineStore('goal-lists', {
  state: (): GoalListsStoreState => ({
    lists: [],
    loading: false,
  }),
  getters: {
    listMap: (state) => {
      return new Map(state.lists.map((list) => [list.id, list]))
    },
  },
  actions: {
    async addList(listItem: GoalListItemArgAdd): Promise<GoalListItem | null> {
      this.loading = true
      const list = await $tvApi.goalLists.createList(listItem).catch(console.error)
      this.loading = false
      if (list) {
        this.lists.unshift(list)
        return list
      }
      return null
    },

    async fetchLists(goalId: GoalListItemArgFetch['goalId']) {
      this.loading = true
      this.lists = []
      const lists = await $tvApi.goalLists.fetchLists({ goalId }).catch(console.error)
      this.loading = false
      this.lists = lists ?? []
    },

    async deleteList(listId: GoalListItemArgDelete) {
      this.loading = true
      const result = await $tvApi.goalLists.deleteList(listId).catch(console.error)
      this.loading = false
      if (!result) return false
      const index = this.lists.findIndex((item) => +item.id === +listId)
      if (index !== -1) {
        this.lists.splice(index, 1)
      }
    },

    async updateList(listData: GoalListItemArgUpdate) {
      this.loading = true
      const list = await $tvApi.goalLists.updateList(listData).catch(console.error)
      this.loading = false

      if (!list) return false

      const index = this.lists.findIndex((item) => +item.id === +listData.id)
      if (index !== -1) {
        this.lists[index] = list
        return true
      }

      return false
    },
  },
})
