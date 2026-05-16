export type TimeEntryItem = {
    id: number
    taskId: number
    goalId: number
    userId: number
    userEmail: string | null
    startedAt: string
    endedAt: string | null
    durationSeconds: number | null
    description: string | null
    source: 0 | 1
    billable: boolean
    autoStopped: boolean
    createdAt: string
    editedAt: string
}

export type TimeEntryStartArg = {
    taskId: number
    description?: string
}

export type TimeEntryStartResult = {
    entry: TimeEntryItem
    autoStoppedEntry: TimeEntryItem | null
}

export type TimeEntryStopArg = {
    entryId?: number
}

export type TimeEntryCreateManualArg = {
    taskId: number
    startedAt: string | Date
    endedAt: string | Date
    description?: string
    billable?: boolean
}

export type TimeEntryUpdateArg = {
    id: number
    startedAt?: string | Date
    endedAt?: string | Date
    description?: string
    billable?: boolean
}

export type TimeEntryFetchFilters = {
    organizationId?: number
    goalId?: number
    goalIds?: number[]
    taskId?: number
    userId?: number
    billable?: boolean
    from?: string | Date
    to?: string | Date
    limit?: number
    offset?: number
}

export type TimeEntrySummaryByTask = {
    totalSeconds: number
    byUser: { userId: number; seconds: number }[]
}

export type TimeEntrySummaryByGoal = {
    totalSeconds: number
    byUser: { userId: number; seconds: number }[]
    byTask: { taskId: number; seconds: number }[]
}

export type TimeEntryHistoryItem = {
    id: number
    entryId: number
    editDate: string
    entry: TimeEntryItem
}

export const TIME_ENTRY_SOURCE = {
    TIMER: 0,
    MANUAL: 1,
} as const

export type TimeReportFilters = {
    organizationId: number
    goalIds?: number[]
    userId?: number
    from: string | Date
    to: string | Date
    billable?: boolean
    timezone?: string
}

export type TimeReportByDayRow = {
    day: string
    totalSeconds: number
    entriesCount: number
}

export type TimeReportByUserRow = {
    userId: number
    userEmail: string | null
    totalSeconds: number
    entriesCount: number
}

export type TimeReportByTaskRow = {
    taskId: number
    taskDescription: string | null
    goalId: number
    totalSeconds: number
    entriesCount: number
}

export type TimeReportSummary = {
    totalSeconds: number
    totalBillableSeconds: number
    entriesCount: number
}

export type TimeReportContributor = {
    userId: number
    userEmail: string | null
    totalSeconds: number
    entriesCount: number
}
