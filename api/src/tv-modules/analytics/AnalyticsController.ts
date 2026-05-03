import { type } from 'arktype'
import type { NextFunction, Request, Response } from 'express'
import type { AnalyticsScope } from 'taskview-api'
import { $logger } from '../../modules/logget'
import { parseDrillDownMeta, resolveRange } from './helpers'
import { AnalyticsDrillDownArkType, AnalyticsFetchSectionsArkType } from './types'

export class AnalyticsController {
  fetchSections = async (req: Request, res: Response, next: NextFunction) => {
    const out = AnalyticsFetchSectionsArkType(req.query)
    if (out instanceof type.errors) {
      $logger.warn(`analytics: validation failed: ${out.summary}`)
      return res.status(400).send(out.summary)
    }

    let scope: AnalyticsScope
    if (out.scope === 'project') {
      if (out.goalId === undefined) {
        return res.status(400).send('goalId is required for project scope')
      }
      scope = { kind: 'project', goalId: out.goalId }
    } else {
      scope = { kind: out.scope }
    }

    const range = resolveRange(out.period, out.from, out.to)
    if (!range) return res.status(400).send('invalid range')

    const sectionIds = out.sections
      ? out.sections.split(',').map(s => s.trim()).filter(Boolean)
      : undefined

    try {
      const data = await req.appUser.analyticsManager.buildSections({
        scope,
        organizationId: out.organizationId,
        period: out.period,
        range,
        sectionIds,
      })
      return res.tvJson(data)
    } catch (err) {
      $logger.error({
        err,
        userId: req.appUser.getUserData()?.id,
        organizationId: out.organizationId,
        scope,
        period: out.period,
      }, 'Analytics fetchSections failed')
      return next(err)
    }
  }

  fetchDrillDown = async (req: Request, res: Response, next: NextFunction) => {
    const sectionId = req.params.sectionId
    if (!sectionId) return res.status(400).send('missing sectionId')

    const out = AnalyticsDrillDownArkType(req.query)
    if (out instanceof type.errors) {
      $logger.warn(`analytics drill-down: validation failed: ${out.summary}`)
      return res.status(400).send(out.summary)
    }

    let scope: AnalyticsScope
    if (out.scope === 'project') {
      if (out.goalId === undefined) {
        return res.status(400).send('goalId is required for project scope')
      }
      scope = { kind: 'project', goalId: out.goalId }
    } else {
      scope = { kind: out.scope }
    }

    const range = resolveRange(out.period, out.from, out.to)
    if (!range) return res.status(400).send('invalid range')

    const meta = parseDrillDownMeta(out.meta)
    const index = Math.min(out.index ?? 0, 10000)

    try {
      const data = await req.appUser.analyticsManager.drillDown({
        sectionId,
        scope,
        organizationId: out.organizationId,
        period: out.period,
        range,
        arg: {
          bucket: out.bucket ?? '',
          index,
          datasetId: out.datasetId ?? '',
          meta,
        },
      })
      return res.tvJson(data)
    } catch (err) {
      $logger.error({
        err,
        sectionId,
        userId: req.appUser.getUserData()?.id,
        organizationId: out.organizationId,
        scope,
      }, 'Analytics fetchDrillDown failed')
      return next(err)
    }
  }
}
