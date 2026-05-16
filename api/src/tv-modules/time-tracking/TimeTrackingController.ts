import type { Request, Response } from 'express'
import { ArkErrors } from 'arktype'
import { logError } from '../../utils/api'
import { parsePositiveInt } from '../../utils/helpers'
import {
    TimeEntryArkTypeCreate,
    TimeEntryArkTypeDelete,
    TimeEntryArkTypeFetchEntries,
    TimeEntryArkTypeHistory,
    TimeEntryArkTypeStart,
    TimeEntryArkTypeStop,
    TimeEntryArkTypeSummaryByGoal,
    TimeEntryArkTypeSummaryByTask,
    TimeEntryArkTypeUpdate,
    TimeReportArkTypeFilters,
} from './types'

export class TimeTrackingController {
    start = async (req: Request, res: Response) => {
        const data = TimeEntryArkTypeStart(req.body)
        if (data instanceof ArkErrors) return res.status(400).send(data.summary)

        const result = await req.appUser.timeTrackingManager.start(data).catch(logError)
        if (!result) return res.status(403).end()
        return res.tvJson(result)
    }

    stop = async (req: Request, res: Response) => {
        const data = TimeEntryArkTypeStop(req.body ?? {})
        if (data instanceof ArkErrors) return res.status(400).send(data.summary)

        const entry = await req.appUser.timeTrackingManager.stop(data).catch(logError)
        if (!entry) return res.status(404).end()
        return res.tvJson(entry)
    }

    active = async (req: Request, res: Response) => {
        const entry = await req.appUser.timeTrackingManager.getActive().catch(logError)
        return res.tvJson(entry ?? null)
    }

    createManual = async (req: Request, res: Response) => {
        const data = TimeEntryArkTypeCreate(req.body)
        if (data instanceof ArkErrors) return res.status(400).send(data.summary)

        const entry = await req.appUser.timeTrackingManager.createManual(data).catch(logError)
        if (!entry) return res.status(400).end()
        return res.tvJson(entry)
    }

    update = async (req: Request, res: Response) => {
        const data = TimeEntryArkTypeUpdate({ ...req.body, id: Number(req.params.id) })
        if (data instanceof ArkErrors) return res.status(400).send(data.summary)

        const entry = await req.appUser.timeTrackingManager.update(data).catch(logError)
        if (!entry) return res.status(403).end()
        return res.tvJson(entry)
    }

    delete = async (req: Request, res: Response) => {
        const data = TimeEntryArkTypeDelete({ id: req.params.id })
        if (data instanceof ArkErrors) return res.status(400).send(data.summary)

        const ok = await req.appUser.timeTrackingManager.delete(data.id).catch(logError)
        if (!ok) return res.status(403).end()
        return res.tvJson({ deleted: true })
    }

    fetchEntries = async (req: Request, res: Response) => {
        const data = TimeEntryArkTypeFetchEntries(req.query)
        if (data instanceof ArkErrors) return res.status(400).send(data.summary)

        const entries = await req.appUser.timeTrackingManager.fetchEntries(data).catch(logError)
        return res.tvJson(entries ?? [])
    }

    summaryByTask = async (req: Request, res: Response) => {
        const data = TimeEntryArkTypeSummaryByTask({ taskId: req.params.taskId })
        if (data instanceof ArkErrors) return res.status(400).send(data.summary)

        const summary = await req.appUser.timeTrackingManager.summaryByTask(data.taskId).catch(logError)
        if (!summary) return res.status(403).end()
        return res.tvJson(summary)
    }

    summaryByGoal = async (req: Request, res: Response) => {
        const data = TimeEntryArkTypeSummaryByGoal({ goalId: req.params.goalId })
        if (data instanceof ArkErrors) return res.status(400).send(data.summary)

        const summary = await req.appUser.timeTrackingManager.summaryByGoal(data.goalId).catch(logError)
        if (!summary) return res.status(403).end()
        return res.tvJson(summary)
    }

    fetchHistory = async (req: Request, res: Response) => {
        const data = TimeEntryArkTypeHistory({ id: req.params.id })
        if (data instanceof ArkErrors) return res.status(400).send(data.summary)

        const history = await req.appUser.timeTrackingManager.fetchHistory(data.id).catch(logError)
        if (!history) return res.status(403).end()
        return res.tvJson(history)
    }

    private parseReportQuery(req: Request) {
        const organizationId = parsePositiveInt(req.query?.organizationId)
        if (organizationId === null) return { error: 'orgId' as const }
        const filters = TimeReportArkTypeFilters(req.query)
        if (filters instanceof ArkErrors) return { error: 'filters' as const, summary: filters.summary }
        return { request: { organizationId, filters } }
    }

    reportByDay = async (req: Request, res: Response) => {
        const parsed = this.parseReportQuery(req)
        if ('error' in parsed) {
            if (parsed.error === 'orgId') return res.status(400).end()
            return res.status(400).send(parsed.summary)
        }
        const rows = await req.appUser.timeTrackingManager.reportByDay(parsed.request).catch(logError)
        return res.tvJson(rows ?? [])
    }

    reportByUser = async (req: Request, res: Response) => {
        const parsed = this.parseReportQuery(req)
        if ('error' in parsed) {
            if (parsed.error === 'orgId') return res.status(400).end()
            return res.status(400).send(parsed.summary)
        }
        const rows = await req.appUser.timeTrackingManager.reportByUser(parsed.request).catch(logError)
        return res.tvJson(rows ?? [])
    }

    reportByTask = async (req: Request, res: Response) => {
        const parsed = this.parseReportQuery(req)
        if ('error' in parsed) {
            if (parsed.error === 'orgId') return res.status(400).end()
            return res.status(400).send(parsed.summary)
        }
        const rows = await req.appUser.timeTrackingManager.reportByTask(parsed.request).catch(logError)
        return res.tvJson(rows ?? [])
    }

    reportSummary = async (req: Request, res: Response) => {
        const parsed = this.parseReportQuery(req)
        if ('error' in parsed) {
            if (parsed.error === 'orgId') return res.status(400).end()
            return res.status(400).send(parsed.summary)
        }
        const summary = await req.appUser.timeTrackingManager.reportSummary(parsed.request).catch(logError)
        return res.tvJson(summary ?? { totalSeconds: 0, totalBillableSeconds: 0, entriesCount: 0 })
    }

    reportContributors = async (req: Request, res: Response) => {
        const parsed = this.parseReportQuery(req)
        if ('error' in parsed) {
            if (parsed.error === 'orgId') return res.status(400).end()
            return res.status(400).send(parsed.summary)
        }
        const rows = await req.appUser.timeTrackingManager.reportContributors(parsed.request).catch(logError)
        return res.tvJson(rows ?? [])
    }
}
