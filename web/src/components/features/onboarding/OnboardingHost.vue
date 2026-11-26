<template>
  <OnboardingOfferModal
    v-model:open="offerOpen"
    @start="startFirstRun"
    @decline="declineOffer"
  />
  <OnboardingTopicsModal
    v-model:open="store.topicsOpen"
    :topics="topics"
    @select="store.requestTopic"
  />
  <OnboardingStepPopover
    :tour="tour"
    @exit-later="tour.exit()"
    @exit-never="neverOfferAgain"
  />
  <OnboardingSpotlight
    v-if="tour.open.value && tour.ready.value && !tour.stepDone.value"
    :target="tour.targetEl.value"
  />
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useOnboardingStore } from '@/stores/onboarding.store'
import { useDashboard } from '@/composables/useDashboard'
import { FIRST_RUN_TOPIC_ID, type OnboardingTourEnd } from './types'
import { useOnboardingTopics } from './composables/useOnboardingTopics'
import { useOnboardingTour } from './composables/useOnboardingTour'
import OnboardingOfferModal from './parts/OnboardingOfferModal.vue'
import OnboardingTopicsModal from './parts/OnboardingTopicsModal.vue'
import OnboardingStepPopover from './parts/OnboardingStepPopover.vue'
import OnboardingSpotlight from './parts/OnboardingSpotlight.vue'

const store = useOnboardingStore()
const { isSidebarOpen } = useDashboard()
const topics = useOnboardingTopics()
const tour = useOnboardingTour({
  onEnd: handleTourEnd,
  confirmExit: (topicId) => topicId === FIRST_RUN_TOPIC_ID && store.status === 'pending',
})

// Closing the offer without an answer only postpones it: it comes back on the next start of the app
const offerOpen = computed({
  get: () => store.shouldOffer,
  set: (value) => {
    if (!value) store.postponeOffer()
  },
})

function startFirstRun() {
  store.requestTopic(FIRST_RUN_TOPIC_ID)
}

function declineOffer() {
  store.finish('dismissed')
}

function neverOfferAgain() {
  store.finish('dismissed')
  tour.exit()
}

function handleTourEnd(end: OnboardingTourEnd) {
  store.activeTopicId = null
  if (end.topicId !== FIRST_RUN_TOPIC_ID || store.status !== 'pending') return
  if (end.result === 'completed') {
    store.finish('completed')
    return
  }
  store.postponeOffer()
}

// On a phone the user menu sits in the sidebar drawer, which would stay over the list it opens
watch(
  () => store.topicsOpen,
  (open) => {
    if (open) isSidebarOpen.value = false
  },
)

watch(
  () => store.requestedTopicId,
  (topicId) => {
    if (!topicId) return
    store.requestedTopicId = null
    const topic = topics.value.find((item) => item.id === topicId)
    if (!topic) return
    store.activeTopicId = topic.id
    tour.start(topic)
  },
)
</script>
