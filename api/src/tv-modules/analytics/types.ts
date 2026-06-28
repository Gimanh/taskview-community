import { type } from 'arktype'
import type {
  AnalyticsChartType,
  AnalyticsPeriod,
  AnalyticsScope,
  AnalyticsSection,
  AnalyticsSectionGroup,
} from 'taskview-api'
import type { AppUser } from '../../core/AppUser'
import type { AnalyticsRepository } from './AnalyticsRepository'

const positiveIntFromQuery = type('string | number')
  .pipe((v) => Number(v))
  .narrow((n, ctx) => Number.isInteger(n) && n > 0 ? true : ctx.mustBe('a positive integer'))

const nonNegativeIntFromQuery = type('string | number')
  .pipe((v) => Number(v))
  .narrow((n, ctx) => Number.isInteger(n) && n >= 0 ? true : ctx.mustBe('a non-negative integer'))

export const AnalyticsFetchSectionsArkType = type({
  scope: "'org' | 'project'",
  organizationId: positiveIntFromQuery,
  period: "'month' | '7d' | '30d' | '90d' | '180d' | '365d' | 'custom'",
  'goalId?': positiveIntFromQuery,
  'timezone?': 'string',
  'from?': 'string',
  'to?': 'string',
  'sections?': 'string',
})

export const AnalyticsDrillDownArkType = type({
  scope: "'org' | 'project'",
  organizationId: positiveIntFromQuery,
  period: "'month' | '7d' | '30d' | '90d' | '180d' | '365d' | 'custom'",
  'goalId?': positiveIntFromQuery,
  'timezone?': 'string',
  'from?': 'string',
  'to?': 'string',
  'bucket?': 'string',
  'datasetId?': 'string',
  'meta?': 'string',
  'index?': nonNegativeIntFromQuery,
})

export const DrillDownMetaArkType = type({
  'goalIds?': 'number[]',
  'userIds?': 'number[]',
  'statusKeys?': "('active' | 'fading' | 'dead' | 'empty')[]",
})

export type DrillDownMeta = typeof DrillDownMetaArkType.infer

export type AnalyticsRange = {
  from: Date
  to: Date
}

export type ResolveRangeArgs = {
  period: AnalyticsPeriod
  /** IANA timezone the period boundaries are resolved in; defaults to UTC. */
  timezone?: string
  from?: string
  to?: string
}

export type BuilderContext = {
  appUser: AppUser
  scope: AnalyticsScope
  period: AnalyticsPeriod
  range: AnalyticsRange
  accessibleGoalIds: number[]
  repository: AnalyticsRepository
}

export type SectionDrillDownArg = {
  bucket: string
  index: number
  datasetId: string
  meta?: DrillDownMeta
}

export type DrillDownTaskRow = {
  id: number
  description: string
  goalId: number
  goalName: string
  complete: boolean
  priorityId: number | null
  endDate: string | null
  date_creation: string
  date_complete: string | null
}

export interface SectionBuilder {
  readonly id: string
  readonly group: AnalyticsSectionGroup
  readonly allowedChartTypes: readonly AnalyticsChartType[]
  readonly defaultChartType: AnalyticsChartType | null
  readonly requiresGoalScope?: boolean
  readonly cacheTtlSec?: number
  build(ctx: BuilderContext): Promise<AnalyticsSection | null>
  drillDown?(ctx: BuilderContext, arg: SectionDrillDownArg): Promise<DrillDownTaskRow[]>
}

export type AnalyticsArgBuildSections = {
  scope: AnalyticsScope
  organizationId: number
  period: AnalyticsPeriod
  range: AnalyticsRange
  /** IANA timezone of the viewer; used to format the response range. */
  timezone?: string
  sectionIds?: string[]
}

export type AnalyticsArgDrillDown = {
  sectionId: string
  scope: AnalyticsScope
  organizationId: number
  period: AnalyticsPeriod
  range: AnalyticsRange
  arg: SectionDrillDownArg
}

export type FetchAmountPerTagMonthArgs = {
  goalIds: number[]
  range: AnalyticsRange
  transactionType: 0 | 1
}

export type FetchAmountPerProjectMonthArgs = {
  goalIds: number[]
  range: AnalyticsRange
  transactionType: 0 | 1
}

// Sentinel id used in tag-grouped analytics queries to represent tasks that
// have no tags assigned. tasks.tags.id is GENERATED ALWAYS AS IDENTITY (positive
// integers only), so -1 cannot collide with a real tag.
export const UNTAGGED_TAG_ID = -1
