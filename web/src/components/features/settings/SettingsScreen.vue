<template>
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-6 p-3 pb-24 lg:p-6 lg:pb-6">
    <SettingsProfileHeader
      :name="identity.name"
      :email="identity.email"
    />

    <SettingsSection
      v-for="section in sections"
      :key="section.key"
      :title="section.title"
    >
      <template
        v-for="item in section.items"
        :key="item.key"
      >
        <SettingsNavRow
          v-if="item.kind === 'nav'"
          :item="item"
        />
        <SettingsSelectRow
          v-else
          :item="item"
        />
      </template>
      <SettingsVersionRow v-if="section.key === 'about'" />
    </SettingsSection>

    <ExtensionOutlet name="settings-sections" />

    <SettingsLogoutRow />
  </div>
</template>

<script setup lang="ts">
import ExtensionOutlet from '@/components/ExtensionOutlet.vue'
import { useSettingsHub } from './composables/useSettingsHub'
import SettingsProfileHeader from './parts/SettingsProfileHeader.vue'
import SettingsSection from './parts/SettingsSection.vue'
import SettingsNavRow from './parts/SettingsNavRow.vue'
import SettingsSelectRow from './parts/SettingsSelectRow.vue'
import SettingsVersionRow from './parts/SettingsVersionRow.vue'
import SettingsLogoutRow from './parts/SettingsLogoutRow.vue'

const { identity, sections } = useSettingsHub()
</script>
