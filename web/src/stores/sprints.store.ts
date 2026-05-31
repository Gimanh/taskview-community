import { defineStore } from 'pinia'
import type {
  Sprint,
  SprintCadence,
  SprintCloseArgs,
  SprintCreateArgs,
  SprintListFilterArgs,
  SprintPlanningArgs,
  SprintPlanningPage,
  SprintSaveRetroArgs,
  SprintSetCadenceArgs,
  SprintSetTaskArgs,
  SprintUpdateArgs,
  SprintVelocityArgs,
} from 'taskview-api'
import { $tvApi } from '@/plugins/axios'
import { logError } from '@/helpers/Helper'
import type { SprintsStoreState } from '@/types/sprints.types'

export const useSprintsStore = defineStore('sprints', {
  state: (): SprintsStoreState => ({
    sprints: [],
    activeSprint: null,
    currentSprint: null,
    burndownById: {},
    velocity: [],
    cadence: null,
    loading: false,
  }),
  getters: {
    sprintsByStatus: (state) => (status: Sprint['status']) =>
      state.sprints.filter((s) => s.status === status),
  },
  actions: {
    upsertSprint(sprint: Sprint) {
      const index = this.sprints.findIndex((s) => s.id === sprint.id)
      if (index !== -1) {
        this.sprints[index] = sprint
      } else {
        this.sprints.unshift(sprint)
      }
      if (sprint.status === 'active' || sprint.status === 'review') {
        this.activeSprint = sprint
      } else if (this.activeSprint?.id === sprint.id) {
        this.activeSprint = null
      }
      if (this.currentSprint?.id === sprint.id) {
        this.currentSprint = { ...this.currentSprint, ...sprint }
      }
    },

    async fetchSprintsForGoal(args: SprintListFilterArgs): Promise<void> {
      this.loading = true
      const sprints = await $tvApi.sprints
        .listForGoal(args)
        .catch(logError)
        .finally(() => {
          this.loading = false
        })
      if (!sprints) return
      this.sprints = sprints
      this.activeSprint = sprints.find((s) => s.status === 'active' || s.status === 'review') ?? null
    },

    async fetchSprint(sprintId: number): Promise<void> {
      const sprint = await $tvApi.sprints.getById(sprintId).catch(logError)
      if (!sprint) return
      this.currentSprint = sprint
      this.upsertSprint(sprint)
    },

    async fetchBurndown(sprintId: number): Promise<void> {
      const burndown = await $tvApi.sprints.getBurndown(sprintId).catch(logError)
      if (!burndown) return
      this.burndownById[sprintId] = burndown
    },

    async fetchVelocity(args: SprintVelocityArgs): Promise<void> {
      const velocity = await $tvApi.sprints.getVelocity(args).catch(logError)
      if (!velocity) return
      this.velocity = velocity
    },

    async createSprint(args: SprintCreateArgs): Promise<Sprint | null> {
      const sprint = await $tvApi.sprints.create(args).catch(logError)
      if (!sprint) return null
      this.upsertSprint(sprint)
      return sprint
    },

    async updateSprint(args: SprintUpdateArgs): Promise<Sprint | null> {
      const sprint = await $tvApi.sprints.update(args).catch(logError)
      if (!sprint) return null
      this.upsertSprint(sprint)
      return sprint
    },

    async activateSprint(sprintId: number): Promise<Sprint | null> {
      const sprint = await $tvApi.sprints.activate(sprintId).catch(logError)
      if (!sprint) return null
      this.upsertSprint(sprint)
      return sprint
    },

    async startReview(sprintId: number): Promise<Sprint | null> {
      const sprint = await $tvApi.sprints.startReview(sprintId).catch(logError)
      if (!sprint) return null
      this.upsertSprint(sprint)
      return sprint
    },

    async closeSprint(args: SprintCloseArgs): Promise<Sprint | null> {
      const sprint = await $tvApi.sprints.close(args).catch(logError)
      if (!sprint) return null
      this.upsertSprint(sprint)
      return sprint
    },

    async pauseSprint(sprintId: number): Promise<Sprint | null> {
      const sprint = await $tvApi.sprints.pause(sprintId).catch(logError)
      if (!sprint) return null
      this.upsertSprint(sprint)
      return sprint
    },

    async resumeSprint(sprintId: number): Promise<Sprint | null> {
      const sprint = await $tvApi.sprints.resume(sprintId).catch(logError)
      if (!sprint) return null
      this.upsertSprint(sprint)
      return sprint
    },

    async removeSprint(sprintId: number): Promise<boolean> {
      const result = await $tvApi.sprints.remove(sprintId).catch(logError)
      if (!result) return false
      const index = this.sprints.findIndex((s) => s.id === sprintId)
      if (index !== -1) this.sprints.splice(index, 1)
      if (this.activeSprint?.id === sprintId) this.activeSprint = null
      if (this.currentSprint?.id === sprintId) this.currentSprint = null
      delete this.burndownById[sprintId]
      return true
    },

    async saveRetro(args: SprintSaveRetroArgs): Promise<boolean> {
      const result = await $tvApi.sprints.saveRetro(args).catch(logError)
      if (!result) return false
      if (this.currentSprint?.id === args.sprintId) {
        this.currentSprint.retro = {
          wentWell: args.wentWell ?? this.currentSprint.retro?.wentWell ?? null,
          wentBad: args.wentBad ?? this.currentSprint.retro?.wentBad ?? null,
          actionItems: args.actionItems ?? this.currentSprint.retro?.actionItems ?? null,
        }
      }
      return true
    },

    async setTaskSprint(args: SprintSetTaskArgs): Promise<boolean> {
      const result = await $tvApi.sprints.setTaskSprint(args).catch(logError)
      return !!result
    },

    async fetchPlanningTasks(args: SprintPlanningArgs): Promise<SprintPlanningPage | null> {
      const page = await $tvApi.sprints.getPlanningTasks(args).catch(logError)
      return page ?? null
    },

    async fetchCadence(goalId: number): Promise<void> {
      const cadence = await $tvApi.sprints.getCadence(goalId).catch(logError)
      this.cadence = cadence ?? null
    },

    async saveCadence(args: SprintSetCadenceArgs): Promise<SprintCadence | null> {
      const cadence = await $tvApi.sprints.setCadence(args).catch(logError)
      if (!cadence) return null
      this.cadence = cadence
      return cadence
    },
  },
})
