<template>
  <UTooltip
    v-if="defaultProjectId"
    :text="label"
  >
    <UButton
      icon="i-lucide-target"
      color="neutral"
      variant="soft"
      :aria-label="label"
      class="rounded-xl shadow-sm aspect-square justify-center h-auto"
      :class="{ 'bg-primary/10 text-primary': currentProjectId === defaultProjectId }"
      @click="openDefaultProject"
    />
  </UTooltip>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { resolveDefaultRoute } from '@/components/features/auth/auth.helper'
import { useUiPreferencesStore } from '@/stores/uiPreferences.store'
import { useGoalsStore } from '@/stores/goals.store'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const uiPrefs = useUiPreferencesStore()
const goalsStore = useGoalsStore()

onMounted(() => {
  if (!uiPrefs.loaded) uiPrefs.fetch()
})

const defaultProjectId = computed(() => uiPrefs.settings.defaultProjectId ?? null)
const currentProjectId = computed(() => Number(route.params.projectId) || null)

const label = computed(() => {
  const id = defaultProjectId.value
  const name = id !== null ? goalsStore.goalMap.get(id)?.name : undefined
  return name ?? t('uiCustomization.others.defaultProject')
})

async function openDefaultProject() {
  const target = await resolveDefaultRoute()
  if (target) await router.push(target)
}
</script>
