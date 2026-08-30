<template>
  <div class="max-h-64 overflow-y-auto border border-default rounded-lg p-3">
    <div
      v-for="(group, groupId) in groupedPermissions"
      :key="groupId"
      class="mb-3 last:mb-0"
    >
      <p class="text-xs font-semibold text-muted mb-1 uppercase">
        {{ group.name }}
      </p>
      <div class="flex flex-col gap-1">
        <UCheckbox
          v-for="perm in group.items"
          :key="perm.id"
          :model-value="selected.includes(perm.name)"
          :label="describe(perm)"
          @update:model-value="toggle(perm.name)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useApiTokensStore } from '@/stores/api-tokens.store'
import type { ApiTokenPermission } from 'taskview-api'

const selected = defineModel<string[]>({ default: () => [] })

const { t, locale } = useI18n()
const store = useApiTokensStore()

// The table carries a per-locale description; fall back to the English column,
// then to the raw key, so a permission added without translations still reads.
function describe(permission: ApiTokenPermission): string {
  return permission.descriptionLocales?.[locale.value]
    || permission.description
    || permission.name
}

const groupedPermissions = computed(() => {
  const groups: Record<number, { name: string; items: ApiTokenPermission[] }> = {}
  for (const perm of store.permissions) {
    const gid = perm.permissionGroup
    if (!groups[gid]) {
      groups[gid] = { name: t(`permissionGroups.${gid}`), items: [] }
    }
    groups[gid].items.push(perm)
  }
  return groups
})

function toggle(permName: string) {
  const index = selected.value.indexOf(permName)
  if (index === -1) {
    selected.value = [...selected.value, permName]
  } else {
    selected.value = selected.value.filter((name) => name !== permName)
  }
}

onMounted(() => {
  if (store.permissions.length === 0) {
    store.fetchPermissions()
  }
})
</script>
