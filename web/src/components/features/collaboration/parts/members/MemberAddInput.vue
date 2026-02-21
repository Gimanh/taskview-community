<template>
  <UInput
    v-model="email"
    type="email"
    :placeholder="t('collaboration.members.emailPlaceholder')"
    size="xl"
    variant="soft"
    class="w-full"
    :ui="{
      base: 'bg-tv-ui-bg-elevated',
    }"
    @keydown.enter="addMember"
  >
    <template #trailing>
      <UButton
        v-if="isValid"
        icon="i-lucide-corner-down-left"
        color="primary"
        variant="ghost"
        size="xs"
        :aria-label="t('collaboration.members.add')"
        @click="addMember"
      />
      <UIcon
        v-else
        name="i-lucide-keyboard"
        class="size-4 text-dimmed"
      />
    </template>
  </UInput>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { type } from 'arktype'

defineProps<{
  loading?: boolean
}>()

const emit = defineEmits<{
  add: [email: string]
}>()

const { t } = useI18n()

const emailSchema = type('string.email')

const email = ref('')

const isValid = computed(() => {
  const result = emailSchema(email.value)
  return !(result instanceof type.errors)
})

function addMember() {
  if (isValid.value) {
    emit('add', email.value)
    email.value = ''
  }
}
</script>
