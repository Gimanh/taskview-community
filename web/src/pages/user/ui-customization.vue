<template>
  <UDashboardPanel id="ui-customization">
    <template #header>
      <UDashboardNavbar :title="t('uiCustomization.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="flex flex-col gap-6 p-2 lg:p-6 max-w-3xl mx-auto w-full">
        <p class="text-sm text-muted">
          {{ t('uiCustomization.description') }}
        </p>

        <UTabs
          v-model="activeTab"
          :items="tabs"
          :orientation="isMobile ? 'vertical' : 'horizontal'"
          class="w-full"
          :ui="{ root: 'flex-col', list: 'w-full rounded-xl', trigger: 'rounded-lg', indicator: 'rounded-lg' }"
        >
          <template
            v-for="s in sections"
            :key="s.id"
            #[s.id]
          >
            <component
              :is="s.component"
              v-if="s.component"
            />
            <UiCustomizationSection
              v-else
              :title="t(s.labelKey)"
              :resolved="s.resolved"
              @change="items => prefsStore.setSection(s.id, items)"
            />
          </template>
        </UTabs>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import UiCustomizationSection from '@/components/features/ui-customization/UiCustomizationSection.vue'
import { useUiPreferences } from '@/composables/useUiPreferences'
import { uiCustomizationSections } from '@/uiCustomization/registry'
import { useUiPreferencesStore } from '@/stores/uiPreferences.store'
import { useTaskView } from '@/composables/useTaskView'

const { t } = useI18n()
const { isMobile } = useTaskView()
const prefsStore = useUiPreferencesStore()
const route = useRoute()
const router = useRouter()

const sections = reactive(
  uiCustomizationSections.map((def) => {
    if (def.kind === 'custom') {
      return { id: def.id, labelKey: def.labelKey, resolved: undefined, init: undefined, component: def.component }
    }
    const used = def.useSection()
    const { resolved } = useUiPreferences(def.id, () => used.catalogue.value)
    return { id: def.id, labelKey: def.labelKey, resolved, init: used.init, component: undefined }
  }),
)

const tabs = computed(() =>
  sections.map(s => ({ value: s.id, label: t(s.labelKey), slot: s.id })),
)

const activeTab = computed({
  get: () => {
    const q = route.query.tab
    return typeof q === 'string' && sections.some(s => s.id === q) ? q : sections[0].id
  },
  set: (next: string) => {
    router.replace({ query: { ...route.query, tab: next } }).catch(() => { })
  },
})

onMounted(async () => {
  if (!prefsStore.loaded) await prefsStore.fetch()
  await Promise.all(sections.map(s => s.init?.()))
})
</script>
