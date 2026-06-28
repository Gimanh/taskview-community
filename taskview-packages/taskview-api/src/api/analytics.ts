import TvApiBase from './base'
import type { AppResponse } from './base.types'
import type {
  AnalyticsFetchDrillDownArg,
  AnalyticsDrillDownResponse,
  AnalyticsFetchSectionsArg,
  AnalyticsSectionCatalogEntry,
  AnalyticsSectionsResponse,
  AnalyticsScope,
} from './analytics.types'

function scopeToParams(scope: AnalyticsScope): Record<string, string> {
  switch (scope.kind) {
    case 'org':
      return { scope: 'org' }
    case 'project':
      return { scope: 'project', goalId: String(scope.goalId) }
  }
}

export default class TvAnalyticsApi extends TvApiBase {
  protected moduleUrl = '/module/analytics'

  public async fetchSectionsCatalog() {
    return this.request(
      this.$axios.get<AppResponse<AnalyticsSectionCatalogEntry[]>>(
        `${this.moduleUrl}/sections-catalog`,
      ),
    )
  }

  public async fetchSections(arg: AnalyticsFetchSectionsArg, signal?: AbortSignal) {
    const params: Record<string, string> = {
      ...scopeToParams(arg.scope),
      organizationId: String(arg.organizationId),
      period: arg.period,
    }
    if (arg.timezone) params.timezone = arg.timezone
    if (arg.from) params.from = arg.from
    if (arg.to) params.to = arg.to
    if (arg.sections?.length) params.sections = arg.sections.join(',')

    return this.request(
      this.$axios.get<AppResponse<AnalyticsSectionsResponse>>(
        `${this.moduleUrl}/sections`,
        { params, signal },
      ),
    )
  }

  public async fetchDrillDown(arg: AnalyticsFetchDrillDownArg, signal?: AbortSignal) {
    const params: Record<string, string> = {
      ...scopeToParams(arg.scope),
      organizationId: String(arg.organizationId),
      period: arg.period,
    }
    if (arg.timezone) params.timezone = arg.timezone
    if (arg.from) params.from = arg.from
    if (arg.to) params.to = arg.to
    if (arg.bucket) params.bucket = arg.bucket
    if (arg.datasetId) params.datasetId = arg.datasetId
    if (arg.index !== undefined) params.index = String(arg.index)
    if (arg.meta) params.meta = JSON.stringify(arg.meta)

    return this.request(
      this.$axios.get<AppResponse<AnalyticsDrillDownResponse>>(
        `${this.moduleUrl}/drilldown/${arg.sectionId}`,
        { params, signal },
      ),
    )
  }
}
