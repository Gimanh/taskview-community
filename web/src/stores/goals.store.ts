import { defineStore } from 'pinia'
import type { GoalArgItemAdd, GoalArgItemUpdate, GoalItem } from 'taskview-api'
import { $tvApi } from '@/plugins/axios'
import type { GoalsStoreState } from '@/types/goals.types'
import { useUserStore } from './user.store'

export const useGoalsStore = defineStore('goals', {
  state: (): GoalsStoreState => ({
    loading: false,
    selectedItemId: -1,
    goals: [],
  }),
  getters: {
    goalMap: (state) => {
      return new Map(state.goals.map((goal) => [goal.id, goal]))
    },

    selectedGoal: (state) => state.goals.find((goal) => goal.id === state.selectedItemId),

    amIOwner(): boolean {
      const userStore = useUserStore()
      return this.selectedGoal?.owner === userStore.payloadData?.id
    },

    goalIdToName(): Record<number, string> {
      const map: Record<number, string> = {}
      this.goals.forEach((g) => {
        map[g.id] = g.name
      })
      return map
    },
  },
  actions: {
    async fetchGoals(): Promise<void> {
      if (this.loading) return
      this.loading = true
      const result = await $tvApi.goals.fetchGoals()
      if (!result) {
        this.loading = false
        return
      }
      this.goals = result || []
      this.loading = false
    },

    async addGoal(goal: GoalArgItemAdd): Promise<GoalItem | null> {
      const goalWithPermissions = await $tvApi.goals.createGoal(goal)
      if (!goalWithPermissions) return null
      this.goals.unshift(goalWithPermissions)
      return goalWithPermissions
    },

    async updateGoal(goal: GoalArgItemUpdate): Promise<boolean> {
      const goalWithPermissions = await $tvApi.goals.updateGoal(goal)
      if (!goalWithPermissions) return false
      const index = this.goals.findIndex((g) => +g.id === +goal.id)
      if (index !== -1) {
        this.goals[index] = goalWithPermissions
      }
      return true
    },

    async deleteGoal(goalId: GoalItem['id']): Promise<void> {
      const result = await $tvApi.goals.deleteGoal(goalId)
      if (!result) return
      const index = this.goals.findIndex((g) => +g.id === +goalId)
      if (index !== -1) {
        this.goals.splice(index, 1)
      }
      return
    },
  },
})
