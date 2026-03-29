import { defineStore } from 'pinia'
import type {
  CollaborationArgAddUser,
  CollaborationArgDeleteUser,
  CollaborationArgToggleUserRoles,
  GoalItem,
} from 'taskview-api'
import { $tvApi } from '@/plugins/axios'
import type { CollaborationStore } from '@/types/collaboration.types'

export const useCollaborationStore = defineStore('collaboration', {
  state(): CollaborationStore {
    return {
      users: [],
      allUsers: [],
    }
  },

  getters: {
    userMap: (state) => {
      return new Map(state.allUsers.map((user) => [user.id, user]))
    },
  },

  actions: {
    /**
         * Fetch all users for collaboration
         * we use it in the main screen to show the users
         * in the assignees section for tasks
         */
    async fetchAllCollaborationUsers(): Promise<void> {
      const users = await $tvApi.collaboration.fetchAllUsers()
      if (!users) return
      this.allUsers = users
    },
    
/**
         * Fetch users for a specific goal for collaboration section
         */
    async fetchCollaborationUsersForGoal(goalId: GoalItem['id']): Promise<void> {
      const users = await $tvApi.collaboration.fetchUsersForGoal(goalId)
      if (!users) return
      this.users = users
    },

    async addCollaborationUser(data: CollaborationArgAddUser): Promise<boolean> {
      const result = await $tvApi.collaboration.inviteUserToGoal(data)
      if (!result) return false
      this.users.push(result)
      this.allUsers.push(result)
      return true
    },

    async deleteUserFromCollaboration(data: CollaborationArgDeleteUser): Promise<void> {
      const result = await $tvApi.collaboration.deleteUserFromGoal(data)
      if (!result) return
      this.users = this.users.filter((usr) => usr.id !== data.id)
      this.allUsers = this.allUsers.filter((usr) => !(usr.id === data.id && usr.goalId === data.goalId))
    },

    async toggleUserRole(data: CollaborationArgToggleUserRoles) {
      const roles = await $tvApi.collaboration.toggleUserRoles(data)
      if (!roles) return
      const user = this.users.find((us) => us.id === data.userId)
      if (user && roles) {
        user.roles = roles
      }
    },
  },
})
