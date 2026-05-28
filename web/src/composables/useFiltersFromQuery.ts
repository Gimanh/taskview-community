import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export const useFiltersFromQuery = () => {
  const route = useRoute()
  const router = useRouter()

  const parseIds = (raw: unknown): number[] => {
    if (typeof raw !== 'string' || !raw) return []
    return raw
      .split(',')
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n))
  }

  const serializeIds = (ids: number[]): string | undefined =>
    ids.length ? ids.join(',') : undefined

  const sameIds = (a: number[], b: number[]) =>
    a.length === b.length && a.every((v, i) => v === b[i])

  const selectedListIds = ref<number[]>(parseIds(route.query.lists))
  const selectedAssigneeIds = ref<number[]>(parseIds(route.query.assignees))

  watch([selectedListIds, selectedAssigneeIds], ([lists, assignees]) => {
    const next = { ...route.query }
    const listsStr = serializeIds(lists)
    const assigneesStr = serializeIds(assignees)
    if (listsStr) next.lists = listsStr
    else delete next.lists
    if (assigneesStr) next.assignees = assigneesStr
    else delete next.assignees
    router.replace({ query: next })
  })

  watch(
    () => [route.query.lists, route.query.assignees] as const,
    ([lists, assignees]) => {
      const nextLists = parseIds(lists)
      const nextAssignees = parseIds(assignees)
      if (!sameIds(nextLists, selectedListIds.value)) {
        selectedListIds.value = nextLists
      }
      if (!sameIds(nextAssignees, selectedAssigneeIds.value)) {
        selectedAssigneeIds.value = nextAssignees
      }
    },
  )

  const hasActiveFilters = computed(
    () => selectedListIds.value.length > 0 || selectedAssigneeIds.value.length > 0,
  )

  return { selectedListIds, selectedAssigneeIds, hasActiveFilters }
}
