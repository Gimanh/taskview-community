import { defineStore } from 'pinia'
import type {
  CollaborationArgCreateRoleForGoal,
  CollaborationArgDeleteRoleFromGoal,
  CollaborationArgToggleRolePermission,
  GoalItem,
} from 'taskview-api'
import { $tvApi } from '@/plugins/axios'
import type { CollaborationRolesStore } from '@/types/collaboration-roles.types'

export const useCollaborationRolesStore = defineStore('collaborationRoles', {
  state(): CollaborationRolesStore {
    return {
      roles: [],
      rolesPermissions: {},
    }
  },

  actions: {
    async fetchCollaborationRolesForGoal(goalId: GoalItem['id']): Promise<void> {
      const roles = await $tvApi.collaboration.fetchRolesForGoal(goalId)
      if (!roles) return
      this.roles = roles
    },

    async addCollaborationRole(data: CollaborationArgCreateRoleForGoal): Promise<void> {
      const role = await $tvApi.collaboration.createRoleForGoal(data)
      if (!role) return

      this.roles.push(role)

      if (!this.rolesPermissions[role.id]) {
        this.rolesPermissions[role.id] = {}
      }
    },

    async deleteCollaborationRole(data: CollaborationArgDeleteRoleFromGoal): Promise<void> {
      const result = await $tvApi.collaboration.deleteRoleFromGoal(data)
      if (!result) return

      const index = this.roles.findIndex((role) => role.id === data.id)
      if (index !== -1) {
        this.roles.splice(index, 1)
      }
    },

    async fetchAllRolePermissionsForGoal(goalId: GoalItem['id']): Promise<void> {
      const result = await $tvApi.collaboration.fetchRoleToPermissionsForGoal(goalId)
      if (!result) return

      result.forEach((item) => {
        if (!item.role_id || !item.permission_id) return

        if (!this.rolesPermissions[item.role_id]) {
          this.rolesPermissions[item.role_id] = {}
        }
        this.rolesPermissions[item.role_id][item.permission_id] = true
      })
    },

    async togglePermissionForRole(data: CollaborationArgToggleRolePermission) {
      const result = await $tvApi.collaboration.toggleRolePermission(data)
      if (!result) return

      if (result.add) {
        if (!this.rolesPermissions[data.roleId]) {
          this.rolesPermissions[data.roleId] = {}
        }
        this.rolesPermissions[data.roleId][data.permissionId] = true
      } else {
        delete this.rolesPermissions[data.roleId][data.permissionId]
      }
    },
  },
})
