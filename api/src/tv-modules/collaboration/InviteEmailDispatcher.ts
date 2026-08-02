import { and, count, eq, gte, lt, sql } from 'drizzle-orm';
import { GoalsSchema, InviteEmailsSchema, OrganizationsSchema, UsersSchema } from 'taskview-db-schemas';
import type { Dispatcher } from '../../core/Dispatcher';
import { Email } from '../../core/Email';
import { eventBus, type AppEvents } from '../../core/EventBus';
import { Database } from '../../modules/db';
import { $logger } from '../../modules/logget';
import { escapeHtml, parsePositiveInt } from '../../utils/helpers';
import InviteEmailTemplateEn from './mail/invite-en';
import InviteEmailTemplateRu from './mail/invite-ru';
import type { InviteEmailRateLimitArgs, InviteEmailSendArgs } from './collaboration.server.types';

const DEFAULT_HOURLY_LIMIT = 30;

export class InviteEmailDispatcher implements Dispatcher {
    static enabled(): boolean {
        return process.env.INVITE_EMAIL_ENABLED?.trim().toLowerCase() === 'true';
    }

    static hourlyLimit(): number {
        return parsePositiveInt(process.env.INVITE_EMAIL_HOURLY_LIMIT) ?? DEFAULT_HOURLY_LIMIT;
    }

    static validateOnStartup(): void {
        const enabledRaw = process.env.INVITE_EMAIL_ENABLED;
        if (enabledRaw !== undefined && enabledRaw.trim() !== '') {
            const normalized = enabledRaw.trim().toLowerCase();
            if (normalized !== 'true' && normalized !== 'false') {
                throw new Error(`INVITE_EMAIL_ENABLED has unrecognized value "${enabledRaw}". Allowed: true, false`);
            }
        }

        const limitRaw = process.env.INVITE_EMAIL_HOURLY_LIMIT;
        if (limitRaw !== undefined && limitRaw.trim() !== '' && parsePositiveInt(limitRaw) === null) {
            throw new Error(
                `INVITE_EMAIL_HOURLY_LIMIT has unrecognized value "${limitRaw}". Expected a positive integer`
            );
        }
    }

    register(): void {
        eventBus.on('collaboration.userAdded', (data) => this.onUserAdded(data));
    }

    async registerWorkers(): Promise<void> {}

    private async onUserAdded(data: AppEvents['collaboration.userAdded']): Promise<void> {
        if (!InviteEmailDispatcher.enabled() || !process.env.SMTP_HOST) return;

        const db = Database.getInstance();

        const [goal] = await db.dbDrizzle
            .select({ name: GoalsSchema.name, organizationId: GoalsSchema.organizationId })
            .from(GoalsSchema)
            .where(eq(GoalsSchema.id, data.goalId))
            .limit(1);
        if (!goal) return;

        const [inviter] = await db.dbDrizzle
            .select({ login: UsersSchema.login })
            .from(UsersSchema)
            .where(eq(UsersSchema.id, data.initiatorId))
            .limit(1);
        if (!inviter) return;

        const allowed = await this.passesRateLimit({
            initiatorId: data.initiatorId,
            email: data.email,
            goalId: data.goalId,
        });
        if (!allowed) return;

        const link = await this.buildGoalLink(data.goalId, goal.organizationId);
        if (!link) {
            $logger.warn('APP_URL is not set — skipping invite email');
            return;
        }

        await db.dbDrizzle.insert(InviteEmailsSchema).values({
            initiatorId: data.initiatorId,
            email: data.email,
            goalId: data.goalId,
        });

        const fallbackName = data.locale === 'ru' ? 'Пользователь TaskView' : 'A TaskView user';

        await this.sendInviteEmail({
            email: data.email,
            inviterName: this.truncate(inviter.login?.trim() || fallbackName),
            goalName: this.truncate(goal.name || ''),
            link,
            locale: data.locale,
        });
    }

    // Two rules: a 24h cooldown per (goal, recipient) — closes the delete/re-add resend loop —
    // and an hourly cap per initiator against using the instance as a mail relay.
    // Rows older than the cooldown window are pruned first, keeping the table tiny.
    private async passesRateLimit(args: InviteEmailRateLimitArgs): Promise<boolean> {
        const db = Database.getInstance();

        await db.dbDrizzle
            .delete(InviteEmailsSchema)
            .where(lt(InviteEmailsSchema.sentAt, sql`now() - interval '24 hours'`));

        const [cooldown] = await db.dbDrizzle
            .select({ id: InviteEmailsSchema.id })
            .from(InviteEmailsSchema)
            .where(and(eq(InviteEmailsSchema.goalId, args.goalId), eq(InviteEmailsSchema.email, args.email)))
            .limit(1);
        if (cooldown) return false;

        const [hourly] = await db.dbDrizzle
            .select({ count: count() })
            .from(InviteEmailsSchema)
            .where(
                and(
                    eq(InviteEmailsSchema.initiatorId, args.initiatorId),
                    gte(InviteEmailsSchema.sentAt, sql`now() - interval '1 hour'`)
                )
            );
        if ((hourly?.count ?? 0) >= InviteEmailDispatcher.hourlyLimit()) {
            $logger.warn(
                { initiatorId: args.initiatorId, goalId: args.goalId },
                'Invite email hourly limit reached — skipping send'
            );
            return false;
        }

        return true;
    }

    private async sendInviteEmail(args: InviteEmailSendArgs): Promise<void> {
        const template = args.locale === 'ru' ? InviteEmailTemplateRu : InviteEmailTemplateEn;
        const subject =
            args.locale === 'ru'
                ? `${args.inviterName} приглашает вас в проект «${args.goalName}» в TaskView`
                : `${args.inviterName} invited you to "${args.goalName}" on TaskView`;
        const text =
            args.locale === 'ru'
                ? `${args.inviterName} приглашает вас присоединиться к проекту «${args.goalName}» в TaskView.\n\nОткрыть проект: ${args.link}`
                : `${args.inviterName} has invited you to join the project "${args.goalName}" on TaskView.\n\nOpen the project: ${args.link}`;

        // Single-pass replace with a function: no re-substitution of placeholders inside
        // inserted values, and no special treatment of $-patterns in the replacement
        const values: Record<string, string> = {
            inviter: args.inviterName,
            project: args.goalName,
            link: args.link,
        };
        const html = template.replace(/\{(inviter|project|link)\}/g, (_, key: string) => escapeHtml(values[key]));

        await Email.send({
            text,
            subject,
            to: args.email,
            from: process.env.SMTP_FROM_EMAIL as string,
            attachment: [{ data: html, alternative: true }],
        });
    }

    // Frontend project route is /:orgSlug/:projectId; goals without an organization fall back to the app root
    private async buildGoalLink(goalId: number, organizationId: number | null): Promise<string | null> {
        const appUrl = (process.env.APP_URL ?? '').replace(/\/+$/, '');
        if (!appUrl) return null;
        if (!organizationId) return appUrl;

        const db = Database.getInstance();
        const [org] = await db.dbDrizzle
            .select({ slug: OrganizationsSchema.slug })
            .from(OrganizationsSchema)
            .where(eq(OrganizationsSchema.id, organizationId))
            .limit(1);
        if (!org?.slug) return appUrl;

        return `${appUrl}/${encodeURIComponent(org.slug)}/${goalId}`;
    }

    private truncate(value: string): string {
        const max = 80;
        return value.length > max ? `${value.slice(0, max)}…` : value;
    }
}
