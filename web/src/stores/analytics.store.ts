import axios from 'axios'
import { defineStore } from 'pinia'
import type { AnalyticsPeriod, AnalyticsScope, AnalyticsSection } from 'taskview-api'
import { $tvApi } from '@/plugins/axios'
import type {
  AnalyticsError,
  AnalyticsErrorKind,
  AnalyticsOpenDrillDownArgs,
  AnalyticsState,
} from '@/types/analytics.types'
import { useOrganizationStore } from './organization.store'

// Kept outside Pinia state on purpose: Pinia proxies break AbortController.signal reads.
let sectionsAbortController: AbortController | null = null
let drillDownAbortController: AbortController | null = null

function isCancelled(e: unknown): boolean {
  return axios.isCancel(e) || (e instanceof Error && e.name === 'CanceledError')
}

function classifyError(e: unknown): AnalyticsError {
  if (isCancelled(e)) return null
  if (axios.isAxiosError(e)) {
    const status = e.response?.status
    if (status === 403) return { kind: 'forbidden', status }
    if (status && status >= 500) return { kind: 'server', status }
    if (!e.response) return { kind: 'network' }
    return { kind: 'unknown', status }
  }
  return { kind: 'unknown' }
}

export const useAnalyticsStore = defineStore('analytics', {
  state: (): AnalyticsState => ({
    scope: { kind: 'org' },
    period: '30d',
    customFrom: null,
    customTo: null,
    sections: [],
    failedSectionIds: [],
    availableGoals: [],
    range: null,
    loading: false,
    error: null,
    drillDown: {
      open: false,
      loading: false,
      sectionId: null,
      sectionTitle: null,
      bucket: null,
      tasks: [],
    },
  }),
  getters: {
    kpiSections: (state) => state.sections.filter(s => s.payload.kind === 'kpi'),
    chartSections: (state) => state.sections.filter(s => s.payload.kind === 'series'),
    sectionsByGroup: (state) => {
      const map = new Map<string, AnalyticsSection[]>()
      for (const s of state.sections) {
        if (s.payload.kind === 'kpi') continue
        const arr = map.get(s.group) ?? []
        arr.push(s)
        map.set(s.group, arr)
      }
      return map
    },
  },
  actions: {
    setScope(scope: AnalyticsScope) {
      this.scope = scope
      return this.fetchSections()
    },
    setPeriod(period: AnalyticsPeriod) {
      this.period = period
      return this.fetchSections()
    },
    setCustomRange(from: string, to: string) {
      this.period = 'custom'
      this.customFrom = from
      this.customTo = to
      return this.fetchSections()
    },

    async fetchSections(): Promise<void> {
      const orgStore = useOrganizationStore()
      const organizationId = orgStore.currentOrg?.id
      if (!organizationId) {
        this.sections = []
        this.failedSectionIds = []
        return
      }

      sectionsAbortController?.abort()
      const controller = new AbortController()
      sectionsAbortController = controller

      this.loading = true
      this.error = null
      try {
        const result = await $tvApi.analytics.fetchSections({
          scope: this.scope,
          organizationId,
          period: this.period,
          from: this.customFrom ?? undefined,
          to: this.customTo ?? undefined,
        }, controller.signal)
        if (controller.signal.aborted) return
        if (result) {
          this.sections = result.sections
          this.failedSectionIds = result.failedSectionIds ?? []
          this.availableGoals = result.availableGoals
          this.range = result.range
        }
      } catch (e) {
        if (controller.signal.aborted || isCancelled(e)) return
        const err = classifyError(e)
        if (!err) return
        this.error = err
        this.sections = []
        this.failedSectionIds = []
        this.availableGoals = []
        // Auto-recovery: forbidden on project scope → fall back to org scope
        if (err.kind === 'forbidden' && this.scope.kind === 'project') {
          this.scope = { kind: 'org' }
          this.error = null
          return this.fetchSections()
        }
      } finally {
        if (sectionsAbortController === controller) {
          sectionsAbortController = null
          this.loading = false
        }
      }
    },

    async openDrillDown(args: AnalyticsOpenDrillDownArgs) {
      drillDownAbortController?.abort()
      const controller = new AbortController()
      drillDownAbortController = controller

      this.drillDown.open = true
      this.drillDown.loading = true
      this.drillDown.sectionId = args.sectionId
      this.drillDown.sectionTitle = args.sectionTitle
      this.drillDown.bucket = args.bucket
      this.drillDown.tasks = []

      const orgStore = useOrganizationStore()
      const organizationId = orgStore.currentOrg?.id
      if (!organizationId) {
        this.drillDown.loading = false
        return
      }

      try {
        const result = await $tvApi.analytics.fetchDrillDown({
          sectionId: args.sectionId,
          scope: this.scope,
          organizationId,
          period: this.period,
          from: this.customFrom ?? undefined,
          to: this.customTo ?? undefined,
          bucket: args.bucket,
          index: args.index,
          datasetId: args.datasetId,
          meta: args.meta,
        }, controller.signal)
        if (controller.signal.aborted) return
        if (result) {
          this.drillDown.tasks = result.tasks
        }
      } catch (e) {
        if (controller.signal.aborted || isCancelled(e)) return
        throw e
      } finally {
        if (drillDownAbortController === controller) {
          drillDownAbortController = null
          this.drillDown.loading = false
        }
      }
    },

    closeDrillDown() {
      drillDownAbortController?.abort()
      drillDownAbortController = null
      this.drillDown.open = false
      this.drillDown.loading = false
      this.drillDown.tasks = []
      this.drillDown.sectionId = null
      this.drillDown.sectionTitle = null
      this.drillDown.bucket = null
    },
  },
})

export type { AnalyticsErrorKind }
