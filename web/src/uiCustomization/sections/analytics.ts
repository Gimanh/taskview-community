import { computed } from 'vue'
import { useAnalyticsLocale } from '@/components/features/analytics/composables/useAnalyticsLocale'
import { useAnalyticsStore } from '@/stores/analytics.store'
import type { UiCustomizationSectionDef } from '../types'

type AnalyticsSubsectionArgs = {
  id: string
  labelKey: string
  payloadKind: 'kpi' | 'series'
}

function buildAnalyticsSection(args: AnalyticsSubsectionArgs): UiCustomizationSectionDef {
  const { id, labelKey, payloadKind } = args
  return {
    kind: 'list',
    id,
    labelKey,
    useSection() {
      const store = useAnalyticsStore()
      const { pick } = useAnalyticsLocale()
      return {
        catalogue: computed(() =>
          store.sectionsCatalog
            .filter(entry => entry.payloadKind === payloadKind)
            .map(entry => ({
              id: entry.id,
              label: pick(entry.title),
            })),
        ),
        init: async () => {
          if (store.sectionsCatalog.length === 0) {
            await store.fetchSectionsCatalog()
          }
        },
      }
    },
  }
}

export const analyticsIndicatorsSection = buildAnalyticsSection({
  id: 'analyticsIndicators',
  labelKey: 'uiCustomization.sections.analyticsIndicators',
  payloadKind: 'kpi',
})

export const analyticsChartsSection = buildAnalyticsSection({
  id: 'analyticsCharts',
  labelKey: 'uiCustomization.sections.analyticsCharts',
  payloadKind: 'series',
})
