<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      v-bind="{
        ...user,
        label: collapsed ? undefined : user?.name,
        trailingIcon: collapsed ? undefined : 'i-lucide-chevrons-up-down'
      }"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
      :ui="{
        trailingIcon: 'text-dimmed'
      }"
    />

    <template #chip-leading="{ item }">
      <div class="inline-flex items-center justify-center shrink-0 size-5">
        <span
          class="rounded-full ring ring-bg bg-(--chip-light) dark:bg-(--chip-dark) size-2"
          :style="{
            '--chip-light': `var(--color-${(item as any).chip}-500)`,
            '--chip-dark': `var(--color-${(item as any).chip}-400)`
          }"
        />
      </div>
    </template>
  </UDropdownMenu>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { DropdownMenuItem } from '@nuxt/ui'
import { useColorMode } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app.store'
import { useLogout } from '@/composables/useLogout'
import { useUpdater } from '@/composables/useUpdater'
import { useUserStore } from '@/stores/user.store'
import { $ls } from '@/plugins/axios'
import avatarImg from '@/assets/images/avatar-1.jpeg'

defineProps<{
  collapsed?: boolean
}>()

const { t, locale } = useI18n()
const colorMode = useColorMode()
const appStore = useAppStore()
const router = useRouter()
const toast = useToast()
const userStore = useUserStore()

const prodOrDev = ref<'prod' | 'dev'>('prod')
let counter = 0
let timeout: number
let timeoutChangeProdOrDev: number

onMounted(async () => {
  prodOrDev.value = (await $ls.getValue('update_loading')) === 'dev' ? 'dev' : 'prod'
})

async function checkForUpdates() {
  counter++

  if (timeout) clearTimeout(timeout)
  if (timeoutChangeProdOrDev) clearTimeout(timeoutChangeProdOrDev)

  timeout = window.setTimeout(() => {
    counter = 0
  }, 500)

  if (counter === 7) {
    timeoutChangeProdOrDev = window.setTimeout(async () => {
      if ((await $ls.getValue('update_loading')) !== 'dev') {
        await $ls.setValue('update_loading', 'dev')
        prodOrDev.value = 'dev'
      } else {
        await $ls.setValue('update_loading', 'prod')
        prodOrDev.value = 'prod'
      }
      console.log(await $ls.getValue('update_loading'))
      await useUpdater(true)
      clearTimeout(timeoutChangeProdOrDev)
    }, 2000)
  }
}

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
  name: userStore.email || userStore.login,
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
  [
    // {
    //   label: t('userMenu.profile'),
    //   icon: 'i-lucide-user',
    // },
    {
      label: t('userMenu.accountSettings'),
      icon: 'i-lucide-settings',
      onSelect() {
        router.push({ name: 'account' })
      },
    },
  ],
  [
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
          onUpdateChecked(checked: boolean) {
            if (checked) {
              colorMode.value = 'dark'
            }
          },
          onSelect(e: Event) {
            e.preventDefault()
          },
        },
      ],
    },
    {
      label: t('userMenu.language'),
      icon: 'i-lucide-languages',
      children: [
        {
          label: 'English',
          type: 'checkbox',
          checked: locale.value === 'en',
          onSelect(e: Event) {
            e.preventDefault()
            locale.value = 'en'
          },
        },
        {
          label: 'Русский',
          type: 'checkbox',
          checked: locale.value === 'ru',
          onSelect(e: Event) {
            e.preventDefault()
            locale.value = 'ru'
          },
        },
      ],
    },
    {
      label: t('userMenu.taskDetailView'),
      icon: 'i-lucide-panel-right',
      children: [
        {
          label: t('userMenu.taskDetailSlideover'),
          icon: 'i-lucide-panel-right',
          type: 'checkbox',
          checked: appStore.taskDetailDisplayMode === 'slideover',
          onSelect(e: Event) {
            e.preventDefault()
            appStore.setTaskDetailDisplayMode('slideover')
          },
        },
        {
          label: t('userMenu.taskDetailModal'),
          icon: 'i-lucide-square',
          type: 'checkbox',
          checked: appStore.taskDetailDisplayMode === 'modal',
          onSelect(e: Event) {
            e.preventDefault()
            appStore.setTaskDetailDisplayMode('modal')
          },
        },
      ],
    },
  ],
  [
    {
      label: t('userMenu.site'),
      icon: 'i-lucide-globe',
      to: 'https://taskview.tech/',
      target: '_blank',
    },
    {
      label: t('userMenu.documentation'),
      icon: 'i-lucide-book-open',
      to: 'https://taskview.tech/docs/',
      target: '_blank',
    },
    {
      label: t('userMenu.github'),
      icon: 'simple-icons:github',
      to: 'https://github.com/Gimanh/taskview-community',
      target: '_blank',
    },
    {
      label: t('userMenu.docker'),
      icon: 'simple-icons:docker',
      to: 'https://hub.docker.com/u/gimanhead',
      target: '_blank',
    },
  ],
  [
    {
      label: `v ${APP_VERSION}${prodOrDev.value === 'dev' ? '_d' : ''}`,
      icon: 'i-lucide-info',
      onSelect(e: Event) {
        e.preventDefault()
        checkForUpdates()
      },
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
