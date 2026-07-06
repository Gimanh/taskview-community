import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useColorMode } from '@vueuse/core'
import type { Locale } from '@/locales'
import type { SidebarView, TaskDetailDisplayMode } from '@/types/global-app.types'
import { useAppStore } from '@/stores/app.store'
import { useUserStore } from '@/stores/user.store'
import { useOrganizationStore } from '@/stores/organization.store'
import { useOrgSwitcher } from '@/composables/useOrgSwitcher'
import { saveLocale } from '@/plugins/i18n'
import type { SettingsSection } from '../types'

const LANGUAGE_OPTIONS = [
  { label: 'English', value: 'en' },
  { label: 'Русский', value: 'ru' },
  { label: 'Deutsch', value: 'de' },
  { label: 'Español', value: 'es' },
]

export function useSettingsHub() {
  const { t, locale } = useI18n()
  const colorMode = useColorMode()
  const appStore = useAppStore()
  const userStore = useUserStore()
  const orgStore = useOrganizationStore()
  const { switchOrg } = useOrgSwitcher()

  const identity = computed(() => ({
    name: userStore.login || userStore.email,
    email: userStore.email,
  }))

  const sections = computed<SettingsSection[]>(() => {
    const account: SettingsSection = {
      key: 'account',
      title: t('settings.account'),
      items: [
        { kind: 'nav', key: 'account', icon: 'i-lucide-user-cog', color: 'emerald', title: t('userMenu.accountSettings'), to: { name: 'account' } },
        { kind: 'nav', key: 'organizations', icon: 'i-lucide-building-2', color: 'violet', title: t('userMenu.organizations'), to: { name: 'organizations' } },
      ],
    }

    if (orgStore.organizations.length > 1) {
      account.items.unshift({
        kind: 'select',
        key: 'org-switch',
        icon: 'i-lucide-arrow-left-right',
        color: 'indigo',
        title: t('userMenu.switchOrganization'),
        options: orgStore.organizations.map((o) => ({ label: o.name, value: String(o.id) })),
        get: () => String(orgStore.currentOrg?.id ?? ''),
        set: (value) => {
          const org = orgStore.organizations.find((o) => String(o.id) === value)
          if (org) switchOrg(org)
        },
      })
    }

    const appearance: SettingsSection = {
      key: 'appearance',
      title: t('settings.appearance'),
      items: [
        {
          kind: 'select',
          key: 'theme',
          icon: 'i-lucide-sun-moon',
          color: 'amber',
          title: t('userMenu.appearance'),
          options: [
            { label: t('userMenu.light'), value: 'light' },
            { label: t('userMenu.dark'), value: 'dark' },
            { label: t('settings.system'), value: 'auto' },
          ],
          get: () => colorMode.value,
          set: (value) => { colorMode.value = value as typeof colorMode.value },
        },
        {
          kind: 'select',
          key: 'language',
          icon: 'i-lucide-languages',
          color: 'sky',
          title: t('userMenu.language'),
          options: LANGUAGE_OPTIONS,
          get: () => locale.value,
          set: (value) => saveLocale(value as Locale),
        },
        { kind: 'nav', key: 'ui-customization', icon: 'i-lucide-sliders-horizontal', color: 'rose', title: t('userMenu.uiCustomization'), to: { name: 'ui-customization' } },
      ],
    }

    const layout: SettingsSection = {
      key: 'layout',
      title: t('settings.layout'),
      items: [
        {
          kind: 'select',
          key: 'task-detail',
          icon: 'i-lucide-panel-right',
          color: 'indigo',
          title: t('userMenu.taskDetailView'),
          options: [
            { label: t('userMenu.taskDetailSlideover'), value: 'slideover' },
            { label: t('userMenu.taskDetailModal'), value: 'modal' },
          ],
          get: () => appStore.taskDetailDisplayMode,
          set: (value) => appStore.setTaskDetailDisplayMode(value as TaskDetailDisplayMode),
        },
        {
          kind: 'select',
          key: 'sidebar-view',
          icon: 'i-lucide-panel-left',
          color: 'teal',
          title: t('userMenu.sidebarView'),
          options: [
            { label: t('userMenu.sidebarViewSecond'), value: 'second' },
            { label: t('userMenu.sidebarViewFirst'), value: 'first' },
          ],
          get: () => appStore.sidebarView,
          set: (value) => appStore.setSidebarView(value as SidebarView),
        },
      ],
    }

    const about: SettingsSection = {
      key: 'about',
      title: t('settings.about'),
      items: [
        { kind: 'nav', key: 'site', icon: 'i-lucide-globe', color: 'zinc', title: t('userMenu.site'), href: 'https://taskview.tech/' },
        { kind: 'nav', key: 'docs', icon: 'i-lucide-book-open', color: 'zinc', title: t('userMenu.documentation'), href: 'https://taskview.tech/docs/' },
        { kind: 'nav', key: 'github', icon: 'simple-icons:github', color: 'zinc', title: t('userMenu.github'), href: 'https://github.com/Gimanh/taskview-community' },
        { kind: 'nav', key: 'docker', icon: 'simple-icons:docker', color: 'zinc', title: t('userMenu.docker'), href: 'https://hub.docker.com/u/gimanhead' },
      ],
    }

    return [account, appearance, layout, about]
  })

  return { identity, sections }
}
