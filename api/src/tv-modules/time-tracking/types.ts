import { type } from 'arktype'
import type { TimeEntriesSchemaTypeForSelect } from 'taskview-db-schemas'

export type TimeEntryWithUser = TimeEntriesSchemaTypeForSelect & {
    userEmail: string | null
}

const NumberFromString = type('string|number').pipe((v) => Number(v))
const OptionalNumberFromString = type('string|number|undefined').pipe((v) => v === undefined ? undefined : Number(v))
const DateFromString = type('string|Date').pipe((v) => v instanceof Date ? v : new Date(v))
const OptionalDateFromString = type('string|Date|undefined').pipe((v) => v === undefined ? undefined : v instanceof Date ? v : new Date(v))

const DESCRIPTION_MAX = 500
const Description = type('string').narrow((v, ctx) => {
    const codepoints = [...v].length
    return codepoints <= DESCRIPTION_MAX || ctx.mustBe(`at most ${DESCRIPTION_MAX} characters (got ${codepoints})`)
})

export const TimeEntryArkTypeStart = type({
    taskId: 'number',
    'description?': Description,
})
export type TimeEntryArgStart = typeof TimeEntryArkTypeStart.infer

export const TimeEntryArkTypeStop = type({
    'entryId?': 'number',
})
export type TimeEntryArgStop = typeof TimeEntryArkTypeStop.infer

export const TimeEntryArkTypeCreate = type({
    taskId: 'number',
    startedAt: DateFromString,
    endedAt: DateFromString,
    'description?': Description,
    'billable?': 'boolean',
})
export type TimeEntryArgCreate = typeof TimeEntryArkTypeCreate.infer

export const TimeEntryArkTypeUpdate = type({
    id: 'number',
    'startedAt?': OptionalDateFromString,
    'endedAt?': OptionalDateFromString,
    'description?': Description,
    'billable?': 'boolean',
})
export type TimeEntryArgUpdate = typeof TimeEntryArkTypeUpdate.infer

export const TimeEntryArkTypeDelete = type({
    id: NumberFromString,
})
export type TimeEntryArgDelete = typeof TimeEntryArkTypeDelete.infer

export const TimeEntryArkTypeFetchEntries = type({
    'goalId?': OptionalNumberFromString,
    'taskId?': OptionalNumberFromString,
    'userId?': OptionalNumberFromString,
    'from?': OptionalDateFromString,
    'to?': OptionalDateFromString,
    'limit?': OptionalNumberFromString,
    'offset?': OptionalNumberFromString,
})
export type TimeEntryArgFetchEntries = typeof TimeEntryArkTypeFetchEntries.infer

export const TimeEntryArkTypeSummaryByGoal = type({
    goalId: NumberFromString,
})
export type TimeEntryArgSummaryByGoal = typeof TimeEntryArkTypeSummaryByGoal.infer

export const TimeEntryArkTypeSummaryByTask = type({
    taskId: NumberFromString,
})
export type TimeEntryArgSummaryByTask = typeof TimeEntryArkTypeSummaryByTask.infer

export const TimeEntryArkTypeHistory = type({
    id: NumberFromString,
})
export type TimeEntryArgHistory = typeof TimeEntryArkTypeHistory.infer

export const TIME_ENTRY_SOURCE = {
    TIMER: 0,
    MANUAL: 1,
} as const

export type TimeEntrySource = typeof TIME_ENTRY_SOURCE[keyof typeof TIME_ENTRY_SOURCE]

export type TimeEntryInsertParams = {
    taskId: number
    goalId: number
    userId: number
    source: TimeEntrySource
    startedAt?: Date
    endedAt?: Date | null
    durationSeconds?: number | null
    description?: string | null
    billable?: boolean
}

export type TimeEntryUpdateParams = Partial<{
    startedAt: Date
    endedAt: Date | null
    durationSeconds: number | null
    description: string | null
    billable: boolean
    autoStopped: boolean
}>

export type TimeEntryFilters = {
    goalId?: number
    taskId?: number
    userId?: number
    from?: Date
    to?: Date
    limit?: number
    offset?: number
}

export type TimeEntryStartResult = {
    entry: TimeEntryWithUser
    autoStoppedEntry: TimeEntryWithUser | null
}

export type TimeEntryInsertResult = {
    entry: TimeEntryWithUser | null
    conflict: boolean
}

export type TimeEntryUserSeconds = { userId: number; seconds: number }

export type TimeEntryTaskSummary = {
    totalSeconds: number
    byUser: TimeEntryUserSeconds[]
}

export type TimeEntryGoalSummary = {
    totalSeconds: number
    byUser: TimeEntryUserSeconds[]
    byTask: { taskId: number; seconds: number }[]
}
