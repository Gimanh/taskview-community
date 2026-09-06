import { and, eq, isNull, lt, or } from 'drizzle-orm'
import {
    ApiTokensSchema,
    OAuthAuthCodesSchema,
    OAuthClientsSchema,
    OAuthGrantsSchema,
    type OAuthAuthCodesSchemaTypeForSelect,
    type OAuthClientsSchemaTypeForSelect,
    type OAuthGrantsSchemaTypeForInsert,
    type OAuthGrantsSchemaTypeForSelect,
} from 'taskview-db-schemas'
import { Database } from '../../modules/db'
import { callWithCatch } from '../../utils/helpers'
import type {
    ConsumeAuthCodeArgs,
    CreateAccessTokenArgs,
    CreateAuthCodeArgs,
    CreateOAuthClientArgs,
    RevokeGrantArgs,
    RotateRefreshTokenArgs,
} from './types'

export class OAuthRepository {
    private readonly db: Database

    constructor() {
        this.db = Database.getInstance()
    }

    async createClient(data: CreateOAuthClientArgs): Promise<OAuthClientsSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.insert(OAuthClientsSchema).values(data).returning(),
        )
        return result?.[0] ?? null
    }

    async findClientByClientId(clientId: string): Promise<OAuthClientsSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(OAuthClientsSchema).where(eq(OAuthClientsSchema.clientId, clientId)),
        )
        return result?.[0] ?? null
    }

    async createAuthCode(data: CreateAuthCodeArgs & { codeHash: string; expiresAt: Date }): Promise<boolean> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.insert(OAuthAuthCodesSchema).values({
                codeHash: data.codeHash,
                clientId: data.clientId,
                userId: data.userId,
                redirectUri: data.redirectUri,
                codeChallenge: data.codeChallenge,
                codeChallengeMethod: data.codeChallengeMethod,
                allowedPermissions: data.allowedPermissions,
                allowedGoalIds: data.allowedGoalIds,
                resource: data.resource,
                expiresAt: data.expiresAt,
            }).returning(),
        )
        return !!result?.length
    }

    async findAuthCodeByHash(codeHash: string): Promise<OAuthAuthCodesSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(OAuthAuthCodesSchema).where(eq(OAuthAuthCodesSchema.codeHash, codeHash)),
        )
        return result?.[0] ?? null
    }

    /**
     * Single-use redemption. The UPDATE only matches while used_at is still NULL,
     * so two concurrent exchanges of the same code cannot both win.
     */
    async consumeAuthCode(args: ConsumeAuthCodeArgs): Promise<boolean> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.update(OAuthAuthCodesSchema)
                .set({ usedAt: new Date(), grantId: args.grantId })
                .where(and(eq(OAuthAuthCodesSchema.id, args.id), isNull(OAuthAuthCodesSchema.usedAt))),
        )
        return !!result?.rowCount
    }

    async deleteExpiredAuthCodes(): Promise<void> {
        await callWithCatch(() =>
            this.db.dbDrizzle.delete(OAuthAuthCodesSchema).where(lt(OAuthAuthCodesSchema.expiresAt, new Date())),
        )
    }

    async createGrant(data: OAuthGrantsSchemaTypeForInsert): Promise<OAuthGrantsSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.insert(OAuthGrantsSchema).values(data).returning(),
        )
        return result?.[0] ?? null
    }

    /** Matches the current refresh token or the previous one, so replay is detectable. */
    async findGrantByRefreshHash(refreshTokenHash: string): Promise<OAuthGrantsSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(OAuthGrantsSchema).where(
                or(
                    eq(OAuthGrantsSchema.refreshTokenHash, refreshTokenHash),
                    eq(OAuthGrantsSchema.refreshTokenPrevHash, refreshTokenHash),
                ),
            ),
        )
        return result?.[0] ?? null
    }

    async rotateRefreshToken(args: RotateRefreshTokenArgs): Promise<boolean> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.update(OAuthGrantsSchema)
                .set({
                    refreshTokenHash: args.refreshTokenHash,
                    refreshTokenPrevHash: args.prevHash,
                    refreshExpiresAt: args.refreshExpiresAt,
                    lastUsedAt: new Date(),
                })
                .where(and(
                    eq(OAuthGrantsSchema.id, args.grantId),
                    isNull(OAuthGrantsSchema.revokedAt),
                    // The presented token must still be the current one. Without this,
                    // two concurrent refreshes both succeed and the second overwrites
                    // the first, silently orphaning the refresh token it just handed out.
                    args.presentedHash
                        ? eq(OAuthGrantsSchema.refreshTokenHash, args.presentedHash)
                        : isNull(OAuthGrantsSchema.refreshTokenHash),
                )),
        )
        return !!result?.rowCount
    }

    async fetchGrantsByUserId(userId: number): Promise<OAuthGrantsSchemaTypeForSelect[]> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(OAuthGrantsSchema).where(
                and(eq(OAuthGrantsSchema.userId, userId), isNull(OAuthGrantsSchema.revokedAt)),
            ),
        )
        return result ?? []
    }

    async fetchClientsByClientIds(clientIds: string[]): Promise<OAuthClientsSchemaTypeForSelect[]> {
        if (!clientIds.length) return []
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(OAuthClientsSchema),
        )
        return (result ?? []).filter((client) => clientIds.includes(client.clientId))
    }

    /**
     * Revoking a grant also deletes its live access tokens — that is the whole
     * point of storing them as opaque rows instead of self-contained JWTs.
     */
    async revokeGrant(args: RevokeGrantArgs): Promise<boolean> {
        const where = args.userId === undefined
            ? eq(OAuthGrantsSchema.id, args.grantId)
            : and(eq(OAuthGrantsSchema.id, args.grantId), eq(OAuthGrantsSchema.userId, args.userId))

        const result = await callWithCatch(() =>
            this.db.dbDrizzle.update(OAuthGrantsSchema)
                .set({ revokedAt: new Date(), refreshTokenHash: null, refreshTokenPrevHash: null })
                .where(where),
        )
        if (!result?.rowCount) return false

        await callWithCatch(() =>
            this.db.dbDrizzle.delete(ApiTokensSchema).where(eq(ApiTokensSchema.grantId, args.grantId)),
        )
        return true
    }

    async createAccessToken(data: CreateAccessTokenArgs): Promise<boolean> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.insert(ApiTokensSchema).values(data).returning(),
        )
        return !!result?.length
    }

    async findGrantIdByAccessTokenHash(tokenHash: string): Promise<number | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select({ grantId: ApiTokensSchema.grantId })
                .from(ApiTokensSchema)
                .where(eq(ApiTokensSchema.tokenHash, tokenHash)),
        )
        return result?.[0]?.grantId ?? null
    }
}
