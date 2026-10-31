<template>
  <div class="flex flex-col gap-3">
    <div>
      <h3 class="font-medium">
        {{ t('import.people.title') }}
      </h3>
      <p class="text-sm text-muted">
        {{ t('import.people.description') }}
      </p>
    </div>

    <div
      v-for="person in people"
      :key="person.externalId"
      class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
      data-testid="import-person-row"
    >
      <div class="min-w-0">
        <p class="truncate text-sm font-medium">
          {{ person.displayName }}
        </p>
        <p
          v-if="person.username"
          class="truncate text-xs text-muted"
        >
          @{{ person.username }}
        </p>
      </div>
      <USelectMenu
        :model-value="model[person.externalId] ?? NOT_ASSIGNED"
        :items="memberItems"
        value-key="value"
        class="w-full sm:w-72"
        @update:model-value="(value) => assign({ externalId: person.externalId, memberId: value })"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ImportPerson, OrgMember } from 'taskview-api'
import type { ImportPeopleAssignment, ImportPeopleSelection } from '../importProviders.types'

const NOT_ASSIGNED = 0

const props = defineProps<{
  people: ImportPerson[]
  members: OrgMember[]
}>()

const model = defineModel<ImportPeopleSelection>({ required: true })

const { t } = useI18n()

const memberItems = computed(() => [
  { value: NOT_ASSIGNED, label: t('import.people.notAssigned') },
  ...props.members.map((member) => ({ value: member.id, label: member.email })),
])

function assign(assignment: ImportPeopleAssignment) {
  model.value = { ...model.value, [assignment.externalId]: assignment.memberId === NOT_ASSIGNED ? null : assignment.memberId }
}

watch(
  () => props.members,
  (members) => {
    const next = { ...model.value }
    for (const person of props.people) {
      if (next[person.externalId] !== undefined || !person.email) continue
      const match = members.find((member) => member.email.toLowerCase() === person.email!.toLowerCase())
      if (match) next[person.externalId] = match.id
    }
    model.value = next
  },
  { immediate: true },
)
</script>
