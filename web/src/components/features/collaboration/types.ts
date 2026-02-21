export interface Permission {
  id: string
  key: string
  name: string
  description: string
  group: 'tasks' | 'lists' | 'members' | 'roles'
}

export interface Role {
  id: string
  name: string
  permissions: string[]
  isSystem?: boolean
}

export interface Member {
  id: string
  email: string
  name?: string
  avatar?: string
  roleIds: string[]
  status: 'pending' | 'active'
  invitedAt: Date
}

export const PERMISSIONS: Permission[] = [
  // Tasks
  { id: 'view_tasks', key: 'view_tasks', name: 'View Tasks', description: 'Can view tasks in the project', group: 'tasks' },
  { id: 'create_tasks', key: 'create_tasks', name: 'Create Tasks', description: 'Can create new tasks', group: 'tasks' },
  { id: 'edit_tasks', key: 'edit_tasks', name: 'Edit Tasks', description: 'Can edit existing tasks', group: 'tasks' },
  { id: 'delete_tasks', key: 'delete_tasks', name: 'Delete Tasks', description: 'Can delete tasks', group: 'tasks' },

  // Lists
  { id: 'view_lists', key: 'view_lists', name: 'View Lists', description: 'Can view lists in the project', group: 'lists' },
  { id: 'create_lists', key: 'create_lists', name: 'Create Lists', description: 'Can create new lists', group: 'lists' },
  { id: 'edit_lists', key: 'edit_lists', name: 'Edit Lists', description: 'Can edit existing lists', group: 'lists' },
  { id: 'delete_lists', key: 'delete_lists', name: 'Delete Lists', description: 'Can delete lists', group: 'lists' },

  // Members
  { id: 'view_members', key: 'view_members', name: 'View Members', description: 'Can view project members', group: 'members' },
  { id: 'invite_members', key: 'invite_members', name: 'Invite Members', description: 'Can invite new members', group: 'members' },
  { id: 'remove_members', key: 'remove_members', name: 'Remove Members', description: 'Can remove members from project', group: 'members' },

  // Roles
  { id: 'view_roles', key: 'view_roles', name: 'View Roles', description: 'Can view roles', group: 'roles' },
  { id: 'manage_roles', key: 'manage_roles', name: 'Manage Roles', description: 'Can create, edit and delete roles', group: 'roles' },
]

export const DEFAULT_ROLES: Role[] = [
  {
    id: 'admin',
    name: 'Admin',
    permissions: PERMISSIONS.map(p => p.id),
    isSystem: true,
  },
  {
    id: 'member',
    name: 'Member',
    permissions: ['view_tasks', 'create_tasks', 'edit_tasks', 'view_lists', 'create_lists', 'edit_lists', 'view_members'],
    isSystem: true,
  },
  {
    id: 'viewer',
    name: 'Viewer',
    permissions: ['view_tasks', 'view_lists', 'view_members'],
    isSystem: true,
  },
]
