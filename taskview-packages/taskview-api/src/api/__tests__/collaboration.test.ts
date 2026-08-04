import { TvApi } from '@/tv';
import {
    describe,
    it,
    expect,
    beforeAll,
    beforeEach,
} from 'vitest';
import type { GoalItem } from '../goals.types';
import { initApi } from './init-api';

describe('Collaboration', () => {
    let $api: TvApi;
    let user1Email: string;

    beforeAll(async () => {
        const { $tvApi, user1Email: u1Email } = await initApi();
        $api = $tvApi;
        user1Email = u1Email;
    });

    let collaborationGoal: GoalItem | null;
    let email: string;

    const addUserToGoal = async (goalId: number, email: string) => {
        return await $api.collaboration.inviteUserToGoal({
            goalId: goalId,
            email: email
        }).catch(console.error).then((response) => response);
    }

    beforeEach(async () => {
        email = `test-${Date.now()}@email.com`;
    });

    beforeAll(async () => {
        collaborationGoal = await $api.goals.createGoal({
            name: 'Collaboration goal',
        });

        if (!collaborationGoal) {
            throw new Error('Failed to add collaboration goal');
        }
    })

    it('should add user to two goal', async () => {
        const addResult = await $api.collaboration.inviteUserToGoal({
            goalId: collaborationGoal?.id!,
            email: email
        }).catch(console.error);

        if (!addResult) {
            throw new Error('Failed to add user to goal');
        }

        expect(addResult.id).toBeDefined();
        expect(addResult.email).toEqual(email);

        const secondGoal = await $api.goals.createGoal({
            name: 'Collaboration goal',
        });

        const addResult2 = await $api.collaboration.inviteUserToGoal({
            goalId: secondGoal?.id!,
            email: email
        }).catch(console.error);

        if (!addResult2) {
            throw new Error('Failed to add user to goal');
        }

        expect(addResult2.id).toBeDefined();
        expect(addResult2.email).toEqual(email);
    });

    it('should add user to goal', async () => {
        const addResult = await $api.collaboration.inviteUserToGoal({
            goalId: collaborationGoal?.id!,
            email: email
        }).catch(console.error);

        if (!addResult) {
            throw new Error('Failed to add user to goal');
        }

        expect(addResult.id).toBeDefined();
        expect(addResult.email).toEqual(email);
    });

    it('should delete user from goal', async () => {
        const user = await addUserToGoal(collaborationGoal?.id!, email);

        if (!user) {
            throw new Error('Failed to add user to goal');
        }

        const deleteUserFromGoalResponse = await $api.collaboration.deleteUserFromGoal({
            goalId: collaborationGoal?.id!,
            id: user.id
        }).catch(console.error);

        if (!deleteUserFromGoalResponse) {
            throw new Error('Failed to delete user from goal');
        }

        expect(deleteUserFromGoalResponse).toEqual(true);
    });

    it('should fetch all users', async () => {
        const users = await $api.collaboration.fetchAllUsers().catch(console.error);
        expect(users).toBeDefined();
        expect(users?.length).toBeGreaterThan(0);
    });

    it('should fetch users for goal and "owner" should be true for owner', async () => {
        const user = await addUserToGoal(collaborationGoal?.id!, email);

        if (!user) {
            throw new Error('Failed to add user to goal');
        }

        const users = await $api.collaboration.fetchUsersForGoal(collaborationGoal?.id!).catch(console.error);

        expect(users).toBeDefined();
        expect(users?.find((u) => u.id === user.id)?.email).toEqual(email);
        const collabUser = users?.[0];
        expect(collabUser?.id).toBeDefined();
        expect(collabUser?.email).toBeDefined();
        expect(collabUser?.goal_id).toBeDefined();
        expect(collabUser?.goalId).toBeDefined();
        expect(collabUser?.invitation_date).toBeDefined();
        expect(collabUser?.invitationDate).toBeDefined();
        expect(collabUser?.roles).toBeDefined();
        expect(collabUser?.goalOwner).toBeDefined();

        const owner = users?.find((user) => user.email === user1Email);
        expect(owner?.goalOwner).toBe(true);
    });

    it('should add role to goal', async () => {
        const name = `test role-${Date.now()}`;
        const role = await $api.collaboration.createRoleForGoal({
            goalId: collaborationGoal?.id!,
            roleName: name,
        }).catch(console.error);
        expect(role?.id).toBeDefined();
        expect(role?.name).toEqual(name);
        expect(role?.goal_id).toEqual(collaborationGoal?.id!);
        expect(role?.created).toBeDefined();
        expect(role?.goalId).toEqual(collaborationGoal?.id!);
    });

    it('should not add two roles with the same name', async () => {
        const name = `test role same name-${Date.now()}`;
        const role = await $api.collaboration.createRoleForGoal({
            goalId: collaborationGoal?.id!,
            roleName: name,
        }).catch(console.error);
        expect(role?.id).toBeDefined();
        expect(role?.name).toEqual(name);

        const role2 = await $api.collaboration.createRoleForGoal({
            goalId: collaborationGoal?.id!,
            roleName: name,
        }).catch(console.error);
        expect(role2?.id).toBeUndefined();
        expect(role2?.name).toBeUndefined();
    });

    it('should delete role from goal', async () => {
        const name = `test role same name-${Date.now()}`;

        const role = await $api.collaboration.createRoleForGoal({
            goalId: collaborationGoal?.id!,
            roleName: name,
        }).catch(console.error);

        const deleteRoleFromGoalResponse = await $api.collaboration.deleteRoleFromGoal({
            goalId: collaborationGoal?.id!,
            id: role?.id!,
        }).catch(console.error);

        expect(deleteRoleFromGoalResponse).toEqual(true);
    });

    it('should fetch all permissions', async () => {
        const permissions = await $api.collaboration.fetchAllPermissions().catch(console.error);
        expect(permissions).toBeDefined();
        expect(permissions?.length).toBeGreaterThan(0);
        expect(permissions?.[0].id).toBeDefined();
        expect(permissions?.[0].name).toBeDefined();
        expect(permissions?.[0].description).toBeDefined();
        expect(permissions?.[0].permission_group).toBeDefined();
        expect(permissions?.[0].permissionGroup).toBeDefined();
        expect(permissions?.[0].description_locales).toBeDefined();
        expect(typeof permissions?.[0].description_locales).toBe('string');
        expect(typeof JSON.parse(permissions?.[0].descriptionLocales!)).toBe('object');
        expect(permissions?.[0].descriptionLocales).toBeDefined();
    });

    it('should fetch roles for goal', async () => {
        const roles = await $api.collaboration.fetchRolesForGoal(collaborationGoal?.id!).catch(console.error);
        expect(roles).toBeDefined();
        expect(roles?.length).toBeGreaterThan(0);
        expect(roles?.[0].id).toBeDefined();
        expect(roles?.[0].name).toBeDefined();
        expect(roles?.[0].goal_id).toBeDefined();
        expect(roles?.[0].goalId).toBeDefined();
    });

    it('should fetch role to permissions for goal', async () => {
        const permissions = await $api.collaboration.fetchRoleToPermissionsForGoal(collaborationGoal?.id!).catch(console.error);
        expect(permissions).toBeDefined();
        expect(permissions?.length).toBeGreaterThan(0);
        expect(permissions?.[0].roleId).toBeDefined();
        expect(permissions?.[0].permissionId).toBeDefined();
        expect(permissions?.[0].role_id).toBeDefined();
        expect(permissions?.[0].permission_id).toBeDefined();
    });

    it('should toggle role permission', async () => {

        const permissions = await $api.collaboration.fetchRoleToPermissionsForGoal(collaborationGoal?.id!).catch(console.error);
        //we can add role but without permission, so we need to find first permission that is not null
        const permission = permissions?.find((p) => p.permissionId !== null);

        const data = {
            permissionId: permission?.permissionId!,
            roleId: permission?.roleId!,
        };

        const toggleRolePermissionResponse = await $api.collaboration.toggleRolePermission(data).catch((err) => err);

        console.log('permissions', permissions);
        console.log('data', data);
        console.log('toggleRolePermissionResponse', toggleRolePermissionResponse);

        expect(toggleRolePermissionResponse?.add).toEqual(false);

        const toggleRolePermissionResponse2 = await $api.collaboration.toggleRolePermission({
            permissionId: permission?.permissionId!,
            roleId: permission?.roleId!,
        }).catch(console.error);

        expect(toggleRolePermissionResponse2?.add).toEqual(true);
    });

    it('should toggle user roles', async () => {
        const roles = await $api.collaboration.fetchRolesForGoal(collaborationGoal?.id!).catch(console.error);

        expect(roles).toBeDefined();

        expect(roles?.filter((r) => r.name === 'editor' || r.name === 'executor').length).toBe(2);

        const email = `user-${Date.now()}@fff.com`

        // add user and check add result
        const addUserResult = await $api.collaboration.inviteUserToGoal({
            email,
            goalId: collaborationGoal?.id!
        });
        const users = await $api.collaboration.fetchUsersForGoal(collaborationGoal?.id!).catch(console.error);
        const user = users?.find((u) => u.email === email);

        expect(user?.roles).toBeDefined();
        expect(user?.roles.length).toBe(0);

        // editor and executor roles must be defined always by default
        const editorAndExecutor = roles?.filter((r) => r.name === 'editor' || r.name === 'executor');
        expect(editorAndExecutor).toBeDefined();
        expect(editorAndExecutor?.length).toBe(2);

        const editorId = editorAndExecutor?.[0].id;
        const executorId = editorAndExecutor?.[1].id;

        expect(editorId).toBeDefined();
        expect(executorId).toBeDefined();

        // 1 toggle user roles to editor and executor
        const toggleResult = await $api.collaboration.toggleUserRoles({
            goalId: collaborationGoal?.id!,
            userId: addUserResult?.id!,
            roles: [editorId!, executorId!],
        }).catch(console.error);

        expect(toggleResult).toEqual([editorId!, executorId!]);

        //we are fetching users for goal and checking that user has editor and executor roles
        const users2 = await $api.collaboration.fetchUsersForGoal(collaborationGoal?.id!).catch(console.error);
        const user2 = users2?.find((u) => u.email === email);

        expect(user2?.roles).toEqual([editorId!, executorId!]);

        // 2 toggle user roles to editor only
        const toggleResult2 = await $api.collaboration.toggleUserRoles({
            goalId: collaborationGoal?.id!,
            userId: addUserResult?.id!,
            roles: [editorId!],
        }).catch(console.error);

        expect(toggleResult2).toEqual([editorId!]);

        //we are fetching users for goal and checking that user has editor role only
        const users3 = await $api.collaboration.fetchUsersForGoal(collaborationGoal?.id!).catch(console.error);
        const user3 = users3?.find((u) => u.email === email);

        expect(user3?.roles).toEqual([editorId!]);

    });

    // Regression for #98, the reporter's exact path: an org admin who is a collaborator
    // in several projects created a new project in that org and lost every role he had.
    // The trigger is creating a goal in an organization owned by SOMEONE ELSE - only then
    // does the API add the creator as a collaborator, which used to wipe his other roles.
    it('an org member creating a project in that org keeps his roles in other projects', async () => {
        const { $tvApiForSecondUser, user2Email } = await initApi();

        const org = await $api.organizations.create({ name: `Roles org ${Date.now()}` });
        expect(org?.id).toBeDefined();

        // the reporter's case: the second user is an ADMIN of the organization
        await $api.organizations.addMember({
            organizationId: org.id,
            email: user2Email,
            role: 'admin',
        });

        // owner creates two projects in the org and gives the admin roles in both
        const projectA = await $api.goals.createGoal({ name: 'Org project A', organizationId: org.id });
        const projectB = await $api.goals.createGoal({ name: 'Org project B', organizationId: org.id });
        expect(projectA?.id).toBeDefined();
        expect(projectB?.id).toBeDefined();

        const collabA = await $api.collaboration.inviteUserToGoal({ goalId: projectA!.id, email: user2Email });
        const collabB = await $api.collaboration.inviteUserToGoal({ goalId: projectB!.id, email: user2Email });
        expect(collabA?.id).toBeDefined();
        expect(collabB?.id).toEqual(collabA?.id);

        const editorA = (await $api.collaboration.fetchRolesForGoal(projectA!.id))?.find((r) => r.name === 'editor');
        const editorB = (await $api.collaboration.fetchRolesForGoal(projectB!.id))?.find((r) => r.name === 'editor');
        expect(editorA?.id).toBeDefined();
        expect(editorB?.id).toBeDefined();

        await $api.collaboration.toggleUserRoles({
            goalId: projectA!.id,
            userId: collabA!.id,
            roles: [editorA!.id],
        });
        await $api.collaboration.toggleUserRoles({
            goalId: projectB!.id,
            userId: collabA!.id,
            roles: [editorB!.id],
        });

        // ...the admin now creates his own project INSIDE the owner's organization
        const ownProject = await $tvApiForSecondUser.goals.createGoal({
            name: 'Project created by the org admin',
            organizationId: org.id,
        });
        expect(ownProject?.id).toBeDefined();

        // roles in the pre-existing projects must survive
        const usersA = await $api.collaboration.fetchUsersForGoal(projectA!.id);
        const usersB = await $api.collaboration.fetchUsersForGoal(projectB!.id);
        expect(usersA?.find((u) => u.email === user2Email)?.roles).toEqual([editorA!.id]);
        expect(usersB?.find((u) => u.email === user2Email)?.roles).toEqual([editorB!.id]);

        // and the new project is still usable by its creator
        const ownGoals = await $tvApiForSecondUser.goals.fetchGoals(org.id);
        expect(ownGoals?.some((g) => g.id === ownProject!.id)).toBe(true);

        await $api.organizations.delete(org.id).catch(() => { });
    });

    // Regression for #98: toggling roles in one goal wiped the user's roles in every other goal
    it('toggling roles in one goal must not touch the same user roles in another goal', async () => {
        const email = `multi-goal-${Date.now()}@fff.com`;

        const goalA = await $api.goals.createGoal({ name: 'Roles isolation goal A' });
        const goalB = await $api.goals.createGoal({ name: 'Roles isolation goal B' });
        expect(goalA).toBeTruthy();
        expect(goalB).toBeTruthy();

        const userInA = await $api.collaboration.inviteUserToGoal({ goalId: goalA!.id, email });
        const userInB = await $api.collaboration.inviteUserToGoal({ goalId: goalB!.id, email });
        expect(userInA?.id).toBeDefined();
        // the same collaboration user is shared between goals
        expect(userInB?.id).toEqual(userInA?.id);

        const rolesA = await $api.collaboration.fetchRolesForGoal(goalA!.id);
        const rolesB = await $api.collaboration.fetchRolesForGoal(goalB!.id);
        const editorA = rolesA?.find((r) => r.name === 'editor');
        const editorB = rolesB?.find((r) => r.name === 'editor');
        expect(editorA?.id).toBeDefined();
        expect(editorB?.id).toBeDefined();

        // assign a role in goal B first
        const toggledB = await $api.collaboration.toggleUserRoles({
            goalId: goalB!.id,
            userId: userInA?.id!,
            roles: [editorB?.id!],
        });
        expect(toggledB).toEqual([editorB?.id!]);

        // toggling roles in goal A must not clear the role in goal B
        const toggledA = await $api.collaboration.toggleUserRoles({
            goalId: goalA!.id,
            userId: userInA?.id!,
            roles: [editorA?.id!],
        });
        expect(toggledA).toEqual([editorA?.id!]);

        const usersInB = await $api.collaboration.fetchUsersForGoal(goalB!.id);
        expect(usersInB?.find((u) => u.email === email)?.roles).toEqual([editorB?.id!]);

        // each goal's collaborator list shows only that goal's roles
        const usersInA = await $api.collaboration.fetchUsersForGoal(goalA!.id);
        expect(usersInA?.find((u) => u.email === email)?.roles).toEqual([editorA?.id!]);

        // a role id belonging to another goal must not be assignable through this goal
        const toggledForeign = await $api.collaboration.toggleUserRoles({
            goalId: goalA!.id,
            userId: userInA?.id!,
            roles: [editorB?.id!],
        }).catch(() => null);
        expect(toggledForeign ?? []).toEqual([]);

        const usersInB2 = await $api.collaboration.fetchUsersForGoal(goalB!.id);
        expect(usersInB2?.find((u) => u.email === email)?.roles).toEqual([editorB?.id!]);
    });

    it('should handle inviting already existing collaborator', async () => {
        const addResult1 = await $api.collaboration.inviteUserToGoal({
            goalId: collaborationGoal?.id!,
            email: email,
        }).catch(console.error);

        if (!addResult1) {
            throw new Error('Failed to add user to goal');
        }

        await $api.collaboration.inviteUserToGoal({
            goalId: collaborationGoal?.id!,
            email: email,
        }).catch(console.error);

        const users = await $api.collaboration.fetchUsersForGoal(collaborationGoal?.id!).catch(console.error);
        const matchingUsers = users?.filter((u) => u.email === email);

        expect(matchingUsers?.length).toBe(1);
    });

    it('should remove user roles when user is deleted from goal', async () => {
        const roles = await $api.collaboration.fetchRolesForGoal(collaborationGoal?.id!).catch(console.error);
        const editorRole = roles?.find((r) => r.name === 'editor');
        expect(editorRole).toBeDefined();

        const addResult = await $api.collaboration.inviteUserToGoal({
            goalId: collaborationGoal?.id!,
            email: email,
        }).catch(console.error);

        if (!addResult) {
            throw new Error('Failed to add user to goal');
        }

        await $api.collaboration.toggleUserRoles({
            goalId: collaborationGoal?.id!,
            userId: addResult.id,
            roles: [editorRole?.id!],
        }).catch(console.error);

        await $api.collaboration.deleteUserFromGoal({
            goalId: collaborationGoal?.id!,
            id: addResult.id,
        }).catch(console.error);

        const reAddResult = await $api.collaboration.inviteUserToGoal({
            goalId: collaborationGoal?.id!,
            email: email,
        }).catch(console.error);

        if (!reAddResult) {
            throw new Error('Failed to re-add user to goal');
        }

        const users = await $api.collaboration.fetchUsersForGoal(collaborationGoal?.id!).catch(console.error);
        const user = users?.find((u) => u.email === email);

        expect(user?.roles).toBeDefined();
        expect(user?.roles.length).toBe(0);
    });

    it('should handle removing all roles from user', async () => {
        const roles = await $api.collaboration.fetchRolesForGoal(collaborationGoal?.id!).catch(console.error);
        const editorRole = roles?.find((r) => r.name === 'editor');
        expect(editorRole).toBeDefined();

        const addResult = await $api.collaboration.inviteUserToGoal({
            goalId: collaborationGoal?.id!,
            email: email,
        }).catch(console.error);

        if (!addResult) {
            throw new Error('Failed to add user to goal');
        }

        await $api.collaboration.toggleUserRoles({
            goalId: collaborationGoal?.id!,
            userId: addResult.id,
            roles: [editorRole?.id!],
        }).catch(console.error);

        const users1 = await $api.collaboration.fetchUsersForGoal(collaborationGoal?.id!).catch(console.error);
        const user1 = users1?.find((u) => u.email === email);
        expect(user1?.roles.length).toBeGreaterThan(0);

        await $api.collaboration.toggleUserRoles({
            goalId: collaborationGoal?.id!,
            userId: addResult.id,
            roles: [],
        }).catch(console.error);

        const users2 = await $api.collaboration.fetchUsersForGoal(collaborationGoal?.id!).catch(console.error);
        const user2 = users2?.find((u) => u.email === email);

        expect(user2?.roles).toBeDefined();
        expect(user2?.roles.length).toBe(0);
    });

    it('should keep user in collaboration when added to multiple goals', async () => {
        const goal2 = await $api.goals.createGoal({
            name: `Multi goal collab-${Date.now()}`,
        }).catch(console.error);

        if (!goal2) {
            throw new Error('Failed to create second goal');
        }

        // add same user to both goals
        const user1 = await $api.collaboration.inviteUserToGoal({
            goalId: collaborationGoal?.id!,
            email: email,
        }).catch(console.error);

        const user2 = await $api.collaboration.inviteUserToGoal({
            goalId: goal2.id,
            email: email,
        }).catch(console.error);

        if (!user1 || !user2) {
            throw new Error('Failed to add user to goals');
        }

        // user should be in both goals
        const usersGoal1 = await $api.collaboration.fetchUsersForGoal(collaborationGoal?.id!).catch(console.error);
        const usersGoal2 = await $api.collaboration.fetchUsersForGoal(goal2.id).catch(console.error);

        expect(usersGoal1?.find((u) => u.email === email)).toBeDefined();
        expect(usersGoal2?.find((u) => u.email === email)).toBeDefined();

        // remove from first goal
        await $api.collaboration.deleteUserFromGoal({
            goalId: collaborationGoal?.id!,
            id: user1.id,
        }).catch(console.error);

        // user should still be in second goal
        const usersGoal2After = await $api.collaboration.fetchUsersForGoal(goal2.id).catch(console.error);
        expect(usersGoal2After?.find((u) => u.email === email)).toBeDefined();

        // user should appear in fetchAllUsers (still in goal2)
        const allUsers = await $api.collaboration.fetchAllUsers().catch(console.error);
        expect(allUsers?.find((u) => u.email === email)).toBeDefined();

        await $api.goals.deleteGoal(goal2.id).catch(() => {});
    });

    it('should not appear in fetchAllUsers after removed from all goals', async () => {
        const uniqueEmail = `cleanup-${Date.now()}@test.com`;

        const goal2 = await $api.goals.createGoal({
            name: `Cleanup collab-${Date.now()}`,
        }).catch(console.error);

        if (!goal2) {
            throw new Error('Failed to create goal');
        }

        // add user to two goals
        const user1 = await $api.collaboration.inviteUserToGoal({
            goalId: collaborationGoal?.id!,
            email: uniqueEmail,
        }).catch(console.error);

        const user2 = await $api.collaboration.inviteUserToGoal({
            goalId: goal2.id,
            email: uniqueEmail,
        }).catch(console.error);

        if (!user1 || !user2) {
            throw new Error('Failed to add user to goals');
        }

        // remove from both goals
        await $api.collaboration.deleteUserFromGoal({
            goalId: collaborationGoal?.id!,
            id: user1.id,
        }).catch(console.error);

        await $api.collaboration.deleteUserFromGoal({
            goalId: goal2.id,
            id: user2.id,
        }).catch(console.error);

        // user should not appear in any goal
        const usersGoal1 = await $api.collaboration.fetchUsersForGoal(collaborationGoal?.id!).catch(console.error);
        const usersGoal2 = await $api.collaboration.fetchUsersForGoal(goal2.id).catch(console.error);

        expect(usersGoal1?.find((u) => u.email === uniqueEmail)).toBeUndefined();
        expect(usersGoal2?.find((u) => u.email === uniqueEmail)).toBeUndefined();

        // user should not appear in fetchAllUsers
        const allUsers = await $api.collaboration.fetchAllUsers().catch(console.error);
        expect(allUsers?.find((u) => u.email === uniqueEmail)).toBeUndefined();

        await $api.goals.deleteGoal(goal2.id).catch(() => {});
    });

    it('should remove user from task assignees when removed from goal', async () => {
        const assigneeEmail = `assignee-${Date.now()}@test.com`;

        // invite user to goal
        const collabUser = await $api.collaboration.inviteUserToGoal({
            goalId: collaborationGoal?.id!,
            email: assigneeEmail,
        }).catch(console.error);

        if (!collabUser) {
            throw new Error('Failed to invite user');
        }

        // create a task
        const task = await $api.tasks.createTask({
            goalId: collaborationGoal?.id!,
            description: `Assignee removal test-${Date.now()}`,
        }).catch(console.error);

        if (!task) {
            throw new Error('Failed to create task');
        }

        // assign user to task
        await $api.tasks.toggleTasksAssignee({
            taskId: task.id,
            userIds: [collabUser.id],
        }).catch(console.error);

        // verify user is assigned
        const taskBefore = await $api.tasks.fetchTaskById(task.id).catch(console.error);
        expect(taskBefore?.assignedUsers).toContain(collabUser.id);

        // remove user from goal collaboration
        await $api.collaboration.deleteUserFromGoal({
            goalId: collaborationGoal?.id!,
            id: collabUser.id,
        }).catch(console.error);

        // verify user is no longer assigned to task (DB trigger removes assignee)
        const taskAfter = await $api.tasks.fetchTaskById(task.id).catch(console.error);
        expect(taskAfter?.assignedUsers).not.toContain(collabUser.id);

        await $api.tasks.deleteTask(task.id).catch(() => {});
    });
});