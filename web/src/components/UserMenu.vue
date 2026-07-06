<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)', group: 'max-h-screen' }"
  >
    <UButton
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
      :ui="{
        trailingIcon: 'text-dimmed'
      }"
    >
      <template #leading>
        <UAvatar
          :src="user.avatar.src"
          :alt="user.avatar.alt"
          size="2xs"
        />
      </template>
      <div
        v-if="!collapsed"
        class="flex flex-col items-start text-left truncate flex-1"
      >
        <span class="truncate text-sm font-medium">{{ user.name }}</span>
        <span class="truncate text-xs text-dimmed">{{ user.description }}</span>
      </div>
      <template
        v-if="!collapsed"
        #trailing
      >
        <UIcon
          name="i-lucide-chevrons-up-down"
          class="size-4 text-dimmed"
        />
      </template>
    </UButton>
  </UDropdownMenu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DropdownMenuItem } from '@nuxt/ui'
import { useColorMode } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useLogout } from '@/composables/useLogout'
import { useUserStore } from '@/stores/user.store'
import { useOrganizationStore } from '@/stores/organization.store'
import { useOrgSwitcher } from '@/composables/useOrgSwitcher'
import avatarImg from '@/assets/images/avatar-1.jpeg'

defineProps<{
  collapsed?: boolean
}>()

const { t } = useI18n()
const colorMode = useColorMode()
const router = useRouter()
const toast = useToast()
const userStore = useUserStore()
const orgStore = useOrganizationStore()
const { switchOrg } = useOrgSwitcher()

async function handleLogout() {
  const success = await useLogout()
  if (success) {
    router.push('/')
  } else {
    toast.add({
      title: t('userMenu.logoutFailed'),
      description: t('userMenu.logoutFailedDescription'),
      color: 'error',
    })
  }
}

const user = computed(() => ({
  name: orgStore.currentOrg?.name || userStore.login || userStore.email,
  description: userStore.email || userStore.login,
  avatar: {
    src: avatarImg,
    alt: userStore.email || userStore.login,
  },
}))

const items = computed<DropdownMenuItem[][]>(() => [
  [
    {
      type: 'label',
      label: user.value.name,
      avatar: user.value.avatar,
    },
  ],
  orgStore.organizations.length > 1 ? [
    {
      label: orgStore.currentOrg?.name || t('userMenu.switchOrganization'),
      icon: 'i-lucide-building-2',
      children: orgStore.organizations.map(org => ({
        label: org.name,
        icon: org.id === orgStore.currentOrg?.id ? 'i-lucide-check' : undefined,
        onSelect(e: Event) {
          e.preventDefault()
          switchOrg(org)
        },
      })),
    },
  ] : [],
  [
    {
      label: t('settings.title'),
      icon: 'i-lucide-settings',
      onSelect() {
        router.push({ name: 'settings' })
      },
    },
    {
      label: t('userMenu.appearance'),
      icon: 'i-lucide-sun-moon',
      children: [
        {
          label: t('userMenu.light'),
          icon: 'i-lucide-sun',
          type: 'checkbox',
          checked: colorMode.value === 'light',
          onSelect(e: Event) {
            e.preventDefault()
            colorMode.value = 'light'
          },
        },
        {
          label: t('userMenu.dark'),
          icon: 'i-lucide-moon',
          type: 'checkbox',
          checked: colorMode.value === 'dark',
          onSelect(e: Event) {
            e.preventDefault()
            colorMode.value = 'dark'
          },
        },
      ],
    },
  ],
  [
    {
      label: t('userMenu.logout'),
      icon: 'i-lucide-log-out',
      onSelect: handleLogout,
    },
  ],
])
</script>
