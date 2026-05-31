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

  const parseSprint = (raw: unknown): number | null => {
    if (typeof raw === 'string' && raw) {
      const id = Number(raw)
      if (Number.isFinite(id)) return id
    }
    return null
  }

  const serializeSprint = (id: number | null): string | undefined =>
    id != null ? String(id) : undefined

  const selectedListIds = ref<number[]>(parseIds(route.query.lists))
  const selectedAssigneeIds = ref<number[]>(parseIds(route.query.assignees))
  const selectedSprintId = ref<number | null>(parseSprint(route.query.sprint))

  watch([selectedListIds, selectedAssigneeIds, selectedSprintId], ([lists, assignees, sprint]) => {
    const next = { ...route.query }
    const listsStr = serializeIds(lists)
    const assigneesStr = serializeIds(assignees)
    const sprintStr = serializeSprint(sprint)
    if (listsStr) next.lists = listsStr
    else delete next.lists
    if (assigneesStr) next.assignees = assigneesStr
    else delete next.assignees
    if (sprintStr) next.sprint = sprintStr
    else delete next.sprint
    router.replace({ query: next })
  }, { deep: true })

  watch(
    () => [route.query.lists, route.query.assignees, route.query.sprint] as const,
    ([lists, assignees, sprint]) => {
      const nextLists = parseIds(lists)
      const nextAssignees = parseIds(assignees)
      const nextSprint = parseSprint(sprint)
      if (!sameIds(nextLists, selectedListIds.value)) {
        selectedListIds.value = nextLists
      }
      if (!sameIds(nextAssignees, selectedAssigneeIds.value)) {
        selectedAssigneeIds.value = nextAssignees
      }
      if (nextSprint !== selectedSprintId.value) {
        selectedSprintId.value = nextSprint
      }
    },
  )

  const hasActiveFilters = computed(
    () =>
      selectedListIds.value.length > 0
      || selectedAssigneeIds.value.length > 0
      || selectedSprintId.value !== null,
  )

  return { selectedListIds, selectedAssigneeIds, selectedSprintId, hasActiveFilters }
}
