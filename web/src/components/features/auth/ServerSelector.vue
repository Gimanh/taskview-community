<template>
  <div class="space-y-2">
    <USelectMenu
      v-model="selectedServer"
      :items="serverOptions"
      :placeholder="t('server.selectServer')"
      value-key="value"
      class="w-full"
      variant="subtle"
    >
      <template #item="{ item }">
        <div class="flex items-center justify-between w-full gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <UIcon
              :name="item.isSystem ? 'i-lucide-server' : 'i-lucide-cloud'"
              class="size-4 shrink-0"
            />
            <span class="truncate">{{ item.label }}</span>
          </div>
          <UButton
            v-if="!item.isSystem"
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            size="xs"
            @click.stop="deleteServer(item.value)"
          />
        </div>
      </template>
    </USelectMenu>

    <UButton
      :label="t('server.addServer')"
      icon="i-lucide-plus"
      variant="ghost"
      size="sm"
      class="w-full"
      @click="showAddDialog = true"
    />

    <UModal v-model:open="showAddDialog">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold">
                {{ t('server.addNewServer') }}
              </h3>
              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                @click="showAddDialog = false"
              />
            </div>
          </template>

          <div class="space-y-4">
            <UFormField :label="t('server.serverUrl')">
              <UInput
                v-model="newServerUrl"
                placeholder="https://api.example.com"
                class="w-full"
                @keyup.enter="handleAddServer"
              />
            </UFormField>
            <p class="text-xs text-muted">
              {{ t('server.serverUrlHint') }}
            </p>
          </div>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                color="neutral"
                variant="outline"
                @click="showAddDialog = false"
              >
                {{ t('common.cancel') }}
              </UButton>
              <UButton
                :disabled="!isValidUrl"
                variant="outline"
                @click="handleAddServer"
              >
                {{ t('common.add') }}
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAdditionalServer } from '@/composables/useAdditionalServer'

const { t } = useI18n()

const mainServer = ref('')
const allServers = ref<string[]>([])
const systemServer = ref('')
const setMainServer = ref<(server: string) => void>(() => {})
const addServerFn = ref<(server: string) => void>(() => {})
const deleteServerFn = ref<(server: string) => void>(() => {})

const showAddDialog = ref(false)
const newServerUrl = ref('')
const selectedServer = ref<string | undefined>(undefined)

onMounted(async () => {
  const serverApi = await useAdditionalServer()
  mainServer.value = serverApi.mainServer.value
  allServers.value = serverApi.allServers.value
  systemServer.value = serverApi.systemServer.value
  setMainServer.value = serverApi.setMainServer
  addServerFn.value = serverApi.addServer
  deleteServerFn.value = serverApi.deleteServer
  selectedServer.value = mainServer.value
})

const serverOptions = computed(() => {
  const options = [
    {
      label: systemServer.value || t('server.defaultServer'),
      value: systemServer.value,
      isSystem: true,
    },
  ]

  allServers.value.forEach((server) => {
    if (server !== systemServer.value) {
      options.push({
        label: server,
        value: server,
        isSystem: false,
      })
    }
  })

  return options
})

const isValidUrl = computed(() => {
  if (!newServerUrl.value) return false
  try {
    const url = new URL(newServerUrl.value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
})

watch(selectedServer, (newServer) => {
  if (newServer && newServer !== mainServer.value) {
    setMainServer.value(newServer)
    mainServer.value = newServer
  }
})

function handleAddServer() {
  if (!isValidUrl.value) return

  const url = newServerUrl.value.trim().replace(/\/$/, '')

  if (!allServers.value.includes(url) && url !== systemServer.value) {
    addServerFn.value(url)
    allServers.value = [...allServers.value, url]
  }

  selectedServer.value = url
  setMainServer.value(url)
  mainServer.value = url

  newServerUrl.value = ''
  showAddDialog.value = false
}

function deleteServer(server: string) {
  deleteServerFn.value(server)
  allServers.value = allServers.value.filter((s) => s !== server)

  if (selectedServer.value === server) {
    selectedServer.value = systemServer.value
    mainServer.value = systemServer.value
  }
}
</script>
