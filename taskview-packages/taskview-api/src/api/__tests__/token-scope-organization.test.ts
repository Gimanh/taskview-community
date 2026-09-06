import { TvApi } from '@/tv';
import axios from 'axios';
import {
    describe,
    it,
    expect,
    beforeAll,
    afterAll,
} from 'vitest';
import { initApi, API_URL } from './init-api';

/**
 * Organization, SSO and webhook endpoints are guarded by an organization role or
 * by project ownership, not by the project RBAC, so before migration 1.65.0 they
 * ignored the scope of an API token entirely: a token issued with a single
 * permission could still create organizations and webhooks. These tests pin the
 * fixed behaviour, including the deliberate escape hatch — a token with no
 * permissions selected stays unrestricted.
 */
describe('API token scope on organization-level surfaces', () => {
    let $api: TvApi;
    const tokenIds: number[] = [];
    const orgIds: number[] = [];
    let goalId: number;

    const clientFor = (token: string) => new TvApi(axios.create({
        baseURL: API_URL,
        headers: { Authorization: `Bearer ${token}` },
    }));

    const scopedClient = async (allowedPermissions: string[]) => {
        const created = await $api.apiTokens.create({
            name: `scope-${Date.now()}-${Math.random()}`,
            allowedPermissions,
        });
        tokenIds.push(created!.item.id);
        return clientFor(created!.token);
    };

    const statusOf = async (call: Promise<unknown>) =>
        call.then(() => 200).catch((err) => err.status ?? err.response?.status);

    /**
     * A permitted call must answer 200. Asserting merely "not 403" would also pass
     * on a 500, which is how a broken endpoint gets mistaken for a working guard.
     */
    const expectAllowed = (status: number) => expect(status).toBe(200);

    beforeAll(async () => {
        const { $tvApi } = await initApi();
        $api = $tvApi;

        const goal = await $api.goals.createGoal({ name: `scope-goal-${Date.now()}` });
        goalId = goal!.id!;
    });

    afterAll(async () => {
        for (const id of orgIds) {
            await $api.organizations.delete(id).catch(() => {});
        }
        for (const id of tokenIds) {
            await $api.apiTokens.delete(id).catch(() => {});
        }
        await $api.goals.deleteGoal(goalId).catch(() => {});
    });

    describe('permission catalogue', () => {
        it('offers the organization group for selection', async () => {
            const permissions = await $api.apiTokens.fetchPermissions();
            const names = permissions!.map((p) => p.name);

            expect(names).toContain('org_can_view');
            expect(names).toContain('org_can_manage');
            expect(names).toContain('org_can_manage_members');
            expect(names).toContain('sso_can_manage');
            expect(names).toContain('webhooks_can_manage');
        });

        it('carries localized descriptions for them', async () => {
            const permissions = await $api.apiTokens.fetchPermissions();
            const orgManage = permissions!.find((p) => p.name === 'org_can_manage');

            expect(orgManage!.permissionGroup).toBe(6);
            expect(orgManage!.descriptionLocales?.en).toBeTruthy();
            expect(orgManage!.descriptionLocales?.ru).toBeTruthy();
        });

        it('never offers group 1, which is enforced nowhere', async () => {
            const permissions = await $api.apiTokens.fetchPermissions();

            expect(permissions!.some((p) => p.permissionGroup === 1)).toBe(false);
        });
    });

    describe('creating organizations', () => {
        it('denies a token scoped to an unrelated permission', async () => {
            const client = await scopedClient(['timetracking_can_view']);

            const status = await statusOf(client.organizations.create({ name: `denied-${Date.now()}` }));

            expect(status).toBe(403);
        });

        it('allows a token holding org_can_manage', async () => {
            const client = await scopedClient(['org_can_manage']);

            const org = await client.organizations.create({ name: `allowed-${Date.now()}` });

            expect(org).toBeDefined();
            orgIds.push(org!.id);
        });

        it('allows a token with no permissions selected — unrestricted by design', async () => {
            const client = await scopedClient([]);

            const org = await client.organizations.create({ name: `unrestricted-${Date.now()}` });

            expect(org).toBeDefined();
            orgIds.push(org!.id);
        });

        it('does not restrict a normal browser session', async () => {
            const org = await $api.organizations.create({ name: `session-${Date.now()}` });

            expect(org).toBeDefined();
            orgIds.push(org!.id);
        });
    });

    describe('managing members', () => {
        it('separates org_can_manage from org_can_manage_members', async () => {
            const owner = await scopedClient(['org_can_manage']);
            const org = await owner.organizations.create({ name: `members-${Date.now()}` });
            orgIds.push(org!.id);

            const status = await statusOf(owner.organizations.addMember({
                organizationId: org!.id,
                email: `member-${Date.now()}@test.dest`,
                role: 'member',
            }));

            expect(status).toBe(403);
        });

        it('lets a token holding org_can_manage_members through the guard', async () => {
            const owner = await scopedClient(['org_can_manage']);
            const org = await owner.organizations.create({ name: `members-ok-${Date.now()}` });
            orgIds.push(org!.id);

            const member = await scopedClient(['org_can_manage_members']);
            const status = await statusOf(member.organizations.addMember({
                organizationId: org!.id,
                email: `member-${Date.now()}@test.dest`,
                role: 'member',
            }));

            expectAllowed(status);
        });

        it('denies listing members without org_can_view', async () => {
            const owner = await scopedClient(['org_can_manage']);
            const org = await owner.organizations.create({ name: `list-${Date.now()}` });
            orgIds.push(org!.id);

            const status = await statusOf(owner.organizations.fetchMembers(org!.id));

            expect(status).toBe(403);
        });

        it('allows listing members with org_can_view', async () => {
            const owner = await scopedClient(['org_can_manage']);
            const org = await owner.organizations.create({ name: `list-ok-${Date.now()}` });
            orgIds.push(org!.id);

            const viewer = await scopedClient(['org_can_view']);
            const status = await statusOf(viewer.organizations.fetchMembers(org!.id));

            expectAllowed(status);
        });
    });

    describe('changing and deleting an organization', () => {
        it('denies renaming without org_can_manage', async () => {
            const owner = await scopedClient(['org_can_manage']);
            const org = await owner.organizations.create({ name: `rename-${Date.now()}` });
            orgIds.push(org!.id);

            const outsider = await scopedClient(['org_can_view']);
            const status = await statusOf(outsider.organizations.update(org!.id, { name: 'renamed' }));

            expect(status).toBe(403);
        });

        it('allows renaming with org_can_manage', async () => {
            const owner = await scopedClient(['org_can_manage']);
            const org = await owner.organizations.create({ name: `rename-ok-${Date.now()}` });
            orgIds.push(org!.id);

            const status = await statusOf(owner.organizations.update(org!.id, { name: `renamed-${Date.now()}` }));

            expectAllowed(status);
        });

        it('denies deleting without org_can_manage', async () => {
            const owner = await scopedClient(['org_can_manage']);
            const org = await owner.organizations.create({ name: `delete-${Date.now()}` });
            orgIds.push(org!.id);

            const outsider = await scopedClient(['org_can_view']);
            const status = await statusOf(outsider.organizations.delete(org!.id));

            expect(status).toBe(403);
        });
    });

    describe('changing and removing members', () => {
        it('denies changing a role without org_can_manage_members', async () => {
            const owner = await scopedClient(['org_can_manage']);
            const org = await owner.organizations.create({ name: `role-${Date.now()}` });
            orgIds.push(org!.id);

            const status = await statusOf(owner.organizations.updateMemberRole({
                organizationId: org!.id,
                email: `role-${Date.now()}@test.dest`,
                role: 'admin',
            }));

            expect(status).toBe(403);
        });

        it('denies removing a member without org_can_manage_members', async () => {
            const owner = await scopedClient(['org_can_manage']);
            const org = await owner.organizations.create({ name: `remove-${Date.now()}` });
            orgIds.push(org!.id);

            const status = await statusOf(owner.organizations.removeMember({
                organizationId: org!.id,
                email: `remove-${Date.now()}@test.dest`,
            }));

            expect(status).toBe(403);
        });

        it('lets org_can_manage_members past the guard on both', async () => {
            const owner = await scopedClient(['org_can_manage']);
            const org = await owner.organizations.create({ name: `member-verbs-${Date.now()}` });
            orgIds.push(org!.id);

            const manager = await scopedClient(['org_can_manage_members']);
            const email = `member-${Date.now()}@test.dest`;
            await manager.organizations.addMember({ organizationId: org!.id, email, role: 'member' }).catch(() => {});

            const roleStatus = await statusOf(manager.organizations.updateMemberRole({
                organizationId: org!.id, email, role: 'admin',
            }));
            const removeStatus = await statusOf(manager.organizations.removeMember({
                organizationId: org!.id, email,
            }));

            expectAllowed(roleStatus);
            expectAllowed(removeStatus);
        });
    });

    describe('SSO administration', () => {
        it('denies listing configs without sso_can_manage', async () => {
            const owner = await scopedClient(['org_can_manage']);
            const org = await owner.organizations.create({ name: `sso-${Date.now()}` });
            orgIds.push(org!.id);

            const status = await statusOf(owner.sso.listConfigs(org!.id));

            expect(status).toBe(403);
        });

        it('allows listing configs with sso_can_manage', async () => {
            const owner = await scopedClient(['org_can_manage']);
            const org = await owner.organizations.create({ name: `sso-ok-${Date.now()}` });
            orgIds.push(org!.id);

            const admin = await scopedClient(['sso_can_manage']);
            const status = await statusOf(admin.sso.listConfigs(org!.id));

            expectAllowed(status);
        });

        it('denies every other admin verb on a real config without sso_can_manage', async () => {
            const owner = await scopedClient(['org_can_manage']);
            const org = await owner.organizations.create({ name: `sso-verbs-${Date.now()}` });
            orgIds.push(org!.id);

            // A real config is required: IsSsoConfigAdmin runs first and would answer
            // 404 for a made-up id, hiding whether the token check exists at all.
            const admin = await scopedClient(['sso_can_manage']);
            const config = await admin.sso.createConfig({
                organizationId: org!.id,
                protocol: 'oidc',
                displayName: 'Scope probe',
                emailDomainRestriction: `sso-${Date.now()}.test`,
            });
            expect(config).toBeDefined();
            const configId = config!.id;

            const results = await Promise.all([
                statusOf(owner.sso.updateConfig(configId, { displayName: 'renamed' })),
                statusOf(owner.sso.startDomainVerification(configId)),
                statusOf(owner.sso.checkDomainVerification(configId)),
                statusOf(owner.sso.generateScimToken(configId)),
                statusOf(owner.sso.toggleScim(configId, true)),
                statusOf(owner.sso.deleteConfig(configId)),
            ]);

            expect(results).toEqual([403, 403, 403, 403, 403, 403]);

            await admin.sso.deleteConfig(configId).catch(() => {});
        });

        it('lets sso_can_manage change and delete a config', async () => {
            const owner = await scopedClient(['org_can_manage']);
            const org = await owner.organizations.create({ name: `sso-admin-${Date.now()}` });
            orgIds.push(org!.id);

            const admin = await scopedClient(['sso_can_manage']);
            const config = await admin.sso.createConfig({
                organizationId: org!.id,
                protocol: 'oidc',
                displayName: 'Editable',
                emailDomainRestriction: `sso-ok-${Date.now()}.test`,
            });

            const updateStatus = await statusOf(admin.sso.updateConfig(config!.id, { displayName: 'Renamed' }));
            const deleteStatus = await statusOf(admin.sso.deleteConfig(config!.id));

            expectAllowed(updateStatus);
            expectAllowed(deleteStatus);
        });

        it('denies creating a config without sso_can_manage', async () => {
            const owner = await scopedClient(['org_can_manage']);
            const org = await owner.organizations.create({ name: `sso-create-${Date.now()}` });
            orgIds.push(org!.id);

            const status = await statusOf(owner.sso.createConfig({
                organizationId: org!.id,
                protocol: 'oidc',
                displayName: 'Should not be created',
                emailDomainRestriction: `sso-${Date.now()}.test`,
            }));

            expect(status).toBe(403);
        });
    });

    describe('webhooks', () => {
        it('denies a token scoped to an unrelated permission', async () => {
            const client = await scopedClient(['timetracking_can_view']);

            const status = await statusOf(client.webhooks.fetch(goalId));

            expect(status).toBe(403);
        });

        it('allows a token holding webhooks_can_manage', async () => {
            const client = await scopedClient(['webhooks_can_manage']);

            const status = await statusOf(client.webhooks.fetch(goalId));

            expectAllowed(status);
        });

        it('allows an unrestricted token', async () => {
            const client = await scopedClient([]);

            const status = await statusOf(client.webhooks.fetch(goalId));

            expectAllowed(status);
        });

        it('denies creating a webhook without webhooks_can_manage', async () => {
            const client = await scopedClient(['timetracking_can_view']);

            const status = await statusOf(client.webhooks.create({
                goalId,
                url: 'https://exfiltration.test/hook',
                events: ['task.created'],
            }));

            expect(status).toBe(403);
        });

        it('allows the full webhook lifecycle with webhooks_can_manage', async () => {
            const client = await scopedClient(['webhooks_can_manage']);

            const created = await client.webhooks.create({
                goalId,
                url: `https://receiver.test/${Date.now()}`,
                events: ['task.created'],
            });
            expect(created).toBeDefined();

            const updateStatus = await statusOf(client.webhooks.update({
                id: created!.webhook.id,
                events: ['task.created', 'task.updated'],
            }));
            const deleteStatus = await statusOf(client.webhooks.delete({ id: created!.webhook.id }));

            expectAllowed(updateStatus);
            expectAllowed(deleteStatus);
        });
    });
});
