import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { OnboardingFinishStatus, OnboardingStatus } from 'taskview-api'
import { $tvApi } from '@/plugins/axios'

export const useOnboardingStore = defineStore('onboarding', () => {
  // null: not loaded, or the server does not know about onboarding (an older API) — nothing is offered then
  const status = ref<OnboardingStatus | null>(null)
  const offerPostponed = ref(false)
  const topicsOpen = ref(false)
  const activeTopicId = ref<string | null>(null)
  const requestedTopicId = ref<string | null>(null)

  const shouldOffer = computed(() =>
    status.value === 'pending' && !offerPostponed.value && activeTopicId.value === null && requestedTopicId.value === null,
  )

  async function fetch() {
    try {
      const state = await $tvApi.onboarding.fetch()
      status.value = state?.status ?? null
    } catch {
      status.value = null
    }
  }

  async function finish(next: OnboardingFinishStatus) {
    if (status.value !== 'pending') return
    status.value = next
    await $tvApi.onboarding.finish({ status: next }).catch(() => undefined)
  }

  function postponeOffer() {
    offerPostponed.value = true
  }

  function requestTopic(topicId: string) {
    topicsOpen.value = false
    requestedTopicId.value = topicId
  }

  function openTopics() {
    topicsOpen.value = true
  }

  return {
    status,
    offerPostponed,
    topicsOpen,
    activeTopicId,
    requestedTopicId,
    shouldOffer,
    fetch,
    finish,
    postponeOffer,
    requestTopic,
    openTopics,
  }
})
