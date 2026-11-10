import { ALL_TASKS_LIST_ID, type TvApi } from 'taskview-api'
import type { TaskUrlBuilderArgs, TaskUrlSource } from './task-url.types.js'

/** Builds web-app links to tasks: {appUrl}/{orgSlug}/{goalId}/{ALL_TASKS_LIST_ID}/{taskId}. */
export class TaskUrlBuilder {
  private readonly api: TvApi
  private readonly appUrl: string | null
  private orgSlugByGoal: Promise<Map<number, string>> | null = null

  constructor(args: TaskUrlBuilderArgs) {
    this.api = args.api
    this.appUrl = args.appUrl?.trim().replace(/\/+$/, '') || null
  }

  async withUrl<T extends TaskUrlSource>(task: T): Promise<T & { url?: string }> {
    const url = await this.urlFor(task)
    return url ? { ...task, url } : task
  }

  async urlFor(task: TaskUrlSource): Promise<string | null> {
    if (!this.appUrl) return null
    try {
      const slug = (await this.loadOrgSlugs()).get(task.goalId)
      if (!slug) return null
      return `${this.appUrl}/${encodeURIComponent(slug)}/${task.goalId}/${ALL_TASKS_LIST_ID}/${task.id}`
    } catch {
      this.orgSlugByGoal = null
      return null
    }
  }

  private loadOrgSlugs(): Promise<Map<number, string>> {
    this.orgSlugByGoal ??= Promise.all([this.api.goals.fetchGoals(), this.api.organizations.fetch()])
      .then(([goals, orgs]) => {
        const slugByOrg = new Map((orgs ?? []).map((org) => [org.id, org.slug]))
        const result = new Map<number, string>()
        for (const goal of goals ?? []) {
          const slug = goal.organizationId ? slugByOrg.get(goal.organizationId) : undefined
          if (slug) result.set(goal.id, slug)
        }
        return result
      })
    return this.orgSlugByGoal
  }
}
