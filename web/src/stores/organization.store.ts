import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Organization, OrgMember } from 'taskview-api'
import { $tvApi } from '@/plugins/axios'

export const useOrganizationStore = defineStore('organization', () => {
  const organizations = ref<Organization[]>([])
  const currentOrg = ref<Organization | null>(null)
  const members = ref<OrgMember[]>([])
  const loading = ref(false)

  async function fetchOrganizations() {
    loading.value = true
    try {
      const result = await $tvApi.organizations.fetch()
      organizations.value = result ?? []
    } catch {
      organizations.value = []
    } finally {
      loading.value = false
    }
  }

  async function createOrganization(name: string, slug?: string) {
    try {
      const org = await $tvApi.organizations.create({ name, slug })
      if (org) {
        organizations.value.push(org)
      }
      return org
    } catch {
      return null
    }
  }

  async function updateOrganization(id: number, updates: { name?: string, slug?: string, logoUrl?: string | null }) {
    try {
      const org = await $tvApi.organizations.update({ organizationId: id, ...updates })
      if (org) {
        const idx = organizations.value.findIndex(o => o.id === id)
        if (idx !== -1) organizations.value[idx] = org
        if (currentOrg.value?.id === id) currentOrg.value = org
      }
      return org
    } catch {
      return null
    }
  }

  async function deleteOrganization(id: number) {
    try {
      const result = await $tvApi.organizations.delete({ organizationId: id })
      if (result) {
        organizations.value = organizations.value.filter(o => o.id !== id)
        if (currentOrg.value?.id === id) currentOrg.value = null
      }
      return result
    } catch {
      return false
    }
  }

  async function fetchMembers(orgId: number) {
    try {
      const result = await $tvApi.organizations.fetchMembers(orgId)
      members.value = result ?? []
      return members.value
    } catch {
      members.value = []
      return []
    }
  }

  async function addMember(organizationId: number, email: string, role: 'admin' | 'member' = 'member') {
    try {
      const member = await $tvApi.organizations.addMember({ organizationId, email, role })
      if (member) {
        members.value.push(member)
      }
      return member
    } catch {
      return null
    }
  }

  async function updateMemberRole(organizationId: number, email: string, role: 'admin' | 'member') {
    try {
      const updated = await $tvApi.organizations.updateMemberRole({ organizationId, email, role })
      if (updated) {
        const idx = members.value.findIndex(m => m.email === email && m.organizationId === organizationId)
        if (idx !== -1) members.value[idx] = updated
      }
      return updated
    } catch {
      return null
    }
  }

  async function removeMember(organizationId: number, email: string) {
    try {
      const result = await $tvApi.organizations.removeMember({ organizationId, email })
      if (result) {
        members.value = members.value.filter(m => !(m.email === email && m.organizationId === organizationId))
      }
      return result
    } catch {
      return false
    }
  }

  function setCurrentOrg(org: Organization | null) {
    currentOrg.value = org
    if (org) {
      localStorage.setItem('tv_current_org_id', String(org.id))
    } else {
      localStorage.removeItem('tv_current_org_id')
    }
  }

  function restoreCurrentOrg() {
    const savedId = localStorage.getItem('tv_current_org_id')
    if (savedId && organizations.value.length) {
      const found = organizations.value.find(o => o.id === Number(savedId))
      currentOrg.value = found ?? organizations.value[0]
    } else if (organizations.value.length) {
      currentOrg.value = organizations.value[0]
    }
  }

  return {
    organizations,
    currentOrg,
    members,
    loading,
    fetchOrganizations,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    fetchMembers,
    addMember,
    updateMemberRole,
    removeMember,
    setCurrentOrg,
    restoreCurrentOrg,
  }
})
